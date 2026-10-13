# Real Booking data activation preparation

2026-10-13 · `feature/final-development` · AG Dental `dcdgrbziounizuigmjcm`

**Preparation completed; production activation remains blocked pending clinic decisions and separate authorization.** Production access in this task was read-only. No services, doctors, schedules, appointments, settings, CMS records, prices, media or deployment configuration were changed. No migration, production upload, notification integration, deployment, commit, merge or push was performed.

## 1. Verified production inventory

Verified the project-qualified Session Pooler identity, Supabase project hostname, PostgreSQL database `postgres`, `sslmode=verify-full`, trusted certificate chain and matching hostname. Connections force read-only transactions. Exact ledger is 001_user_roles through 008_calendar_month_horizon; 008 was applied at 2026-10-13 16:18:23.456037 UTC.

| Object | Current state |
| --- | --- |
| Operational Booking services | 0 |
| Operational doctors | 1; Anda, inactive and Booking disabled |
| Doctor profiles | 1, explicitly linked to `clinic.doctorBio` |
| Doctor-service relationships | 0 |
| Working intervals | 1, active Monday 12:00–17:00 test entry, no effective dates; not confirmed clinic hours |
| Absences/time off | 0 |
| Appointments / appointment events | 0 / 0 |
| Booking settings / settings events | 1 / 1 |
| Notification outbox | 0 |
| CMS documents / revisions / events | 198 / 198 / 205 |
| Media registry / media events | 13 / 4 |
| Auth users / identities / user roles | 1 / 1 / 1; no orphan links |
| Public catalog | 8 services, 6 categories, 69 price rows |
| Storage buckets / objects | 1 / 0 |

Final read-only comparison: all **61 source-table fingerprints**, complete captured schema, supplementary RLS/Auth metadata, role inventory, sequences, catalog/doctor inventory and Storage metadata match the beginning of this task exactly. No independent production drift was observed.

Current Booking settings: automatic confirmation; day horizon 60; month horizon **0**; minimum advance 120 minutes; interval 15 minutes; Europe/Riga; privacy notice NULL. These are existing inactive-launch configuration values, not the newly requested clinic rules.

### Owner clarification: Monday interval is test data

Anda's existing interval is **Monday 12:00–17:00**, record `74228cc9-157d-4aa1-a73c-0577d8d3af2a`. The owner confirmed that they manually entered it for testing; it is **not confirmed clinic working time**. The clinic has confirmed **Wednesday and Friday**, but exact hours remain pending. Do not infer or invent hours for those days.

During separately authorized production activation, first perform a fresh appointment-dependency and schedule-impact check for this exact interval. Only if no existing appointments depend on it, remove it from active availability through the existing schedule deactivation workflow, preserving history. If dependencies exist, stop for review rather than remove coverage or alter appointments automatically. The earlier zero-appointment inventory is not a substitute for this fresh check. No production data was changed for this clarification; public Booking remains inactive and DEMO unchanged.

## 2. Exact specialist mapping

### Dr. Anda Gutovska — reuse

- Operational doctor ID: `347786ef-600f-4553-87d9-4c4f5bb29770`.
- `doctor_profiles.doctor_id` matches that ID.
- Explicit editorial key: `clinic.doctorBio`.
- Existing draft and published revision: `9fe7bfd1-f981-415f-94b3-c4e8bcb2f955`.
- Existing portrait reference: `media.a5efea0fa7154c32`.
- Existing LV/RU/EN title/biography remain unchanged.
- Existing provenance is `clinic_verified`; `active=false`, `booking_enabled=false`.

This mapping is supported by a stored foreign-key relationship, not a fuzzy name match. Reuse the UUID, editorial link, portrait, revisions and historical records. Keep inactive while configuration is incomplete.

### Henriete Jete Otto — new operational identity required

No existing operational doctor or matching CMS specialist document was found. The confirmed name and hygienist role do not authorize inventing a biography, portrait or qualifications.

