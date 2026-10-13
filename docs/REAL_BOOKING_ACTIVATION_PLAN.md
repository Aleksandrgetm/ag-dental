# Real Booking configuration and DEMO removal preparation

> Status clarification — 2026-10-13: Migration 008 is now applied, with the month rule still inactive; see [activation evidence](BOOKING_008_PRODUCTION_ACTIVATION.md). Use [the latest data activation plan](REAL_BOOKING_DATA_ACTIVATION.md), including the owner-confirmed Monday test schedule and outstanding clinic decisions. Do not replay migration steps from this earlier plan.

2026-10-13 · `feature/final-development` · AG Dental

**Safe local implementation and isolated acceptance completed. Production Booking remains unactivated.** No production database connection, record changes, migrations, uploads, backend restart, deployment, commit, merge or push was performed in this task. Existing unrelated working-tree changes were preserved.

## 1. Confirmed information

| Booking offering | Duration | Eligible specialist |
| --- | --- | --- |
| Konsultācija pie zobārsta (ārstēšana, ķirurģija, protezēšana) | 30 minutes | Dr. Anda Gutovska |
| Zobārsta vizīte (ar iekļautu manipulāciju) | 60 minutes | Dr. Anda Gutovska |
| Pilna mutes dobuma higiēna | 60 minutes | Henriete Jete Otto, hygienist |

No prices are assigned or inferred. Operational Booking offerings are not automatically mapped onto the eight broad editorial service pages or 69 public price rows. Existing public catalog, price data and SEO remain unchanged. In particular, a broad category is not a verified exact procedure/price identity. Fresh production inventory and explicit identity mapping are required before creating operational records, so existing records must not be duplicated.

Anda works Wednesday and Friday; hours remain unknown. Henriete requires individual working dates that can change each month. No real hours or additional qualifications were invented.

## 2. Architecture audit

Already supported:

- Real guest Booking API, optional verified Auth association, service durations, doctor eligibility and UTC appointment storage.
- Europe/Riga availability, recurring intervals, inclusive effective-date ranges, time off, minimum notice and time-slot intervals.
- Date-specific working intervals via matching `effective_from` / `effective_until`; no new schedule table needed.
- Manual `pending` versus automatic `confirmed` creation.
- PostgreSQL exclusion constraint reserves pending and confirmed intervals; completed/no-show rows retain historical occupancy. Cancelled/rejected rows release time.
- Validated admin confirm/reschedule/cancel transitions, audit history, idempotency and collision protection.
- Server-side JWT/admin role checks, RLS/browser access restrictions and schedule-impact checks.
- Dev-only DEMO adapter, with no fallback to demo after a real API failure.

Gaps addressed locally:

1. Simplified specialist editor did not expose individual effective dates. It now does.
2. Horizon previously supported a fixed number of days only. A calendar-month mode is implemented with an additive proposed migration.
3. Pending receipt now explicitly states in LV/RU/EN that automatic email/WhatsApp notifications are unavailable and asks patients to retain the booking reference.

No production configuration was inferred from old reports. Prior production values are not assumed to be current merely because an earlier task verified them.

## 3. Monthly scheduling implementation

Within each Specialist → Schedule editor:

- Select month using a native month picker.
- Add working date using a native date picker.
- Enter start/end times; save with the existing Save schedule action.
- Repeat for other dates/intervals; dates sort chronologically within the selected month.
- Weekly hours are optional and remain separate. Weekly toggle/copy operations preserve individual dates.
- Date-specific intervals round-trip through existing API effective-date fields and do not recur the following week.
- No default hours are inserted. New intervals start blank.
- Responsive date/time inputs remain readable on mobile; existing simplified visual identity is retained.
- Up to 124 active intervals are accepted to accommodate monthly split schedules. Older intervals may be removed from the active set without permanently deleting their history.

Existing schedule saves are versioned/configuration-locked. They check appointment coverage against the resulting schedule, reject newly uncovered future pending/confirmed appointments, and preserve existing appointment records. Time off, breaks and vacations remain in the existing embedded controls.

