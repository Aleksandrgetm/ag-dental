package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// Processing is server-side, bounded and opt-in. Deploy binaries in a resource-limited
// container (memory/CPU/process limits); never run uploaded files as programs.
type Tools struct{ FFmpeg, FFprobe, CWebP string }

func Detect(data []byte) (string, string, string, error) {
	if len(data) < 16 {
		return "", "", "", ErrInvalid
	}
	switch {
	case bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}):
		return "image/jpeg", "jpg", "image", nil
	case bytes.HasPrefix(data, []byte("\x89PNG\r\n\x1a\n")):
		return "image/png", "png", "image", nil
	case string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return "image/webp", "webp", "image", nil
	case string(data[4:8]) == "ftyp" && strings.Contains("avif avis", string(data[8:12])):
		return "image/avif", "avif", "image", nil
	case string(data[4:8]) == "ftyp" && strings.Contains("isom iso2 mp41 mp42 M4V  avc1", string(data[8:12])):
		return "video/mp4", "mp4", "video", nil
	case bytes.HasPrefix(data, []byte{0x1a, 0x45, 0xdf, 0xa3}) && bytes.Contains(data[:min(4096, len(data))], []byte("webm")):
		return "video/webm", "webm", "video", nil
	}
	return "", "", "", ErrInvalid
}
func NormalizeFilename(s, ext string) string {
	s = filepath.Base(strings.ReplaceAll(s, "\\", "/"))
	s = strings.TrimSuffix(s, filepath.Ext(s))
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' || r == ' ' {
			b.WriteRune(r)
		}
		if b.Len() > 100 {
			break
		}
	}
	s = strings.TrimSpace(b.String())
	if s == "" {
		s = "image"
	}
	return s + "." + ext
}
func Hash(b []byte) string { s := sha256.Sum256(b); return hex.EncodeToString(s[:]) }

