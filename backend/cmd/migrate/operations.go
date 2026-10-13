package main

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5"
)

const operationsVersion = "006_admin_operations"
const operationsChecksum = "94f143141af6d896ad6c0bca8d4b0e5ef0b78ee5eb0024d6200032dd8489e002"

// Deliberately separate from the default 001–005 manifest. The reviewed SQL stays
// byte-for-byte in its proposed location; activation always requires an explicit flag.
func applyOperations(ctx context.Context, conn *pgx.Conn, dir string) error {
	sql, err := os.ReadFile(filepath.Join(dir, "proposed", operationsVersion+".sql"))
	if err != nil || fmt.Sprintf("%x", sha256.Sum256(sql)) != operationsChecksum {
		return errors.New("006 checksum differs from the reviewed migration; no migration executed")
	}
	var count int
	if err = conn.QueryRow(ctx, "SELECT count(*) FROM public.schema_migrations").Scan(&count); err != nil {
		return errors.New("Could not inspect 006 baseline")
	}
	if isApplied(ctx, conn, operationsVersion) {
		if count != 6 {
			return errors.New("006 ledger is not complete")
		}
		if err = verifyOperations(ctx, conn); err != nil {
			return err
		}
		fmt.Println("006_admin_operations already applied; schema verified; no writes")
		return nil
	}
	if count != 5 || !isApplied(ctx, conn, "005_cms_media") {
		return errors.New("006 requires exactly the complete 001–005 ledger")
	}
	checks := []struct{ label, sql string }{
		{"object names", `SELECT NOT EXISTS(SELECT FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('admin_operation_events','doctor_profiles','admin_profile_media_references','admin_operation_history','admin_profile_media_asset','cms_booking_single_editorial_source','doctor_working_intervals_no_overlap')) AND NOT EXISTS(SELECT FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname='doctor_working_intervals_no_overlap')`},
		{"new columns", `SELECT NOT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND ((table_name='doctor_services' AND column_name='booking_enabled') OR (table_name IN ('doctor_schedules','doctor_time_off') AND column_name='active')))`},
		{"extension", `SELECT EXISTS(SELECT FROM pg_extension WHERE extname='btree_gist')`},
		{"service links", `SELECT NOT EXISTS(SELECT service_id FROM public.cms_booking_service_links GROUP BY service_id HAVING count(*)>1)`},
		{"schedule overlaps", `SELECT NOT EXISTS(SELECT FROM public.doctor_schedules a JOIN public.doctor_schedules b ON a.id<b.id AND a.doctor_id=b.doctor_id AND a.weekday=b.weekday AND daterange(a.effective_from,a.effective_until,'[]') && daterange(b.effective_from,b.effective_until,'[]') AND a.start_time<b.end_time AND b.start_time<a.end_time)`},
		{"CMS event constraint", `SELECT count(*)=1 AND bool_and(contype='c' AND convalidated AND pg_get_constraintdef(oid)=$$CHECK ((event_type = ANY (ARRAY['imported'::text, 'draft_saved'::text, 'published'::text, 'rolled_back'::text])))$$) FROM pg_constraint WHERE conrelid='public.cms_events'::regclass AND conname='cms_events_event_type_check'`},
	}
	for _, c := range checks {
		var ok bool
		if err = conn.QueryRow(ctx, c.sql).Scan(&ok); err != nil || !ok {
			return fmt.Errorf("006 preflight failed: %s; no migration executed", c.label)
		}
	}
	if _, err = conn.Exec(ctx, "SET lock_timeout='5s'; SET statement_timeout='60s'"); err != nil {
		return errors.New("Could not bound 006 execution time")
	}
	// Execute these already-hashed bytes, not a second filesystem read.
	if err = executeSQL(ctx, conn, sql, operationsVersion+".sql", "Applied 006_admin_operations"); err != nil {
		return err
	}
	if err = validateLedger(ctx, conn); err != nil {
		return errors.New("006 execution completed but ledger verification failed; inspect before any retry")
	}
	if err = verifyOperations(ctx, conn); err != nil {
		return err
	}
	fmt.Println("006_admin_operations ledger and schema verified")
	return nil
}

func verifyOperations(ctx context.Context, conn *pgx.Conn) error {
	eventConstraint := `CHECK ((event_type = ANY (ARRAY['imported'::text, 'draft_saved'::text, 'published'::text, 'rolled_back'::text, 'unpublished'::text])))`
	if isApplied(ctx, conn, archiveVersion) {
		eventConstraint = archiveEvents
	}
	checks := []string{
		`SELECT count(*)=3 AND bool_and(relkind='r' AND relrowsecurity AND NOT has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AND NOT has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AND NOT EXISTS(SELECT FROM aclexplode(COALESCE(relacl,acldefault('r',relowner))) a WHERE a.grantee=0)) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('admin_operation_events','doctor_profiles','admin_profile_media_references')`,
		`SELECT NOT EXISTS(SELECT FROM pg_policies WHERE schemaname='public' AND tablename IN ('admin_operation_events','doctor_profiles','admin_profile_media_references'))`,
		`SELECT count(*)=3 AND bool_and(is_nullable='NO' AND udt_name='bool' AND column_default='true') FROM information_schema.columns WHERE table_schema='public' AND ((table_name='doctor_services' AND column_name='booking_enabled') OR (table_name IN ('doctor_schedules','doctor_time_off') AND column_name='active'))`,
		`SELECT count(*)=8 AND bool_and(i.indisvalid AND i.indisready) FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('doctor_working_intervals_no_overlap','cms_booking_single_editorial_source','admin_operation_events_pkey','admin_operation_history','doctor_profiles_pkey','doctor_profiles_editorial_key_key','admin_profile_media_references_pkey','admin_profile_media_asset')`,
		`SELECT EXISTS(SELECT FROM pg_constraint WHERE conrelid='public.doctor_schedules'::regclass AND conname='doctor_working_intervals_no_overlap' AND contype='x' AND convalidated) AND (SELECT count(*)=7 AND bool_and(convalidated) FROM pg_constraint WHERE conrelid IN ('public.admin_operation_events'::regclass,'public.doctor_profiles'::regclass,'public.admin_profile_media_references'::regclass) AND contype='f')`,
		`SELECT count(*)=1 AND bool_and(convalidated AND pg_get_constraintdef(oid)=$$` + eventConstraint + `$$) FROM pg_constraint WHERE conrelid='public.cms_events'::regclass AND conname='cms_events_event_type_check'`,
	}
	for i, q := range checks {
		var ok bool
		if err := conn.QueryRow(ctx, q).Scan(&ok); err != nil || !ok {
			return fmt.Errorf("006 schema verification failed at check %d; inspect before any retry", i+1)
		}
	}
	return nil
}