## 4. Calendar-month horizon and proposed migration

Prepared, **not integrated into the production runner and not applied to production**:

- `backend/migrations/proposed/008_calendar_month_horizon.sql`
- `backend/migrations/proposed/008_calendar_month_horizon.down.sql`

Adds `booking_settings.booking_horizon_months`, integer 0–12, default 0. Zero retains the existing day-based horizon, so migration alone changes no Booking policy. Positive values use local Riga calendar dates. One month means the same calendar day in the next month, clamped to that month's last day, inclusive. Examples: January 31 → February 28/29; December 31 → January 31. This interpretation is explicit for clinic review, not silently approximated as 30 days.

The engine retains UTC instants and existing DST rules. Minimum notice remains elapsed minutes: 1440 equals 24 hours, including across daylight-saving changes. If “working day” means business-day counting, cutoff time or excluding closed days, this is not yet implemented or assumed approved.

Admin settings updates validate/audit the month field. On an older schema, existing day-mode updates still work and a nonzero month request fails closed as not configured. No AutoMigrate is used. The rollback refuses to drop an active month rule until a replacement policy is approved.

Disposable tests covered apply/default preservation, down/up, and transactional failure of raw repeat application. Production integration must use the reviewed ledger-aware runner under separate approval, not execute raw SQL blindly.

## 5. Manual confirmation and notifications

Staging uses `confirmation_mode=manual`. New guest requests return `pending`, with a reference and reserved time. Administrators can confirm, reschedule or cancel; history remains visible. Concurrent requests for the same slot produce one 201 and one 409.

There is **no automatic pending-expiry policy/job** and none was added. A pending slot remains reserved until an explicit approved lifecycle transition. The existing admin calendar displays pending status and confirmation action; real browser acceptance verified that workflow.

Notification events/outbox records are created atomically as before, but there is no delivery integration/worker in this task. Tests assert zero delivered notifications. No Resend or WhatsApp code was added. Operationally, the clinic must agree who reviews pending requests and communicates confirmation/cancellation manually before launch; the website must not imply an automatic message is sent.

## 6. Isolated real-service staging

Reproducible command from repository root:

```sh
QA_REAL_BOOKING=1 \
PLAYWRIGHT_MODULE=/Users/aleksandrgetmanenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
python3 backend/scripts/acceptance-local.py
```

The runner creates a new dedicated Docker network, disposable PostgreSQL, real local Supabase Auth and the existing isolated Storage dependency; loopback-only ports, temporary test credentials and no production `.env` are used. Browser traffic is restricted to localhost/127.0.0.1. It sets `VITE_BOOKING_DEMO=false` only for this test frontend. All resources are removed afterward.

`backend/testdata/real_booking_staging.sql` is applied only by this disposable mode after its baseline synthetic fixture. It configures the confirmed names/durations and correct doctor eligibility with no prices. Russian/English service labels are translations for review; no extra clinical claims are introduced. Working hours 09:00–17:00, breaks, individual dates and the privacy version are **synthetic**, never approved clinic facts. The SQL is not a production import script.

Verified in actual browser-to-Go-to-PostgreSQL flow:

- Guest service and named specialist selection; real availability.
- Pending creation and reference; admin confirmation, rescheduling and cancellation/history.
- Real idempotent retry and simultaneous-slot collision 201/409.
- No DEMO indication/adapter in this staging build.
- Six LV/RU/EN × 390/1440px selection-to-review flows covering all three offerings.
- Six localized individual-date saves, reload persistence and no required recurring hours.
- Horizon and advance limits through the real availability API.
- No delivered notifications.

The full mutation lifecycle was tested in English; localized mobile/desktop coverage exercises selection/review and monthly schedule saves in all three languages. This distinction is intentional rather than claiming every lifecycle mutation was repeated in every language.

Screenshots (all synthetic hours/patients):