type probeStream struct {
	Type   string `json:"codec_type"`
	Codec  string `json:"codec_name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Pix    string `json:"pix_fmt"`
	Frames string `json:"nb_frames"`
}
type probeResult struct {
	Streams []probeStream `json:"streams"`
	Format  struct {
		Duration string `json:"duration"`
	} `json:"format"`
}

type limitedOutput struct{ bytes.Buffer }

func (b *limitedOutput) Write(p []byte) (int, error) {
	if b.Len()+len(p) > 1<<20 {
		return 0, io.ErrShortBuffer
	}
	return b.Buffer.Write(p)
}

func run(ctx context.Context, bin string, args ...string) ([]byte, error) {
	if bin == "" {
		return nil, ErrUnavailable
	}
	cmd := exec.CommandContext(ctx, bin, args...)
	// Decoders have no need for database, JWT or Storage credentials.
	cmd.Env = []string{"PATH=" + os.Getenv("PATH"), "LANG=C", "OMP_NUM_THREADS=1"}
	var out limitedOutput
	cmd.Stdout = &out
	// Never include decoder diagnostics or filenames in API/log errors.
	if e := cmd.Run(); e != nil {
		return nil, ErrInvalid
	}
	if out.Len() > 1<<20 {
		return nil, ErrInvalid
	}
	return out.Bytes(), nil
}
func (t Tools) probe(ctx context.Context, path string) (probeResult, error) {
	var p probeResult
	b, e := run(ctx, t.FFprobe, "-v", "error", "-max_alloc", "67108864", "-protocol_whitelist", "file", "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt,nb_frames:format=duration", "-of", "json", path)
	if e != nil || json.Unmarshal(b, &p) != nil || len(p.Streams) == 0 || len(p.Streams) > 2 {
		return p, ErrInvalid
	}
	return p, nil
}
func (t Tools) Process(ctx context.Context, name string, b []byte) (Processed, error) {
	var result Processed
	mime, ext, kind, e := Detect(b)
	supplied := strings.ToLower(strings.TrimPrefix(filepath.Ext(name), "."))
	if supplied == "jpeg" {
		supplied = "jpg"
	}
	if supplied != ext {
		return result, ErrInvalid
	}
	if e != nil {
		return result, e
	}
	limit := ImageLimit
	if kind == "video" {
		limit = VideoLimit
	}
	if int64(len(b)) > limit {
		return result, ErrInvalid
	}
	if mime == "image/jpeg" || mime == "image/png" {
		cfg, _, e := image.DecodeConfig(bytes.NewReader(b))
		if e != nil || cfg.Width < 1 || cfg.Height < 1 || int64(cfg.Width)*int64(cfg.Height) > 32_000_000 {
			return result, ErrInvalid
		}
	}
	ctx, cancel := context.WithTimeout(ctx, 75*time.Second)
	defer cancel()
	dir, e := os.MkdirTemp("", "ag-media-")
	if e != nil {
		return result, ErrUnavailable
	}
	defer os.RemoveAll(dir)
	src := filepath.Join(dir, "original."+ext)
	if os.WriteFile(src, b, 0600) != nil {
		return result, ErrUnavailable
	}
	p, e := t.probe(ctx, src)
	if e != nil {
		return result, e
	}
	v := p.Streams[0]
	for _, s := range p.Streams {
		if s.Type == "video" {
			v = s
			break
		}
	}
	if v.Type != "video" || v.Width < 1 || v.Height < 1 || v.Width > 12000 || v.Height > 12000 || int64(v.Width)*int64(v.Height) > 32_000_000 {
		return result, ErrInvalid
	}
	duration, _ := strconv.ParseFloat(p.Format.Duration, 64)
	if kind == "video" {
		if duration <= 0 || duration > 90 || v.Width > 3840 || v.Height > 2160 {
			return result, ErrInvalid
		}
		for _, s := range p.Streams {
			if (s.Type == "video" && ((ext == "mp4" && s.Codec != "h264") || (ext == "webm" && s.Codec != "vp8" && s.Codec != "vp9"))) || (s.Type == "audio" && ((ext == "mp4" && s.Codec != "aac") || (ext == "webm" && s.Codec != "opus" && s.Codec != "vorbis"))) || (s.Type != "video" && s.Type != "audio") {
				return result, ErrInvalid
			}
		}
	} else if len(p.Streams) != 1 || (v.Frames != "" && v.Frames != "N/A" && v.Frames != "1") {
		return result, ErrInvalid
	}
	result = Processed{Hash: Hash(b), Metadata: Metadata{Filename: NormalizeFilename(name, ext), Kind: kind, MIME: mime, Bytes: int64(len(b)), Width: v.Width, Height: v.Height, Duration: duration}}
	add := func(name, mime string, data []byte, w, h int) {
		f := File{Variant: Variant{name, mime, int64(len(data)), w, h, Hash(data)}, Data: data}
		result.Files = append(result.Files, f)
		result.Metadata.Variants = append(result.Metadata.Variants, f.Variant)
	}
	add("original."+ext, mime, b, v.Width, v.Height) // Private archival original; never served publicly.
	for _, size := range []struct {
		name  string
		width int
	}{{"display", 1920}, {"medium", 960}, {"thumb", 320}} {
		// Decode and normalize orientation on the server; fit without cropping or upscaling.
		png := filepath.Join(dir, size.name+".png")
		filter := "scale=w='min(" + strconv.Itoa(size.width) + ",iw)':h='min(" + strconv.Itoa(size.width) + ",ih)':force_original_aspect_ratio=decrease"
		_, e = run(ctx, t.FFmpeg, "-nostdin", "-v", "error", "-max_alloc", "67108864", "-threads", "1", "-protocol_whitelist", "file", "-i", src, "-map", "0:v:0", "-frames:v", "1", "-vf", filter, "-map_metadata", "-1", "-threads", "1", png)
		if e != nil {
			return Processed{}, e
		}
		target := filepath.Join(dir, size.name+".webp")
		_, e = run(ctx, t.CWebP, "-quiet", "-q", "82", "-metadata", "none", png, "-o", target)
		if e != nil {
			return Processed{}, e
		}
		raw, e := os.ReadFile(target)
		if e != nil {
			return Processed{}, ErrUnavailable
		}
		pngFile, e := os.Open(png)
		if e != nil {
			return Processed{}, ErrUnavailable
		}
		cfg, _, e := image.DecodeConfig(pngFile)
		pngFile.Close()
		if e != nil {
			return Processed{}, ErrInvalid
		}
		add(size.name+".webp", "image/webp", raw, cfg.Width, cfg.Height)
	}
	if kind == "video" {
		// Validate the entire stream and remux only approved codecs; this is not transcoding.
		if _, e = run(ctx, t.FFmpeg, "-nostdin", "-v", "error", "-xerror", "-max_alloc", "67108864", "-threads", "1", "-protocol_whitelist", "file", "-i", src, "-map", "0:v:0", "-map", "0:a?", "-f", "null", "-"); e != nil {
			return Processed{}, e
		}
		target := filepath.Join(dir, "video."+ext)
		args := []string{"-nostdin", "-v", "error", "-protocol_whitelist", "file", "-i", src, "-map", "0:v:0", "-map", "0:a?", "-c", "copy", "-map_metadata", "-1"}
		if ext == "mp4" {
			args = append(args, "-movflags", "+faststart")
		}
		args = append(args, target)
		if _, e = run(ctx, t.FFmpeg, args...); e != nil {
			return Processed{}, e
		}
		raw, e := os.ReadFile(target)
		if e != nil || int64(len(raw)) > VideoLimit {
			return Processed{}, ErrInvalid
		}
		add("video."+ext, mime, raw, v.Width, v.Height)
	}
	return result, nil
}

var altForbidden = regexp.MustCompile(`[\x00-\x1f<>]`)

func ValidAlt(alt map[string]string) bool {
	if len(alt) != 3 {
		return false
	}
	for _, l := range []string{"lv", "ru", "en"} {
		s := strings.TrimSpace(alt[l])
		if s == "" || len([]rune(s)) > 300 || altForbidden.MatchString(s) {
			return false
		}
	}
	return true
}