Proposed creation: one operational identity named `Henriete Jete Otto`, initially inactive and Booking disabled. Allocate its UUID once during an approved transaction and persist it in the approved activation manifest. Do not manufacture a preexisting ID. No automatic CMS profile import/link based on similar names. If the editor requires profile map shapes, empty optional LV/RU/EN biography/qualification values are not clinical claims; role/title translations require approval or can remain absent. No new public specialist publication is included in this plan.

## 3. Exact service and eligibility proposal

These are **operational Booking offerings**, separate from broad editorial service pages. There are no existing operational UUIDs to reuse. Proposed internal slugs below are identifiers for review, not changes to public routes.

| Proposed internal slug | Confirmed Latvian name | Minutes | Doctor |
| --- | --- | ---: | --- |
| konsultacija-pie-zobarsta | Konsultācija pie zobārsta (ārstēšana, ķirurģija, protezēšana) | 30 | Existing Anda UUID above |
| zobarsta-vizite-ar-manipulaciju | Zobārsta vizīte (ar iekļautu manipulāciju) | 60 | Existing Anda UUID above |
| pilna-mutes-dobuma-higiena | Pilna mutes dobuma higiēna | 60 | Henriete UUID allocated once on approved creation |

For each: clinic-verified provenance, no price/price metadata inferred, initially inactive/not bookable, no duration override needed. Create exactly three eligibility pairs. No other website service becomes bookable.

**RU/EN labels for these exact offerings remain unapproved.** The existing staging fixture already contains translated test labels from earlier local work; they were reused unchanged solely as test data and are not an approved production translation source. This task invented no new translations. Nonempty LV/RU/EN service names are validated by the API, so production creation must wait for approved labels rather than duplicate Latvian into all locales.

### Public catalog separation

Existing public identifiers and routes remain:

- `service.konsultacija` → `/pakalpojumi/konsultacija`
- `service.zobu-arstesana` → `/pakalpojumi/zobu-arstesana`
- `service.saknu-kanalu-arstesana` → `/pakalpojumi/saknu-kanalu-arstesana`
- `service.zobu-higiena` → `/pakalpojumi/zobu-higiena`
- `service.zobu-balinasana` → `/pakalpojumi/zobu-balinasana`
- `service.zobu-kirurgija` → `/pakalpojumi/zobu-kirurgija`
- `service.zobu-protezesana` → `/pakalpojumi/zobu-protezesana`
- `service.bernu-zobarstnieciba` → `/pakalpojumi/bernu-zobarstnieciba`

All catalog Booking links are currently empty. Consultation/diagnosis, restorative dentistry and hygiene are related categories, **not verified one-to-one price/Booking identities**. Do not create `cms_booking_service_links` or set catalog `booking_id` from this resemblance. The catalog synchronization code can replace an operational offering's localized name/description and derive a price from its editorial owner; linking blindly would defeat the approved exact names and could advertise an unconfirmed price.

Proposed mappings therefore intentionally leave editorial ownership/price links empty. Preserve all eight catalog items, six categories, 69 prices, slugs, CMS payloads and SEO. Any later shared catalog mapping needs explicit clinic review and synchronization design, not implicit linking during activation.

## 4. Rules and monthly scheduling

### One calendar month

Migration 008 supports `booking_horizon_months=1`; the engine uses Riga local dates, includes the boundary day and clamps month end. January 31 maps to February 28/29, December 31 to January 31. This is not 30 days. Month and DST boundary tests pass. Production remains at 0 until separately authorized.

### Two advance-notice candidates for clinic review

The following hours are hypothetical comparison examples only, not confirmed clinic hours.

| Interpretation | Proposed rule | Example: request Tuesday 10:00, Wednesday hours 09:00–17:00 |
| --- | --- | --- |
| A: appointment start | Appointment start must be at least 24 elapsed hours after request | Wednesday 14:00 can be offered; 09:00 cannot |
| B: working-day start | Doctor's first effective working interval that date must begin at least 24 elapsed hours after request | Entire Wednesday unavailable, including 14:00 |

