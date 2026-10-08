# AG Zobārstniecība Supabase migration readiness

**Deployment completed and verified on 8 October 2026.** Migration 001 was adopted, then migrations 002 and 003 were applied through the reviewed Go runner. The user explicitly approved this exact sequence without a backup or restore drill, acknowledging that the Free project has no verified recovery point. Recovery readiness itself remains unresolved; this approval superseded the earlier deployment block for this sequence only. No backup or restore was performed.

## Deployment result — 8 October 2026

Target: **AG Dental**, project `dcdgrbziounizuigmjcm`, PostgreSQL 17.6 database `postgres`, shared Session Pooler `aws-1-eu-west-1.pooler.supabase.com:5432`. The private connection retained `sslmode=verify-full` and the previously verified Supabase CA. Certificate-chain and hostname validation succeeded for pgx and the actual GORM backend connection. Negative trust/hostname checks also rejected an empty trust store and incorrect hostname.

### Preflight and source integrity

Read-only preflight at **14:42–14:45 UTC** matched the reviewed state: empty application ledger; only `user_roles` and `schema_migrations` in public; no booking object/name collisions; the expected extensions, functions and event triggers; one Auth user, one identity and one role, with no missing or orphan roles. All nine baseline checks passed. The existing role table, signup function/trigger, policies and grants matched the review.

All three SQL files matched the SHA-256 values recorded below. The runner source was inspected and matched the documented adoption/application procedure. Its modification time, **13:35:34 UTC**, predates the original **13:48:43 UTC** readiness inspection. The earlier report did not record a runner hash, so a retrospective cryptographic comparison is not claimed. Its SHA-256 was recorded for this deployment and rechecked without changes before adoption verification and after application:

```text
cmd/migrate/main.go
07b9b4873457cf862841a1caa5436181ab211f8fc1868f757f1a85bbf0b236b2
```

### Execution and exact final ledger

Executed from `backend/`, clearing any inherited URL so the reviewed private `.env` supplies the verified configuration:

```sh
env -u DATABASE_URL go run ./cmd/migrate --adopt-auth-baseline
# Read-only ledger and preservation verification passed here.
env -u DATABASE_URL go run ./cmd/migrate
```

Both commands exited successfully. Adoption recorded only 001 and left booking tables absent. The normal runner skipped 001, applied 002, then applied 003. No raw migration SQL, rollback command, AutoMigrate or development fixture was run.

| version | applied_at (UTC, exact database value) |
| --- | --- |
| `001_user_roles` | `2026-10-08 14:45:26.34766+00` |
| `002_booking_foundation` | `2026-10-08 14:45:52.875126+00` |
| `003_automatic_confirmation` | `2026-10-08 14:45:53.358552+00` |

### Live database verification

The unchanged [post-migration verification SQL](BOOKING_POST_MIGRATION_VERIFY.sql) was executed against Supabase in its repeatable-read, read-only transaction, ending with `ROLLBACK`. Independent preservation comparisons also passed after adoption and after both booking migrations.

- **Ten booking tables:** `services`, `doctors`, `doctor_services`, `doctor_schedules`, `doctor_time_off`, `booking_settings`, `appointments`, `appointment_events`, `notification_outbox`, `booking_settings_events`.
- **Extensions/indexes:** `btree_gist` 1.7 installed in `public`; existing `pgcrypto` 1.3 retained in `extensions`. All **25** expected booking indexes exist on the intended tables and are ready/valid. All **61** inspected CHECK/FK/UNIQUE constraints, including the existing role constraints, are validated.
- **Collision protection:** `appointments_doctor_no_overlap` is validated and nondeferrable, backed by a ready/valid GiST index. Its exact predicate occupies `pending`, `confirmed`, `completed` and `no_show`, using doctor equality and overlapping half-open UTC ranges. Cancelled/rejected appointments do not occupy time. Positive finite duration, eligibility and unique reference/idempotency constraints exist. No production collision-write test was performed.
- **Settings:** exactly one singleton; stored mode and SQL default both `automatic`; timezone `Europe/Riga`; horizon 60 days; minimum advance 120 minutes; interval 15 minutes; privacy version `NULL`; cancellation configuration `{}`. Exactly one migration audit event records manual → automatic, without an Auth actor or administrator event.
- **RLS/grants:** all ten new tables have RLS enabled, zero policies, and no table or column privileges for `PUBLIC`, `anon` or `authenticated`. Both existing public tables retain their protection. The Auth function and both new trigger functions deny browser execution. The five booking triggers and existing signup trigger are enabled. The privileged backend still bypasses RLS; API authentication, role authorization and validation remain the trust boundary.
- **Preservation:** one Auth user, one identity and one role remain; no gaps/orphans. Aggregate row fingerprints for **30 existing tables** (all 27 Auth tables, `user_roles`, Storage buckets and objects) match before/after. Existing Auth/public-baseline table definitions, ACLs, policies, non-internal triggers, both pre-existing public functions and database event triggers also match. No existing data or schema difference was detected in these comparisons. Fingerprints contain no captured user rows or credentials and are not backups.
- **Empty production catalogs:** zero services, doctors, eligibility rows, schedules, time-off rows, appointments, appointment events and outbox rows. No fixtures, delivered notifications, reminders, invalid appointment durations or occupied overlaps. There were no existing appointment statuses to change.

