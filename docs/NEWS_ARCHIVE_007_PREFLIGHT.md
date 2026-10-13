# Migration 007 production preflight — 2026-10-11

> Status clarification — 2026-10-13: Migration 007 was subsequently applied and verified. See [activation evidence](NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md). Do not replay this historical preflight procedure.

**BLOCKED — no production migration executed.** Branch `feature/final-development`.

## Migration review

Reviewed `backend/migrations/proposed/007_news_archive.sql` SHA-256:
`84cb1982b21c404d745bdab924be992476147ea3cfd018de31f935699ecee41d`.

One transaction adds nullable `cms_documents.archived_at`, the `cms_archive_unpublished` check, a partial archive index, and extends the existing CMS event check with `archived` / `restored`. Existing event types from 004/006 remain accepted. No data UPDATE/DELETE, table drop, grants, RLS, Auth, Booking or Storage alterations. Existing records receive NULL archive markers. Existing revision/media foreign keys and document keys remain unchanged. The unpublished constraint prevents simultaneous archive/publication; application row locks and version checks handle concurrent edits. Restoration returns unpublished and retains revisions/audit.

DDL requires short exclusive locks on CMS tables and validates constraints; schedule a low-activity window and apply explicit lock/statement timeouts in the activation runner. Failure must stop for state inspection. The rollback refuses to erase archive or restoration history.

**Runner gap:** 007 is not registered in the production runner and its SQL does not record a ledger entry. Running the normal runner will not activate 007. Do not run the SQL manually. A dedicated, checksum-pinned, ledger-aware 007 activation path must be implemented/tested before approval to execute it. Existing 006 machinery cannot safely be reused by changing only its filename.

## Fresh read-only production verification

The existing audited private `operations006-postcheck.go` was executed in a repeatable-read, read-only transaction with `default_transaction_read_only=on`; transaction rolled back on completion.

