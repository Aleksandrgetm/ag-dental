# Migration 008 production preflight

> Status clarification — 2026-10-13: Migration 008 was subsequently integrated, applied and verified. See [activation evidence](BOOKING_008_PRODUCTION_ACTIVATION.md). The missing-runner and unapplied-migration statements below are historical.

2026-10-13 · `feature/final-development` · AG Dental `dcdgrbziounizuigmjcm`

**Production safety and recovery checks PASS. Migration 008 is NOT applied. Activation requires explicit approval and the ledger-aware runner integration described below.** No production records, settings, CMS, prices, Storage, services, doctors or appointments were changed. No deployment, commit, merge or push occurred. The existing production-connected backend was not restarted. Public Booking was not enabled.

## 1. Production identity and baseline

The existing ignored backend configuration was read without printing credentials. Verified:

- Supabase project hostname and project-qualified database username match `dcdgrbziounizuigmjcm`.
- Session Pooler: `aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`, PostgreSQL 17.6.
- `sslmode=verify-full`; pgx TLS has a trusted verified chain and an explicitly validated matching hostname. No insecure fallback.
- Trusted CA SHA-256: `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
- Every production connection used `default_transaction_read_only=on`; inspection/capture transactions were read-only and rolled back.
- No `booking_horizon_months` column or same-named check constraint exists.

Exact ledger, unchanged before/after:

| Version | Applied UTC |
| --- | --- |
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |
| 005_cms_media | 2026-10-10 11:00:43.465901 |
| 006_admin_operations | 2026-10-10 13:33:42.900410 |
| 007_news_archive | 2026-10-11 20:06:12.069040 |

Current counts, verified against the same backup snapshot and final production fingerprints:

| Area | Count |
| --- | ---: |
| Auth users / identities / user roles | 1 / 1 / 1 |
| Missing/orphan Auth-role/identity links | 0 |
| CMS documents / revisions / events | 198 / 198 / 205 |
| Media registry / media events | 13 / 4 |
| Catalog services / categories / price rows | 8 / 6 / 69 |
| Operational services / doctor-service links | 0 / 0 |
| Doctors / doctor profiles / schedule intervals | 1 / 1 / 1 |
| Time off / appointments / appointment events | 0 / 0 / 0 |
| Booking settings / settings events | 1 / 1 |
| Notification outbox | 0 |
| Storage buckets / objects | 1 / 0 |

Existing schedule/doctor records were neither interpreted as approved launch configuration nor edited. Current settings are **automatic confirmation, 60-day horizon, 120-minute advance, 15-minute slot interval, Europe/Riga, NULL privacy notice version**. The new clinic rules are not yet activated. Migration alone must not change these values.

All **61 source-table** fingerprints, source schema, role-name inventory and sequence state matched before/after. This preserves CMS payloads, prices, IDs, revisions, media references, Auth, Booking and Storage metadata exactly during this task. No production write tests were used.

## 2. Migration review

Reviewed source: `backend/migrations/proposed/008_calendar_month_horizon.sql`.

SHA-256:

```text
2b1db4fc48db4bfd36b7296bce67317aa5eb2e5ed13650c573e695c938069394
```

Rollback: `backend/migrations/proposed/008_calendar_month_horizon.down.sql`.

```text
ab58e328426dfa85e4fc5e4fccc71c363b812eb8261d0fd345d5858170f8e061
```

The forward transaction adds only:

- `public.booking_settings.booking_horizon_months integer NOT NULL DEFAULT 0`.
- Automatically named `booking_settings_booking_horizon_months_check`, range 0–12.
- An explanatory column comment.

There are no UPDATE/DELETE/TRUNCATE/DROP operations, seed records, price changes, RLS/grant changes, new tables, indexes or extensions. Existing `btree_gist` and appointment exclusion protection remain unchanged. PostgreSQL 17 supports the constant-default column addition without a full table rewrite, but ALTER TABLE still needs an exclusive lock: the future runner must bound lock acquisition and execution time.

Default 0 retains the existing day horizon. Positive values select the application's inclusive, Riga-local, month-end-clamped calendar-month rule. No month rule becomes active merely by applying this migration. Existing applications that ignore the extra column retain their behavior. Current source supports older schemas for day-mode reads/updates; a nonzero month update without the column fails closed. Settings changes remain server-authorized.

The rollback refuses an active nonzero month rule. It must never be run automatically. Even at zero it removes the capability and requires operator review of application dependencies. An uncertain COMMIT must be investigated through ledger and schema inspection before any retry.

## 3. Fresh encrypted backup and recovery

Archive:

```text
/Volumes/AG-Dental-Secure/AG-Dental-20261013T160454Z-backup/database.dump
SHA-256: e5278246785d4127791ec356b67e591e5f69f1f3f78672b0a5be2195a34a227a
```

The mounted sparsebundle was verified against its actual `/Volumes/AG-Dental-Secure` mount, encrypted status and nonsecret header (AES algorithm, 256-bit key size). APFS volume is writable, ownership enforcement is enabled, temporary write/fsync/delete probe passed, and approximately 4.05 GB was available. A new unique directory was created without overwriting earlier backups.

Capture used the reviewed helper, a read-only repeatable-read exported snapshot shared with pg_dump and row fingerprints, PostgreSQL custom archive and separate role reference without role passwords. Credentials were temporarily staged only within the encrypted directory and removed by the helper. The archive contains sensitive Auth/session data; no contents were printed or copied into Git. Archive listing/full decode and final SHA-256 passed.

Isolated restore:

- Pinned PostgreSQL 17 container, network `none`, no published ports or production credentials.
- Read-only archive mount, tmpfs database, disabled Docker logs, no persistent data volume.
- 821 selected archive entries; 114 explicitly documented provider-specific entries excluded from the standalone rehearsal, retained in the full archive.
- Single-transaction restore, exit on error; no ignored restore failures.
- All 57 public/Auth/Storage tables have exact row-count/fingerprint matches.
- 254 constraints, 182 indexes, 27 functions, 13 user triggers, 10 enum types and 15 default-ACL groups match.
- RLS, browser grants, signup protection, sequence values and exact ledger 001–007 match.
- 23 raw ACL ordering differences normalize to identical privileges; no semantic grant changes.
- All public tables retain RLS and denied browser table access; Auth relationships remain consistent.
- Disposable restore container removed after successful verification.

Private evidence: `manifest.json`, `capture-metadata.json`, `comparison-final.json`, `verification-result.json`, source/restored schema/data/sequence comparisons and explicit restore selection/exclusion lists beside the archive.

Limitations: this is database recovery evidence, not PITR or complete hosted Supabase recovery. External Storage file bytes, platform/API secrets, provider service configuration and activity after the snapshot are not covered. All application/Auth/Storage database objects were included; the difference between 61 source tables and 57 restored tables is the documented provider-only scope. No claim of recovering external media bytes is made.

## 4. Tests run

| Test | Result |
| --- | --- |
| `python3 backend/scripts/test-booking008-local.py` | PASS: complete 001–007 schema, populated synthetic services/doctors/schedules/pending appointment preserved |
| Raw 008 repeated application | Expected error; original applied column and all data preserved |
| Range/null checks | -1, 13 and NULL rejected |
| Rollback | Active month rule refused; zero-rule rollback/reapply passed |
| Injected failure before COMMIT | Column addition rolled back; no partial schema remained |
| `sh backend/scripts/test-media-local.sh` | PASS: all Go packages and disposable migration/Auth/Booking/CMS/Media/Admin integrations |
| `QA_REAL_BOOKING=1 ... python3 backend/scripts/acceptance-local.py` | PASS: proposed 008 apply/default/down/up/repeat safety; real local Auth/Booking browser lifecycle; pending, confirm/reschedule/cancel/collision; six LV/RU/EN responsive schedule/review workflows |
| `node frontend/scripts/check-hero-lock.mjs` from frontend | 15/15 PASS |
| Backup restore and production preservation | PASS as detailed above |

The populated migration test initially compared settings to a baseline preceding its own intentional month-policy UPDATEs. The existing updated_at trigger correctly changed the timestamp. The test now snapshots after its deliberate policy updates for rollback comparisons; all unrelated tables and original forward-migration data-preservation checks remain exact. No application or migration change was needed.

A ledger-aware 008 no-op/retry test is **not yet possible**: the runner has no 008 operation. Raw SQL repeated failure is not described as idempotent runner success. Existing 001–007 runner tests passed. No frontend source changes or new frontend build were necessary for this preflight.

## 5. Exact activation procedure — requires approval and runner integration

**Do not execute the existing default runner expecting it to apply 008.** It knows normal migrations 001–005 plus explicit 006/007 operations; `validateLedger` currently recognizes only 001–007. Raw 008 does not register itself. The production runner was deliberately left unchanged in this preflight.

After explicit approval, implement and review a dedicated `--apply-booking-horizon` operation with:

1. Exclusive operation flags, existing advisory lock `714092001`, pinned forward checksum above and complete existing 001–007 ledger/schema validation.
2. Reject missing/out-of-order/unknown ledger entries and pre-existing conflicting column/constraint without an 008 ledger row. Do not adopt or repair conflicts automatically.
3. Extend `validateLedger` to recognize `008_calendar_month_horizon` only after 007. Preserve all prior migration files and behavior.
4. Extract the unchanged SQL body from its leading comment and BEGIN/COMMIT envelope. The 007 helper's exact `HasPrefix("BEGIN;")` assumption cannot be copied unchanged because 008 starts with a comment.
5. Begin one transaction; `SET LOCAL lock_timeout='5s'`, `statement_timeout='60s'`; execute the reviewed body and insert the 008 ledger row in that same transaction.
6. Before commit verify the exact integer/not-null/default/range constraint and comment, unchanged existing settings fields, RLS/grants, ledger and protected data. No rule UPDATEs.
7. If already recorded, require complete ledger 001–008 and exact matching schema, then return verified no-op without writes. Reject inconsistent states.
8. Disposable runner tests: first apply, second verified no-op, checksum mismatch, conflicting column/ledger, missing baseline, injected ledger failure/transaction rollback, existing record and security preservation.

Once that implementation passes review/tests and fresh identity/TLS/backup/data checks pass, the proposed command will be:

```sh
cd /Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend
go run ./cmd/migrate --apply-booking-horizon
```

**That flag does not exist yet. This is the agreed integration target, not a runnable command at the current source state.** Do not substitute manual SQL execution or the default migration command. Connection credentials stay in ignored backend configuration; verify-full remains mandatory.

Read-only postchecks, before any retry or further action:

```sql
BEGIN READ ONLY;
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;
SELECT data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='booking_settings'
  AND column_name='booking_horizon_months';
