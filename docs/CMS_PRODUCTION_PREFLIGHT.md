# AG Dental CMS production preflight — 9 October 2026

> Recovery update — 10 October 2026 (Europe/Riga): the separately authorized encrypted manual backup and isolated application-database restore passed. See [SUPABASE_BACKUP_RESTORE_VERIFICATION.md](SUPABASE_BACKUP_RESTORE_VERIFICATION.md) for the VERIFIED result, snapshot time, scope and platform limitations. The original preflight below is historical; production CMS migration/import still require fresh checks and explicit approval.

**Read-only preflight completed. No production migration, content import, test record, draft, publication, role change or backup was made. Deployment remains awaiting explicit approval.** This report follows the owner's clarification: production content must not be edited or published for testing; write tests belong only in a disposable local database.

Technical compatibility and local rehearsal: **PASS**. Database recovery readiness: **BLOCKED — no verified recovery point**. These are separate results; the technical pass does not waive recovery risk or authorize deployment.

Branch: `feature/admin-cms`. HEAD: `3a07279970f3bf24745baa40998d41e7ac6656ae`. Existing uncommitted CMS foundation/UX changes were preserved. No commit, merge or push. No application, migration, importer, frontend, Hero, Welcome, Booking or Auth source was changed during this preflight.

## 1. Correct target and verified connection

The signed-in Supabase Dashboard identified organization **AG Dental / FREE**, project **AG Dental**, branch **main / PRODUCTION**, project reference **`dcdgrbziounizuigmjcm`**. The private database username's project suffix and the backend Supabase Auth hostname match that project.

- Database: `postgres`, PostgreSQL **17.6**.
- Connection: shared **Session Pooler**, `aws-1-eu-west-1.pooler.supabase.com:5432`.
- `sslmode=verify-full`; independently trusted Supabase Root 2021 CA; TLS **1.3**; one verified chain; actual pooler hostname matches the certificate SAN.
- Wrong-hostname and empty-root-trust negative checks reject the connection certificate.
- The actual GORM/pgx `database.Connect()` implementation passed the same strict verification.
- Production SQL inspections used `REPEATABLE READ READ ONLY`, with `default_transaction_read_only=on`, ending in rollback. Final snapshot: **2026-10-09 20:28:20–20:28:27 UTC**. Temporary Go HTTP checks also forced all database sessions read-only.
- Existing `.env` and CA files were neither displayed nor changed. The private directory and generated metadata remain Git-ignored.

