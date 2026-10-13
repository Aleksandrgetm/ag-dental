package main

import (
	"context"
	"github.com/jackc/pgx/v5"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestBookingHorizonActivation(t *testing.T) {
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
	if _, e = control.Exec(ctx, "CREATE DATABASE ag_horizon_activation_test"); e != nil {
		t.Fatal(e)
	}
	defer func() {
		if _, e := control.Exec(ctx, "DROP DATABASE ag_horizon_activation_test"); e != nil {
			t.Error(e)
		}
	}()
	cfg.Database = "ag_horizon_activation_test"
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
	url := strings.Replace(dsn, "/ag_migration_test", "/ag_horizon_activation_test", 1)
	if e := runWithOperations(ctx, url, "../../migrations", false, false, false, false, true); e != nil {
		t.Fatal(e)
	}
	activate := func(dir string) error {
		return runWithOperations(ctx, url, dir, false, false, false, false, false, true)
	}
	absent := func() {
		t.Helper()
		var ok bool
		if e := db.QueryRow(ctx, `SELECT NOT EXISTS(SELECT FROM schema_migrations WHERE version='008_calendar_month_horizon') AND NOT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='booking_settings' AND column_name='booking_horizon_months')`).Scan(&ok); e != nil || !ok {
			t.Fatal("partial migration", e)
		}
	}
	if e := run(ctx, url, "../../migrations", false, false, false); e != nil {
		t.Fatal(e)
	}
	absent()
	temp := t.TempDir()
	os.Mkdir(filepath.Join(temp, "proposed"), 0700)
	os.WriteFile(filepath.Join(temp, "proposed", horizonVersion+".sql"), []byte("SELECT 1"), 0600)
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
	exec("ALTER TABLE booking_settings ADD COLUMN booking_horizon_months integer")
	if activate("../../migrations") == nil {
		t.Fatal("object conflict accepted")
	}
	exec("ALTER TABLE booking_settings DROP COLUMN booking_horizon_months")
	absent()
	// Force failure AFTER DDL, at ledger insert; every schema change must roll back.
	exec(`CREATE FUNCTION public.reject_008_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.version='008_calendar_month_horizon' THEN RAISE EXCEPTION 'synthetic rejection'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_008 BEFORE INSERT ON schema_migrations FOR EACH ROW EXECUTE FUNCTION reject_008_test()`)
	if activate("../../migrations") == nil {
		t.Fatal("injected failure accepted")
	}
	absent()
	exec("DROP TRIGGER reject_008 ON schema_migrations; DROP FUNCTION reject_008_test()")
	// Preserve existing settings and a synthetic CMS document.
	exec(`INSERT INTO cms_documents(key,version,source_hash) VALUES ('created.news.11111111-1111-4111-8111-111111111111',1,repeat('a',64))`)
	raw, e = os.ReadFile("../../testdata/acceptance.sql")
	if e != nil {
		t.Fatal(e)
	}
	exec(string(raw))
	fingerprint := func() map[string]string {
		t.Helper()
		rows, err := db.Query(ctx, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migrations' ORDER BY tablename")
		if err != nil {
			t.Fatal(err)
		}
		names := []string{}
		for rows.Next() {
			var name string
			if err = rows.Scan(&name); err != nil {
				t.Fatal(err)
			}
			names = append(names, name)
		}
		if err = rows.Err(); err != nil {
			t.Fatal(err)
		}
		rows.Close()
		out := map[string]string{}
		for _, name := range names {
			var digest string
			q := `SELECT md5(COALESCE(string_agg((to_jsonb(t)-'booking_horizon_months')::text,'' ORDER BY (to_jsonb(t)-'booking_horizon_months')::text),'')) FROM ` + pgx.Identifier{"public", name}.Sanitize() + ` t`
			if err = db.QueryRow(ctx, q).Scan(&digest); err != nil {
				t.Fatal(err)
			}
			out[name] = digest
		}
		return out
	}
	before := fingerprint()
	if e := activate("../../migrations"); e != nil {
		t.Fatal(e)
	}
	if !reflect.DeepEqual(before, fingerprint()) {
		t.Fatal("existing public data changed")
	}
	var stamp, repeat string
	db.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='008_calendar_month_horizon'").Scan(&stamp)
	if e := activate("../../migrations"); e != nil {
		t.Fatal(e)
	}
	db.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='008_calendar_month_horizon'").Scan(&repeat)
	if stamp != repeat {
		t.Fatal("repeat changed ledger")
	}
	exec("ALTER TABLE booking_settings DISABLE ROW LEVEL SECURITY")
	if activate("../../migrations") == nil {
		t.Fatal("insecure repeat accepted")
	}
	exec("ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY")
}
