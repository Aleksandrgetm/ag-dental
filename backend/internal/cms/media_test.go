package cms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"image"
	"image/color"
	"image/jpeg"
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
	"time"
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
	for _, endpoint := range []struct{ method, path string }{{"PATCH", "/api/admin/cms/media/upload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/metadata"}, {"GET", "/api/admin/cms/media"}, {"POST", "/api/admin/cms/media"}, {"POST", "/api/admin/cms/media/media.1a179d8d90f66b15/archive"}, {"DELETE", "/api/admin/cms/media/anything"}, {"GET", "/api/admin/cms/media/anything/display.webp"}} {
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
	uploadAlt := `{"lv":"Testa attēls","ru":"Тестовое изображение","en":"Test image"}`
	uploadName := "test.png"
	upload := func(data []byte, key string) *httptest.ResponseRecorder {
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		file, _ := form.CreateFormFile("file", uploadName)
		file.Write(data)
		if uploadAlt != "" {
			form.WriteField("alt", uploadAlt)
		}
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
	uploadAlt = "" // A retry without descriptions must retain existing metadata.
	if w = upload(testPNG(45), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); w.Code != 200 || w.Header().Get("Idempotency-Replayed") != "true" {
		t.Fatal("idempotency")
	}
	var replay struct {
		Asset MediaRow `json:"asset"`
	}
	json.Unmarshal(w.Body.Bytes(), &replay)
	if !bytes.Equal(replay.Asset.Metadata, asset.Metadata) {
		t.Fatal("retry erased existing metadata")
	}
	uploadAlt = `{"lv":"Testa attēls","ru":"Тестовое изображение","en":"Test image"}`

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
	// Real image processing + HTTP uploads with no metadata, then secure edits.
	uploadAlt = ""
	for i, ext := range []string{"png", "jpg", "jpeg", "webp", "avif"} {
		data := testPNG(uint8(80 + i))
		if ext == "jpg" || ext == "jpeg" {
			img, _ := png.Decode(bytes.NewReader(data))
			var out bytes.Buffer
			jpeg.Encode(&out, img, nil)
			data = out.Bytes()
		}
		if ext == "webp" {
			input := t.TempDir() + "/source.png"
			os.WriteFile(input, data, 0600)
			converted, err := exec.Command(cw, "-quiet", input, "-o", "-").Output()
			if err != nil {
				t.Fatal(err)
			}
			data = converted
		}
		if ext == "avif" {
			var err error
			data, err = os.ReadFile("../media/testdata/still.avif")
			if err != nil {
				t.Fatal(err)
			}
		}
		uploadName = "optional." + ext
		response := upload(data, fmt.Sprintf("eeeeeeee-eeee-4eee-8eee-%012d", i))
		if response.Code != 200 {
			t.Fatalf("metadata-free %s: %d %s", ext, response.Code, response.Body.String())
		}
		var optional struct {
			Asset MediaRow `json:"asset"`
		}
		json.Unmarshal(response.Body.Bytes(), &optional)
		before := optional.Asset
		if before.PublishedAt != nil {
			t.Fatal("upload published automatically")
		}
		if request("GET", "/api/cms/media/"+before.ID+"/display.webp", false).Code != 404 {
			t.Fatal("private upload exposed")
		}
		patch := func(alt map[string]string, version time.Time) *httptest.ResponseRecorder {
			body, _ := json.Marshal(map[string]any{"alt": alt, "expected_updated_at": version})
			req := httptest.NewRequest("PATCH", "/api/admin/cms/media/"+before.ID+"/metadata", bytes.NewReader(body))
			req.Header.Set("Authorization", "Bearer verified")
			req.Header.Set("Content-Type", "application/json")
			out := httptest.NewRecorder()
			r.ServeHTTP(out, req)
			return out
		}

		// A draft may refer to an incomplete upload, but publication must reject it.
		doc, _, _ := s.Detail(ctx, "service.konsultacija")
		pending, err := s.Change(ctx, doc.Key, actor, "draft_saved", "", doc.Version, changed(t, doc.Key, []string{"image"}, before.URL))
		if err != nil {
			t.Fatal("optional-media draft", err)
		}
		if _, err = s.Change(ctx, doc.Key, actor, "published", *pending.DraftRevision, pending.Version, nil); err == nil {
			t.Fatal("informative image without alt published")
		}
		descriptions := map[string]string{"lv": "Sintētisks attēls", "ru": "Синтетическое изображение", "en": "Synthetic image"}
		edited := patch(descriptions, before.UpdatedAt)
		if edited.Code != 200 {
			t.Fatalf("metadata edit: %d %s", edited.Code, edited.Body.String())
		}
		if patch(descriptions, before.UpdatedAt).Code != 409 {
			t.Fatal("stale metadata overwrite allowed")
		}
		after, _ := s.Media(ctx, before.ID)
		var oldMD, newMD map[string]any
		json.Unmarshal(before.Metadata, &oldMD)
		json.Unmarshal(after.Metadata, &newMD)
		oldMD["alt"], oldMD["decorative"] = newMD["alt"], newMD["decorative"]
		oldJSON, _ := json.Marshal(oldMD)
		newJSON, _ := json.Marshal(newMD)
		if !bytes.Equal(oldJSON, newJSON) || after.PublishedAt != nil {
			t.Fatal("metadata edit changed other fields/publication")
		}
		if _, err = s.Change(ctx, doc.Key, actor, "published", *pending.DraftRevision, pending.Version, nil); err != nil {
			t.Fatal("described image publication", err)
		}
		current, _ := s.Media(ctx, before.ID)
		if _, err = s.UpdateMediaMetadata(ctx, before.ID, actor, current.UpdatedAt, nil, false); !errors.Is(err, ErrMediaMetadata) {
			t.Fatal("published alt erased", err)
		}
		decorated, err := s.UpdateMediaMetadata(ctx, before.ID, actor, current.UpdatedAt, descriptions, true)
		if err != nil {
			t.Fatal("decorative metadata", err)
		}
		var decor media.Metadata
		json.Unmarshal(decorated.Metadata, &decor)
		if !decor.Decorative || decor.Alt["en"] != "Synthetic image" {
			t.Fatal("decorative edit erased descriptions")
		}
		emptyDecor, err := s.UpdateMediaMetadata(ctx, before.ID, actor, decorated.UpdatedAt, nil, true)
		if err != nil {
			t.Fatal("empty decorative alt rejected", err)
		}
		publishedRows, _ := s.Published(ctx)
		publicMetadata, err := s.PublishedMedia(ctx, publishedRows)
		found := false
		for _, item := range publicMetadata {
			if item.ID == emptyDecor.ID {
				found = item.Decorative && len(item.Alt) == 0
			}
		}
		if err != nil || !found {
			t.Fatal("decorative public metadata lost", err)
		}

	}

	var optionalJPEG bytes.Buffer
	jpeg.Encode(&optionalJPEG, image.NewRGBA(image.Rect(0, 0, 54, 38)), nil)
	uploadName = "optional-metadata.jpeg"
	uploadAlt = `{"lv":"Sintētisks attēls"}`
	metadataUpload := upload(optionalJPEG.Bytes(), "ffffffff-ffff-4fff-8fff-ffffffffffff")
	if metadataUpload.Code != 200 {
		t.Fatal("JPEG with optional partial metadata", metadataUpload.Code)
	}
	var metadataResult struct {
		Asset MediaRow `json:"asset"`
	}
	json.Unmarshal(metadataUpload.Body.Bytes(), &metadataResult)
	var metadataJPEG media.Metadata
	json.Unmarshal(metadataResult.Asset.Metadata, &metadataJPEG)
	if metadataJPEG.Alt["lv"] != "Sintētisks attēls" || len(metadataJPEG.Alt) != 1 {
		t.Fatal("optional JPEG metadata changed")
	}
	uploadName = "test.png"
	uploadAlt = `{"lv":"Testa attēls","ru":"Тестовое изображение","en":"Test image"}`

	storage.failAfter = len(storage.objects) + 2
	w = upload(testPNG(47), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
	if w.Code != 503 || !strings.Contains(w.Body.String(), "storage_failed") {
		t.Fatal("storage failure classification", w.Code, w.Body.String())
	}
	if len(storage.objects) != storage.failAfter {
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

func TestMediaStageErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		err    error
		status int
		code   string
	}{
		{errors.New("sensitive SQL details"), 503, "media_record_failed"},
		{ErrProtected, 403, "media_protected"}, {ErrConflict, 409, "media_conflict"},
	} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		mediaRecordFailure(c, tc.err)
		if w.Code != tc.status || !strings.Contains(w.Body.String(), tc.code) || strings.Contains(w.Body.String(), "sensitive") {
			t.Fatal("unsafe stage response", w.Code, w.Body.String())
		}
	}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	failure(c, &FieldError{Field: "image", Code: "image_association_failed"})
	if w.Code != 422 || w.Body.String() != `{"error":"image_association_failed","field":"image"}` {
		t.Fatal("association response", w.Body.String())
	}
}
func TestNewsImageContext(t *testing.T) {
	imported := map[string]any{}
	for _, lang := range []string{"lv", "ru", "en"} {
		imported[lang] = map[string]any{"title": "Existing title " + lang}
	}
	if !newsImageContextAvailable(Definition{Target: "articles"}, imported) {
		t.Fatal("existing localized titles rejected")
	}
	if newsImageContextAvailable(Definition{Target: "other"}, imported) {
		t.Fatal("unrelated content bypass")
	}
	delete(imported, "ru")
	if newsImageContextAvailable(Definition{Target: "articles"}, imported) {
		t.Fatal("missing language accepted")
	}
	created := map[string]any{"title": map[string]any{"lv": "Title lv", "ru": "Title ru", "en": "Title en"}}
	if !newsImageContextAvailable(Definition{Target: "created", Group: "news"}, created) {
		t.Fatal("created news fallback")
	}
	if newsImageContextAvailable(Definition{Target: "created", Group: "pages"}, created) {
		t.Fatal("non-news fallback")
	}
}