### Backend checks and limits

Executed `go test ./... -count=1` with `DATABASE_URL`, `AUTH_TEST_DATABASE_URL`, `BOOKING_TEST_DATABASE_URL` and `MIGRATION_TEST_DATABASE_URL` unset for the test process. All test-bearing packages passed: `cmd/migrate`, `internal/auth` and `internal/booking`. The first sandboxed attempt could not bind the local HTTP listener used by Auth tests; the retry with local network permission passed. Disposable-database integration tests were **skipped**, because their explicit test database URLs were not set. This deployment does not claim a new database concurrency integration-test run.

The existing Go router and actual backend database connector were exercised through a temporary loopback-only HTTP server against live Supabase, using verified TLS. It was closed after these GET-only checks:

| Request | Verified result |
| --- | --- |
| `/api/health` | 200; `status=ok`, `database=connected` |
| `/api/booking/services` | 200; empty services, null privacy version |
| `/api/booking/doctors?service_id=<valid nonexistent UUID>` | 404; `not_found`, proving a schema query rather than a missing-table error |
| `/api/booking/availability?service_id=<valid nonexistent UUID>&date=2026-10-08` | 503; `booking_not_configured` as required until privacy/catalog setup |
| `/api/admin/booking/settings` without credentials | 401; `unauthorized` |
| `/api/admin/booking/appointments` without credentials | 401; `unauthorized` |

These are local application checks against the real database, not a claim that a hosted API service was deployed or restarted. No POST/PATCH/PUT/DELETE requests or test appointments were made. No public listener was left running.

### Files and next phase

Deployment documentation updated: this report and [BOOKING_MIGRATIONS.md](BOOKING_MIGRATIONS.md). Local diagnostics created: `/tmp/dental-deployment-audit.go`, ignored `backend/.tls/deployment-health.go`, and ignored metadata-only `.tls/deployment-baseline.json` / `.tls/deployment-verification.json`. These private metadata files use mode `0600`; neither credentials nor database rows are included. Existing `.env`, CA trust, migrations, runner, application source and frontend were not changed during deployment. No commit or push was made.

**Ready for Booking Frontend development. Public booking remains unavailable.** Real verified services/durations, doctors/eligibility, working schedules and approved privacy details must be configured before launch; the technical timing/cancellation settings still need clinic confirmation. No frontend or admin-panel work was started. Deployment and requested verification are complete, with no unresolved migration errors. Backup/restore readiness remains the explicitly accepted limitation.

## Historical readiness inspection (before the approved deployment)

The following sections preserve the pre-deployment review. Statements that no migrations had run and that deployment was blocked describe that earlier inspection; the completed deployment above supersedes them. The sequence was **adopt 001, apply 002, apply 003**, preserving the existing Auth baseline rather than recreating it.

Inspection date: **8 October 2026**, initial database snapshot **13:48:43 UTC**. Branch: `feature/booking-backend`. This report reflects the current uncommitted migration files. **No migration, baseline adoption, reset, table drop, Auth-user modification or RLS change was executed.** Live inspection used SELECT statements in read-only transactions, followed by rollback. Migration implementation and application code were not changed during this review.

## Verified live state

