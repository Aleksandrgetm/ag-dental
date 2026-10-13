// Apply reviewed SQL migrations explicitly. The API never applies migrations.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

var versions = []string{"001_user_roles", "002_booking_foundation", "003_automatic_confirmation", "004_website_cms", "005_cms_media"}

func main() {
	horizon := flag.Bool("apply-booking-horizon", false, "apply only reviewed migration 008 after complete 001–007 baseline")
	archive := flag.Bool("apply-news-archive", false, "apply only reviewed migration 007 after the complete 001–006 baseline")
	operations := flag.Bool("apply-admin-operations", false, "apply only reviewed migration 006 after the complete 001–005 baseline")
	adopt := flag.Bool("adopt-auth-baseline", false, "validate an existing, unrecorded auth schema and record migration 001 only")
	down := flag.Bool("down-booking", false, "roll back migration 002 only if it contains no real catalog or appointment data")
	downConfirmation := flag.Bool("down-confirmation-default", false, "roll back migration 003, restoring manual mode for future bookings without changing appointments")
	dir := flag.String("dir", "migrations", "directory containing reviewed migration SQL")
	flag.Parse()
	if (*horizon && (*archive || *operations || *adopt || *down || *downConfirmation)) || (*archive && (*operations || *adopt || *down || *downConfirmation)) || (*adopt && (*down || *downConfirmation)) || (*down && *downConfirmation) || (*operations && (*adopt || *down || *downConfirmation)) {
		fmt.Fprintln(os.Stderr, "Choose only one migration operation")
		os.Exit(1)
	}
	_ = godotenv.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := runWithOperations(ctx, os.Getenv("DATABASE_URL"), *dir, *adopt, *down, *downConfirmation, *operations, *archive, *horizon); err != nil {
		// Never print connection strings, SQL arguments, role contents or server errors.
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, dsn, dir string, adopt, down, downConfirmation bool) error {
	return runWithOperations(ctx, dsn, dir, adopt, down, downConfirmation, false)
}

func runWithOperations(ctx context.Context, dsn, dir string, adopt, down, downConfirmation, operations bool, archiveOption ...bool) error {
	archive := len(archiveOption) > 0 && archiveOption[0]
	horizon := len(archiveOption) > 1 && archiveOption[1]
	if horizon && (archive || operations || adopt || down || downConfirmation) {
		return errors.New("Choose only one migration operation")
	}
	if archive && (operations || adopt || down || downConfirmation) {
		return errors.New("Choose only one migration operation")
	}
	if operations && (adopt || down || downConfirmation) {
		return errors.New("Choose only one migration operation")
	}
	if dsn == "" {
		return errors.New("DATABASE_URL is required")
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return errors.New("Database connection failed; no credentials were logged")
	}
	defer conn.Close(context.Background())
	if _, err = conn.Exec(ctx, "SELECT pg_advisory_lock(714092001)"); err != nil {
		return errors.New("Could not acquire migration lock")
	}
	defer conn.Exec(context.Background(), "SELECT pg_advisory_unlock(714092001)")
	var ledgerExists, rolesExist bool
	if err = conn.QueryRow(ctx, `SELECT to_regclass('public.schema_migrations') IS NOT NULL,
		to_regclass('public.user_roles') IS NOT NULL`).Scan(&ledgerExists, &rolesExist); err != nil {
		return errors.New("Could not inspect migration baseline")
	}
	if ledgerExists {
		if err = validateLedger(ctx, conn); err != nil {
			return err
		}
	}
	if horizon {
		if !ledgerExists || !rolesExist {
			return errors.New("008 requires complete 001–007 baseline")
		}
		return applyBookingHorizon(ctx, conn, dir)
	}
	if archive {
		if !ledgerExists || !rolesExist {
			return errors.New("007 requires complete 001–006 baseline")
		}
		return applyNewsArchive(ctx, conn, dir)
	}
	if operations {
		if !ledgerExists || !rolesExist {
			return errors.New("006 requires the complete existing 001–005 baseline")
		}
		return applyOperations(ctx, conn, dir)
	}
	if adopt {
		if !rolesExist {
			return errors.New("No existing auth schema to adopt; use the normal migration command")
		}
		return adoptAuth(ctx, conn, ledgerExists)
	}
	if down || downConfirmation {
		if ledgerExists && isApplied(ctx, conn, "004_website_cms") {
			return errors.New("CMS migration is present; review dependent CMS rollback before reverting booking migrations")
		}
		if !ledgerExists {
			return errors.New("No migration ledger; rollback refused")
		}
		if downConfirmation {
			if !isApplied(ctx, conn, "003_automatic_confirmation") {
				return errors.New("Automatic-confirmation migration is not recorded; rollback refused")
			}
			return executeFile(ctx, conn, filepath.Join(dir, "003_automatic_confirmation.down.sql"), "Rolled back 003_automatic_confirmation; future bookings use manual confirmation")
		}
		if isApplied(ctx, conn, "003_automatic_confirmation") {
			return errors.New("Roll back migration 003 first with --down-confirmation-default; booking schema/settings were not changed")
		}
		if !isApplied(ctx, conn, "002_booking_foundation") {
			return errors.New("Booking migration is not recorded; rollback refused")
		}
		return executeFile(ctx, conn, filepath.Join(dir, "002_booking_foundation.down.sql"), "Rolled back 002_booking_foundation")
	}
	if rolesExist && (!ledgerExists || !isApplied(ctx, conn, "001_user_roles")) {
		return errors.New("Existing auth schema is unrecorded. Review it, then run --adopt-auth-baseline; no schema/data changes were made")
	}
	for _, version := range versions {
		if ledgerExists && isApplied(ctx, conn, version) {
			fmt.Println(version + " already applied")
			continue
		}
		if err = executeFile(ctx, conn, filepath.Join(dir, version+".sql"), "Applied "+version); err != nil {
			return err
		}
		ledgerExists = true
	}
	// The original 001 is preserved byte-for-byte; harden its bookkeeping table here.
	if _, err = conn.Exec(ctx, `ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
		REVOKE ALL ON public.schema_migrations FROM PUBLIC, anon, authenticated`); err != nil {
		return errors.New("Migrations applied, but migration-ledger hardening failed; review database permissions")
	}
	return nil
}

func executeFile(ctx context.Context, conn *pgx.Conn, path, success string) error {
	sql, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("Could not read reviewed migration file %s", filepath.Base(path))
	}
	return executeSQL(ctx, conn, sql, filepath.Base(path), success)
}

