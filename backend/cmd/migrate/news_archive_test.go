package main

import (
	"context"
	"github.com/jackc/pgx/v5"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNewsArchiveActivation(t *testing.T) {
	dsn := os.Getenv("MIGRATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("disposable database required")
	}
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil || cfg.Host != "127.0.0.1" || cfg.Database != "ag_migration_test" || os.Getenv("MIGRATION_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("isolated database required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	control, e := pgx.ConnectConfig(ctx, cfg)
	if e != nil {
		t.Fatal(e)
	}
	defer control.Close(ctx)
	if _, e = control.Exec(ctx, "CREATE DATABASE ag_archive_activation_test"); e != nil {
		t.Fatal(e)
	}
	defer func() {
		if _, e := control.Exec(ctx, "DROP DATABASE ag_archive_activation_test"); e != nil {
			t.Error(e)
		}
	}()
	cfg.Database = "ag_archive_activation_test"
	db, e := pgx.ConnectConfig(ctx, cfg)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close(ctx)
	exec := func(q string) {
		t.Helper()
		if _, e := db.Exec(ctx, q); e != nil {
			t.Fatal(e)
		}
	}
	raw, e := os.ReadFile("../../testdata/bootstrap.sql")
	if e != nil {
		t.Fatal(e)
	}
	lines := []string{}
	for _, l := range strings.Split(string(raw), "\n") {
		if !strings.HasPrefix(l, "CREATE ROLE ") {
			lines = append(lines, l)
		}
	}
	exec(strings.Join(lines, "\n"))
	for _, v := range append(append([]string{}, versions...), "proposed/006_admin_operations") {
		if e := executeFile(ctx, db, "../../migrations/"+v+".sql", "Synthetic baseline"); e != nil {
			t.Fatal(e)
		}
	}
	url := strings.Replace(dsn, "/ag_migration_test", "/ag_archive_activation_test", 1)
	activate := func(dir string) error { return runWithOperations(ctx, url, dir, false, false, false, false, true) }
	absent := func() {
		t.Helper()
		var ok bool
		if e := db.QueryRow(ctx, `SELECT NOT EXISTS(SELECT FROM schema_migrations WHERE version='007_news_archive') AND NOT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='cms_documents' AND column_name='archived_at')`).Scan(&ok); e != nil || !ok {
			t.Fatal("partial migration", e)
		}
	}
	if e := run(ctx, url, "../../migrations", false, false, false); e != nil {
		t.Fatal(e)
	}
	absent()
	temp := t.TempDir()
	os.Mkdir(filepath.Join(temp, "proposed"), 0700)
	os.WriteFile(filepath.Join(temp, "proposed", archiveVersion+".sql"), []byte("SELECT 1"), 0600)
	if activate(temp) == nil {
		t.Fatal("checksum drift accepted")
	}
	absent()
	exec("INSERT INTO schema_migrations(version) VALUES ('999_unknown')")
	if activate("../../migrations") == nil {
		t.Fatal("unknown ledger accepted")
	}
	exec("DELETE FROM schema_migrations WHERE version='999_unknown'")
	exec("DELETE FROM schema_migrations WHERE version='005_cms_media'")
	if activate("../../migrations") == nil {
		t.Fatal("gap accepted")
	}
	exec("INSERT INTO schema_migrations(version) VALUES ('005_cms_media')")
	exec("CREATE INDEX cms_documents_archive ON cms_documents(key)")
	if activate("../../migrations") == nil {
		t.Fatal("object conflict accepted")
	}
	exec("DROP INDEX cms_documents_archive")
	absent()
	// Force failure AFTER DDL, at ledger insert; every schema change must roll back.
	exec(`CREATE FUNCTION public.reject_007_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.version='007_news_archive' THEN RAISE EXCEPTION 'synthetic rejection'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_007 BEFORE INSERT ON schema_migrations FOR EACH ROW EXECUTE FUNCTION reject_007_test()`)
	if activate("../../migrations") == nil {
		t.Fatal("injected failure accepted")
	}
	absent()
	exec("DROP TRIGGER reject_007 ON schema_migrations; DROP FUNCTION reject_007_test()")
	// A retained synthetic document proves no data rewrite beyond the NULL column.
	exec(`INSERT INTO cms_documents(key,version,source_hash) VALUES ('created.news.11111111-1111-4111-8111-111111111111',1,repeat('a',64))`)
	var before, after string
	digest := `SELECT md5(COALESCE(string_agg((to_jsonb(t)-'archived_at')::text,'' ORDER BY key),'')) FROM cms_documents t`
	if e := db.QueryRow(ctx, digest).Scan(&before); e != nil {
		t.Fatal(e)
	}
	if e := activate("../../migrations"); e != nil {
		t.Fatal(e)
	}
	if e := db.QueryRow(ctx, digest).Scan(&after); e != nil || before != after {
		t.Fatal("data changed", e)
	}
	var stamp, repeat string
	db.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='007_news_archive'").Scan(&stamp)
	if e := activate("../../migrations"); e != nil {
		t.Fatal(e)
	}
	db.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='007_news_archive'").Scan(&repeat)
	if stamp != repeat {
		t.Fatal("repeat changed ledger")
	}
	exec("ALTER TABLE cms_documents DISABLE ROW LEVEL SECURITY")
	if activate("../../migrations") == nil {
		t.Fatal("insecure repeat accepted")
	}
	exec("ALTER TABLE cms_documents ENABLE ROW LEVEL SECURITY")
}
