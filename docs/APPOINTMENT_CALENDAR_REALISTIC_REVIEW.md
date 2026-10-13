# Populated appointment calendar review

Branch: `feature/final-development`. Review performed locally on 11 October 2026.

## Isolation and realism

`backend/scripts/review-calendar-local.sh` creates a new PostgreSQL 17.11 Docker container with a tmpfs database, exposed only on loopback port 55874. It applies migrations 001–006 to the new `ag_calendar_test` database, never reads `.env`, and removes its own container on exit, including failure.

The opt-in Go test starts the real server router on an ephemeral loopback port. Browser booking/catalog/operations requests go to that server and persist in PostgreSQL. They are not canned booking responses. Supabase session establishment is simulated using the existing browser fixture and a test-only verifier; the real server still resolves administrator roles from the disposable database. Missing/invalid identity returns 401; an ordinary database user returns 403. The verifier exists only in `_test.go`, never in the production binary. No external Supabase authentication or data access occurs.

Synthetic inventory: two explicitly labelled fictional specialists, two localized services with test-only 30/60 minute durations, weekday working hours 09:00–12:00 and 13:00–17:00, and 90 initial appointments across 15 working days. Pending, confirmed and cancelled appointments show different states, lunch breaks, half-hour gaps and an afternoon gap. Prices and actual clinic schedules are not invented or modified.

The screenshot period begins on a future Monday derived from the execution date (19 October for this run). Six browser scenarios each create, confirm, reschedule and cancel a separate synthetic appointment four weeks later, so workflow records do not clutter the displayed week. Each resulting history contains four real lifecycle events. After the run the disposable database is removed.

## Findings and changes

1. Excessive introductory space pushed the calendar below the mobile fold. Removed the calendar-only explanatory intro, tightened the local heading/filter spacing and omitted the empty live-status paragraph.
2. Add appointment looked like another secondary control. Gave it the existing dark action treatment, scoped only to Appointments.
3. Populated week cards were difficult to scan. Time ranges, patient name, service, specialist and status now have distinct lines. Pending/confirmed/cancelled edge treatments supplement explicit text; cancelled time is struck through. No meaning relies on color alone.
4. Day cards now align the time range in a dedicated column, with patient/service information alongside it.
5. Repeated full year/date headings crowded week columns. Week headings now use localized short weekday/date labels. The period uses localized dates and a smaller Riga-time note.
6. Month counts were too small on mobile. They now use readable counts and a small indicator, with date/count accessible names on each day button.
7. Russian Previous/Today/Next labels wrapped into an uneven second row. Mobile navigation uses three equal controls with retained 44px minimum targets.
8. Detail headings were oversized. Reduced only calendar dialog heading size and tightened paragraph spacing.

The page remains a chronological agenda/calendar, not a proportional time-grid or drag-and-drop scheduler. No public design, Header, Hero, Welcome Intro, backend business rule or production configuration was changed.

## Screenshots

All names/contact information are synthetic. No real patient data appears in these files.

| Language / viewport | Day | Week | Month | Details |
| --- | --- | --- | --- | --- |
| LV / 390px | [day](screenshots/calendar-realistic/lv-390-day.png) | [week](screenshots/calendar-realistic/lv-390-week.png) | [month](screenshots/calendar-realistic/lv-390-month.png) | [details](screenshots/calendar-realistic/lv-390-details.png) |
| LV / 1440px | [day](screenshots/calendar-realistic/lv-1440-day.png) | [week](screenshots/calendar-realistic/lv-1440-week.png) | [month](screenshots/calendar-realistic/lv-1440-month.png) | [details](screenshots/calendar-realistic/lv-1440-details.png) |
| RU / 390px | [day](screenshots/calendar-realistic/ru-390-day.png) | [week](screenshots/calendar-realistic/ru-390-week.png) | [month](screenshots/calendar-realistic/ru-390-month.png) | [details](screenshots/calendar-realistic/ru-390-details.png) |
| RU / 1440px | [day](screenshots/calendar-realistic/ru-1440-day.png) | [week](screenshots/calendar-realistic/ru-1440-week.png) | [month](screenshots/calendar-realistic/ru-1440-month.png) | [details](screenshots/calendar-realistic/ru-1440-details.png) |
| EN / 390px | [day](screenshots/calendar-realistic/en-390-day.png) | [week](screenshots/calendar-realistic/en-390-week.png) | [month](screenshots/calendar-realistic/en-390-month.png) | [details](screenshots/calendar-realistic/en-390-details.png) |
| EN / 1440px | [day](screenshots/calendar-realistic/en-1440-day.png) | [week](screenshots/calendar-realistic/en-1440-week.png) | [month](screenshots/calendar-realistic/en-1440-month.png) | [details](screenshots/calendar-realistic/en-1440-details.png) |