func executeSQL(ctx context.Context, conn *pgx.Conn, sql []byte, name, success string) error {
	if _, err := conn.Exec(ctx, string(sql)); err != nil {
		_, _ = conn.Exec(context.Background(), "ROLLBACK")
		return fmt.Errorf("Migration %s did not report success; inspect ledger and schema before any retry; commit outcome may be uncertain (server details withheld)", name)
	}
	fmt.Println(success)
	return nil
}

func isApplied(ctx context.Context, conn *pgx.Conn, version string) bool {
	var exists bool
	return conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version=$1)", version).Scan(&exists) == nil && exists
}

type queryer interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func require(ctx context.Context, db queryer, label, query string) error {
	var valid bool
	if err := db.QueryRow(ctx, query).Scan(&valid); err != nil || !valid {
		return fmt.Errorf("Baseline validation failed: %s; adoption refused without changing existing data", label)
	}
	return nil
}

func validateLedger(ctx context.Context, db queryer) error {
	checks := []struct{ label, sql string }{
		{"migration ledger columns", `SELECT
			(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations')=2
			AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='version' AND udt_name='text' AND is_nullable='NO')
			AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='applied_at' AND udt_name='timestamptz' AND is_nullable='NO' AND column_default='now()')
			AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schema_migrations'::regclass AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (version)')`},
		{"unknown or out-of-order migration history", `SELECT
			NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version NOT IN ('001_user_roles','002_booking_foundation','003_automatic_confirmation','004_website_cms','005_cms_media','006_admin_operations','007_news_archive','008_calendar_month_horizon'))
			AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='002_booking_foundation') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='001_user_roles'))
			AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='003_automatic_confirmation') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='002_booking_foundation'))
			AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='004_website_cms') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='003_automatic_confirmation'))
 AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='005_cms_media') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='004_website_cms'))
 AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='006_admin_operations') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='005_cms_media'))
 AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='007_news_archive') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='006_admin_operations'))
 AND (NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='008_calendar_month_horizon') OR EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='007_news_archive'))`},
		{"migration ledger grants/policies", `SELECT
			NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='schema_migrations')
			AND NOT has_table_privilege('anon','public.schema_migrations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
			AND NOT has_table_privilege('authenticated','public.schema_migrations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')`},
	}
	for _, check := range checks {
		if err := require(ctx, db, check.label, check.sql); err != nil {
			return err
		}
	}
	return nil
}

