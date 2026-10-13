# Appointment calendar UX simplification

Branch: `feature/final-development`. Local work only; existing uncommitted work preserved.

## Workflows

- Main controls are Day / Week / Month, date, Previous / Today / Next, specialist filter and Add appointment. Date and specialist changes reload automatically. Search, service and status filters are under Advanced options, with an explicit search action. No patient-data polling was added.
- Mobile initially opens Day; desktop opens Week. Day entries are sorted chronologically in Europe/Riga. Week shows seven days with compact empty days. Month uses a Monday-first seven-column grid with leading alignment cells, current-day marker and appointment counts. Selecting a day opens Day view.
- One empty-period message replaces repeated empty messages. Existing paginated API results remain paginated; an explicit notice explains that counts cover the loaded page when more results exist.
- Add appointment starts with a configured specialist, then only their eligible approved services, then server-returned date/time availability. Patient/contact/privacy fields appear after a slot is selected. No arbitrary time, invented configuration or client-supplied duration is accepted.
- Missing configuration disables Add with an explanation and a Specialists link. Temporary failures use nontechnical language.
- Details retain patient contact, specialist, service, date, time and status. Confirm, Reschedule and Cancel are primary; advanced terminal statuses and audit history are disclosures.
- Successful writes refresh the calendar. Existing version checks, consent, immutable uncertain-request retry payload/idempotency key, dialog focus trap, role revalidation and route-leave protection are preserved.

## Exact files changed in this task

- `frontend/src/views/admin/AdminAppointmentsView.vue`
- `frontend/src/i18n/appointments.ts`
- `frontend/tests/appointments-browser.cjs`
- `frontend/tests/specialist-editor-browser.cjs` — wait for Vue editor detachment after role revocation instead of asserting before the render completes.
- `docs/APPOINTMENT_CALENDAR_UX.md`
- `docs/screenshots/appointment-calendar/before-390.png`
- `docs/screenshots/appointment-calendar/before-1440.png`
- `docs/screenshots/appointment-calendar/after-390.png`
- `docs/screenshots/appointment-calendar/after-1440.png`

No backend, database migration, public page, Hero, Welcome Intro or Auth implementation changes.

## Screenshot evidence

Before images are preserved captures from the prior synthetic admin acceptance run, not live production data. After images use the synthetic calendar fixture.

| Viewport | Before | After |
| --- | --- | --- |
| Mobile 390px | [Before](screenshots/appointment-calendar/before-390.png) | [After](screenshots/appointment-calendar/after-390.png) |
| Desktop 1440px | [Before](screenshots/appointment-calendar/before-1440.png) | [After](screenshots/appointment-calendar/after-1440.png) |

## Verification approach

Browser requests are intercepted by local synthetic fixtures; no real patient data or production writes. Actual PostgreSQL integration runs use the guarded local Docker PostgreSQL 17.11 runner (`backend/scripts/test-media-local.sh`) and synthetic disposable databases. This is not a claim of production end-to-end write testing.

## Limitations

- Real configuration and backend availability remain prerequisites. This task does not enable public booking, media uploads or configure clinic hours/services.
- The existing API pages results by 100; calendar counts explicitly refer to the loaded page when pagination is active. This task does not add a backend aggregate endpoint.
- Specialist eligibility is checked against the existing public service/doctor catalog. Closed public booking configuration remains fail-closed for creation, as before; no admin bypass was introduced.
- Browser tests verify synthetic API interactions; concurrency and collision constraints are exercised separately against disposable PostgreSQL.
- The existing production bundle warning about chunks exceeding 500 kB remains.
- Historical browser scripts for removed admin sections are superseded by current three-section regression suites, not evidence of current UI coverage.
- No production Supabase changes, real appointments, Resend, commits, merges, pushes or deployment.

## Final test results

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk warning only |
| Frontend unit tests | 100 passed, 0 failed |
| Appointment browser | 24 LV/RU/EN × 320/375/390/430/768/1024/1440/1920 scenarios; 2 additional screenshot/default-view scenarios |
| Booking browser | 172 layout checks, 31 flows, no browser errors |
| Auth browser | 96 layout checks; registration/login/persistence/logout/recovery/confirmation |
| Admin authorization browser | 12 guest/ordinary-user/unavailable-identity cases, zero privileged requests |
| Specialist editor browser | 24 scoped-save/localization/responsive/authorization workflows |
| Specialist creation browser | 24 workflows |
| Existing specialist linking | 6 cases |
| Specialist time off | 6 cases |
| Inline media browser | 3 locales; mocked transport only |
| Created content / News CMS browser | 24 scenarios |
| `go test -count=1 -p 1 ./...` | PASS against disposable PostgreSQL 17.11 via guarded runner; cluster removed afterward |
| Hero locks | All 15 passed |
| Whitespace validation | PASS, with only the previously approved unchanged font-license exemptions |

Appointment browser checks cover populated/empty views, month-to-day navigation, Previous/Next/Today, specialist filtering, create with 503 retry retaining identical payload and key, reschedule with expected version, stale status conflict, successful confirm/cancel, audit disclosure, focus trap, no contact details in browser storage or request URLs, and removal of the calendar on identity expiry. Backend integration tests independently cover concurrent booking 201/409 outcomes, eligibility, time-off, idempotency and authorization.

Two test issues were corrected during validation: the calendar filter needed an explicit accessible label; an existing specialist test needed to await Vue detachment after role revocation. Final reruns passed. Desktop and mobile after screenshots were visually inspected.

All requested safe local checkpoints are complete. No production activation is included or required by this UI change. Review the report and screenshots before any separately authorized commit/deployment.
