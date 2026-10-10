package main

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

// These tests intentionally exercise real PostgreSQL DDL. They never use the
// application's DATABASE_URL and refuse non-local/non-disposable targets.
func TestMigrationsIntegration(t *testing.T) {
	dsn := os.Getenv("MIGRATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires MIGRATION_TEST_DATABASE_URL and MIGRATION_TEST_DATABASE_CONFIRM=disposable")
	}
	config, err := pgx.ParseConfig(dsn)
	if err != nil || os.Getenv("MIGRATION_TEST_DATABASE_CONFIRM") != "disposable" ||
		!strings.HasSuffix(config.Database, "_test") ||
		(config.Host != "127.0.0.1" && config.Host != "localhost") {
		t.Fatal("migration tests require an explicitly disposable local *_test database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		t.Fatal("could not connect to isolated migration test database")
	}
	defer conn.Close(context.Background())
	exec := func(t *testing.T, sql string, args ...any) {
		t.Helper()
		if _, err := conn.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("test database statement failed: %v", err)
		}
	}
	assertBool := func(t *testing.T, sql string) {
		t.Helper()
		var ok bool
		if err := conn.QueryRow(ctx, sql).Scan(&ok); err != nil || !ok {
			t.Fatalf("database invariant failed: %s (query error: %v)", sql, err)
		}
	}
	migrate := func(adopt, down bool) error { return run(ctx, dsn, "../../migrations", adopt, down, false) }
	downCMS := func() error {
		return executeFile(ctx, conn, "../../migrations/004_website_cms.down.sql", "Remove empty local-test CMS")
	}
	downConfirmation := func() error {
		var exists bool
		if err := conn.QueryRow(ctx, "SELECT to_regclass('public.cms_documents') IS NOT NULL").Scan(&exists); err != nil {
			return err
		}
		if exists {
			if err := downCMS(); err != nil {
				return err
			}
		}
		return run(ctx, dsn, "../../migrations", false, false, true)
	}

	// Roles are cluster-wide and may already support the booking tests in another
	// database. Bootstrap only this dedicated database's schemas and auth stub.
	exec(t, "DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public")
	bootstrap, err := os.ReadFile("../../testdata/bootstrap.sql")
	if err != nil {
		t.Fatal(err)
	}
	var statements []string
	for _, line := range strings.Split(string(bootstrap), "\n") {
		if !strings.HasPrefix(strings.TrimSpace(line), "CREATE ROLE ") {
			statements = append(statements, line)
		}
	}
	exec(t, strings.Join(statements, "\n"))
	exec(t, "INSERT INTO auth.users(id) VALUES ('30000000-0000-4000-8000-000000000001')")

	t.Run("forward defaults automatic and repeat preserves admin mode choices", func(t *testing.T) {
		if err := migrate(false, false); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT count(*)=4 FROM public.schema_migrations")
		assertBool(t, "SELECT role='user' FROM public.user_roles WHERE user_id='30000000-0000-4000-8000-000000000001'")
		assertBool(t, "SELECT confirmation_mode='automatic' AND privacy_notice_version IS NULL FROM public.booking_settings")
		assertBool(t, "SELECT column_default='''automatic''::text' FROM information_schema.columns WHERE table_schema='public' AND table_name='booking_settings' AND column_name='confirmation_mode'")
		assertBool(t, "SELECT count(*)=1 FROM public.booking_settings_events WHERE source='migration' AND previous_settings->>'confirmation_mode'='manual' AND new_settings->>'confirmation_mode'='automatic'")
		exec(t, "UPDATE public.user_roles SET role='admin' WHERE user_id='30000000-0000-4000-8000-000000000001'")
		exec(t, "UPDATE public.booking_settings SET confirmation_mode='manual'")
		if err := migrate(false, false); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT role='admin' FROM public.user_roles WHERE user_id='30000000-0000-4000-8000-000000000001'")
		assertBool(t, "SELECT confirmation_mode='manual' FROM public.booking_settings")
		assertBool(t, "SELECT count(*)=4 FROM public.schema_migrations")
		assertBool(t, "SELECT count(*)=1 FROM public.booking_settings_events")
	})
	if t.Failed() {
		return
	}

	t.Run("unknown history fails closed", func(t *testing.T) {
		exec(t, "INSERT INTO public.schema_migrations(version) VALUES ('999_unknown')")
		if err := migrate(false, false); err == nil {
			t.Fatal("runner accepted an unknown migration")
		}
		assertBool(t, "SELECT count(*)=5 FROM public.schema_migrations")
		exec(t, "DELETE FROM public.schema_migrations WHERE version='999_unknown'")
	})

	t.Run("rollback guards real catalog and custom settings", func(t *testing.T) {
		if err := migrate(false, true); err == nil {
			t.Fatal("booking rollback accepted a later applied migration")
		}
		assertBool(t, "SELECT count(*)=4 FROM public.schema_migrations")
		if err := run(ctx, dsn, "../../migrations", false, false, true); err == nil {
			t.Fatal("confirmation rollback ignored CMS dependency")
		}
		assertBool(t, "SELECT count(*)=5 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('cms_documents','cms_revisions','cms_events','cms_media','cms_booking_service_links') AND c.relrowsecurity")
		if err := downConfirmation(); err != nil {
			t.Fatal(err)
		}
		exec(t, "INSERT INTO public.services(slug,name_lv,name_ru,name_en) VALUES ('test-verified-record','Test LV','Test RU','Test EN')")
		if err := migrate(false, true); err == nil {
			t.Fatal("rollback deleted a non-development catalog record")
		}
		assertBool(t, "SELECT count(*)=1 FROM public.services")
		assertBool(t, "SELECT count(*)=2 FROM public.schema_migrations")
		exec(t, "DELETE FROM public.services")
		exec(t, "UPDATE public.booking_settings SET confirmation_mode='automatic'")
		if err := migrate(false, true); err == nil {
			t.Fatal("rollback deleted customized settings")
		}
		assertBool(t, "SELECT confirmation_mode='automatic' FROM public.booking_settings")
		exec(t, "UPDATE public.booking_settings SET confirmation_mode='manual'")
		if err := migrate(false, true); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT to_regclass('public.appointments') IS NULL AND to_regclass('public.user_roles') IS NOT NULL")
		assertBool(t, "SELECT count(*)=1 FROM public.schema_migrations")
	})
	if t.Failed() {
		return
	}

	t.Run("002 upgrade changes future mode without confirming existing appointments", func(t *testing.T) {
		if err := executeFile(ctx, conn, "../../migrations/002_booking_foundation.sql", "Prepared existing 002 deployment"); err != nil {
			t.Fatal(err)
		}
		exec(t, `INSERT INTO public.services(id,slug,name_lv,name_ru,name_en,duration_minutes,provenance)
			VALUES ('10000000-0000-4000-8000-000000000099','migration-upgrade-test','Test LV','Test RU','Test EN',30,'development_fixture');
			INSERT INTO public.doctors(id,name,provenance) VALUES ('20000000-0000-4000-8000-000000000099','SYNTHETIC migration test','development_fixture');
			INSERT INTO public.doctor_services(doctor_id,service_id) VALUES ('20000000-0000-4000-8000-000000000099','10000000-0000-4000-8000-000000000099');
			INSERT INTO public.appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint)
			VALUES ('MIGRATION-TEST-PENDING','10000000-0000-4000-8000-000000000099','20000000-0000-4000-8000-000000000099','Synthetic','Test','+37120000000','test@example.invalid','2030-01-07 10:00+00','2030-01-07 10:30+00','pending','development-fixture-v1',now(),gen_random_uuid(),repeat('a',64))`)
		assertBool(t, "SELECT confirmation_mode='manual' FROM public.booking_settings")
		if err := migrate(false, false); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT confirmation_mode='automatic' FROM public.booking_settings")
		assertBool(t, "SELECT status='pending' FROM public.appointments WHERE booking_reference='MIGRATION-TEST-PENDING'")
		assertBool(t, "SELECT count(*)=1 FROM public.booking_settings_events WHERE source='migration'")
		if err := downConfirmation(); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT confirmation_mode='manual' FROM public.booking_settings")
		assertBool(t, "SELECT status='pending' FROM public.appointments WHERE booking_reference='MIGRATION-TEST-PENDING'")
		exec(t, "DELETE FROM public.appointments; DELETE FROM public.doctor_services; DELETE FROM public.doctors; DELETE FROM public.services")
		if err := migrate(false, true); err != nil {
			t.Fatal(err)
		}
	})
	if t.Failed() {
		return
	}

	t.Run("adopt existing auth baseline without overwriting roles", func(t *testing.T) {
		exec(t, "DELETE FROM public.schema_migrations WHERE version='001_user_roles'")
		if err := migrate(false, false); err == nil {
			t.Fatal("unrecorded existing auth schema was accepted implicitly")
		}
		assertBool(t, "SELECT count(*)=0 FROM public.schema_migrations")
		if err := migrate(true, false); err != nil {
			t.Fatal(err)
		}
		assertBool(t, "SELECT role='admin' FROM public.user_roles WHERE user_id='30000000-0000-4000-8000-000000000001'")
		assertBool(t, "SELECT count(*)=1 FROM public.schema_migrations WHERE version='001_user_roles'")
		assertBool(t, "SELECT to_regclass('public.appointments') IS NULL")
		if err := migrate(false, false); err != nil {
			t.Fatal(err)
		}
		if err := downConfirmation(); err != nil {
			t.Fatal(err)
		}
		if err := migrate(false, true); err != nil {
			t.Fatal(err)
		}
		exec(t, "DELETE FROM public.schema_migrations WHERE version='001_user_roles'")
	})
	if t.Failed() {
		return
	}

	t.Run("confirmation rollback retains administrator audit history", func(t *testing.T) {
		if err := migrate(true, false); err != nil {
			t.Fatal(err)
		}
		if err := migrate(false, false); err != nil {
			t.Fatal(err)
		}
		exec(t, `INSERT INTO public.booking_settings_events(source,actor_user_id,previous_settings,new_settings)
			VALUES ('admin',NULL,'{"confirmation_mode":"automatic"}','{"confirmation_mode":"manual"}')`)
		if err := downConfirmation(); err == nil {
			t.Fatal("rollback deleted administrator audit history with an absent actor")
		}
		assertBool(t, "SELECT count(*)=1 FROM public.booking_settings_events WHERE source='admin'")
		assertBool(t, "SELECT confirmation_mode='automatic' FROM public.booking_settings")
		assertBool(t, "SELECT count(*)=3 FROM public.schema_migrations")
		// Explicitly remove only this synthetic test row so later independent cases
		// can exercise baseline adoption. Production rollback never performs this.
		exec(t, "DELETE FROM public.booking_settings_events WHERE source='admin'")
		if err := downConfirmation(); err != nil {
			t.Fatal(err)
		}
		if err := migrate(false, true); err != nil {
			t.Fatal(err)
		}
		exec(t, "DELETE FROM public.schema_migrations WHERE version='001_user_roles'")
	})
	if t.Failed() {
		return
	}

	t.Run("adoption refuses unsafe grant or modified role trigger function", func(t *testing.T) {
		exec(t, "GRANT SELECT ON public.user_roles TO anon")
		if err := migrate(true, false); err == nil {
			t.Fatal("adoption accepted browser access to role data")
		}
		assertBool(t, "SELECT count(*)=0 FROM public.schema_migrations")
		exec(t, "REVOKE SELECT ON public.user_roles FROM anon")
		exec(t, `CREATE OR REPLACE FUNCTION public.create_user_role() RETURNS trigger
			LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
			BEGIN
			  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
			  RETURN NEW;
			END;
			$$`)
		if err := migrate(true, false); err == nil {
			t.Fatal("adoption accepted a trigger function that grants admin on signup")
		}
		assertBool(t, "SELECT count(*)=0 FROM public.schema_migrations")
		assertBool(t, "SELECT role='admin' FROM public.user_roles WHERE user_id='30000000-0000-4000-8000-000000000001'")
	})
}