SELECT conname, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public.booking_settings'::regclass
  AND conname='booking_settings_booking_horizon_months_check';
SELECT col_description('public.booking_settings'::regclass, attnum)
FROM pg_attribute WHERE attrelid='public.booking_settings'::regclass
  AND attname='booking_horizon_months' AND NOT attisdropped;
SELECT confirmation_mode, booking_horizon_days, booking_horizon_months,
       minimum_advance_minutes, slot_interval_minutes, timezone, privacy_notice_version
FROM public.booking_settings;
SELECT relrowsecurity,
       has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
       has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE') AS user_access
FROM pg_class WHERE oid='public.booking_settings'::regclass;
SELECT convalidated, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public.appointments'::regclass
  AND conname='appointments_doctor_no_overlap';
ROLLBACK;
```

Additionally repeat the reviewed private full-table/schema fingerprint comparison. The only intended differences are the new settings column/default/check/comment, settings JSON gaining `booking_horizon_months:0`, and the single ledger row. Compare old settings after excluding the new field. Auth, CMS, prices, Storage and all other Booking data must remain identical, except separately investigated independent activity. No test appointments or production setting changes are part of migration acceptance.

## 6. Files and approval boundary

Created in this task:

- `backend/scripts/test-booking008-local.py` — synthetic preservation/transaction test.
- `docs/BOOKING_008_PRODUCTION_PREFLIGHT.md` — this report.
- Private ignored helpers `backend/.tls/booking008-restore.py` and `backend/.tls/booking008-postcheck.go`.
- Fresh encrypted backup/evidence directory stated above; temporary disposable test artifacts only.

Existing application changes were preserved; migrations 001–008 were not edited. Hero and Welcome Intro remain untouched.

**Requested next approval:** integrate/test the dedicated ledger-aware 008 operation, then apply only the checksum-pinned additive migration after repeating fresh safety checks. This approval must not enable the one-month rule, manual confirmation, public Booking, services, schedules, CMS changes or uploads. Those remain separate clinic configuration/activation decisions. Stop here before production migration.
