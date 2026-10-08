# Booking database operations

## Scope and prerequisites

The API never runs migrations or `AutoMigrate`. Run these reviewed SQL migrations explicitly from `backend/`, using the intended database connection. The connection must support **session affinity** (direct PostgreSQL or a session-mode pooler), because the runner holds session advisory lock `714092001` across migration checks/application. Do not use a transaction-mode pooler for this command. Use a database owner/migration role capable of creating tables, functions, triggers and `btree_gist`; keep those credentials on the server.

The database must already provide Supabase's `auth.users` table and `anon`/`authenticated` roles. An isolated PostgreSQL test database can supply a minimal compatible bootstrap; that bootstrap is not a production migration and must not replace Supabase Auth. PostgreSQL 14+ is supported; the existing Supabase architecture is retained.

Migration files:

- `backend/migrations/001_user_roles.sql` — original auth migration, restored unchanged from `feature/homepage`. Creates authoritative `user`/`admin` roles and the new-auth-user trigger. Existing users default to `user`.
- `backend/migrations/002_booking_foundation.sql` — booking schema, constraints, indexes, RLS/grants, default settings and migration record.
- `backend/migrations/002_booking_foundation.down.sql` — guarded booking rollback; retains auth and the potentially shared `btree_gist` extension.
- `backend/migrations/003_automatic_confirmation.sql` — the clinic owner's confirmed automatic-mode decision, applied once to the SQL default and current settings singleton; adds settings audit history. Migration 002 is preserved unchanged.
- `backend/migrations/003_automatic_confirmation.down.sql` — explicit return to manual mode for future bookings; refuses to remove administrator audit history.
- `backend/migrations/fixtures/booking_development.sql` — separate, opt-in **synthetic development data**, never an automatic migration.

Each migration is transactional. The runner reports sanitized failures without SQL parameters, connection strings or patient information. It does not silently repair schema drift. Back up the target database and review pending migrations before production application.

## Existing Supabase baseline

The pre-deployment inspection found `public.user_roles` already present, with no recorded migrations in `public.schema_migrations`. On **8 October 2026**, the reviewed runner adopted 001 and applied 002 and 003 to AG Dental, with subsequent read-only verification. See the exact ledger, preservation results and test limitations in [the deployment report](BOOKING_MIGRATION_READINESS.md). The user explicitly authorized that sequence without backup or restore validation; this does not establish a recovery point or waive backup review for future changes. Blindly replaying migration 001 would fail. Do not delete/recreate that role table or its rows.

From `backend/`, with the reviewed target `DATABASE_URL` in the existing ignored `.env` or process environment:

```sh
go run ./cmd/migrate --adopt-auth-baseline
go run ./cmd/migrate
```

These are two deliberate steps. The first validates the role table columns, primary/foreign/check constraints, role defaults, RLS, absence of browser policies/table permissions, trigger definition, function body, security-definer settings, empty search path and execution grants. It also validates any existing migration ledger. Only if all checks match does it record `001_user_roles`; role data stays unchanged. A differing function/schema or unknown migration history fails closed. Review any reported difference; do not edit the validator simply to bypass a failure.

The second command applies migrations 002 and 003 and skips recorded versions. Migration 003 deliberately changes an existing 002 singleton from manual to automatic once, without changing any existing appointment's status. Subsequent runs preserve an administrator's later choice of manual mode. This sequence has now completed on the existing Supabase project; do not run it again merely to check status. Inspect the ledger with read-only queries. Catalogs remain empty and privacy is unconfigured, so public booking is not enabled.

For a fresh Supabase project with neither auth-role table nor migration records, run only:

```sh
go run ./cmd/migrate
```

## Tables and invariants

| Table | Purpose |
| --- | --- |
| `services` | Localized catalog, optional verified prices/duration, activation and explicit provenance |
| `doctors` | Verified doctor catalog or distinctly labeled development fixtures |
| `doctor_services` | Eligibility, optional duration override and composite key |
| `doctor_schedules` | Local weekly intervals and optional inclusive effective dates; Sunday = 0 |
| `doctor_time_off` | Actual unavailable UTC instants; full/partial days, holiday/vacation/other |
| `booking_settings` | Singleton server-side configuration and approved privacy notice version |
| `booking_settings_events` | Minimal before/after settings snapshots, verified administrator actor where available, and explicit migration/admin source |
| `appointments` | Guest contact data, optional auth link, unique reference, reservation and idempotency |
| `appointment_events` | Lifecycle, known actor and minimal metadata |
| `notification_outbox` | Transactional notification intent; no delivery is claimed or attempted |

Appointment doctor/service eligibility is protected by a composite foreign key. Time ranges must be finite, positive and no longer than 24 hours. A GiST exclusion constraint combines doctor equality with overlapping half-open `tstzrange(starts_at, ends_at, '[)')` ranges. It blocks `pending`, `confirmed`, `completed` and `no_show`; the latter two retain historical occupancy. `cancelled` and `rejected` release time. Adjacent appointments may share an end/start instant.

The status trigger permits `pending → confirmed/cancelled/rejected` and `confirmed → completed/cancelled/no_show`. Terminal states cannot transition or be rescheduled. Rescheduling an active booking preserves its status and creates an audit event in the application transaction. `updated_at` triggers protect timestamps on services, doctors, appointments and settings.