| Item | Observation |
| --- | --- |
| PostgreSQL | Supabase PostgreSQL 17.6, primary database |
| Connection | Existing ignored `backend/.env`; Supabase shared session pooler on port 5432; database and Supabase Auth project identifiers match |
| Database role | `postgres`, not superuser, with BYPASSRLS; owns existing public role and application-ledger tables |
| Migration history | `public.schema_migrations` exists but contains **zero rows** |
| Existing public tables | Only `user_roles` and `schema_migrations` |
| Booking objects | None of the ten booking tables, their checked index names, table row types or new trigger-function names exists |
| Auth consistency | One role row; zero Auth users missing roles; zero orphan roles |
| Auth compatibility | UUID Auth primary key, role-table columns/constraints/defaults, signup trigger, function body/owner/security settings and grants all match migration 001; all nine read-only baseline checks passed |
| Browser access | Existing role/ledger tables have RLS enabled, no policies and no browser table/column grants; `anon` and `authenticated` are not superusers and do not bypass RLS |
| Extension prerequisites | `pgcrypto` 1.3 already exists in `extensions`; `btree_gist` is absent, available at default version 1.7 and marked trusted; core UUID/range functions and Europe/Riga are available |
| Migration privileges | Database CREATE, public-schema CREATE, Auth USAGE/REFERENCES, ownership of role/ledger tables and Auth/role-table lock privileges are present |

The objects equivalent to migration 001 are present, but the empty ledger does not establish how they were originally created. **Do not execute `001_user_roles.sql` directly**: it would try to recreate the existing table, function and trigger. The validated adoption operation preserves existing user roles and records their baseline. Supabase's separate `auth`, `storage` and `realtime` migration histories are platform-owned and must not be modified.

## Connection prerequisite

### Step 1 result: verified TLS connection

Verified **8 October 2026, 14:15:24 UTC** against `aws-1-eu-west-1.pooler.supabase.com:5432`, the Supabase shared **Session Pooler**, using the existing private credentials without displaying or changing them. This supersedes the earlier unresolved TLS prerequisite. The earlier schema snapshot above was not repeated during this TLS-only step.

The original private URL specified neither `sslmode` nor `sslrootcert`. A forced `verify-full` connection with its default system trust reproduced this exact certificate error on macOS:

```text
x509: “*.pooler.supabase.com” certificate is not standards compliant
```

That is the observed platform-verifier failure, not an inferred password or hostname error. There was no explicitly configured Supabase root CA. The system-trust result does not identify a more specific Apple certificate-policy rule, so this report does not assert one. With Supabase's officially sourced root explicitly configured, the normal Go TLS verifier successfully validated the same presented certificate chain and hostname. No verification callback, `InsecureSkipVerify`, weaker SSL mode, or system-wide trust change was used.

