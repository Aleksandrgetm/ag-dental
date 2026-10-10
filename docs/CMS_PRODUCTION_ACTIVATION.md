# AG Dental — production CMS activation

**PASS — migration 004 and the approved content import completed and were verified.**

Date: **10 October 2026, Europe/Riga** (9 October UTC). Project `dcdgrbziounizuigmjcm`; branch `feature/admin-cms`; HEAD remains `3a07279970f3bf24745baa40998d41e7ac6656ae`.

The owner explicitly approved the previously reviewed `backend/migrations/004_website_cms.sql` and the 194-group/2,198-value/12-media-registry import, conditional on fresh preflight checks. That condition passed before writes. No public-site deployment, content-edit test, media upload, Auth operation, Booking configuration change, commit, merge or push was performed.

## 1. Fresh preflight

- Production identity matched the private database project suffix and configured Supabase Auth project: **AG Dental, `dcdgrbziounizuigmjcm`**.
- PostgreSQL **17.6**, Session Pooler `aws-1-eu-west-1.pooler.supabase.com:5432`.
- **`sslmode=verify-full`**, trusted certificate chain and matching hostname verified. No credentials or private connection URLs were displayed.
- Ledger contained exactly migrations 001–003; CMS migration, tables and naming collisions were absent.
- All reviewed checksums in `CMS_PRODUCTION_PREFLIGHT.md` matched: migrations, migration runner, importer CLI/store, embedded manifest, inventory and verification queries. They were checked again after activation and remain unchanged.
- Reproducible content extraction passed: 194 documents, 2,198 fields, 26 route entries and 12 media records. All twelve registered source files matched their approved byte counts and SHA-256, including the three source-only legacy inventory assets.
- The existing archive at `/Volumes/AG-Dental-Secure/AG-Dental-20261009T210634Z-backup/database.dump` was accessible and matched SHA-256 `a32819eb14a74d22c21de24ac84acc12368e0906fce671ee23e4b8b090ddd766`. Its manifest and recovery verification status are VERIFIED.
- The fresh production SHA-256 baseline matched the backup task's **final read-only inspection** exactly: all **51 table fingerprints**, schema, role-name inventory, sequence state and supplementary metadata. No unexpected changes were found.

The backup snapshot is **2026-10-09 21:06:34 UTC**. The previously documented Auth activity after that snapshot is not in the archive: the final backup inspection and activation baseline have 14 refresh-token rows, versus 13 in the archive, and updated Auth session/user fingerprints. The fresh baseline explicitly includes that known activity; it was not mistaken for archived data or caused by this activation. The backup remains a manual point-in-time recovery source, not PITR.

Fresh preflight metadata was inspected around **2026-10-09 21:19 UTC**. Existing Auth counts were one user, one identity and one admin-role row, with no missing/orphan relationships. All Booking operational catalogs, schedules and appointments remained empty; settings retained automatic confirmation and `Europe/Riga`.

## 2. Migration execution

Executed the unchanged reviewed runner from `backend/`:

```sh
env -u DATABASE_URL go run ./cmd/migrate
```

Observed output:

```text
001_user_roles already applied
002_booking_foundation already applied
003_automatic_confirmation already applied
Applied 004_website_cms
```

No migration replay, adoption, rollback, AutoMigrate or fixture command was used. The runner's previously reviewed ledger RLS/grant hardening reasserted the existing restrictions without changing their effective state.

Exact final ledger (UTC):

| Version | Applied at |
| --- | --- |
| `001_user_roles` | `2026-10-08 14:45:26.34766+00` |
| `002_booking_foundation` | `2026-10-08 14:45:52.875126+00` |
| `003_automatic_confirmation` | `2026-10-08 14:45:53.358552+00` |
| `004_website_cms` | `2026-10-09 21:20:38.885622+00` |

Migration 004's recorded timestamp is **10 October 2026, 00:20:38.885622 in Riga**.

Immediate read-only verification passed before import:

- Exactly five new tables: `cms_documents`, `cms_revisions`, `cms_media`, `cms_events`, `cms_booking_service_links`.
- Nine indexes, all ready and valid; all 23 CMS constraints validated.
- RLS enabled on every CMS table; no browser RLS policy added.
- PUBLIC, `anon` and `authenticated` denied direct table access, including MAINTAIN and column grants.
- Identity sequence `cms_events_id_seq` denies browser/PUBLIC access.
- All five new tables empty; existing data and schema unchanged except the authorized migration ledger addition and new CMS objects/internal foreign-key dependencies.

The migration completed without an error or uncertain commit outcome. No retry or automatic rollback was needed.

## 3. Approved content import

Used the existing idempotent importer, with the reviewed private configuration loaded by godotenv without printing it:

```sh
go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --dry-run
# Dry run: 194 groups would be imported; no writes

go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --apply --confirm-import
# Imported 194 missing groups; existing content unchanged

go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --dry-run
# Dry run: 0 groups would be imported; no writes
```

There were no conflicts or existing CMS edits. Initial revisions are the approved baseline publications, not testing edits. No draft-save, editorial publish or rollback action was used for testing. The only lifecycle events are the 194 authorized `imported` events, with null actor IDs.

No media bytes were uploaded or replaced. The import registered existing media metadata only. No operational Booking service, doctor, duration, schedule, time off, appointment or mapping was created.

## 4. Exact database and content results

| Item | Verified result |
| --- | ---: |
| CMS documents | **194** |
| Initial revisions | **194** |
| Import events | **194** |
| Media registry records | **12** |
| Public API documents | **192** |
| Protected Hero reference documents | **2** |
| Total content values | **2,198** |
| LV / RU / EN values | **651 / 651 / 651** |
| Shared values | **245** |
| Public service content documents | **8** |
| Price categories / price rows | **6 / 69** |
| News articles | **4** |
| CMS-to-Booking mappings | **0** |
| Incomplete revision pointers | **0** |
| Invalid revision ownership/pointers | **0** |
| Documents changed from initial state | **0** |
| Unexpected initial events | **0** |
| Exact document-payload discrepancies | **0** |
| Exact media-metadata discrepancies | **0** |
| Repeat dry-run missing groups | **0** |

Executed the existing read-only procedures in `CMS_POST_IMPORT_VERIFY.sql` and `CMS_BASELINE_VERIFY.sql`, binding the exact approved `content.json` as a query parameter. The comparison checks complete JSON payloads, source hashes, media identities/metadata and revision state. Prices, article titles/dates/slugs, service descriptions and all language values match the approved manifest exactly; no translations or facts were invented.

Manifest SHA-256: `b8e387b0e13b03cfb8820cc838fd63f552172d228a0ed89abfde0472c918f831`.

`messages.hero` and `literal.67e05d3c.0` remain the two system-managed provenance documents. They are excluded by existing server code from admin list/detail/mutations and the public feed. Hero video/poster media stay protected. All **15 Hero-lock checks passed**, and no Hero, Welcome Intro or other application source was modified.

## 5. Data preservation and security

Compared all 51 pre-existing table fingerprints against the fresh pre-write baseline:

- **50 / 50 non-ledger tables match exactly**, including every Auth, Booking, role, Storage, Realtime and Vault table in the captured scope.
- `schema_migrations` differs only by the authorized 004 row. The three original rows and timestamps are unchanged.
- Every pre-existing table definition, owner, RLS flag, grant, column/default, constraint, index, user trigger, function, relevant sequence and default ACL matches after excluding the expected new CMS objects.
- No additional independent Auth changes occurred between the fresh baseline and post-import inspection.
- Auth remains one user, one identity and one role; zero missing/orphan roles or identities.
- Booking remains automatic, `Europe/Riga`, horizon 60 days, advance notice 120 minutes, slot interval 15 minutes, privacy notice version NULL. The validated GiST overlap constraint remains unchanged. Public booking remains unconfigured.

The database connection role retains BYPASSRLS. Verified JWT identity plus the current server-side `user_roles` lookup remains the API authorization boundary; browser roles have no direct CMS table privileges. No client-supplied role is trusted. No real clinic content was edited to test authorization.

## 6. Tests and actual backend checks