Candidate B uses the selected doctor's first actual scheduled instant that Riga date, not the clinic opening time. Split shifts do not get separate later cutoffs. Time off or earlier bookings do not move the cutoff later. These are **explicit review assumptions**, not confirmed clinic policy. The clinic must clarify doctor start versus clinic opening, whole-day versus per-shift cutoff, exact inclusion at the boundary, and elapsed hours versus local clock/business days. Neither candidate means “previous business day” automatically.

Candidate A is supported by the existing persisted minutes setting. Candidate B is now an engine-only review option, selected in tests through a temporary Go build overlay. No public request, database field, normal backend environment variable or admin setting selects it. Normal `Settings.availability()` remains unchanged and uses appointment start. If B is approved, separately implement a durable, authorized policy setting/migration and its audit/UI behavior before launch. Do not deploy the temporary overlay as a production configuration mechanism.

Tests cover before/exactly/after the day-start cutoff, split shifts, spring/fall DST with elapsed 24 hours, invalid policy references, and real API availability/creation rejection under B. The deterministic API boundary test temporarily uses an artificial notice length to position the threshold inside a synthetic day; the full staging workflows use 1440 minutes. This does not pretend that either interpretation is approved.

### Manual confirmation and slot protection

Proposed production setting is manual. New requests become pending; pending and confirmed both occupy the GiST-protected half-open time range. Confirm, reschedule, cancel and reject use existing validated, authorized lifecycle operations. Cancel/reject releases the slot; completed/no-show retains historical occupancy. There is no pending-expiry job or new expiry rule.

### Henriete's dates

Existing Specialists → Schedule now supports month selection and individual dates with start/end, multiple intervals, edit and remove. Weekly hours are optional. Same-day `effective_from=effective_until` persists through the API; dates do not recur next week. Changes preserve existing appointments and reject newly uncovered pending/confirmed visits. Deactivated historical intervals remain stored. Actual Henriete dates are still missing. Tests use synthetic hours only.

## 5. Patient data, privacy and access

| Field | Required | Purpose / handling |
| --- | --- | --- |
| First name, last name | Yes, 1–100 characters each | Identify the requested visit and patient on the admin calendar |
| Phone | Yes; 7–15 digits in a supported international-style string up to 30 characters | Manual contact about pending/changed visits; not a country-specific mandatory prefix |
| Email | Yes, validated, maximum 254 characters | Contact channel; no automatic email currently sent. Clinic should confirm the need for both phone and email |
| Service, assigned/selected doctor, date/time | Yes; any-doctor requests can omit doctor until server assignment | Allocate duration and reserve an eligible slot |
| Privacy acknowledgement/version | Yes, unchecked by default | Record acknowledgement of the active notice; stale/missing versions rejected |
| Auth user association | Optional, server-verified | Associate authenticated requests; guests do not register |

No diagnosis, national identity number, medical history or health free-text field is requested. Server derives duration/status/end time; client cannot set an admin role or trusted price.

PostgreSQL stores patient contact fields with the appointment, consent timestamp/version, reference, status, timestamps, idempotency key/request fingerprint and minimal lifecycle events. Pending retry intent can temporarily include form values in same-tab sessionStorage; after success the saved state becomes receipt/service/doctor metadata without contact fields. Backups contain database data and require protected storage/retention.

Public catalog/availability/receipt responses do not expose patient lists/contact data. Admin reads and writes require a verified JWT plus server-side admin authorization. Browser table access is denied with RLS in place. The privileged Go database connection is an explicit trust boundary; RLS is not a substitute for backend authorization. A reference alone does not expose a patient-details endpoint. Existing rate limits, input validation, no-store admin delivery and transaction/collision safeguards remain intact.

Privacy notice version is currently NULL and readiness blocks real submission. `frontend/src/content/legal.ts` still has `CLIENT_CONFIRMATION_REQUIRED`; draft wording includes absent accounts/calendar/browser-only form handling that must be reviewed for the real Booking flow. No legal text was changed. Controller/privacy contact, lawful basis, processor/transfers, rights handling and accurate LV/RU/EN notice require approval. Do not set a synthetic version just to bypass readiness.

Retention/deletion periods for appointments, pending/cancelled requests, consent evidence, events, idempotency state, logs and backups are unresolved. No period or purge job was invented. Clinic/legal review must specify access/deletion responsibility and exceptions before launch.