**Trusted source:** Supabase's [SSL documentation](https://supabase.com/docs/guides/platform/ssl-enforcement) directs clients to its Dashboard root certificate. The Dashboard's [SSL component](https://github.com/supabase/supabase/blob/690ef5e7f7748ba1e9131c2c027b78f4a77f9f3e/apps/studio/components/interfaces/Settings/Database/SSLConfiguration.tsx) uses the URL from its [official certificate configuration](https://github.com/supabase/supabase/blob/690ef5e7f7748ba1e9131c2c027b78f4a77f9f3e/apps/studio/hooks/custom-content/custom-content.json#L63). Its production URL is [Supabase's public root certificate](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). The source metadata, source files and certificate were fetched over certificate-verified HTTPS. The trust anchor was obtained independently of the untrusted database handshake; a peer-supplied certificate was not promoted into trust.

The installed file contains only **Supabase Root 2021 CA**, valid from 28 April 2021 through 26 April 2031. The pooler supplies its intermediate certificate; no additional CA bundle or leaf pin is needed for the tested Go clients.

```text
Root certificate DER SHA-256:
807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa

Downloaded PEM file SHA-256:
700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7
```

The verified chain was `*.pooler.supabase.com` → `Supabase Intermediate 2021 CA` → `Supabase Root 2021 CA`. The leaf's DNS SAN `*.pooler.supabase.com` matches the exact configured hostname. Its validity is 12 March 2025–11 March 2030.

**Persisted local configuration:** the ignored `backend/.env` now explicitly sets `sslmode=verify-full` and `sslrootcert` in the existing URL. The root path is `/Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend/.tls/supabase-prod-ca-2021.crt`. The URL's credentials, destination and other environment values were checked to remain unchanged. The environment file and local TLS files have mode `0600`; the TLS directory has mode `0700`. The directory is explicitly ignored by Git, and neither it nor `.env` is tracked. No credentials or connection URLs are included in this report.

| Verification | Result |
| --- | --- |
| Effective client mode | `verify-full`; hostname set to the actual pooler; `InsecureSkipVerify=false`; no plaintext fallback |
| Negotiated TLS | TLS 1.3 |
| Certificate-chain validation | Successful; one verified chain terminating at the independently obtained Supabase root |
| Hostname validation | Successful against the actual pooler hostname |
| Negative hostname check | The verified leaf rejects `wrong-host.invalid` |
| Negative trust check | Offline verification with an empty trusted-root pool rejects the same chain with `x509.UnknownAuthorityError` |
| Database reachability | `SELECT 1` returned `1`; server version `17.6` |
| Transaction safety | `transaction_read_only=on`; diagnostic transactions ended with `ROLLBACK` |
| Existing API connection function | Actual `internal/database.Connect()` (GORM/pgx) succeeded; its socket had a verified chain and matching hostname; read-only SELECT succeeded |
| Migration connection compatibility | The same installed pgx driver used by `cmd/migrate` succeeded with the saved strict settings. The runner itself was **not invoked**, because it performs writes |

The local, Git-ignored diagnostic can be repeated without running migrations:

```sh
cd /Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend
go run ./.tls/verify.go -configured
```

It reads `.env` directly, suppresses credentials/raw connection errors, validates TLS state for both pgx and the actual backend connection function, and only executes the following queries inside read-only transactions:

```sql
SELECT 1, current_setting('transaction_read_only'), current_setting('server_version');
SELECT 1, current_setting('transaction_read_only');
```

Both existing clients can use this configuration without application-code changes. A running process must be restarted to pick up the new URL and must not inherit a stale `DATABASE_URL`: `godotenv.Load()` preserves existing process environment values. No application process was restarted in this step. On another deployment host, securely provide the same trusted public CA file and configure `sslrootcert` to its readable absolute path there; this workstation path is not portable. A missing or invalid root must fail closed. Certificate rotation requires obtaining and verifying an updated official CA, not disabling verification.

**Files changed in Step 1:** `.gitignore`, this report and ignored `backend/.env`. **Files created:** ignored `backend/.tls/supabase-prod-ca-2021.crt` and `backend/.tls/verify.go`. Temporary public-source downloads and diagnostic/configuration helpers were also created under `/tmp`; they contain no stored connection credentials. Application source and migrations were not changed. No migration, backup check, live database write, Auth/user/role change, RLS change or server SSL-setting change was performed. **Step 1 is complete; wait for the user's next instruction.**

The backend `pg_stat_ssl` observation was non-TLS; through this pooler it describes the pooler-to-database hop, not the separately confirmed encrypted client-to-pooler connection. Do not present that metadata as proof of end-to-end TLS or of a plaintext client connection.

Session affinity is required because the runner holds a session advisory lock. The inspected shared pooler port 5432 is session mode; do not switch to transaction mode on port 6543. Direct PostgreSQL is also suitable if available. These connection and certificate distinctions follow the [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

The server reported `statement_timeout=2min` and `lock_timeout=0`. A read-only trial with `PGOPTIONS` requesting shorter limits did not change those observed values through this pooler, so the commands do not pretend those overrides work. The migration runner itself has a two-minute context deadline. Adoption briefly takes a table lock on `auth.users` and `user_roles`; schedule it when signup activity is low. The lock does not insert/update/delete Auth users.

## Backup and restore prerequisite

**Step 2 result: BLOCKED, 8 October 2026.** The authenticated AG Dental Dashboard explicitly reports that Free excludes scheduled backups, PITR requires a Pro add-on, and restore-to-new-project requires a paid plan and physical backups. No selectable backup timestamp or recovery window was available. No claim is made about undisclosed provider-internal copies.

Read-only metadata inspection over `verify-full` at 14:22:54 UTC found 1 Auth user, 1 identity and 1 application role row; the application migration ledger remains empty. All inspected non-system tables/sequences are readable with the existing trusted connection role. The signup trigger on `auth.users`, both existing public functions and the `ensure_rls` event trigger require explicit backup coverage. Native libpq 18.4 and the cached PostgreSQL 17.11 client both passed read-only strict-TLS connection checks. Only `pg_dump --version` was executed; no database dump was created.

The [Step 2 report](BOOKING_BACKUP_READINESS.md) supplies the exact proposed PostgreSQL 17 archive/role-reference capture procedure, private credential handling, offline integrity checks, managed-schema restore boundaries and isolated Supabase drill requirements. Backup creation needs explicit approval and a named encrypted private destination. A restore drill needs separate approval. No production restore, backup configuration change, Auth change, RLS change or migration was performed. Stop before the deployment commands below until recovery readiness has been established and deployment separately authorized.

## Exact execution order and objects

| Order | Operation | Objects and data changes |
| --- | --- | --- |
| 1 | `go run ./cmd/migrate --adopt-auth-baseline` | Validates the existing Auth schema; inserts only `001_user_roles` into the application ledger. Reasserts its existing RLS/revoked browser grants. No change to Auth users, role rows, Auth trigger or role function. This is a write operation, not a dry run. |
| 2 | `002_booking_foundation.sql` through the runner | Installs `btree_gist` in `public`; creates nine booking tables, indexes, constraints, two trigger functions and five triggers. Inserts one new settings row and the 002 ledger record. Enables RLS and revokes browser access on the new objects. |
| 3 | `003_automatic_confirmation.sql` through the runner | Creates private `booking_settings_events` plus its index; changes the SQL default and new settings singleton from manual to automatic; records the migration's before/after settings event; inserts the 003 ledger record. |

Migration 002 creates:

- `services`: localized catalog, nullable verified duration/price metadata, activation and provenance.
- `doctors`: bookable doctor catalog.
- `doctor_services`: eligibility relationship and optional duration override.
- `doctor_schedules`: recurring local intervals and effective dates.
- `doctor_time_off`: unavailable actual time ranges.
- `booking_settings`: singleton operational configuration.
- `appointments`: guest contact fields, optional Auth link, timestamps/status, consent, unique reference and idempotency key.
- `appointment_events`: minimal lifecycle audit history with optional Auth actor.
- `notification_outbox`: durable notification intent; no delivery process.

It creates `enforce_appointment_status_transition()` and `touch_booking_updated_at()`. Triggers are `appointments_status_transition`, plus updated-at triggers on services, doctors, appointments and settings. Indexes include the GiST exclusion index and time-off range index, eligibility/schedule lookup indexes, appointment date/service/doctor/account indexes, event lookup and outbox queue index, and implicit primary/unique indexes. The supplied verification SQL enumerates their definitions and validity.

Migration 003 adds the tenth table, `booking_settings_events`, with an Auth actor FK, source (`migration` or `admin`), before/after JSON snapshots, timestamp and chronological index. All ten tables deny direct browser access. The existing privileged Go database role bypasses RLS, so API validation and role authorization remain essential.

Dependencies are satisfied: `auth.users(id)` and browser roles exist; adoption supplies the missing 001 ledger entry; 002 supplies the settings/booking schema needed by 003. `btree_gist` provides UUID equality for GiST and is a trusted extension installable with database CREATE privileges, which were verified. No extra `uuid-ossp` extension is needed because core `gen_random_uuid()` exists. See [PostgreSQL btree_gist documentation](https://www.postgresql.org/docs/17/btree-gist.html).

## Data preservation and confirmation

The proposed forward sequence deletes no existing production records and recreates no existing table. It does not run migration 001's original role backfill because the existing matching baseline is adopted instead. There is no `DROP`, `DELETE`, `TRUNCATE`, Auth-user update or GORM AutoMigrate in the proposed forward sequence. Do not run the development fixture or local Auth bootstrap on Supabase.

The deliberate configuration write in 003 changes the newly created settings row to automatic; no booking settings table exists in the inspected live database. **No migration changes appointment statuses.** There are currently no live appointment rows because the table does not exist. On an existing 002 installation, 003 would change configuration once but leave pending/confirmed and other existing appointment statuses intact. Subsequent runner executions skip recorded 003 and preserve a later administrator's manual-mode choice.

Immediately after this first deployment, expected state is automatic confirmation, Europe/Riga, horizon 60 days, minimum notice 120 minutes, interval 15 minutes, null privacy version, empty cancellation configuration, empty clinic catalogs and **one migration settings audit event**. Timing defaults still need clinic confirmation. Booking stays unavailable until approved privacy information, real doctor/service durations and schedules are configured.

The final state is automatic only after **both** 002 and 003 succeed. Each file commits separately; baseline adoption and the two migrations are not one combined transaction. Do not enable booking traffic between migrations or if 003 fails after 002 succeeds.

## Collision protection

Migration 002 declares:

```sql
CONSTRAINT appointments_doctor_no_overlap EXCLUDE USING gist (
  doctor_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('pending', 'confirmed', 'completed', 'no_show'))
```

Concurrent overlapping reservations for the same doctor conflict at PostgreSQL level. Pending and confirmed both reserve time; completed/no-show retain historical occupancy. Cancelled/rejected release the range. Half-open intervals allow adjacent appointments. Database checks also require finite positive appointment intervals no longer than 24 hours, valid statuses and doctor/service eligibility. The Go API maps conflicts to safe HTTP 409 responses and does not trust client-provided status/duration.

This constraint is source-reviewed and was exercised in the previously completed isolated PostgreSQL 17 concurrency tests, including direct SQL writes and simultaneous HTTP requests. **It does not yet exist on live Supabase.** No production test booking or write-based collision probe was performed during this review.

## Commands after explicit approval

The commands in this section are future deployment instructions, **not actions authorized or executed during Step 1 or Step 2**. Certificate trust is verified locally, but Step 2 established that recovery readiness is **BLOCKED**. Before deployment, complete the separately approved backup and restore validation and recheck live ledger/object state if time has passed. The commands below intentionally use the updated private `backend/.env`, whose URL contains the verified TLS settings, rather than a stale inherited `DATABASE_URL`; no connection secret is printed or placed in a command argument.

First, adopt the validated Auth baseline only:

```sh
cd /Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend
(
  set -e
  test -r .env
  test -r .tls/supabase-prod-ca-2021.crt
  unset DATABASE_URL
  go run ./cmd/migrate --adopt-auth-baseline
)
```

Then run these SELECTs in the Supabase SQL Editor to verify adoption before continuing:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;
SELECT count(*) AS role_rows FROM public.user_roles;
SELECT count(*) AS missing_roles
FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id=u.id
WHERE r.user_id IS NULL;
SELECT to_regclass('public.appointments') IS NULL AS booking_not_applied_yet;
ROLLBACK;
```

Expect only 001 recorded, the existing role row retained (legitimate new signups may increase the count), zero missing roles and `booking_not_applied_yet=true`. If any expectation fails, stop and investigate.

Apply remaining reviewed migrations in the runner's fixed order, 002 then 003:

```sh
cd /Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend
(
  set -e
  test -r .env
  test -r .tls/supabase-prod-ca-2021.crt
  unset DATABASE_URL
  go run ./cmd/migrate
)
```

If certificate verification still fails, these commands stop before migration execution; fix the trusted certificate/connection configuration rather than downgrading verification. After success, run the complete [read-only post-migration verification SQL](BOOKING_POST_MIGRATION_VERIFY.sql) in the Supabase SQL Editor. It contains exact queries and expected outcomes for history, extension, all ten tables, grants, defaults, indexes/constraints, Auth and booking triggers, empty production catalogs, the single migration audit event and zero overlapping occupied appointments.

## Rollback and retry considerations

- A normal SQL error rolls back that migration file's transaction. Earlier successfully committed steps remain committed.
- On a network failure near COMMIT, the result can be uncertain. The current runner's generic error says the migration was rolled back even if rollback acknowledgement failed. **Verify ledger and schema before retrying; do not rely on that wording.** This was documented, not changed, during this report-only task.
- The runner has no migration checksums or full schema-drift validation for already recorded booking versions. Re-run the verification SQL after a retry; a ledger row alone is not proof of an intact schema.
- Rollback order is 003 then 002. Under a separately approved rollback, the commands are `go run ./cmd/migrate --down-confirmation-default`, then `go run ./cmd/migrate --down-booking`, using the same verified connection environment.
- Rolling back 003 restores manual mode for future bookings and leaves appointments unchanged. It refuses if any administrator settings audit exists, even when its actor was deleted. It removes only migration-only settings history when its guard permits.
- Rolling back 002 drops the booking tables only when its guards allow it: no appointments/events/outbox, real catalog or customized production settings. It retains Auth and the potentially shared `btree_gist` extension. Once live data exists, prefer a forward corrective migration.
- No destructive rollback of the existing Auth baseline is proposed. Do not drop `user_roles` or delete Auth users to undo a ledger adoption.

Reviewed forward-file SHA-256 fingerprints:

```text
001_user_roles.sql             7297b745a5f0e94b04b106e082aac10d2447dee6f0c083e22ed16f0601a44337
002_booking_foundation.sql     cafb1e0f73a3be14e248949942256c794e53ae06f354dbda2002624b701be01e
003_automatic_confirmation.sql 8061246853b5cbf3e8690199bc56877b3f30d1e0c6efd206976a89daa036bdd5
```

The original readiness review added this report and its companion verification SQL. Step 1 TLS-only changes are listed above. Step 2 added the backup readiness report and updated this document; it made no persistent configuration or database changes. **Backup creation, a restore drill and migration deployment remain separately subject to explicit approval.**
