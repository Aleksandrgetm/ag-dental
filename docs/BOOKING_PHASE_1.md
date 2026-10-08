# Booking Phase 1 — architecture and implementation notes

## Scope and inspected baseline

Work is confined to `feature/booking-backend`, initially commit `01bf14f`. This branch contains the original API scaffold, not the approved site/auth source on `feature/homepage` (`f50e2aa`). Reuse only the existing backend Auth package and original role migration. Do not change frontend, contact form, public design, Hero, Intro or authentication flows. No production schema changes are performed by starting the API.

Read-only Supabase inspection found `public.user_roles` and `public.schema_migrations`, both RLS-enabled, no policies, an empty migration ledger, and a database connection with BYPASSRLS. Migration 001 cannot simply be replayed over this existing table. A deliberate, validated baseline-adoption procedure is needed before migration 002. Never overwrite roles or existing data.

## Architectural decisions, including the owner's confirmed update

- SQL migrations are explicit, versioned and transactional; GORM AutoMigrate is not used. Migration history is serialized. The existing auth migration is preserved.
- Production booking catalogs start empty. No procedure duration, real doctor, price or working hours is assumed. Synthetic development fixtures are separate, opt-in, and conspicuously labeled.
- All booking tables deny browser/PostgREST access. The Go API is the trust boundary when its PostgreSQL role bypasses RLS. Privileged operations require Supabase-verified identity and the authoritative database admin role; token metadata is never a role source.
- Both guests and signed-in users can create bookings. Invalid supplied credentials fail rather than silently becoming a guest. No patient profile, diagnosis, medical history or national identifier is collected.
- Appointment instants use PostgreSQL timestamptz and UTC API values. Recurring schedules use local weekday and wall-clock intervals in Europe/Riga. Availability iterates actual instants, preserving distinct repeated-hour slots and never manufacturing nonexistent local times. Full elapsed treatment duration must fit an uninterrupted working interval.
- A PostgreSQL GiST exclusion constraint on doctor and half-open time range rejects overlaps for pending, confirmed, completed and no_show. Cancelled/rejected release the time. Historical completed/no_show records remain protected.
- Creation uses a transaction with idempotency serialization and shared booking-configuration locking. The database exclusion constraint remains the final concurrency protection. Future configuration writers must follow the same locking protocol.
- A client-generated random UUID Idempotency-Key binds a canonical request and optional authenticated user. Identical retries return the original safe receipt; changed payloads conflict. A reference is not authorization; no public reference lookup is exposed.
- Omitted doctor_id means any eligible doctor; availability returns real doctor-specific options and creation selects an available eligible doctor deterministically.
- The clinic owner has confirmed automatic/confirmed as the default, overriding the original manual default. Manual/pending remains available through authenticated admin settings. Both reserve time. No public setting modification is exposed.
- Account creation remains optional. Phase 2 will add an unchecked account checkbox, separate privacy acknowledgement and password/confirmation fields using existing Supabase Auth. Backend booking remains independent of signup, with explicit partial-failure handling; the two systems are not one atomic transaction.
- Lifecycle events and pending notification-outbox rows commit atomically with bookings. No email sender runs and nothing is marked delivered. Outbox payloads contain identifiers and minimal lifecycle metadata, not contact details.
- Strict bounded request bodies, field validation, safe error codes, bounded rate limiting, no trusted proxy by default, and disabled SQL value logging protect public creation. Distributed deployments need a shared perimeter limiter.

## Verification plan

Run Go unit tests, API authorization/validation tests and real PostgreSQL integration tests against an isolated local database, including two concurrent overlapping submissions and idempotent retries. Verify health and browser-role denial. Report test database execution separately from Supabase migration application.

## References