CA PEM SHA-256: `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.

## 2. Ledger and existing production schema

The ledger matches the completed Booking deployment report exactly:

| Version | Applied at, UTC |
| --- | --- |
| `001_user_roles` | `2026-10-08 14:45:26.34766+00` |
| `002_booking_foundation` | `2026-10-08 14:45:52.875126+00` |
| `003_automatic_confirmation` | `2026-10-08 14:45:53.358552+00` |

**004 is absent.** There are twelve public tables: `schema_migrations`, `user_roles`, and the ten existing Booking tables. All have RLS enabled and deny ordinary browser table access. There are no public RLS policies. The role and ledger tables also deny PUBLIC/column grants; the ledger denies the PostgreSQL 17 MAINTAIN privilege to browser roles.

No `cms_*` public relation, index, sequence, row type or function naming collision was found. The required UUID primary keys on `auth.users` and `public.services`, ledger structure, schema CREATE privilege and foreign-key REFERENCES privileges exist. Core `gen_random_uuid()` is available. Migration 004 requires **no additional extension**. Existing `btree_gist` 1.7 and `pgcrypto` 1.3 remain installed.

Auth has **one user, one identity and one matching admin-role record**, with zero missing/orphan roles. The signup function still forces the `user` role, uses SECURITY DEFINER with an empty search path, denies browser execution and has its enabled Auth insert trigger. No user identifiers, contact values or tokens were printed.

Production Booking counts:

| Table | Rows |
| --- | ---: |
| `services`, `doctors`, `doctor_services` | 0 each |
| `doctor_schedules`, `doctor_time_off` | 0 each |
| `appointments`, `appointment_events`, `notification_outbox` | 0 each |
| `booking_settings` | 1 |
| `booking_settings_events` | 1 |

Stored confirmation mode remains **automatic**; timezone `Europe/Riga`; horizon 60 days; advance notice 120 minutes; interval 15 minutes; privacy notice version NULL. The validated `appointments_doctor_no_overlap` GiST exclusion constraint still protects overlapping `pending`, `confirmed`, `completed` and `no_show` appointments using half-open time ranges. No production collision-write test was performed. Public booking remains unconfigured.

Aggregate data fingerprints for **41 existing tables** (27 Auth, twelve public, Storage buckets/objects) and three schema/function/event-trigger fingerprint groups matched between the initial and final preflight snapshots. This verifies no change during the inspection window in the captured scope. These metadata fingerprints contain no exported rows and are **not backups**. Recheck immediately before any later deployment; this observation is not a lock against future activity.

## 3. Migration reviewed and naming discrepancy

The actual implemented file is **`backend/migrations/004_website_cms.sql`**, with ledger key **`004_website_cms`**. The requested name `004_cms_foundation.sql` does not exist in this working tree. Do not rename the reviewed migration, invent another 004, or run a similarly named file from another checkout. Approval must identify the actual file below.

| New table | Purpose |
| --- | --- |
| `cms_documents` | Stable key, source hash, version, draft/publication pointers |
| `cms_revisions` | Content payload, publication timestamp, optional Auth actor |
| `cms_media` | Existing asset identifiers, URLs, byte hashes, metadata, protection flags |
| `cms_events` | Minimal imported/draft/published/rollback audit events |
| `cms_booking_service_links` | Explicit editorial-to-operational service mapping; imported empty |

Migration 004 creates these five tables, nine indexes including primary/unique indexes, the `cms_events_id_seq` identity sequence, and validated constraints. Composite foreign keys enforce ownership of revision pointers and event references. It enables RLS and revokes ALL table/sequence privileges from PUBLIC, anon and authenticated, then inserts its ledger entry in the same transaction.

It does not update or delete existing Auth, roles, Booking, settings, appointments or prices. It references Auth users and operational services with foreign keys; PostgreSQL adds the corresponding internal referential-integrity triggers and briefly locks referenced objects during DDL. These dependency effects are expected; no signup trigger or role table is recreated.

The existing Supabase `ensure_rls` event trigger only enables RLS on newly created public tables. No blind policy rewrite is needed. Current postgres default grants include TRUNCATE/REFERENCES/TRIGGER/MAINTAIN for browser roles; 004's explicit `REVOKE ALL` removes them before commit. This was rehearsed locally using the observed defaults. The existing privileged `service_role` remains a server-only trust boundary; no secret key may be exposed to the browser.

The reviewed runner knows versions 001–004 and will skip the three recorded versions. It also reasserts existing ledger RLS/grant protection after migration; that protection already matches the intended state. Do not invoke adoption, rollback flags, raw production SQL migration files, development fixtures or AutoMigrate.

## 4. Inventory and import safety

Reproducible extraction, duplicate/shape/path checks, exact values, source references and asset-byte checks passed:

| Inventory | Verified result |
| --- | ---: |
| Unique content groups | 194 |
| Values | 2,198 |
| LV / RU / EN values | 651 / 651 / 651 |
| Shared values | 245 |
| Concrete route entries | 26 |
| Public services | 8 |
| Price categories / rows | 6 / 69 |
| Articles | 4 |
| Registered media | 12 |

There are no duplicate document keys, leaf identifiers, field paths, asset IDs or asset URLs. Every homepage-section key, price mapping and content media reference resolves. Article titles, dates, slugs, complete language payloads, service content, price strings, ordering and review flags match the approved source. All twelve registered files exist with the expected SHA-256 and byte size. Three unused source-only starter assets are technical inventory entries, not publicly fetchable CMS replacement choices.

The 2,198 total includes shared source literals; it does not mean 2,198 independent three-language translations. Existing shared/Latvian-only wording and `CLIENT_CONFIRMATION_REQUIRED` flags are preserved, not translated or legally reinterpreted by this activation.

The importer is a **transactional insert-missing operation**, not a synchronizer. It uses an advisory lock, validates definitions, rejects incompatible hashes/missing revision pointers or asset identity conflicts, and leaves matching existing content, drafts, publication pointers and histories unchanged. Failure rolls the transaction back. Local tests demonstrated a second import adds zero groups and does not overwrite staff edits. Production currently contains no CMS documents to conflict with.

Initial import creates 194 documents, 194 revisions, 194 imported events, twelve media records and **zero** Booking mappings. Each initial revision has both draft and publication pointers, version 1 and a publication timestamp. No operational service, duration, doctor, schedule, Auth user or appointment is created. No files are uploaded or replaced.

## 5. Hero and authorization

`messages.hero` and `literal.67e05d3c.0` remain system-managed provenance documents. They are retained in the 194 technical records but excluded from admin list/detail, save/publish/restore operations and the public publication feed. Expected initial public feed: **192** documents. A non-null provenance publication pointer does not make a Hero document publishable through the API.

Hero video/poster references and the shared Hero CTA fields remain immutable and hidden from editors/previews. Homepage editing begins with the introduction after the Hero. All **15 Hero-lock hashes pass**, including approved shared styles, copy, fonts and media.

All five CMS tables and their identity sequence deny browser direct access. The Go database role is `postgres` with BYPASSRLS, so server-side verified Supabase identity plus current `user_roles` lookup is the authorization boundary. Client role claims cannot authorize writes. Public responses select the current published pointer only; they do not expose drafts or actor information. Unknown/system keys are filtered.

Local authorization tests prove guests/forged tokens receive 401, ordinary users receive 403 on every CMS admin route, role lookup failures fail closed, and Hero mutations fail before storage access. Publish and restore require validated revision ownership and optimistic version checks. These are local middleware/database tests, not a claim that live authenticated production publication was exercised.

## 6. Tests and read-only API checks executed

| Check | Result |
| --- | --- |
| Strict TLS diagnostic and actual GORM connector | PASS, verified chain + matching hostname, negative checks pass |
| Two production read-only schema/data inspections | PASS; 41 data / three schema fingerprint groups unchanged |
| `node frontend/scripts/export-cms-content.mjs --check` | PASS, exact 194 / 2,198 / 26 / 12 |
| Independent inventory, path, reference and all-asset SHA checks | PASS |
| `go run ./cmd/cms` (offline default) | PASS, no DB connection |
| `node --test frontend/tests/*.test.mjs` | PASS, 76 tests, zero skipped |
| `go test ./... -count=1 -json`, four isolated test database configurations | PASS, 188 test/subtest pass events, zero skipped integration suites |
| All four DB suites | PASS: migration runner, Auth roles, Booking, CMS |
| Fresh local import and repeated import | 194 added, then 0 added; final dry run 0 |
| Prepared post-import SQL and full baseline comparison | PASS; 194/2,198/12; zero payload or media discrepancies; all grants denied; nine indexes ready/valid |
| Hero lock / whitespace checks | PASS, 15/15 and `git diff --check` |

The first sandboxed Go test attempt could not bind an `httptest` listener; the permitted rerun passed. An initial run without test database variables correctly skipped four integration suites; the subsequent full run supplied four independent disposable local databases and executed all of them. The new verification SQL initially encountered a missing `auth.identities` stub in the minimal local test schema; adding only that empty **local** stub allowed the complete verification to pass. No production repair was required.

Write tests ran in the newly created `ag-dental-cms-preflight-20261009` PostgreSQL 17 container, published only on `127.0.0.1:55441`, with explicit `_test` databases and disposable confirmations. They excluded production environment configuration and used synthetic records only. This is a schema/import rehearsal, **not a Supabase backup restore drill**. The test container is stopped and removed after verification; other user containers are untouched.

A temporary loopback Go server used the actual production connection with read-only mode and verified TLS. All nine GET-only checks passed:

- `/api/health`: 200, database connected.
- `/api/booking/services`: 200, empty catalog and NULL privacy version.
- `/api/booking/doctors` with a nonexistent valid ID: 404.
- `/api/booking/availability` with that ID: 503, booking not configured.
- `/api/cms/published`: **503, content unavailable**, as expected before 004.
- `/api/admin/cms/documents`, direct Hero detail, Booking settings and Booking appointments without credentials: 401.

No production login, session creation, POST, PUT, PATCH or DELETE was performed. The loopback server closed afterward. No frontend build/browser design pass was needed for this documentation-only preflight; the current frontend unit and Hero checks were rerun. A hosted Go API deployment and live authenticated admin testing are not claimed.

## 7. Recovery and rollback

Fresh Dashboard inspection confirmed **Free Plan does not include project backups**, and PITR is unavailable without an eligible paid configuration. No backup was created, downloaded, restored or verified. No existing usable recovery point is established. See `BOOKING_BACKUP_READINESS.md` for the earlier manual capture/recovery plan; its inventory must be refreshed for the now-applied Booking schema.

The prior backup waiver authorized only Booking migrations 001–003. It is not reused for CMS. Before deployment, the owner must choose either a separately approved backup/verification step or explicitly accept proceeding without a verified recovery point for this exact 004/import sequence.

The down migration only removes an empty CMS and refuses after documents/media are imported. Never auto-run it after failure. After import, revisions can restore content publications, but that is not recovery from database loss. An interrupted COMMIT requires inspecting ledger/schema/content before retrying; do not trust a generic runner failure message as proof that nothing committed. The idempotent importer supports a safe reviewed retry after state inspection, not an automatic retry around unknown outcomes.

## 8. Exact approval-gated sequence and verification

**Prepared only — do not execute production writes without new explicit approval.** Freshly repeat target/TLS/ledger/object/hash/preservation checks first. If any source or production state differs, stop and review it.

From `backend/`, the existing runner loads the private `.env`. Clearing an inherited URL prevents a different target from taking precedence:

```sh
env -u DATABASE_URL go run ./cmd/migrate
```

Expected: 001–003 already applied; apply only **004_website_cms**. Immediately verify the four ledger entries and five new tables before importing. Do not run another command following a migration error until inspecting the resulting state.

The existing import CLI intentionally does not load `.env`. Use the already installed `github.com/joho/godotenv` CLI to pass the verified private configuration as environment variables, without putting credentials in arguments or evaluating `.env` as shell code. `-o` deliberately selects the just-reviewed private file over inherited variables. Do not enable shell tracing or print the environment.

```sh
go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --dry-run
# Stop unless exactly 194 missing groups and no conflicts.
go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --apply --confirm-import
go run github.com/joho/godotenv/cmd/godotenv -o -f .env go run ./cmd/cms --dry-run
# Expect 0 missing groups; existing content unchanged.
```

Run `docs/CMS_POST_IMPORT_VERIFY.sql` inside its read-only transaction and `docs/CMS_BASELINE_VERIFY.sql` with the exact reviewed `backend/internal/cms/content.json` bound as `$1`. The latter compares **every complete JSON payload and every asset's metadata**, not merely counts/hashes. It detects missing/extra keys, changed prices, translations, dates, slugs or references without outputting all content.

A local ignored diagnostic, validated against the disposable test database, executes both queries and binds the manifest safely:

```sh
go run ./.tls/cms-verify.go
```

It pins the reviewed manifest checksum, validates the production target/CA/hostname, and forces read-only sessions. This diagnostic is not a replacement migration/import runner. It is local, not a distributed deployment dependency; its SQL files and semantics are retained in the repository. Its no-argument production invocation has **not** been run while the CMS schema is absent.

Expected initial state: 194 documents/revisions/events; twelve media; 2,198 leaves; 8 services, 6 categories, 69 rows, 4 articles; 2 system references excluded from the 192-document public feed; zero discrepancies, incomplete pointers or Booking mappings; all CMS RLS enabled and browser privileges absent. Compare all pre-existing data/schema fingerprints, excluding only the expected new ledger row and CMS-owned objects/internal FK effects. Existing 001–003 ledger timestamps must remain unchanged.

After approval and import, verification remains read-only against production. Do not edit/publish real clinic content to test the workflow. Future UI write testing uses a disposable local database. No Booking, Storage upload, operational catalog or public-booking activation is included in this approval scope.

## 9. Files changed by this preflight

Repository documentation only:

- `docs/CMS_PRODUCTION_PREFLIGHT.md` — this report.
- `docs/CMS_POST_IMPORT_VERIFY.sql` — expanded exact read-only checks.
- `docs/CMS_BASELINE_VERIFY.sql` — complete parameterized manifest/media comparison.

Private ignored diagnostics: `backend/.tls/cms-verify.go`, `backend/.tls/cms-preflight-health.go`, and two mode-0600 fingerprint snapshots (`cms-preflight-20261009T202213Z.json`, `cms-preflight-20261009T202827Z.json`). Temporary credential-free diagnostic/test scripts and logs are under `/tmp/ag-cms-*` and `/tmp/dental-cms-preflight.go`. These metadata files are not backups. No credentials/private files are committed.

## 10. Reviewed checksums

SHA-256 at preflight completion. Previous `CMS_VALIDATION.md` contains an older manifest hash from before the subsequent Hero-exclusion UX refinement; the current reproducible manifest and current tests were reviewed here, without rewriting that historical report.

```text
7297b745a5f0e94b04b106e082aac10d2447dee6f0c083e22ed16f0601a44337  backend/migrations/001_user_roles.sql
cafb1e0f73a3be14e248949942256c794e53ae06f354dbda2002624b701be01e  backend/migrations/002_booking_foundation.sql
8061246853b5cbf3e8690199bc56877b3f30d1e0c6efd206976a89daa036bdd5  backend/migrations/003_automatic_confirmation.sql
69fde95d6673851a70f073a13eea8173b14e18e94c3139a2ec613fb939e04b51  backend/migrations/004_website_cms.sql
9087c67dacb57dd3934318a9426e2c652868b2f92082b11e3f7c04fddab045a8  backend/migrations/004_website_cms.down.sql
daafd9e55f0423a9947488878063ec0ff174879dee46360eaf96dd1f82720cfd  backend/cmd/migrate/main.go
ced209a5ca503e62e53d4412afd65995b3a1dfc79afaaec795a4e7e0f782be17  backend/cmd/cms/main.go
d24cb1d6eb184dc760ffc8b33d0b43c74a9160db5766ba16c4ad648ca67914c6  backend/internal/cms/store.go
b8e387b0e13b03cfb8820cc838fd63f552172d228a0ed89abfde0472c918f831  backend/internal/cms/content.json
6ccfc78947faa5e53130946022aae6af52a67fa9b7506f94bf8d361ac6680dbd  docs/CMS_CONTENT_INVENTORY.json
b56f4c91ff59404844b9a6a73e10c51580ac3ba3435ac707595b9a0256849f95  docs/CMS_POST_IMPORT_VERIFY.sql
98c83245e50236daa5fa45630a0eafbeb65f89f39e4f269b95807b037d0fef2f  docs/CMS_BASELINE_VERIFY.sql
```

**Next action:** review this report and explicitly approve the actual `004_website_cms.sql` migration plus the 194-group/12-media-registry import, including the recovery choice. Until then, production remains at migrations 001–003 with no CMS tables or imported content.