func adoptAuth(ctx context.Context, conn *pgx.Conn, ledgerExists bool) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return errors.New("Could not start baseline adoption transaction")
	}
	defer tx.Rollback(context.Background())
	if _, err = tx.Exec(ctx, "LOCK TABLE public.user_roles, auth.users IN SHARE ROW EXCLUSIVE MODE"); err != nil {
		return errors.New("Could not lock auth baseline for validation")
	}
	checks := []struct{ label, sql string }{
		{"role table columns", `SELECT
			(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles')=3
			AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='user_id' AND udt_name='uuid' AND is_nullable='NO')
			AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='role' AND udt_name='text' AND is_nullable='NO' AND column_default='''user''::text')
			AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='created_at' AND udt_name='timestamptz' AND is_nullable='NO' AND column_default='now()')`},
		{"role table constraints", `SELECT
			(SELECT count(*) FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype <> 'n')=3
			AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (user_id)')
			AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype='f' AND confrelid='auth.users'::regclass AND convalidated AND confdeltype='c' AND pg_get_constraintdef(oid)='FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
			AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype='c' AND convalidated AND pg_get_constraintdef(oid)='CHECK ((role = ANY (ARRAY[''user''::text, ''admin''::text])))')`},
		{"role table RLS/grants/policies", `SELECT
			(SELECT relrowsecurity AND pg_get_userbyid(relowner) NOT IN ('anon','authenticated') FROM pg_class WHERE oid='public.user_roles'::regclass)
			AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles')
			AND NOT has_table_privilege('anon','public.user_roles','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
			AND NOT has_table_privilege('authenticated','public.user_roles','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')`},
		{"role creation function settings", `SELECT EXISTS (
			SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
			WHERE p.oid=to_regprocedure('public.create_user_role()') AND p.prosecdef AND l.lanname='plpgsql'
			AND p.prorettype='trigger'::regtype AND p.proconfig=ARRAY['search_path=""']::text[]
			AND p.proowner=(SELECT relowner FROM pg_class WHERE oid='public.user_roles'::regclass))
			AND NOT has_function_privilege('anon','public.create_user_role()','EXECUTE')
			AND NOT has_function_privilege('authenticated','public.create_user_role()','EXECUTE')`},
		{"role creation trigger", `SELECT EXISTS (
			SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
			AND tgname='on_auth_user_created_role' AND tgfoid=to_regprocedure('public.create_user_role()')
			AND tgtype=5 AND tgenabled IN ('O','A') AND tgqual IS NULL AND tgnargs=0 AND NOT tgisinternal)
			AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND NOT tgisinternal)`},
	}
	for _, check := range checks {
		if err = require(ctx, tx, check.label, check.sql); err != nil {
			return err
		}
	}
	var body string
	if err = tx.QueryRow(ctx, "SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('public.create_user_role()')").Scan(&body); err != nil {
		return errors.New("Could not inspect role creation function; adoption refused")
	}
	expected := "BEGIN INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user'); RETURN NEW; END;"
	if strings.Join(strings.Fields(body), " ") != expected {
		return errors.New("Role creation function body differs from migration 001; adoption refused")
	}
	if !ledgerExists {
		if _, err = tx.Exec(ctx, `CREATE TABLE public.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil {
			return errors.New("Could not create migration ledger; adoption rolled back")
		}
	}
	if _, err = tx.Exec(ctx, `ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
		REVOKE ALL ON public.schema_migrations FROM PUBLIC, anon, authenticated;
		INSERT INTO public.schema_migrations(version) VALUES ('001_user_roles') ON CONFLICT (version) DO NOTHING`); err != nil {
		return errors.New("Could not record auth baseline; adoption rolled back")
	}
	if err = tx.Commit(ctx); err != nil {
		return errors.New("Could not commit auth baseline adoption")
	}
	fmt.Println("Validated and recorded 001_user_roles; existing roles/data unchanged. Run the normal migration command separately to apply booking schema.")
	return nil
}