- [Schedule EN mobile](screenshots/real-booking/schedule-en-390.png)
- [Schedule EN desktop](screenshots/real-booking/schedule-en-1440.png)
- [Review LV mobile](screenshots/real-booking/review-lv-390.png)
- [Review RU desktop](screenshots/real-booking/review-ru-1440.png)
- Equivalent `schedule-{lv,ru,en}-{390,1440}.png` and `review-{lv,ru,en}-{390,1440}.png` are captured in the same folder.

## 7. Privacy audit and launch dependencies

Actual Booking request fields:

- First name and last name (required, max 100 each).
- Phone (required, optional leading +, digits/spaces/parentheses/hyphens; 7–30 characters).
- Email (required, validated, max 254).
- Service ID, selected/assigned doctor ID, requested start time.
- Required unprechecked privacy acknowledgement and current notice version.
- Optional Auth user association supplied by verified server authentication, not a trusted client role.

Stored operational/audit data additionally includes appointment/reference IDs, calculated end time, status, consent timestamp, creation/update timestamps, idempotency key/request fingerprint and lifecycle actor/event metadata. Notification outbox stores event/appointment references and undelivered state. No diagnosis, identity number, medical history or free-text health intake is requested by the Booking form.

Browser retry handling stores a same-key pending intent in tab storage before submission; once a receipt is obtained it replaces patient details with receipt metadata. This is another privacy surface to document, not merely a database-only flow.

Access boundaries:

- Guest users may create bookings without registering.
- Public service/doctor/slot endpoints disclose no patient list or contact information.
- Receipt responses omit patient contact details.
- Admin reads/mutations require verified JWT plus server/database admin role, with no-store responses and existing rate/input validation.
- Direct browser table access remains restricted. The Go PostgreSQL connection is trusted/privileged; RLS must not be misrepresented as protecting against misuse of that backend connection.
- Reference knowledge alone does not expose a public patient-details endpoint.

**Privacy blockers:** `frontend/src/content/legal.ts` retains `CLIENT_CONFIRMATION_REQUIRED` for controller identity, privacy contact, lawful basis, recipients/processors/transfers, retention, rights and activation. Existing draft policy wording includes statements about absent patient accounts/calendar and browser-only form data that must be reviewed against the now-implemented Booking architecture. Publish an accurate approved LV/RU/EN notice before activating submission; do not merely set a dummy notice version to bypass readiness.

No retention period was invented. The clinic must approve separate retention/deletion rules for requests, cancelled/rejected appointments, audit/consent evidence, idempotency records, infrastructure logs, backups and future communications, plus access/deletion procedures and backup expiry. There is no new automatic purge or pending-expiry mechanism in this task. Retention decisions require clinic/legal review, not inferred software defaults.

## 8. Tests executed

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk advisory remains |
| Frontend suite | 146 passed, zero failures |
| `go test ./...` through disposable PostgreSQL runner | PASS all packages: Auth, Booking, CMS, admin/server, database, Media and migration runner |
| New Go rules | PASS month-end clamping, leap year, year boundary, date horizon across spring DST season, exact 24-hour boundary and nonrecurring date |
| Existing integration coverage | PASS pending/manual/automatic states, collision, schedule/time-off impact, appointment preservation, authorization and idempotency |
| Proposed 008 isolated migration | PASS additive default, rollback/reapply and safe repeat failure |
| Real staging browser | PASS full English lifecycle plus six localized responsive review/date-editor workflows |
| Existing Auth/Admin browser behavior within staging | PASS real Auth login, verified admin role and admin lifecycle |
| Hero locks | 15/15 PASS |

Initial staging test assumed a second doctor-radio option; the real configuration correctly has only one eligible named doctor. The shared test selector was corrected to support that case. No application availability workaround was introduced. Final runs passed and disposable environments were removed.

## 9. Production activation plan — NOT EXECUTED