## 6. Manual communication and notification dependencies

- Administrators discover pending visits by opening/refreshing the Appointments calendar and filtering pending status. There is no guaranteed push/email alert or delivery worker. A loaded screen is not a guarantee of immediate new-request notification.
- Patients see the submission receipt/reference and pending status. The saved receipt is not a live status subscription; later admin confirmation does not automatically notify the patient or update a previously saved receipt.
- Cancellation/rescheduling changes the server record/history, but does not send email, WhatsApp or SMS. Staff must contact the patient through an agreed manual process.
- Outbox events exist but are not evidence of delivery. Isolated tests assert zero delivered notifications.

Before launch the clinic must assign staff monitoring frequency/responsibility, expected response time, contact channel, failed-contact procedure, and rules for communicating confirmations, rejections, cancellations and new times. A documented reliable manual process may be approved; otherwise lack of notifications is a launch blocker. No promised automatic messaging may appear in patient instructions. Resend/WhatsApp are not implemented here.

## 7. Tests and evidence

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk advisory |
| Frontend unit tests | 146 PASS, zero failures |
| Go tests + disposable PostgreSQL | All packages PASS: Booking/Auth/CMS/Admin/Media/database/migrations |
| Go vet | PASS |
| Candidate A isolated real Auth/Go/PostgreSQL browser run | PASS |
| Candidate B isolated temporary-overlay run | PASS; same real request path, production selector unchanged |
| Both notice candidates | Actual availability response and appointment creation acceptance/rejection verified |
| Monthly editor | Add, save, reload, edit, remove passed in LV/RU/EN at 390/1440px |
| Booking lifecycle | Pending create, reference, admin view/confirm/reschedule/cancel/history, retry, concurrent 201/409 PASS |
| Calendar-month/date/advance/DST engine tests | PASS |
| CMS/service catalog browser regression | PASS: six language/viewport workflows, create/edit/public detail/refresh/archive/restore/concurrency/Auth; appointments preserved and Booking disabled |
| Hero locks | 15/15 PASS |

Full mutation lifecycle runs in English; six localized desktop/mobile runs exercise service/specialist selection through review and monthly schedule CRUD. This is not a claim of repeating every mutation in every locale. Unit/Go suites cover rejection and authorization. No mocked API was the sole evidence.

The first unit-test launch was blocked by sandbox loopback permissions; the permission-enabled run passed all 146. Initial go vet was blocked by cache access; its permitted rerun passed. Disposable test resources were cleaned up. Screenshots under `docs/screenshots/real-booking/` and regenerated shared `final-e2e` images contain synthetic data only.

Reproduction:

```sh
npm --prefix frontend run build
(cd frontend && node --test tests/*.test.mjs)
(cd backend && go vet ./...)
sh backend/scripts/test-media-local.sh
QA_REAL_BOOKING=1 PLAYWRIGHT_MODULE=<installed-playwright-path> python3 backend/scripts/acceptance-local.py
QA_REAL_BOOKING=1 QA_ADVANCE_REVIEW=working_day_start PLAYWRIGHT_MODULE=<installed-playwright-path> python3 backend/scripts/acceptance-local.py
QA_CATALOG_ONLY=1 PLAYWRIGHT_MODULE=<installed-playwright-path> python3 backend/scripts/acceptance-local.py
node frontend/scripts/check-hero-lock.mjs
```

## 8. Production activation procedure — not executed