| Check | Result |
| --- | --- |
| Reviewed source checksum comparison, before/after | PASS |
| Exporter `--check` and all registered media hashes | PASS |
| Exact SQL content/media verification | PASS, zero discrepancies |
| Existing schema/data preservation | PASS |
| Backend `go test ./... -count=1 -json` | PASS: **151 test/subtest pass events**, zero failures |
| DB integration suites in this run | **4 intentionally skipped**; no test DB targets supplied |
| Actual local Go router with production DB | **10 GET checks passed** |
| Hero lock | **15 / 15 PASS** |
| `git diff --check` | PASS |

The four skipped suites are migrations, Auth DB, Booking DB and CMS DB integration suites. Their previous disposable-database rehearsal is documented in `CMS_PRODUCTION_PREFLIGHT.md`; they were not rerun against production. Current backend tests included guest/forged-token rejection, normal-user denial on CMS mutation routes, fail-closed role lookup, Hero mutation rejection and CMS content validation. These are local authorization tests, not claims of live authenticated editorial writes.

Actual HTTP checks used the existing Go router, actual GORM connector and existing Supabase verifier configuration through a temporary loopback server. All production database sessions for those checks were forced read-only and verified the TLS chain/hostname:

- `/api/health`: **200**, database connected.
- `/api/cms/published`: **200**, exactly **192** documents. Every payload matches its approved manifest entry; no protected Hero reference or private actor/source-hash field leaked.
- Conditional public CMS GET: **304** with matching ETag.
- Unauthenticated CMS list and direct Hero detail: **401**.
- Unauthenticated Booking settings/appointments: **401**.
- Booking services: **200**, unchanged empty catalog and NULL privacy version.
- Invalid/nonexistent Booking service doctor lookup: **404**.
- Booking availability: **503 booking_not_configured**, as expected.

The temporary loopback server closed after checks. No live login/session creation, authenticated content write, POST/PUT/PATCH/DELETE test, Storage upload or frontend deployment occurred. A redundant media-check script initially treated three repository-relative source-only asset paths as public URLs; correcting that diagnostic mapping confirmed all twelve hashes, consistent with the original exporter check. No asset or application repair was needed.

## 7. Availability and remaining limitations

**The CMS database is activated and the existing local Go backend is ready to support authorized administrator drafts, preview, publish and revision restore.** The schema/content blocker is removed, and actual published-content reads and access guards were verified against production.

A real authenticated editorial write was deliberately not performed. Normal operation still requires running the existing Go backend and frontend with their established configuration and signing in as an authorized admin. The smoke-check server was temporary, not a deployed service. No public API hosting or public website deployment was performed; a Vercel frontend without a reachable configured Go API does not gain remote editing solely from this database activation.

Other limits are unchanged: no Storage uploads, no new media management infrastructure, no Booking catalogs/schedules/durations enabled, no invented specialist data. The verified recovery archive predates both the known Auth activity and CMS activation. It remains the pre-CMS recovery point, not a backup of the newly imported CMS; no additional backup or retention change was performed in this task.

## 8. Files and evidence

Repository documentation added: `docs/CMS_PRODUCTION_ACTIVATION.md` (this report). Prior reports remain historical and unchanged.

Private Git-ignored evidence/helpers under `backend/.tls`:

- `cms-activation-preflight.log` and fresh fingerprint snapshot `cms-preflight-20261009T211922Z.json`.
- `cms-schema-check.go` and `cms-activation-schema.log`.
- `cms-activation-postsnapshot.go`.
- `cms-activation-content-verification.log`.
- `cms-activation-health.go` and `cms-activation-http.log`.
- `cms-activation-unit-tests.jsonl`.
- `cms-activation-preservation.json`.

Read-only fingerprint metadata is retained under `/tmp/ag-cms-activation-baseline-20261009`, `/tmp/ag-cms-after-migration-20261009` and `/tmp/ag-cms-after-import-20261009`. These are metadata/fingerprints, not new database backups. Private operator evidence is not committed.

Existing uncommitted project work was preserved. No implementation, migration, importer, public design or Git branch/history change was made. **Activation is complete. Stop here; further actions require the owner's next instruction.**