1. Obtain missing clinic information/approvals listed below. Confirm how the three Booking offerings relate to existing operational identities; preserve the public catalog and prices. Do not automatically link broad editorial groups if synchronization would overwrite the confirmed Booking names.
2. Perform fresh read-only project/TLS/ledger/schema/catalog/doctor/Booking inventory. Verify current encrypted backup and isolated restore coverage. Review proposed 008 and integrate it into the existing ledger-aware runner only under a separate migration approval.
3. Apply only approved migration 008, preserving default 0 initially; verify schema/RLS/data preservation. No schedules/services become enabled by migration alone.
4. Reuse matching existing approved operational UUIDs; otherwise create exactly the three approved Booking offerings and two specialist identities through guarded configuration. Preserve Anda's existing editorial linkage and portrait/history. Do not invent Henriete's biography, qualifications or portrait. No prices should be copied from an ambiguous price row.
5. Set confirmed 30/60/60-minute durations. Establish explicit eligibility: Anda → consultation and dental visit; Henriete → hygiene. Keep Booking disabled during preparation. Prepare doctors as active but not bookable where required by existing service-readiness checks.
6. Enter Anda's confirmed Wednesday/Friday intervals and Henriete's actual dated intervals using the new editor. Verify existing appointment impact before modifications. Synthetic fixtures must never be loaded into production.
7. Approve/publish complete localized privacy notice and set its real version. Approve retention and manual communication procedure.
8. Through server-authorized settings, set manual confirmation, `booking_horizon_months=1`, minimum advance 1440 **only if elapsed 24 hours is approved**, Europe/Riga, and preserve the existing slot interval unless separately changed by the clinic. Read current settings before submitting a full update; do not reset unrelated configuration.
9. Verify service/doctor readiness before explicit per-service/per-doctor enablement. Keep the public launch blocked until hosted backend, TLS, JWT verification, CORS, secrets, limits, observability and recovery are verified.
10. Configure the separately approved hosted frontend with real reachable API/Auth values and DEMO off. Missing API must remain unavailable, never silently fall back to demo. No backend or frontend was deployed here.
11. Perform read-only real-service availability checks first (durations, eligibility, dates, timezone, horizon/notice, privacy version). Any production patient/test booking requires separate narrowly scoped authorization. Verify manual pending handling and communication before public launch.
12. Do not automatically enable media uploads, introduce notification providers or publish unrelated content as part of Booking activation.

## 10. Missing clinic information / remaining blockers

- Exact Wednesday/Friday hours and breaks for Anda.
- Henriete's actual dated hours for the first operational month and who maintains them.
- Whether 24 hours means elapsed time or working/business-day notice, and the intended cutoff behavior.
- Approval of the explicit inclusive, clamped calendar-month interpretation.
- Approved privacy/controller/processor/retention information and notice version.
- Confirmation/cancellation/rescheduling operational policy, staff responsibility and manual communication expectations; no expiry policy is assumed.
- Optional price display for the three Booking offerings remains unconfirmed and absent.
- Fresh production identity mapping, separate migration/configuration approval, hosted backend connection/deployment and final controlled launch verification.

## 11. Exact files changed in this task

- `backend/internal/booking/availability.go`
- `backend/internal/booking/models.go`
- `backend/internal/booking/admin.go`
- `backend/internal/booking/doctor_setup.go`
- `backend/internal/booking/real_rules_test.go`
- `backend/migrations/proposed/008_calendar_month_horizon.sql`
- `backend/migrations/proposed/008_calendar_month_horizon.down.sql`
- `backend/scripts/acceptance-local.py`
- `backend/testdata/real_booking_staging.sql`
- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/src/i18n/specialistEditor.ts`
- `frontend/src/i18n/booking.ts`
- `frontend/tests/acceptance-workflows.cjs`
- `frontend/tests/real-booking-staging.cjs`
- This report and synthetic screenshots under `docs/screenshots/real-booking/` (existing final-e2e screenshots also regenerated by the shared lifecycle test).

No production `.env`/DEMO flags changed. No running production-connected backend was restarted. Proposed 008 remains unapplied and outside the production migration runner. Stop for review.
