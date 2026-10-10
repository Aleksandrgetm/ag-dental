package media

import (
	"bytes"
	"context"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func pngBytes() []byte {
	img := image.NewRGBA(image.Rect(0, 0, 48, 32))
	for y := 0; y < 32; y++ {
		for x := 0; x < 48; x++ {
			img.Set(x, y, color.RGBA{80, 140, 110, 255})
		}
	}
	var b bytes.Buffer
	png.Encode(&b, img)
	return b.Bytes()
}
func TestValidation(t *testing.T) {
	for _, data := range [][]byte{[]byte("<svg xmlns='http://www.w3.org/2000/svg'/>"), []byte("MZ executable content"), []byte("<!DOCTYPE html>not media")} {
		if _, _, _, e := Detect(data); e == nil {
			t.Fatal("unsupported accepted")
		}
	}
	if NormalizeFilename("../../patient\\photo<script>.PNG", "png") != "photoscript.png" {
		t.Fatal("filename normalization")
	}
	if ReferenceID("cms-media:upload.0123456789abcdef0123456789abcdef") == "" || ReferenceID("cms-media:../../x") != "" {
		t.Fatal("unsafe reference")
	}
	if ValidAlt(map[string]string{"lv": "a", "ru": "b", "en": "<script>"}) || ValidAlt(map[string]string{"lv": "a"}) {
		t.Fatal("alt validation")
	}
	if _, e := ReadBounded(bytes.NewReader(make([]byte, 33)), 32); e == nil {
		t.Fatal("size bound")
	}
	for _, key := range []string{"../x", "v1/0123456789abcdef0123456789abcdef/../../x", "v1/0123456789abcdef0123456789abcdef/evil.svg"} {
		if objectKey.MatchString(key) {
			t.Fatal("unsafe object key")
		}
	}
}
func TestImagePipeline(t *testing.T) {
	ff, _ := exec.LookPath("ffmpeg")
	fp, _ := exec.LookPath("ffprobe")
	cw, _ := exec.LookPath("cwebp")
	if ff == "" || fp == "" || cw == "" {
		t.Skip("install ffmpeg, ffprobe and cwebp for real processing tests")
	}
	p := Tools{ff, fp, cw}
	result, e := p.Process(context.Background(), "photo.png", pngBytes())
	if e != nil {
		t.Fatal(e)
	}
	if len(result.Files) != 4 || result.Metadata.Width != 48 || result.Metadata.Height != 32 {
		t.Fatal("metadata")
	}
	for _, f := range result.Files[1:] {
		if f.Width != 48 || f.Height != 32 || f.MIME != "image/webp" || f.SHA != Hash(f.Data) || bytes.Contains(f.Data, []byte("EXIF")) {
			t.Fatal("variant, aspect ratio, metadata or checksum")
		}
	}
	if _, e = p.Process(context.Background(), "photo.webp", result.Files[1].Data); e != nil {
		t.Fatal("WebP decode", e)
	}
	var jpg bytes.Buffer
	jpeg.Encode(&jpg, image.NewRGBA(image.Rect(0, 0, 48, 32)), nil)
	if _, e = p.Process(context.Background(), "photo.jpg", jpg.Bytes()); e != nil {
		t.Fatal("JPEG decode", e)
	}
	// Synthetic 48x32 solid-color fixture generated with avifenc, no clinic content.
	avifBytes, e := os.ReadFile("testdata/still.avif")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = p.Process(context.Background(), "photo.avif", avifBytes); e != nil {
		t.Fatal("AVIF decode", e)
	}

	if _, e = p.Process(context.Background(), "photo.svg", pngBytes()); e == nil {
		t.Fatal("extension mismatch")
	}
	truncated := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 24)...)
	if _, e = p.Process(context.Background(), "photo.png", truncated); e == nil {
		t.Fatal("truncated image")
	}
	if _, e = p.Process(context.Background(), "photo.png", append(pngBytes(), make([]byte, ImageLimit)...)); e == nil {
		t.Fatal("oversize")
	}
}

func TestVideoAndDimensions(t *testing.T) {
	ff, _ := exec.LookPath("ffmpeg")
	fp, _ := exec.LookPath("ffprobe")
	cw, _ := exec.LookPath("cwebp")
	if ff == "" || fp == "" || cw == "" {
		t.Skip("processing tools required")
	}
	p := Tools{ff, fp, cw}
	for _, tc := range []struct {
		ext, codec string
		valid      bool
	}{{"mp4", "libx264", true}, {"webm", "libvpx-vp9", true}, {"mp4", "mpeg4", false}} {
		path := filepath.Join(t.TempDir(), "synthetic."+tc.ext)
		cmd := exec.Command(ff, "-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=green:s=64x48:r=5:d=0.4", "-an", "-c:v", tc.codec, "-threads", "1", path)
		if e := cmd.Run(); e != nil {
			t.Fatal("video fixture generation", tc.codec, e)
		}
		b, _ := os.ReadFile(path)
		result, e := p.Process(context.Background(), filepath.Base(path), b)
		if !tc.valid {
			if e == nil {
				t.Fatal("unsupported codec accepted")
			}
			continue
		}
		if e != nil || result.Metadata.Kind != "video" || result.Metadata.Duration <= 0 || len(result.Files) != 5 {
			t.Fatal("video pipeline", tc.ext, e)
		}
	}
	bomb := pngBytes()
	binary.BigEndian.PutUint32(bomb[16:20], 100000)
	binary.BigEndian.PutUint32(bomb[29:33], crc32.ChecksumIEEE(bomb[12:29]))
	if _, e := p.Process(context.Background(), "huge.png", bomb); e == nil {
		t.Fatal("oversized dimensions accepted")
	}
	var b limitedOutput
	if _, e := b.Write(make([]byte, (1<<20)+1)); e == nil || b.Len() != 0 {
		t.Fatal("unbounded tool output")
	}
}
