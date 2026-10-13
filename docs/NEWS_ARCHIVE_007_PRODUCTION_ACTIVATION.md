# Migration 007 production activation — complete

2026-10-11 · AG Dental `dcdgrbziounizuigmjcm` · `feature/final-development`

## Result

Owner-approved migration `007_news_archive` committed at **2026-10-11 20:06:12.069040 UTC**. Only 007 ran. No real article was deleted, restored, unpublished or edited. No production fixture, Storage upload, Booking activation, Resend, deployment, commit, merge or push.

## Runner

Added explicit `--apply-news-archive`, separate from the ordinary 001–005 manifest and the existing 006 flag. Mutually exclusive migration actions; exact complete baseline and existing advisory lock required. Migration SQL remains byte-for-byte unchanged in its proposed location.

The runner hashes the file before execution, checks object conflicts and the 006 schema/security baseline, then executes the reviewed transaction body in a pgx transaction with its ledger insert. Transaction delimiters are removed only after exact hash/envelope verification so no nested commit can separate schema from bookkeeping. Local lock timeout 5 seconds and statement timeout 60 seconds. Schema, grants and ledger are checked before commit. Commit uncertainty returns a stop/inspect error. Repeat execution validates the complete 001–007 ledger and archive schema/security and performs no writes.

Executed once, from `backend`:

```sh
env -u DATABASE_URL /tmp/ag007-migrate --apply-news-archive
```

No raw migration execution or replay of 001–006. The binary was built from the tested current source; equivalent source command is `env -u DATABASE_URL go run ./cmd/migrate --apply-news-archive`. Activation is complete; do not rerun as a smoke test.

| Artifact | SHA-256 |
|---|---|
| Unchanged 007 SQL | `84cb1982b21c404d745bdab924be992476147ea3cfd018de31f935699ecee41d` |
| Runner main.go | `6e5613cf4802f4d4ba6304a057c00148f2c88d17a769c0e6b3e7d0be1aa9f931` |
| Runner news_archive.go | `0d2a4fac30392b0f409ccffebb99d7ffde1bb9f94ec4c65c8951b71f9a75d162` |
| Runner binary | `c4f1ac9e21c110ad154920aef585c0cb8db24220c351fe8c98ccf08c10b2bb85` |
| API binary | `e2c60e3d0fd372ba433927dce3b8a4508c48fc927314cb85d4f4de5a2063d618` |

## Safety gates

All passed before production execution:

- Exact project-specific Session Pooler and Auth identity; PostgreSQL `sslmode=verify-full`, pinned CA, trusted chain and matching hostname.
- Exact 001–006 ledger; no 007/conflicting schema.
- Mounted encrypted backup `/Volumes/AG-Dental-Secure/AG-Dental-20261011T200046Z-backup/database.dump` rehashed to `de90bac49ea5772bbdb644f63871adb7f11ee4617ee1b81a5a793f50729254b9`.
- Valid VERIFIED isolated restore evidence: 57 tables and all security/metadata checks passed.
- Fresh production data, schema, supplementary metadata, role and sequence fingerprints exactly matched the approved snapshot baseline.
- Migration checksum matched the approved preflight. Existing 001–006 SQL files unchanged.

## Postchecks

Read-only verified TLS snapshot confirms exact ledger:

1. `001_user_roles`
2. `002_booking_foundation`
3. `003_automatic_confirmation`
4. `004_website_cms`
5. `005_cms_media`
6. `006_admin_operations`
7. `007_news_archive`

Expected schema verified: nullable timestamptz `cms_documents.archived_at` without default; validated `cms_archive_unpublished`; valid/ready partial btree `cms_documents_archive`; validated CMS event check preserving all prior values and adding `archived`/`restored`. RLS, grants, policies, owners and unrelated schema unchanged.

Only `cms_documents` and `cms_events` schema metadata changed, exactly as expected. All existing row fingerprints matched after excluding only the new NULL archive column from CMS document serialization; **only the migration-ledger row fingerprint changed**. Publication/draft pointers, content, revisions, history and media therefore remain preserved.

Preserved: 195 CMS documents, 195 revisions, 197 events, 12 media registry entries; one doctor/profile/schedule; one Auth user and role; zero services and appointments; one Storage bucket and zero objects. No synthetic clinic records were inserted.

Encrypted private before/after evidence is retained beneath the approved backup directory as `activation007-before` and `activation007-after`. Existing backup checksums continue to describe the original backup artifacts; these additional directories are activation evidence, not part of the recovery snapshot.

## Local backend

Rebuilt the API from current source to `/tmp/ag007-api`. Identified the previous port-8080 executable before stopping only PID 10424. Started the new binary as PID **11954**, preserving private configuration and `MEDIA_UPLOADS_ENABLED=false`. Private log: ignored `backend/.tls/ag007-api.log`.

- `/api/health`: **200**, database connected.
- Archived-News list without JWT: **401**.
- Archive/restore endpoints with no JWT or mutation payload: **401**, proving registration and authentication enforcement. No authorized production mutation was used as a test.

Latest binary includes News archive implementation and schema-unavailable diagnostics. Authorized administrators can now use Delete and Restore locally; no additional migration gate remains. Refresh an already-open admin page if it retains an earlier failure. The actual test article remains untouched. The local backend is a temporary process, not an installed/deployed service.

## Tests

`sh backend/scripts/test-media-local.sh`: all Go packages PASS against fresh disposable PostgreSQL, including migration runner, CMS archive/restore, Auth, Admin authorization, Booking and Media regressions. New activation tests cover default-command exclusion, checksum drift, unknown/gapped ledger, object conflicts, forced ledger-insert failure after DDL (complete rollback), preserved synthetic document data, verified repeat/no-op, and weakened-RLS rejection. The first test attempt had an incomplete synthetic fixture source_hash; it was corrected and the full suite rerun successfully before production activation.

Existing synthetic CMS lifecycle tests cover published/unpublished archive, restore as unpublished, list/public exclusion, retained revisions/audit, duplicate requests and version/role protections. No production write acceptance was attempted.

`go vet ./cmd/migrate`, runner/API builds, `git diff --check`: PASS. **15/15 Hero locks PASS**. Disposable cluster removed by the test runner.

## Exact files changed in this activation

- `backend/cmd/migrate/main.go`
- `backend/cmd/migrate/news_archive.go` (new)
- `backend/cmd/migrate/news_archive_test.go` (new)
- `docs/NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md` (new)

Private ignored helpers: `backend/.tls/news007-activation-postcheck.go`, `backend/.tls/news007-start-api.go`; private API log. Tested binaries in `/tmp`; encrypted before/after evidence outside Git. All pre-existing uncommitted work preserved. No migration SQL, Hero, Welcome, frontend, production article or configuration was edited in this activation.

## Remaining limitations

No further local schema activation is needed for News deletion. Hosted use still needs separately authorized backend/frontend deployment. Backup represents the pre-007 snapshot; future recovery must account for approved migrations and activity after it. Public disconnected-content fallback limitations remain as documented in NEWS_DELETION_FIX.md. No real-content deletion was used to demonstrate activation.