Notification rows start `pending`. A `delivered` status requires `delivered_at`, and other statuses must have no delivery timestamp. No worker/sender is included. Lifecycle rows and outbox intent commit with the corresponding booking operation. Future consumers must provide retry/claim/recovery handling and never record delivery before the provider actually succeeds.

Settings changes are separate from individual appointments. Migration 003 records its manual-to-automatic change with source `migration` and no user actor. Administrator API changes use source `admin` and the verified actor, with bounded before/after configuration snapshots in the same transaction. Neither event type contains passwords, tokens or patient contacts. Deleting an Auth account clears the optional actor foreign key but retains the event and its source.

## Configuration before a real launch

Production catalog tables start empty. Booking also requires a nonempty, approved `privacy_notice_version`; migration 002 intentionally leaves it `NULL`. No real appointment slots are invented.

Automatic confirmation is the **clinic-owner-confirmed default**. Manual confirmation remains available through the authenticated administrator settings API. Other **technical defaults awaiting clinic confirmation** are a 60-day horizon, 120 minutes' minimum notice, a 15-minute slot interval, `Europe/Riga`, and empty cancellation policy configuration. A bookable service must have a positive base duration. An optional doctor/service override is also positive. Do not mark invented staff, prices, durations or schedules as verified.

All admin/configuration writers must use the booking service's exclusive transaction advisory lock `714092002`; booking creation takes that lock shared while validating. Operational migrations updating settings/catalog/schedules/time-off must use the same exclusive lock in their transaction. Normal administrator settings changes must use the role-protected API so the update and administrator audit event commit together. This protocol prevents a configuration change from racing an in-flight booking check. The exclusion constraint independently protects appointment overlap even for writes that bypass the API.

## RLS and trust boundary

All ten booking tables have RLS enabled, no browser policies, and all table privileges revoked from `PUBLIC`, `anon` and `authenticated`. Supporting trigger functions also deny browser execution. Browsers must use the Go API; a Supabase publishable key does not confer direct booking-table access. The migration ledger is likewise hardened by the runner.

The inspected server connection has `BYPASSRLS`. RLS therefore does **not** authorize Go requests: validation, Supabase identity verification and authoritative database role checks are the API's responsibility. Never expose that database connection or privileged Supabase keys to a client. A future least-privilege server role needs deliberate grants/policies consistent with its RLS behavior; do not assume replacing the current role automatically preserves access.

## Development fixtures

Use only an isolated database named `booking_development`, `booking_test_*`, or ending `_test`. The fixture additionally requires an explicit session setting and empty service/doctor/appointment tables. For a local database whose safe connection URL is in `BOOKING_TEST_DATABASE_URL`:

```sh
psql "$BOOKING_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "SET booking.allow_development_fixtures = 'yes'" \
  -f migrations/fixtures/booking_development.sql
```

The fixture supplies one conspicuously synthetic doctor and LV/RU/EN test service, an invented 60-minute **development-only** duration, weekday 09:00–12:00/13:00–17:00 test schedules and `development-fixture-v1` privacy version. It contains no price, real clinic staff or production treatment claim. Deterministic service/doctor IDs end in `000000000001`, with prefixes `10000000-0000-4000-8000-` and `20000000-0000-4000-8000-`, respectively. Never apply it to the clinic database.

## Rollback

Rollback is explicit and ordered. From `backend/`, first roll back migration 003:

```sh
go run ./cmd/migrate --down-confirmation-default
```

This restores the SQL default and singleton to manual **for future bookings**, preserving all existing appointment statuses. It refuses if any `booking_settings_events` row has source `admin`, including events whose Auth actor was subsequently deleted. Only when the table contains migration-only history may this rollback remove it. If refused, preserve the audit data and use a forward corrective migration. Do not delete audit rows to force a production rollback.

Only after 003 has been rolled back may the booking foundation be removed:

```sh
go run ./cmd/migrate --down-booking
```

The runner refuses `--down-booking` while 003 is applied, without changing settings or schema. Migration 002's rollback also refuses if appointments, audit/outbox rows, any non-development catalog, or customized production settings exist. It never deletes booking/patient data to force a rollback. If the guard refuses, retain the schema and make a forward corrective migration, or plan a separately approved export/removal procedure. Migration 001 has no automatic destructive rollback because deleting roles and the auth trigger would break the existing authentication foundation.

## Migration integration tests

The migration runner has real PostgreSQL integration tests in `backend/cmd/migrate/main_test.go`. They require a **separate disposable local** database with a name ending `_test`, plus the cluster-wide `anon` and `authenticated` roles. Do not point them at the booking integration suite's database when both suites run together: migration tests intentionally reset their own `public`/`auth` schemas.

```sh
MIGRATION_TEST_DATABASE_CONFIRM=disposable go test ./cmd/migrate -v -count=1
```

Set `MIGRATION_TEST_DATABASE_URL` to the dedicated local test connection before running this command. Without that variable the integration suite skips explicitly; it never falls back to `DATABASE_URL`. Tests cover automatic defaults, upgrades from an existing 002 database without changing pending appointments, preservation of later administrator manual-mode choices on repeated runs, preserved admin roles, unknown-history refusal, rollback order, safe rollback, rollback refusal for administrator audit data/real catalog/custom settings, deliberate adoption of an unrecorded auth baseline, and rejection of unsafe grants or a modified signup trigger function.