Before refinement: [desktop week](screenshots/calendar-realistic/before/week.png), [mobile month](screenshots/calendar-realistic/before/month-mobile.png).

## Reproduce locally

Requires the cached PostgreSQL Docker image used by the existing test runner, Node with Playwright/Chrome, Go, frontend dependencies and free local ports 5187/55874. No production configuration is needed.

Start the isolated frontend from `frontend/`:

```sh
VITE_API_URL=/api VITE_SUPABASE_URL=https://integration-test.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic VITE_BOOKING_DEMO=false node --input-type=module -e 'import {createServer} from "vite"; const s=await createServer({envDir:false,server:{host:"127.0.0.1",port:5187,strictPort:true}});await s.listen();'
```

From the repository root:

```sh
TEST_BASE_URL=http://127.0.0.1:5187 \
PLAYWRIGHT_MODULE=/Users/aleksandrgetmanenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
GIN_MODE=release bash backend/scripts/review-calendar-local.sh
```

This runs browser actions, refreshes screenshot evidence, and tears down the disposable server/database. It does not leave a publicly accessible demo or modify the normal development backend. Stop the isolated frontend afterward.

## Exact changed files

- `frontend/src/views/admin/AdminAppointmentsView.vue` — local spacing, hierarchy, calendar labels/cards and responsive controls.
- `frontend/tests/appointments-browser.cjs` — month drilldown locator adapted to accessible count presentation.
- `frontend/tests/calendar-realistic-browser.cjs` — real-backend browser review and screenshot capture.
- `backend/internal/server/calendar_browser_test.go` — opt-in guarded synthetic fixture/server, database role checks and browser orchestration.
- `backend/scripts/review-calendar-local.sh` — disposable database lifecycle.
- `docs/APPOINTMENT_CALENDAR_REALISTIC_REVIEW.md` — this report.
- The 24 screenshot files linked above and the two `before/` captures.

Existing uncommitted work was preserved. No commit, merge, push, deployment, production database write, public booking activation or upload activation occurred.

## Limitations

- Authentication establishment is deliberately simulated; this is not a live Supabase login test. Authorization middleware and database roles run normally. Existing Auth/JWT regressions remain separate.
- Synthetic names, durations and schedule are review fixtures only, not clinic facts. They never enter the normal backend or production database.
- The existing 100-result API pagination remains; counts describe the loaded page when pagination is active.
- Week on mobile is a vertical day agenda; Day remains the mobile default. A busy full week requires scrolling.
- No proportional gap visualization or drag-and-drop rescheduling was added. Rescheduling uses actual available slots and existing collision protection.
- The pre-existing production bundle warning for chunks over 500 kB remains.

## Test results

- Real Go/PostgreSQL browser demonstration: **6 scenarios passed**, LV/RU/EN at 390px and 1440px; 24 populated screenshots. All create/confirm/reschedule/cancel writes persisted locally; history verified after cancellation. Actual HTTP authentication/role checks returned expected 401/403 responses.
- Existing appointment browser regression: **24 scenarios passed** across LV/RU/EN and 320, 375, 390, 430, 768, 1024, 1440 and 1920px; includes date navigation, empty states, conflict/retry handling and session expiry.
- Production frontend build: **passed**, with existing chunk-size warning.
- Frontend unit tests: **100 passed, 0 failed**.
- Booking browser: **172 layout checks / 31 flows passed**.
- Auth browser: **96 layout checks** and registration/login/persistence/logout/recovery/confirmation flows passed.
- Admin access browser: **12 cases passed**, no privileged requests for guests, ordinary users or unavailable identity.
- Specialist editor regression: **24 scenarios passed**.
- Actual disposable PostgreSQL regression runner: **all Go packages passed** (`go test -count=1 -p 1 ./...`), including concurrent booking 201/409, idempotency, status transitions, authorization, CMS and Media tests. The opt-in browser test is separately executed by the review runner.
- Hero locks: **15/15 passed**.
- Whitespace check: **passed**, retaining the two previously approved unchanged font-license exemptions.

Desktop Day/Week, mobile Day/Month, and appointment detail screenshots were visually inspected after the final refinements.

Additional current-admin regressions: specialist creation **24**, existing specialist linking **6**, embedded absence/schedules **6**, inline media **3** scenarios passed. Media transport remained mocked; no files were uploaded.

News/created-content CMS browser regression: **24 scenarios passed**. `go vet ./...`: **passed**. All selected current regression suites completed successfully. The final review runner also verifies that appointments, doctors, services and Auth fixtures are empty before seeding, and explicitly disables media uploads.