- Project/Auth URL and pooler username identify `dcdgrbziounizuigmjcm`.
- Session pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`.
- `sslmode=verify-full`, pinned CA verified, nonempty verified TLS chain and explicit certificate hostname validation passed.
- Exact ledger: `001_user_roles`, `002_booking_foundation`, `003_automatic_confirmation`, `004_website_cms`, `005_cms_media`, `006_admin_operations`. No 007.
- Schema fingerprint matches the previous post-006 browser baseline. Archive column is therefore absent.
- Fresh private evidence: `/Volumes/AG-Dental-Secure/news007-preflight-20261011` (outside Git).

Compared with the post-006 baseline, these table fingerprints changed:

| Table | Previous rows | Current rows |
|---|---:|---:|
| auth.mfa_amr_claims | 1 | 2 |
| auth.refresh_tokens | 19 | 3 |
| auth.sessions | 1 | 2 |
| auth.users | 1 | 1 |
| public.admin_operation_events | 0 | 2 |
| public.admin_profile_media_references | 0 | 2 |
| public.cms_documents | 194 | 195 |
| public.cms_events | 194 | 197 |
| public.cms_revisions | 194 | 195 |
| public.doctor_profiles | 0 | 1 |
| public.doctor_schedules | 0 | 1 |
| public.doctors | 0 | 1 |

Changes were observed, not made by this task. Counts alone do not establish which edits were approved. Existing CMS content cannot be claimed byte-identical to the old baseline. Unlisted captured table fingerprints match, including `user_roles` (1), CMS media (12), appointments (0) and Storage objects (0). No raw patient, Auth or content values were printed.

## Backup gate

Mounted encrypted image verified at `/Volumes/AG-Dental-Secure`; `hdiutil isencrypted` reports YES. Latest available archive:
`AG-Dental-20261010T131828Z-backup/database.dump`.

Fresh SHA-256 matches its verified manifest:
`93f957f547e7cc0adcce06d9bb69626b11f9fdc2bbfef41dd1d151e2e1599c67`.

Existing isolated-restore evidence dated 2026-10-10 13:21:43 UTC records 54 restored tables and matching row/schema/ACL/sequence comparisons. This evidence was inspected; **no new restore was executed this turn**. The snapshot predates migration 006 and the changed rows above. It is a verified historical backup, **not a current recovery point**. No later backup directory was present. A new encrypted snapshot plus isolated restoration and fingerprint verification is required. Database backups contain Storage metadata, not object bytes; current Storage object count is zero. Do not treat a standalone PostgreSQL restore as full Supabase-platform recovery.

Because freshness failed, activation stopped. No new backup, production SQL write, upload, restart, or automatic repair occurred.

## Disposable tests

`sh backend/scripts/test-media-local.sh`: PASS against new disposable PostgreSQL 17.11. All Go packages passed, including migration, Auth, Booking, CMS, Media and Admin/API security tests. CMS coverage exercises archive and restore for published/unpublished synthetic articles, retained revisions, public/list exclusion, version conflicts, duplicate requests and revoked-role denial.

Added repeat-007 checks to the disposable runner: replaying raw SQL fails at the already-existing column, the transaction rolls back, and exactly one archive column remains. This is safe atomic refusal, **not successful idempotent runner execution**; ledger-aware repeat/no-op still needs implementation/tests. The test cluster was removed. No production configuration is read by this runner.

Hero lock: 15/15 PASS. Existing migrations 001–006 unchanged. No Hero/Welcome/frontend design changes.

## Backend readiness

Private config presence checked without values: DATABASE_URL, SUPABASE_URL, publishable key, PORT and CORS origins present; PORT=8080, MEDIA_UPLOADS_ENABLED=false. Verified database TLS config is as above.

During inspection, API PID 10424 was independently listening on 8080 from a temporary `go-build` binary. Read-only health check returned HTTP 200: database connected, service ag-dental-api. No process was started, stopped or replaced by this task. Its exact source revision cannot be proven from that temporary executable path. Rebuild from reviewed current source after gates pass; do not assume this listener includes the new archive diagnostics. Backend startup source has no migration/AutoMigrate path.

## Exact activation sequence — NOT AUTHORIZED FOR EXECUTION

1. Obtain approval for a fresh encrypted backup and isolated restore, then capture a consistent read-only snapshot and schema/data fingerprints. Verify archive SHA-256 and isolated restore comparisons. Preserve existing historical backups.
2. Review the changed rows above as the new baseline; do not overwrite them or assume the older 194-document inventory is still current.
3. Implement/test an explicit `--apply-news-archive` runner operation (proposed flag, not currently available). Require exact 001–006 ledger, pinned SQL checksum, no conflicting objects, advisory lock, lock timeout, statement timeout, and atomic schema plus ledger recording. Repeat must verify and no-op. Test partial/unknown ledger, checksum drift, conflicts, rollback and preservation on disposable PostgreSQL.
4. Present exact runner/migration hashes and successful recovery results; request explicit production activation approval. Approval for this preflight is not migration approval.
5. Immediately before approved execution, recheck project/TLS, ledger, fresh backup hash and schema/data drift. Stop on any unexpected difference.
6. Run only the newly reviewed 007-specific runner operation from `backend` using private verified .env; never run raw SQL or replay 001–006. Inspect ledger/schema before any retry if commit outcome is uncertain.
7. Read-only postcheck: ledger 001–007, archive column/type, valid check/index, complete old plus new event allowlist, unchanged RLS/grants, and all prior row fingerprints preserved (apart from deliberate ledger entry and NULL archive field). Compare CMS rows after excluding the added NULL field. Verify no article was archived and no revisions/events inserted by activation.
8. Build/start latest backend safely, preserving uploads disabled. Health 200; protected archive routes require verified admin. Only disposable data for successful write smoke tests; no deletion of the actual test article.

No ready-to-run production activation command exists yet; inventing one would bypass the reviewed runner. All gates must pass before migration approval is requested.

## Files changed / next decision

- `backend/scripts/test-media-local.sh`: isolated repeat-migration safety checks.
- `docs/NEWS_ARCHIVE_007_PREFLIGHT.md`: this report.
- Private read-only evidence directory on the encrypted volume, noted above.

Pre-existing uncommitted changes preserved. No commit, merge, push or deployment.

Next required authorization: create a fresh encrypted backup and verify its isolated restore. Production migration 007 approval must follow the successful recovery gate and completed runner review.