[PostgreSQL exclusion constraints](https://www.postgresql.org/docs/current/rangetypes.html), [RLS and bypass roles](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Go time and daylight saving ambiguity](https://pkg.go.dev/time#Date).

## Implemented result

The current schema defines ten booking tables. Migration 002 creates services, doctors, doctor_services, doctor_schedules, doctor_time_off, appointments, appointment_events, booking_settings and notification_outbox. Migration `003_automatic_confirmation.sql` adds booking_settings_events and applies the owner's automatic-confirmation default rather than changing already versioned migration 002. The existing user_roles migration is restored unchanged as migration 001. No production catalog facts are seeded.

Public API: GET /api/booking/services; GET /api/booking/doctors; GET /api/booking/availability; POST /api/booking/appointments. There is deliberately no public reference lookup. [Full contracts and privileged endpoints](BOOKING_API.md) document the admin booking list/detail/create, status, reschedule and settings API. Internal validated configuration methods prepare catalog, eligibility, schedule and leave management; their HTTP management endpoints and all UI are future work.

Guest requests need no account. Signed-in requests associate a verified Supabase user when its access token is supplied; roles come from user_roles. Public registration always receives user through the existing role trigger, ignoring client role metadata. Automatic/confirmed is the default successful booking state. Administrators may enable manual/pending later; both states reserve time. Completed/no_show retain historical occupancy; cancelled/rejected release it. Status transitions are validated both in Go and PostgreSQL.

The existing protected reschedule API also accepts an optional replacement service. It recalculates the selected service/doctor duration and eligibility, rechecks availability and applies service/doctor/time changes atomically. Its lifecycle event includes previous/new service, doctor and timing values. Admin calendar/UI implementation remains outside this phase.

Settings modifications record the verified admin actor, timestamp and previous/new configuration snapshots in booking_settings_events in the same transaction as the settings update. No-op updates create no duplicate audit entry. Migration 003 records source migration for its one-time change; later administrator changes record source admin. Its guarded rollback refuses to discard any administrator settings audit, even if an actor's Auth account has been deleted. Existing appointment statuses are never rewritten by the default-mode migration.

Availability uses real UTC instants mapped to local Riga schedules, positive elapsed durations, effective dates, absences, occupied ranges, calendar horizon, minimum notice and interval grids. A treatment must fit one working interval. Slots crossing an offset transition (including ending exactly on it) are conservatively excluded. Repeated-hour slots remain distinct UTC choices. Phase 2 should render UTC slots using Europe/Riga with an offset when times repeat.

Booking, lifecycle events and outbox intent share one transaction. The unique UUIDv4 idempotency key is bound to normalized inputs and verified actor/user. Identical retries return the existing receipt; changed inputs conflict. Appointment references are opaque identifiers, never authorization. The database exclusion constraint independently prevents concurrent overlaps, including writes bypassing Go locking. Configuration/admin changes serialize against creation using documented shared/exclusive transaction locks.

## Verification completed

Executed against isolated **local PostgreSQL 17**, not Supabase:

- `go test ./...` with booking, auth and migration integration suites explicitly enabled.
- `go test -race ./...` with booking and auth PostgreSQL suites enabled.
- `go vet ./...` and `git diff --check`.
- Actual forward migration runner execution against dental_booking_test.
- Migration runner tests against separate dental_migrations_test: forward/repeat, existing-auth adoption preserving admin roles, unsafe grants/function drift rejection, unknown version rejection and guarded rollback.
- Booking tests: catalogs/eligibility, normal/off days, full/partial leave, duration gaps, time boundaries, UTC/Riga DST, horizon/advance, invalid input/consent, unavailable services/doctors, any-doctor assignment and duration overrides.
- Concurrency tests: distinct-key simultaneous service submissions; simultaneous HTTP requests producing exactly one 201 and one safe 409; independent concurrent raw SQL writes exercising PostgreSQL exclusion; same-key concurrent replay.
- Lifecycle/security tests: manual/automatic modes, cancellation release, safe rescheduling and failed mutation rollback, outbox failure rolling back the whole booking, signed-in association, guest receipt privacy, rate limiting, strict JSON and rejected client role/status fields, unauthorized admin access and browser table privileges.
- `/api/health` returned HTTP 200 with a connected real test database.

The initial verification run stopped local test container `dental-booking-phase1-test` afterward; its disposable databases remain available for inspection via `docker start dental-booking-phase1-test`. Subsequent update checks may restart it.

The owner-update checks also passed against isolated local PostgreSQL 17: migration 003 and seven migration subtests, automatic guest and authenticated confirmation, retained manual mode, settings audit/no-op/rollback behavior, service-changing reschedule duration/eligibility/collision rollback, verified admin authorization, cancellation release and authenticated-context-safe retries. `go test ./... -count=1` passed with booking/Auth integration enabled; the migration suite passed separately; the final `go test -race ./... -count=1` passed with all three integration suites enabled. `go vet ./...` and `git diff --check` passed. Frontend diff remains empty.

Optional booking checkbox/password-confirmation/live signup tests belong to Phase 2 because no booking frontend is implemented here. Existing backend Auth tests, including the database trigger preventing public registration metadata from granting admin, were executed. No live Supabase signup or account creation was attempted.

Tests never load application `.env` or fall back to DATABASE_URL. Integration execution requires explicit *_TEST_DATABASE_URL plus *_TEST_DATABASE_CONFIRM=disposable and database names ending _test. Without these variables, the corresponding integration tests explicitly skip. Use a fresh disposable target; suites reset test data. Auth bootstrap in backend/testdata/bootstrap.sql is a local stub and must never be applied to Supabase. Migration commands/setup are in [BOOKING_MIGRATIONS.md](BOOKING_MIGRATIONS.md).

## Applying to the inspected Supabase database

No booking migration, fixture, role modification or baseline adoption was applied to Supabase. The only Supabase action was read-only schema/permission inspection. To apply after operational review, from backend/ with the intended direct/session DATABASE_URL:

```sh
go run ./cmd/migrate --adopt-auth-baseline
go run ./cmd/migrate
```

The first command validates and records the pre-existing unrecorded auth schema, failing safely on differences. The second applies pending booking migrations, including the automatic-confirmation update. For a fresh project without user_roles, run only the second command. See migration documentation for prerequisites and guarded rollback. Do not run development fixtures on the clinic database.

## Still awaiting clinic confirmation

- Verified bookable procedure names/price metadata, base durations and doctor-specific overrides.
- Actual bookable doctors, service eligibility, working intervals, breaks, holidays and time off.
- Booking horizon, minimum advance notice and slot interval. Current 60 days / 120 minutes / 15 minutes are technical defaults, not clinic policy. Automatic confirmation is now confirmed by the owner and is no longer an outstanding decision.
- Approved privacy notice/version, data-controller information and retention policy. No guessed controller or retention values were added; booking remains unavailable until a notice version is configured.
- Cancellation/rescheduling rules, whether/how pending requests expire, appointment buffers, and any permission to book outside schedules. Pending currently reserves indefinitely until explicitly handled; manual admin bookings obey the same timing/consent rules.
- Notification recipients/content, delivery/reminder timing and Resend configuration. Outbox rows remain pending; no email delivery or reminder scheduler exists.

## Ready for Phase 2

The frontend can consume localized service metadata, eligible doctors, real slots, current privacy version, UUIDv4-idempotent creation and a safe confirmed booking receipt by default. Privileged lifecycle/settings endpoints and reusable catalog/scheduling services are ready for an authenticated admin UI. Clinic setup remains a prerequisite for real availability. Public design, contact form, Hero, Intro and frontend auth files were not changed. No branch was merged or pushed; work remains on feature/booking-backend.

Phase 2 will create the separate `/pieraksts` experience. Appointment CTA destinations may be updated at that point; no CTA mutation is part of this backend work. `/kontakti` remains for general questions. Phase 3 adds the admin calendar/management UI; Phase 4 adds real Resend delivery and reminders.

### Optional-registration handoff and failure handling

The future Create an account checkbox must be unchecked, hidden for authenticated visitors and independent of required privacy acknowledgement or optional marketing consent. Selected signup exposes password and confirmation fields and reuses existing Supabase validation/error handling. No generated passwords, emailed passwords, service-role frontend credentials or public admin assignment are permitted.

Signup failure must not automatically create a booking. Signup without a session, including confirmation-required configuration, requires an explicit guest-continuation choice; there is no forged session or silent fallback. After a session exists, booking submits its token and Go associates only the verified user. If the account succeeds but booking fails, the account remains and the UI must not claim an appointment was confirmed.

An unknown booking outcome preserves the same idempotency key, payload and identity. Token refresh for the same user is a safe retry. Switching guest/account/user contexts after a possibly successful submission can cause an idempotency conflict; never evade that conflict by blindly generating a new key. Resolve the original request/context or seek clinic assistance. A returned booking receipt, not signup success, determines confirmation. [The full partial-failure/retry matrix](BOOKING_API.md#optional-account-creation--phase-2-contract) is the frontend integration contract. Supabase Auth signup and PostgreSQL booking are explicitly separate operations, not an atomic transaction.

## Exact files changed

Modified:

- backend/cmd/api/main.go
- backend/internal/database/database.go

Added (including restored existing Auth files):

- backend/cmd/migrate/main.go
- backend/cmd/migrate/main_test.go
- backend/internal/auth/auth.go
- backend/internal/auth/auth_test.go
- backend/internal/auth/database_integration_test.go
- backend/internal/auth/optional.go
- backend/internal/auth/optional_test.go
- backend/internal/booking/admin.go
- backend/internal/booking/availability.go
- backend/internal/booking/availability_test.go
- backend/internal/booking/configuration.go
- backend/internal/booking/configuration_test.go
- backend/internal/booking/events.go
- backend/internal/booking/http.go
- backend/internal/booking/integration_test.go
- backend/internal/booking/models.go
- backend/internal/booking/store.go
- backend/internal/booking/validation.go
- backend/internal/server/router.go
- backend/migrations/001_user_roles.sql
- backend/migrations/002_booking_foundation.down.sql
- backend/migrations/002_booking_foundation.sql
- backend/migrations/003_automatic_confirmation.down.sql
- backend/migrations/003_automatic_confirmation.sql
- backend/migrations/fixtures/booking_development.sql
- backend/testdata/bootstrap.sql
- docs/BOOKING_API.md
- docs/BOOKING_MIGRATIONS.md
- docs/BOOKING_PHASE_1.md

## Files changed for the clinic-owner update

This follow-up changes only these files relative to the completed foundation:

- backend/internal/booking/admin.go — optional service reassignment, duration/eligibility revalidation, old/new service audit metadata, actor-bound atomic settings audit.
- backend/internal/booking/http.go — supplies the verified administrator identity when changing settings.
- backend/internal/booking/integration_test.go — automatic default, guest/account behavior, collisions, cancellation, service/doctor reassignment and settings audit tests.
- backend/migrations/003_automatic_confirmation.sql — new automatic default and private configuration audit table; no existing appointment status changes.
- backend/migrations/003_automatic_confirmation.down.sql — explicit guarded rollback preserving administrator audit data.
- backend/cmd/migrate/main.go — migration 003 and ordered rollback support.
- backend/cmd/migrate/main_test.go — upgrade/repeat/default/audit-preserving rollback coverage.
- docs/BOOKING_API.md — updated contracts and Phase 2 optional registration/failure/retry requirements.
- docs/BOOKING_MIGRATIONS.md — new migration, audit and rollback operations.
- docs/BOOKING_PHASE_1.md — owner decisions, scope, test evidence and file inventory.

Migrations 001/002, fixtures, Auth implementation, all frontend files, contact form, CTA destinations, Hero and Welcome Intro were unchanged in this follow-up. Supabase remains unmigrated; only disposable local test databases received migration 003.
