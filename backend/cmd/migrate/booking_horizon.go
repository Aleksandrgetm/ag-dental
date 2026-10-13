package main

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5"
)

const horizonVersion = "008_calendar_month_horizon"
const horizonChecksum = "2b1db4fc48db4bfd36b7296bce67317aa5eb2e5ed13650c573e695c938069394"
const horizonComment = "0 uses existing day horizon; positive values use Riga calendar months, clamped to the target month final day, inclusive."

func horizonSecurity(ctx context.Context, db queryer) error {
	return require(ctx, db, "008 settings security", `SELECT relrowsecurity AND NOT has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AND NOT has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AND NOT EXISTS(SELECT FROM aclexplode(COALESCE(relacl,acldefault('r',relowner))) a WHERE a.grantee=0) AND NOT EXISTS(SELECT FROM pg_policies WHERE schemaname='public' AND tablename='booking_settings') FROM pg_class WHERE oid='public.booking_settings'::regclass`)
}
func verifyBookingHorizon(ctx context.Context, db queryer) error {
	if err := horizonSecurity(ctx, db); err != nil {
		return err
	}
	for _, q := range []string{
		`SELECT count(*)=1 AND bool_and(udt_name='int4' AND is_nullable='NO' AND column_default='0') FROM information_schema.columns WHERE table_schema='public' AND table_name='booking_settings' AND column_name='booking_horizon_months'`,
		`SELECT count(*)=1 AND bool_and(convalidated AND pg_get_constraintdef(oid)='CHECK (((booking_horizon_months >= 0) AND (booking_horizon_months <= 12)))') FROM pg_constraint WHERE conrelid='public.booking_settings'::regclass AND conname='booking_settings_booking_horizon_months_check'`,
		`SELECT col_description('public.booking_settings'::regclass,attnum)=$$` + horizonComment + `$$ FROM pg_attribute WHERE attrelid='public.booking_settings'::regclass AND attname='booking_horizon_months' AND NOT attisdropped`,
	} {
		if err := require(ctx, db, "008 schema", q); err != nil {
			return err
		}
	}
	return nil
}
func applyBookingHorizon(ctx context.Context, conn *pgx.Conn, dir string) error {
	data, err := os.ReadFile(filepath.Join(dir, "proposed", horizonVersion+".sql"))
	if err != nil || fmt.Sprintf("%x", sha256.Sum256(data)) != horizonChecksum {
		return errors.New("008 checksum differs; no migration executed")
	}
	var count int
	if err = conn.QueryRow(ctx, "SELECT count(*) FROM public.schema_migrations").Scan(&count); err != nil {
		return errors.New("Cannot inspect 008 ledger")
	}
	if err = verifyOperations(ctx, conn); err != nil {
		return err
	}
	if err = verifyNewsArchive(ctx, conn); err != nil {
		return err
	}
	if err = horizonSecurity(ctx, conn); err != nil {
		return err
	}
	if isApplied(ctx, conn, horizonVersion) {
		if count != 8 {
			return errors.New("008 requires complete ledger")
		}
		if err = verifyBookingHorizon(ctx, conn); err != nil {
			return err
		}
		fmt.Println("008_calendar_month_horizon already applied; schema verified; no writes")
		return nil
	}
	if count != 7 || !isApplied(ctx, conn, archiveVersion) {
		return errors.New("008 requires exactly 001–007")
	}
	if err = require(ctx, conn, "008 conflict check", `SELECT NOT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='booking_settings' AND column_name='booking_horizon_months') AND NOT EXISTS(SELECT FROM pg_constraint WHERE conrelid='public.booking_settings'::regclass AND conname='booking_settings_booking_horizon_months_check')`); err != nil {
		return err
	}
	sql := strings.TrimSpace(string(data))
	prefix := "-- PROPOSED ONLY. Additive capability; preserves all existing booking rules.\nBEGIN;\n"
	if !strings.HasPrefix(sql, prefix) || !strings.HasSuffix(sql, "\nCOMMIT;") {
		return errors.New("008 transaction envelope differs")
	}
	body := strings.TrimSuffix(strings.TrimPrefix(sql, prefix), "\nCOMMIT;")
	tx, err := conn.Begin(ctx)
	if err != nil {
		return errors.New("Cannot begin 008")
	}
	defer tx.Rollback(context.Background())
	if _, err = tx.Exec(ctx, "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; LOCK TABLE public.booking_settings IN ACCESS EXCLUSIVE MODE"); err != nil {
		return errors.New("Cannot acquire bounded 008 settings lock")
	}
	const snapshot = `SELECT COALESCE(jsonb_agg(to_jsonb(s)-'booking_horizon_months' ORDER BY id),'[]')::text FROM public.booking_settings s`
	var before, after string
	if err = tx.QueryRow(ctx, snapshot).Scan(&before); err != nil {
		return errors.New("Cannot snapshot settings")
	}
	if _, err = tx.Exec(ctx, body); err != nil {
		return errors.New("008 failed before commit; transaction rolled back (details withheld)")
	}
	if _, err = tx.Exec(ctx, "INSERT INTO public.schema_migrations(version) VALUES ($1)", horizonVersion); err != nil {
		return errors.New("008 ledger insert failed; transaction not committed")
	}
	if err = validateLedger(ctx, tx); err != nil {
		return err
	}
	if err = verifyBookingHorizon(ctx, tx); err != nil {
		return err
	}
	if err = tx.QueryRow(ctx, snapshot).Scan(&after); err != nil || before != after {
		return errors.New("008 settings preservation failed")
	}
	if err = require(ctx, tx, "008 initial rule", `SELECT NOT EXISTS(SELECT FROM public.booking_settings WHERE booking_horizon_months<>0)`); err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return errors.New("008 commit outcome uncertain; inspect ledger/schema before retry")
	}
	fmt.Println("Applied 008_calendar_month_horizon; schema and ledger committed atomically; existing settings preserved")
	return nil
}