1. Obtain missing approvals: exact service RU/EN labels and internal identifiers, hours, notice interpretation, privacy/retention and manual communication process. Approve this mapping explicitly.
2. Fresh project/TLS/ledger/schema/identity inventory and full fingerprints. Confirm 001–008 and reconcile any independently added records before preparation. Never infer identity from names alone.
3. Create a fresh encrypted backup and verify isolated restoration before the eventual data write. The existing pre-008 backup is not a complete future activation snapshot. Include current Auth, Booking, CMS/Media/catalog and Storage metadata; preserve external Storage bytes separately where needed. Record SHA-256 and scope.
4. Prepare a reviewed dry-run manifest with exact before-state hashes, expected counts and approved localized data. Reuse Anda's exact UUID/editorial mapping. Allocate/persist new UUIDs for Henriete and three services once. Check proposed slugs for conflicts. If matching activation IDs already exist with identical fields, no-op; if any field/relationship differs, stop. Do not use a name-based upsert or overwrite-on-conflict.
5. Under the existing configuration lock, one transaction creates only the approved missing operational records, initially disabled, and exact three eligibility links. No CMS ownership links, prices or public catalog changes. Record administrator/audit provenance. Verify counts/digests before commit. This guarded activation command is not yet implemented or authorized; do not substitute manual unreviewed SQL.
6. During authorized activation, verify that no existing appointments depend on the owner-created Monday test interval, then remove that exact interval from active availability by deactivating it with history preserved. Stop for review if dependencies exist. Do not reuse its hours as clinic hours. Configure Anda’s Wednesday/Friday intervals only after exact hours are confirmed, and Henriete’s dates only after they are supplied. Use existing schedule-impact checks before every change; no placeholder hours.
7. Publish the separately approved accurate privacy notice and configure its real version. No synthetic notice or empty translation placeholders.
8. Separately activate manual confirmation, month horizon 1 and the approved advance rule; preserve the current interval/timezone/cancellation policy unless explicitly changed. Candidate B requires its durable implementation first. Keep public access blocked until readiness checks pass.
9. Verify hosted Backend TLS, API reachability, JWT issuer/audience/admin authorization, allowed frontend origins, secret isolation, rate limiting, privacy readiness and recovery. No hosted deployment was performed in this task.
10. For the separately approved Vercel environment, set the correct reachable `VITE_API_URL`, frontend-safe Supabase URL/key and `VITE_BOOKING_DEMO=false`, then rebuild/deploy under approval. Never include backend secrets. DEV gating already prevents the demo adapter in production builds; changing a Vite variable requires a rebuild, and DEMO removal is not sufficient to make the Go API ready.
11. Enable only approved services/doctors after all readiness checks. Perform read-only availability verification with real durations/dates/timezone/horizon. A real patient/test booking and its cancellation require separate explicit scope; do not create test appointments as an incidental smoke check.
12. Rollback plan: close new Booking intake by guarded service/doctor flags while preserving appointments and history. Revert only approved configuration changes from recorded before-values, checking concurrent edits and schedule impact. Never delete referenced identities or restore the entire backup over later legitimate activity automatically. Database restoration is a separately approved recovery action, not routine rollback.

## 9. Exact local changes

- `backend/internal/booking/availability.go`: engine-only advance reference review option; default unchanged, no persisted/public selector.
- `backend/internal/booking/real_rules_test.go`: candidate boundaries, split shifts and DST tests.
- `backend/scripts/acceptance-local.py`: temporary Go build overlay for isolated candidate B only; synthetic mode required.
- `frontend/tests/real-booking-staging.cjs`: schedule edit/removal and real API notice acceptance/rejection checks.
- `docs/REAL_BOOKING_DATA_ACTIVATION.md`: this report.
- Ignored operator helper `backend/.tls/real-booking-data-audit.go`, private read-only evidence in `/tmp/ag-real-booking-data-before` and `/tmp/ag-real-booking-data-after`, synthetic screenshots regenerated by existing tests.

No service fixture translations, legal content, production flags, public design, Hero or Welcome Intro were changed. No runner/migration was changed in this task.

## 10. Remaining blockers

- RU/EN names for exact Booking offerings; no production translations invented.
- Anda's exact Wednesday/Friday hours; dependency verification before removing the confirmed Monday test entry during activation.
- Henriete's actual monthly dates; identity creation and optional role/profile publication approval.
- Candidate A versus B and detailed cutoff semantics; B is not production-configurable yet.
- Privacy notice, controller/retention decisions and manual communication procedure.
- Fresh recovery point, reviewed idempotent activation implementation/dry-run and explicit production data approval.
- Hosted backend/frontend deployment and final real-service verification under separate authorization.

No further production action is authorized by this preparation task. Stop for review.
