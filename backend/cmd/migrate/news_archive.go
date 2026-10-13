package main

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"os"
	"path/filepath"
	"strings"
)

const archiveVersion = "007_news_archive"
const archiveChecksum = "84cb1982b21c404d745bdab924be992476147ea3cfd018de31f935699ecee41d"
const archiveEvents = `CHECK ((event_type = ANY (ARRAY['imported'::text, 'draft_saved'::text, 'published'::text, 'rolled_back'::text, 'unpublished'::text, 'archived'::text, 'restored'::text])))`

func applyNewsArchive(ctx context.Context, conn *pgx.Conn, dir string) error {
	data, e := os.ReadFile(filepath.Join(dir, "proposed", archiveVersion+".sql"))
	if e != nil || fmt.Sprintf("%x", sha256.Sum256(data)) != archiveChecksum {
		return errors.New("007 checksum differs; no migration executed")
	}
	var count int
	if e = conn.QueryRow(ctx, "SELECT count(*) FROM public.schema_migrations").Scan(&count); e != nil {
		return errors.New("Cannot inspect 007 baseline")
	}
	if isApplied(ctx, conn, archiveVersion) {
		if count != 7 {
			return errors.New("007 requires complete ledger")
		}
		if e = verifyNewsArchive(ctx, conn); e != nil {
			return e
		}
		fmt.Println("007_news_archive already applied; schema verified; no writes")
		return nil
	}
	if count != 6 || !isApplied(ctx, conn, operationsVersion) {
		return errors.New("007 requires exactly 001–006")
	}
	if e = verifyOperations(ctx, conn); e != nil {
		return e
	}
	if e = archiveSecurity(ctx, conn); e != nil {
		return e
	}
	var clear bool
	if e = conn.QueryRow(ctx, `SELECT NOT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='cms_documents' AND column_name='archived_at') AND to_regclass('public.cms_documents_archive') IS NULL AND NOT EXISTS(SELECT FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname='cms_archive_unpublished')`).Scan(&clear); e != nil || !clear {
		return errors.New("007 object conflict; no migration executed")
	}
	// The reviewed file already has transaction delimiters. Execute its unchanged
	// body inside our transaction so schema and ledger commit together.
	sql := strings.TrimSpace(string(data))
	if !strings.HasPrefix(sql, "BEGIN;\n") || !strings.HasSuffix(sql, "\nCOMMIT;") {
		return errors.New("007 transaction envelope differs")
	}
	body := strings.TrimSuffix(strings.TrimPrefix(sql, "BEGIN;\n"), "\nCOMMIT;")
	tx, e := conn.Begin(ctx)
	if e != nil {
		return errors.New("Cannot begin 007")
	}
	defer tx.Rollback(context.Background())
	if _, e = tx.Exec(ctx, "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'"); e != nil {
		return errors.New("Cannot bound 007 execution")
	}
	if _, e = tx.Exec(ctx, body); e != nil {
		return errors.New("007 failed before commit; inspect state before retry (details withheld)")
	}
	if _, e = tx.Exec(ctx, "INSERT INTO public.schema_migrations(version) VALUES ($1)", archiveVersion); e != nil {
		return errors.New("007 ledger insert failed; transaction not committed")
	}
	if e = validateLedger(ctx, tx); e != nil {
		return e
	}
	if e = verifyNewsArchive(ctx, tx); e != nil {
		return e
	}
	if e = tx.Commit(ctx); e != nil {
		return errors.New("007 commit outcome uncertain; inspect ledger/schema before retry")
	}
	fmt.Println("Applied 007_news_archive; schema and ledger committed atomically")
	return nil
}
func archiveSecurity(ctx context.Context, db queryer) error {
	return require(ctx, db, "007 CMS security", `SELECT count(*)=3 AND bool_and(relrowsecurity AND NOT has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AND NOT has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AND NOT EXISTS(SELECT FROM aclexplode(COALESCE(relacl,acldefault('r',relowner))) a WHERE a.grantee=0)) AND NOT EXISTS(SELECT FROM pg_policies WHERE schemaname='public' AND tablename IN ('cms_documents','cms_revisions','cms_events')) FROM pg_class WHERE oid IN ('public.cms_documents'::regclass,'public.cms_revisions'::regclass,'public.cms_events'::regclass)`)
}
func verifyNewsArchive(ctx context.Context, db queryer) error {
	if e := archiveSecurity(ctx, db); e != nil {
		return e
	}
	checks := []string{
		`SELECT count(*)=1 AND bool_and(udt_name='timestamptz' AND is_nullable='YES' AND column_default IS NULL) FROM information_schema.columns WHERE table_schema='public' AND table_name='cms_documents' AND column_name='archived_at'`,
		`SELECT count(*)=1 AND bool_and(convalidated AND pg_get_constraintdef(oid)='CHECK (((archived_at IS NULL) OR (published_revision IS NULL)))') FROM pg_constraint WHERE conrelid='public.cms_documents'::regclass AND conname='cms_archive_unpublished'`,
		`SELECT count(*)=1 AND bool_and(indisvalid AND indisready AND pg_get_indexdef(indexrelid)='CREATE INDEX cms_documents_archive ON public.cms_documents USING btree (archived_at) WHERE (archived_at IS NOT NULL)') FROM pg_index WHERE indexrelid=to_regclass('public.cms_documents_archive')`,
		`SELECT count(*)=1 AND bool_and(convalidated AND pg_get_constraintdef(oid)=$$` + archiveEvents + `$$) FROM pg_constraint WHERE conrelid='public.cms_events'::regclass AND conname='cms_events_event_type_check'`,
	}
	for i, q := range checks {
		if e := require(ctx, db, fmt.Sprintf("007 schema check %d", i+1), q); e != nil {
			return e
		}
	}
	return nil
}
