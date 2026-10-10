package cms

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Never reads DATABASE_URL or .env. Refuses every non-local/non-disposable target.
func TestCMSPostgres(t *testing.T) {
	dsn := os.Getenv("CMS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires CMS_TEST_DATABASE_URL and CMS_TEST_DATABASE_CONFIRM=disposable")
	}
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil || os.Getenv("CMS_TEST_DATABASE_CONFIRM") != "disposable" || !strings.HasSuffix(cfg.Database, "_test") || (cfg.Host != "localhost" && cfg.Host != "127.0.0.1") {
		t.Fatal("requires explicit disposable local *_test database")
	}
	db, e := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if e != nil {
		t.Fatal("local test connection failed")
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	s := Store{db}
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		if e := db.Exec(sql, args...).Error; e != nil {
			t.Fatal(e)
		}
	}
	var count int64
	db.Raw("SELECT count(*) FROM cms_documents").Scan(&count)
	if count != 0 {
		// Reruns are explicit destructive TEST operations, allowed only after the local
		// *_test + disposable guard above. Never reused by application/import code.
		exec("UPDATE cms_documents SET draft_revision=NULL,published_revision=NULL")
		exec("DELETE FROM cms_booking_service_links; DELETE FROM cms_events; DELETE FROM cms_revisions; DELETE FROM cms_documents; DELETE FROM cms_media")
		exec("DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111'")
	}
	n, e := s.Import(ctx, false)
	if e != nil || n != len(Baseline.Documents) {
		t.Fatalf("dry run %d %v", n, e)
	}
	db.Raw("SELECT count(*) FROM cms_documents").Scan(&count)
	if count != 0 {
		t.Fatal("dry run wrote data")
	}
	n, e = s.Import(ctx, true)
	if e != nil || n != len(Baseline.Documents) {
		t.Fatalf("import %d %v", n, e)
	}
	if n, e = s.Import(ctx, true); e != nil || n != 0 {
		t.Fatalf("repeat import %d %v", n, e)
	}
	links, e := s.BookingLinks(ctx, "service.konsultacija")
	if e != nil || string(links) != "[]" {
		t.Fatal("unmapped booking context must stay empty", e)
	}
	published, e := s.Published(ctx)
	visibleCount := 0
	for _, definition := range Baseline.Documents {
		if AdminVisible(definition.Key) {
			visibleCount++
		}
	}
	if e != nil || len(published) != visibleCount {
		t.Fatal("publication missing")
	}
	for _, row := range published {
		original, _ := decode(definitions[row.Key].Data)
		value, _ := decode(row.Payload)
		if !same(original, value) {
			t.Fatal("source mismatch", row.Key)
		}
	}
	const actor = "11111111-1111-4111-8111-111111111111"
	exec("INSERT INTO auth.users(id) VALUES (?::uuid)", actor)
	d, _, e := s.Detail(ctx, "clinic.about")
	if e != nil {
		t.Fatal(e)
	}
	baseline := *d.PublishedRevision
	payload := changed(t, d.Key, []string{"en"}, "Synthetic local CMS test draft")
	edited, e := s.Change(ctx, d.Key, actor, "draft_saved", "", d.Version, payload)
	if e != nil {
		t.Fatal(e)
	}
	published, _ = s.Published(ctx)
	for _, row := range published {
		if row.Key == d.Key && strings.Contains(string(row.Payload), "Synthetic local") {
			t.Fatal("draft leaked")
		}
	}
	if _, e = s.Change(ctx, d.Key, actor, "draft_saved", "", d.Version, payload); !errors.Is(e, ErrConflict) {
		t.Fatal("lost-update protection missing")
	}
	live, e := s.Change(ctx, d.Key, actor, "published", *edited.DraftRevision, edited.Version, nil)
	if e != nil {
		t.Fatal(e)
	}
	published, _ = s.Published(ctx)
	found := false
	for _, row := range published {
		if row.Key == d.Key && strings.Contains(string(row.Payload), "Synthetic local") {
			found = true
		}
	}
	if !found {
		t.Fatal("publish missing")
	}
	restored, e := s.Change(ctx, d.Key, actor, "rolled_back", baseline, live.Version, nil)
	if e != nil || *restored.PublishedRevision != baseline {
		t.Fatal("rollback failed", e)
	}
	// Concurrent saves with the same version: exactly one succeeds.
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := s.Change(ctx, d.Key, actor, "draft_saved", "", restored.Version, payload)
			results <- e
		}()
	}
	wg.Wait()
	close(results)
	wins, conflicts := 0, 0
	for e := range results {
		if e == nil {
			wins++
		} else if errors.Is(e, ErrConflict) {
			conflicts++
		} else {
			t.Fatal(e)
		}
	}
	if wins != 1 || conflicts != 1 {
		t.Fatal("concurrent saves", wins, conflicts)
	}
	// Re-import must not overwrite staff edits or their history.
	before, history, e := s.Detail(ctx, d.Key)
	if e != nil || len(history) < 3 {
		t.Fatal("history missing")
	}
	if n, e = s.Import(ctx, true); e != nil || n != 0 {
		t.Fatal("idempotency", e)
	}
	after, _, _ := s.Detail(ctx, d.Key)
	if after.Version != before.Version || *after.DraftRevision != *before.DraftRevision {
		t.Fatal("import overwrote edits")
	}
	for i := 0; i < 32; i++ {
		after, e = s.Change(ctx, d.Key, actor, "draft_saved", "", after.Version, payload)
		if e != nil {
			t.Fatal(e)
		}
	}
	_, history, e = s.Detail(ctx, d.Key)
	if e != nil {
		t.Fatal(e)
	}
	found = false
	for _, r := range history {
		if r.ID == baseline {
			found = true
		}
	}
	if !found {
		t.Fatal("active publication omitted from long history")
	}
	other, _, _ := s.Detail(ctx, "clinic.philosophy")
	if _, e = s.Change(ctx, d.Key, actor, "rolled_back", *other.PublishedRevision, after.Version, nil); !errors.Is(e, ErrInvalid) {
		t.Fatal("cross-document revision accepted")
	}
	exec("UPDATE cms_documents SET source_hash=repeat('0',64) WHERE key=?", d.Key)
	if _, e = s.Import(ctx, true); !errors.Is(e, ErrConflict) {
		t.Fatal("import conflict not detected")
	}
	exec("UPDATE cms_documents SET source_hash=? WHERE key=?", definitions[d.Key].SourceHash, d.Key)
	for _, table := range []string{"cms_documents", "cms_revisions", "cms_events", "cms_media", "cms_booking_service_links"} {
		var secure bool
		e = db.Raw(`SELECT c.relrowsecurity AND NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AND NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=?`, table).Scan(&secure).Error
		if e != nil || !secure {
			t.Fatal("RLS/grants", table, e)
		}
	}
	// Operational fields are read through a verified explicit mapping, never copied
	// into editable public content. Synthetic transaction is always rolled back.
	sentinel := errors.New("rollback synthetic mapping test")
	e = db.Transaction(func(tx *gorm.DB) error {
		if e := tx.Exec(`INSERT INTO services(id,slug,name_lv,name_ru,name_en,provenance) VALUES ('10000000-0000-4000-8000-000000000088','cms-mapping-test','Tests','Тест','Test','development_fixture')`).Error; e != nil {
			return e
		}
		if e := tx.Exec(`INSERT INTO cms_booking_service_links(document_key,service_id) VALUES ('service.konsultacija','10000000-0000-4000-8000-000000000088')`).Error; e != nil {
			return e
		}
		raw, e := (&Store{tx}).BookingLinks(ctx, "service.konsultacija")
		if e != nil {
			return e
		}
		var rows []map[string]any
		if e := json.Unmarshal(raw, &rows); e != nil {
			return e
		}
		if len(rows) != 1 || rows[0]["enabled"] != false || rows[0]["duration_minutes"] != nil {
			t.Error("unverified mapping invented booking readiness")
		}
		return sentinel
	})
	if !errors.Is(e, sentinel) {
		t.Fatal(e)
	}
	// Public HTTP responses contain publications only and support conditional revalidation.
	gin.SetMode(gin.TestMode)
	router := gin.New()
	Register(router, &s, verifier{}, roles{"admin", nil})
	request := httptest.NewRequest("GET", "/api/cms/published", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != 200 || response.Header().Get("ETag") == "" || strings.Contains(response.Body.String(), "actor_id") || strings.Contains(response.Body.String(), "Synthetic local CMS test draft") {
		t.Fatal("unsafe public CMS response")
	}
	request = httptest.NewRequest("GET", "/api/cms/published", nil)
	request.Header.Set("If-None-Match", response.Header().Get("ETag"))
	cached := httptest.NewRecorder()
	router.ServeHTTP(cached, request)
	if cached.Code != 304 || cached.Body.Len() != 0 {
		t.Fatal("ETag handling")
	}
	request = httptest.NewRequest("PUT", "/api/admin/cms/documents/clinic.about/draft", strings.NewReader(`{"expected_version":1,"role":"admin"}`))
	request.Header.Set("Authorization", "Bearer verified")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != 422 {
		t.Fatal("arbitrary write fields accepted")
	}
	// SQL rollback refuses imported content rather than deleting it.
	conn, e := pgx.ConnectConfig(ctx, cfg)
	if e != nil {
		t.Fatal("test connection failed")
	}
	defer conn.Close(ctx)
	down, e := os.ReadFile("../../migrations/004_website_cms.down.sql")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = conn.Exec(ctx, string(down)); e == nil {
		t.Fatal("destructive rollback accepted populated CMS")
	}
	conn.Exec(ctx, "ROLLBACK")
	var metadata json.RawMessage
	if e := db.Raw("SELECT metadata FROM cms_media LIMIT 1").Row().Scan(&metadata); e != nil {
		t.Fatal(e)
	}
	if !strings.Contains(string(metadata), "usages") {
		t.Fatal("media provenance missing")
	}
	db.Raw("SELECT (SELECT count(*) FROM appointments)+(SELECT count(*) FROM services)+(SELECT count(*) FROM doctors)+(SELECT count(*) FROM cms_booking_service_links)").Scan(&count)
	if count != 0 {
		t.Fatal("CMS changed booking records")
	}
}
