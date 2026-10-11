package main

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Rehearses explicit 006 activation; default migration execution stays on 001–005.
// Only synthetic records are written, in a separately created local database.
func TestProposedOperationsActivation(t *testing.T) {
	dsn := os.Getenv("MIGRATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires explicitly disposable migration database")
	}
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil || cfg.Host != "127.0.0.1" || cfg.Database != "ag_migration_test" || os.Getenv("MIGRATION_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("activation rehearsal requires disposable loopback ag_migration_test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	control, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatal("local connection failed")
	}
	defer control.Close(ctx)
	if _, err = control.Exec(ctx, "CREATE DATABASE ag_activation_test"); err != nil {
		t.Fatal("fresh rehearsal database required; existing data was not replaced")
	}
	defer func() {
		if _, e := control.Exec(ctx, "DROP DATABASE ag_activation_test"); e != nil {
			t.Error("could not clean up owned local rehearsal database")
		}
	}()
	cfg.Database = "ag_activation_test"
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	exec := func(sql string) {
		t.Helper()
		if _, e := conn.Exec(ctx, sql); e != nil {
			t.Fatal(e)
		}
	}
	bootstrap, err := os.ReadFile("../../testdata/bootstrap.sql")
	if err != nil {
		t.Fatal(err)
	}
	var lines []string
	for _, line := range strings.Split(string(bootstrap), "\n") {
		if !strings.HasPrefix(line, "CREATE ROLE ") {
			lines = append(lines, line)
		}
	}
	exec(strings.Join(lines, "\n"))
	for _, v := range versions {
		if err = executeFile(ctx, conn, "../../migrations/"+v+".sql", "Synthetic activation baseline "+v); err != nil {
			t.Fatal(err)
		}
	}
	pool := stdlib.OpenDB(*cfg)
	defer pool.Close()
	gdb, err := gorm.Open(postgres.New(postgres.Config{Conn: pool}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	activationDSN := strings.Replace(dsn, "/ag_migration_test", "/ag_activation_test", 1)
	if activationDSN == dsn {
		t.Fatal("expected test URL database path")
	}
	activate := func(dir string) error { return runWithOperations(ctx, activationDSN, dir, false, false, false, true) }
	if e := run(ctx, activationDSN, "../../migrations", false, false, false); e != nil {
		t.Fatal(e)
	}
	var onlyFive bool
	if e := conn.QueryRow(ctx, "SELECT count(*)=5 FROM schema_migrations").Scan(&onlyFive); e != nil || !onlyFive {
		t.Fatal("default command must not apply 006", e)
	}
	temp := t.TempDir()
	if e := os.Mkdir(filepath.Join(temp, "proposed"), 0700); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(filepath.Join(temp, "proposed", operationsVersion+".sql"), []byte("SELECT 1;"), 0600); e != nil {
		t.Fatal(e)
	}
	if e := activate(temp); e == nil || !strings.Contains(e.Error(), "checksum") {
		t.Fatal("changed SQL accepted", e)
	}
	exec("INSERT INTO schema_migrations(version) VALUES ('999_unknown')")
	if e := activate("../../migrations"); e == nil {
		t.Fatal("unknown history accepted")
	}
	exec("DELETE FROM schema_migrations WHERE version='999_unknown'; DELETE FROM schema_migrations WHERE version='005_cms_media'")
	if e := activate("../../migrations"); e == nil {
		t.Fatal("incomplete baseline accepted")
	}
	exec("INSERT INTO schema_migrations(version) VALUES ('005_cms_media')")
	content := cms.Store{DB: gdb}
	if _, err = content.Import(ctx, true); err != nil {
		t.Fatal(err)
	}
	store := booking.NewStore(gdb)
	if rows, e := store.List(ctx, booking.Filter{}); e != nil || len(rows) != 0 {
		t.Fatal("appointment list should work on 001–005", e)
	}
	if _, e := store.Operations(ctx, "services"); !errors.Is(e, booking.ErrNotConfigured) {
		t.Fatal("operations must fail closed before 006", e)
	}
	text := cms.LocalText{LV: "Synthetic LV", RU: "Synthetic RU", EN: "Synthetic EN"}
	payload, _ := json.Marshal(cms.CreatedContent{Slug: "synthetic-activation", Date: "2026-10-10", Title: text, Summary: text, Body: text, SEOTitle: text, SEODescription: text})
	if _, e := content.CreateContent(ctx, "created.news.11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111", payload); !errors.Is(e, cms.ErrUnavailable) {
		t.Fatal("content creation must require 006", e)
	}
	exec(`INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO services(id,slug,name_lv,name_ru,name_en,duration_minutes,provenance) VALUES ('22222222-2222-4222-8222-222222222222','synthetic-activation','LV','RU','EN',30,'development_fixture');
INSERT INTO doctors(id,name,provenance) VALUES ('33333333-3333-4333-8333-333333333333','Synthetic activation','development_fixture');
INSERT INTO doctor_services(doctor_id,service_id) SELECT d.id,s.id FROM doctors d CROSS JOIN services s;
INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) VALUES ('33333333-3333-4333-8333-333333333333',1,'09:00','12:00');
INSERT INTO doctor_time_off(doctor_id,starts_at,ends_at) VALUES ('33333333-3333-4333-8333-333333333333','2030-01-08 09:00Z','2030-01-08 10:00Z');
INSERT INTO appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint)
VALUES ('SYNTHETIC-ACTIVATION','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Synthetic','Test','+37120000000','test@example.invalid','2030-01-07 10:00Z','2030-01-07 10:30Z','pending','synthetic-v1',now(),gen_random_uuid(),repeat('a',64))`)
	// Snapshot every existing table; ignore only the three explicitly added columns.
	rows, err := conn.Query(ctx, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migrations' ORDER BY tablename")
	if err != nil {
		t.Fatal(err)
	}
	var tables []string
	for rows.Next() {
		var name string
		if err = rows.Scan(&name); err != nil {
			t.Fatal(err)
		}
		tables = append(tables, name)
	}
	if err = rows.Err(); err != nil {
		t.Fatal(err)
	}
	rows.Close()
	fingerprint := func() map[string]string {
		out := map[string]string{}
		for _, name := range append(append([]string{}, tables...), "auth.users") {
			ident := pgx.Identifier{name}.Sanitize()
			if name == "auth.users" {
				ident = "auth.users"
			}
			value := "to_jsonb(t)"
			if name == "doctor_services" {
				value += "-'booking_enabled'"
			}
			if name == "doctor_schedules" || name == "doctor_time_off" {
				value += "-'active'"
			}
			var digest string
			if e := conn.QueryRow(ctx, "SELECT md5(COALESCE(string_agg(("+value+")::text,'' ORDER BY ("+value+")::text),'')) FROM "+ident+" t").Scan(&digest); e != nil {
				t.Fatal(e)
			}
			out[name] = digest
		}
		return out
	}
	before := fingerprint()
	path := "../../migrations/proposed/006_admin_operations.sql"
	exec(`INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) VALUES ('33333333-3333-4333-8333-333333333333',1,'11:00','13:00')`)
	if e := executeFile(ctx, conn, path, "unexpected conflict acceptance"); e == nil {
		t.Fatal("overlapping baseline accepted")
	}
	var absent bool
	if e := conn.QueryRow(ctx, "SELECT to_regclass('public.admin_operation_events') IS NULL AND NOT EXISTS(SELECT FROM information_schema.columns WHERE table_name='doctor_services' AND column_name='booking_enabled') AND NOT EXISTS(SELECT FROM schema_migrations WHERE version='006_admin_operations')").Scan(&absent); e != nil || !absent {
		t.Fatal("failed migration was not atomic", e)
	}
	exec("DELETE FROM doctor_schedules WHERE start_time='11:00'")
	if e := activate("../../migrations"); e != nil {
		t.Fatal(e)
	}
	if !reflect.DeepEqual(before, fingerprint()) {
		t.Fatal("existing Auth/Booking/CMS/Media rows changed")
	}
	var safe bool
	if e := conn.QueryRow(ctx, `SELECT
 (SELECT bool_and(booking_enabled) FROM doctor_services) AND (SELECT bool_and(active) FROM doctor_schedules) AND (SELECT bool_and(active) FROM doctor_time_off)
 AND (SELECT count(*)=3 AND bool_and(relrowsecurity AND NOT has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE') AND NOT has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE')) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('admin_operation_events','doctor_profiles','admin_profile_media_references'))`).Scan(&safe); e != nil || !safe {
		t.Fatal("activation defaults or grants invalid", e)
	}
	if _, e := store.Operations(ctx, "services"); e != nil {
		t.Fatal("operations unavailable after 006", e)
	}
	if e := executeFile(ctx, conn, "../../../docs/ADMIN_OPERATIONS_POST_MIGRATION_VERIFY.sql", "Read-only postchecks passed in disposable rehearsal"); e != nil {
		t.Fatal(e)
	}
	if e := validateLedger(ctx, conn); e != nil {
		t.Fatal(e)
	}
	var applied string
	if e := conn.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='006_admin_operations'").Scan(&applied); e != nil {
		t.Fatal(e)
	}
	if e := activate("../../migrations"); e != nil {
		t.Fatal("repeat verification", e)
	}
	var repeated string
	conn.QueryRow(ctx, "SELECT applied_at::text FROM schema_migrations WHERE version='006_admin_operations'").Scan(&repeated)
	if applied != repeated || !reflect.DeepEqual(before, fingerprint()) {
		t.Fatal("repeat activation changed data")
	}
	exec("DELETE FROM schema_migrations WHERE version='005_cms_media'")
	if e := activate("../../migrations"); e == nil {
		t.Fatal("006 with gapped ledger accepted")
	}
	exec("INSERT INTO schema_migrations(version) VALUES ('005_cms_media')")
	exec("ALTER TABLE doctor_profiles DISABLE ROW LEVEL SECURITY")
	if e := activate("../../migrations"); e == nil {
		t.Fatal("repeat accepted weakened RLS")
	}
	exec("ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY")
}
