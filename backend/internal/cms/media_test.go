package cms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"sync"
	"testing"
)

type memoryStorage struct {
	mu        sync.Mutex
	objects   map[string][]byte
	fail      bool
	deleted   int
	failAfter int
}

func (m *memoryStorage) Check(context.Context) error { return nil }
func (m *memoryStorage) Put(_ context.Context, key, mime string, b []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail || (m.failAfter > 0 && len(m.objects) >= m.failAfter) {
		return media.ErrUnavailable
	}
	if old, ok := m.objects[key]; ok && !bytes.Equal(old, b) {
		return media.ErrInvalid
	}
	m.objects[key] = append([]byte{}, b...)
	return nil
}
func (m *memoryStorage) Get(_ context.Context, key, rng string) (*http.Response, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.objects[key]
	if !ok {
		return nil, media.ErrUnavailable
	}
	return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(bytes.NewReader(b))}, nil
}
func (m *memoryStorage) Delete(_ context.Context, keys []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail {
		return media.ErrUnavailable
	}
	for _, k := range keys {
		delete(m.objects, k)
		m.deleted++
	}
	return nil
}
func testPNG(seed uint8) []byte {
	img := image.NewRGBA(image.Rect(0, 0, 64, 48))
	for y := 0; y < 48; y++ {
		for x := 0; x < 64; x++ {
			img.Set(x, y, color.RGBA{seed, 120, 180, 255})
		}
	}
	var b bytes.Buffer
	png.Encode(&b, img)
	return b.Bytes()
}
func TestMediaAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, endpoint := range []struct{ method, path string }{{"GET", "/api/admin/cms/media"}, {"POST", "/api/admin/cms/media"}, {"POST", "/api/admin/cms/media/media.1a179d8d90f66b15/archive"}, {"DELETE", "/api/admin/cms/media/anything"}, {"GET", "/api/admin/cms/media/anything/display.webp"}} {
		for _, tc := range []struct {
			token, role string
			want        int
		}{{"", "admin", 401}, {"forged", "admin", 401}, {"verified", "user", 403}} {
			r := gin.New()
			RegisterMedia(r, &Store{}, verifier{}, roles{tc.role, nil}, MediaConfig{})
			req := httptest.NewRequest(endpoint.method, endpoint.path, nil)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatal(endpoint, w.Code)
			}
		}
	}
}
func TestMediaPostgres(t *testing.T) {
	dsn := os.Getenv("MEDIA_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires MEDIA_TEST_DATABASE_URL and MEDIA_TEST_DATABASE_CONFIRM=disposable")
	}
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil || os.Getenv("MEDIA_TEST_DATABASE_CONFIRM") != "disposable" || !strings.HasSuffix(cfg.Database, "_test") || (cfg.Host != "127.0.0.1" && cfg.Host != "localhost") {
		t.Fatal("disposable local *_test required")
	}
	db, e := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if e != nil {
		t.Fatal("test DB unavailable")
	}
	raw, _ := db.DB()
	defer raw.Close()
	ctx := context.Background()
	s := Store{db}
	var n int64
	db.Raw("SELECT count(*) FROM cms_documents").Scan(&n)
	if n != 0 {
		t.Fatal("fresh isolated media database required")
	}
	if _, e = s.Import(ctx, true); e != nil {
		t.Fatal(e)
	}
	const actor = "11111111-1111-4111-8111-111111111111"
	db.Exec(`INSERT INTO auth.users(id) VALUES (?::uuid)`, actor)
	db.Exec(`UPDATE user_roles SET role='admin' WHERE user_id=?::uuid`, actor)
	ff, _ := exec.LookPath("ffmpeg")
	fp, _ := exec.LookPath("ffprobe")
	cw, _ := exec.LookPath("cwebp")
	if ff == "" || fp == "" || cw == "" {
		t.Fatal("real processing binaries required")
	}
	processor := media.Tools{FFmpeg: ff, FFprobe: fp, CWebP: cw}
	storage := &memoryStorage{objects: map[string][]byte{}}
	r := gin.New()
	RegisterMedia(r, &s, verifier{}, roles{"admin", nil}, MediaConfig{storage, processor, true})
	Register(r, &s, verifier{}, roles{"admin", nil})
	upload := func(data []byte, key string) *httptest.ResponseRecorder {
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		file, _ := form.CreateFormFile("file", "test.png")
		file.Write(data)
		form.WriteField("alt", `{"lv":"Testa attēls","ru":"Тестовое изображение","en":"Test image"}`)
		form.Close()
		req := httptest.NewRequest("POST", "/api/admin/cms/media", &body)
		req.Header.Set("Content-Type", form.FormDataContentType())
		req.Header.Set("Authorization", "Bearer verified")
		req.Header.Set("Idempotency-Key", key)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	request := func(method, path string, admin bool) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, nil)
		if admin {
			req.Header.Set("Authorization", "Bearer verified")
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	w := upload(testPNG(45), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
	if w.Code != 200 {
		t.Fatal("upload", w.Code, w.Body.String())
	}
	var result struct {
		Asset MediaRow `json:"asset"`
	}
	json.Unmarshal(w.Body.Bytes(), &result)
	asset := result.Asset
	if asset.State != "ready" || len(storage.objects) != 4 {
		t.Fatal("metadata/storage mismatch")
	}
	if w = upload(testPNG(45), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); w.Code != 200 || w.Header().Get("Idempotency-Replayed") != "true" {
		t.Fatal("idempotency")
	}
	if w = upload(testPNG(46), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); w.Code != 409 {
		t.Fatal("key reused with different bytes", w.Code)
	}
	if w = request("GET", "/api/cms/media/"+asset.ID+"/display.webp", false); w.Code != 404 {
		t.Fatal("draft exposed")
	}
	if w = request("GET", "/api/admin/cms/media/"+asset.ID+"/display.webp", true); w.Code != 200 {
		t.Fatal("preview failed")
	}
	d, _, _ := s.Detail(ctx, "service.konsultacija")
	baseline := *d.PublishedRevision
	payload := changed(t, d.Key, []string{"image"}, asset.URL)
	draft, e := s.Change(ctx, d.Key, actor, "draft_saved", "", d.Version, payload)
	if e != nil {
		t.Fatal(e)
	}
	listed, e := s.MediaList(ctx)
	if e != nil {
		t.Fatal("media listing", e)
	}
	foundUsage := false
	for _, item := range listed {
		if item.ID == asset.ID {
			for _, u := range item.Usages {
				if u.Document == d.Key && u.Draft {
					foundUsage = true
				}
			}
		}
	}
	if !foundUsage {
		t.Fatal("draft usage missing from library")
	}
	if e = s.ArchiveMedia(ctx, asset.ID, actor); !errors.Is(e, ErrReferenced) {
		t.Fatal("draft reference deletion")
	}
	if w = request("GET", "/api/cms/media/"+asset.ID+"/display.webp", false); w.Code != 404 {
		t.Fatal("saved draft exposed")
	}
	live, e := s.Change(ctx, d.Key, actor, "published", *draft.DraftRevision, draft.Version, nil)
	if e != nil {
		t.Fatal(e)
	}
	if w = request("GET", "/api/cms/media/"+asset.ID+"/display.webp", false); w.Code != 200 || !strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Fatal("public delivery")
	}
	if w = request("GET", "/api/cms/media/"+asset.ID+"/original.png", false); w.Code != 404 {
		t.Fatal("original exposed")
	}
	rows, _ := s.Published(ctx)
	published, e := s.PublishedMedia(ctx, rows)
	if e != nil || len(published) != 1 || len(published[0].Variants) != 3 {
		t.Fatal("published media metadata")
	}
	if _, e = s.Change(ctx, d.Key, actor, "rolled_back", baseline, live.Version, nil); e != nil {
		t.Fatal(e)
	}
	if e = s.ArchiveMedia(ctx, asset.ID, actor); !errors.Is(e, ErrReferenced) {
		t.Fatal("history reference deletion")
	}
	if e = s.ArchiveMedia(ctx, "media.1a179d8d90f66b15", actor); !errors.Is(e, ErrProtected) {
		t.Fatal("Hero protection")
	}
	if w = request("GET", "/api/admin/cms/media/media.1a179d8d90f66b15/original.mp4", true); w.Code != 404 {
		t.Fatal("Hero preview")
	}
	if e = Validate("clinic.media", changed(t, "clinic.media", []string{"poster"}, asset.URL)); e == nil {
		t.Fatal("Hero mutation")
	}
	storage.failAfter = len(storage.objects) + 2
	w = upload(testPNG(47), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
	if w.Code != 503 {
		t.Fatal("fake upload success")
	}
	if len(storage.objects) != 6 {
		t.Fatal("partial upload fixture did not retain first two objects")
	}
	storage.failAfter = 0
	w = upload(testPNG(47), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
	if w.Code != 200 {
		t.Fatal("partial failure retry", w.Code)
	}
	json.Unmarshal(w.Body.Bytes(), &result)
	unused := result.Asset
	if w = upload(testPNG(47), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); w.Code != 409 {
		t.Fatal("another existing hash bypassed key conflict", w.Code)
	}
	if w = upload([]byte("<svg>invalid</svg>"), "dddddddd-dddd-4ddd-8ddd-dddddddddddd"); w.Code != 422 {
		t.Fatal("invalid file accepted", w.Code)
	}
	if e = s.ArchiveMedia(ctx, unused.ID, actor); e != nil {
		t.Fatal(e)
	}
	nowDoc, _, _ := s.Detail(ctx, d.Key)
	if _, e = s.Change(ctx, d.Key, actor, "draft_saved", "", nowDoc.Version, changed(t, d.Key, []string{"image"}, unused.URL)); !errors.Is(e, ErrInvalid) {
		t.Fatal("archived media accepted", e)
	}
	storage.fail = true
	if e = s.PurgeMedia(ctx, unused.ID, actor, storage); e == nil {
		t.Fatal("fake deletion")
	}
	storage.fail = false
	if e = s.PurgeMedia(ctx, unused.ID, actor, storage); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Media(ctx, unused.ID); !errors.Is(e, ErrMissing) {
		t.Fatal("deleted metadata still active")
	}
	db.Exec(`UPDATE user_roles SET role='user' WHERE user_id=?::uuid`, actor)
	if w = upload(testPNG(49), "cccccccc-cccc-4ccc-8ccc-cccccccccccc"); w.Code != 403 {
		t.Fatal("revoked role accepted by reserve", w.Code)
	}
	for _, table := range []string{"cms_media", "cms_media_references", "cms_media_events"} {
		var safe bool
		db.Raw(`SELECT c.relrowsecurity AND NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AND NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') FROM pg_class c WHERE c.oid=?::regclass`, table).Scan(&safe)
		if !safe {
			t.Fatal("RLS/grants", table)
		}
	}
	db.Raw(`SELECT (SELECT count(*) FROM services)+(SELECT count(*) FROM doctors)+(SELECT count(*) FROM appointments)`).Scan(&n)
	if n != 0 {
		t.Fatal("booking altered")
	}
}
