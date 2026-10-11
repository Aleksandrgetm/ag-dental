# Admin acceptance QA

Date: 2026-10-10. Branch: `feature/final-development`.

**Result: local acceptance checks PASS, with the activation limitations listed below.**
This is not approval to enable production Booking or Media uploads.

## Scope and safety boundary

The existing signed-in local Chrome session at `http://localhost:5173` was used
for read-only review of the actual admin UI, backed by the running Go API on
port 8080 and the already activated production schema. No production forms were
saved, no content was published, and no database, Auth, Storage or booking
configuration was changed. `/api/health` returned `status: ok`, database connected.

Write verification used two complementary layers:

- Browser interaction/contract tests: isolated Vite on `127.0.0.1:5187`, no `.env`
  loading, synthetic Supabase identity, intercepted APIs and in-memory data.
- Real PostgreSQL integration: a newly created Docker PostgreSQL 17.11 cluster,
  loopback-only, with separate disposable Auth, Booking, CMS, Media, migration and
  operations databases. The test script removed its own cluster on completion.

Browser write tests are **not** a live browser-to-Go-to-Supabase acceptance test.
Database tests exercise the actual persistence and authorization implementation;
UI tests exercise the forms and their API contracts. No real clinic records were
used for write testing. Existing uncommitted work was preserved.

## Actual browser module review

| Module | Observed result / limits |
|---|---|
| Dashboard | Loads live counts/settings and truthful missing-configuration notices. Corrected stale claim that the full appointment calendar was unavailable. Active-specialist totals and recent-activity aggregate remain explicitly unavailable. |
| Appointments | Calendar loads without schema errors; empty week is displayed. Synthetic suites cover modes, search, detail/history, creation/retry and rescheduling. |
| Services and prices | Six published price categories and eight editorial services load; separate booking-management link remains clear. Operational catalog is empty pending clinic setup. |
| Specialists | Existing Dr. Anda Gutovska editorial content loads. Operational specialists remain separate; no synthetic doctor was created in production. |
| Working schedules | Loads without schema errors. New guidance links to specialist/service setup instead of leaving disabled controls unexplained. |
| Website pages | Page inventory loads; homepage editing begins after the system-managed Hero. Draft/publish/revision workflows verified synthetically. |
| News | Four existing articles load. Opened the existing editor read-only and inspected language tabs, text/date/image fields, draft, preview and history controls. |
| Media Library | Registry loads; Hero video/poster are marked system-managed, read-only. Uploads remain disabled. No files uploaded. |
| SEO settings | Existing page metadata inventory loads; protected/global fields remain read-only where required. |
| Contact questions | Honest unavailable state: contact-message intake is not implemented. No fake inbox or success state. |
| General settings | Clinic information, contact details, hours and site preferences are present. Booking settings and notification configuration are explicitly unavailable in this CMS screen. |

Actual schedule screen checked in LV/RU/EN and at 390px mobile width: no horizontal
overflow; browser viewport and original RU locale restored after inspection.
Automated coverage below expands to 320–1920px and all three locales.

## Usability issues and fixes

1. Dashboard described the now-working calendar as unavailable. Updated all three
   translations to direct staff to Appointments.
2. Error text required staff to understand API and schema deployment. Replaced it
   with a plain-language retry/contact-administrator message in LV/RU/EN.
3. Booking price guidance told staff to type into read-only price fields. It now
   explains selecting a published service and editing prices in the website price
   editor. Price authority, linkage and backend validation are unchanged.
4. Empty schedules gave no next action. Added links to operational specialists
   and services, with guidance about confirmed durations and assignments.
5. Inactive catalog records displayed the action “Archive” rather than the status
   “Archived”. Corrected the existing label.
6. Saving content with untranslated hidden language tabs produced a generic
   validation error. It now lists missing languages, selects the first incomplete
   language, returns to editing and focuses an empty required text field.
7. Preview used the same button label to enter and leave preview. The return action
   now says “Continue editing”; SEO labels explain their appearance in search.

Only the new schedule setup links received an underline for discoverability.
Layout, public content, Hero, Welcome Intro, Header and navigation design remain
unchanged. Required short address names remain deliberate, validated fields;
new content cannot silently replace existing public routes.

## Synthetic workflow coverage

- Service creation; confirmed duration; price linked to published content; draft
  price isolation and published price refresh; specialist eligibility/assignment.
- Specialist profile and editorial linkage, portrait validation and protected
  Hero media rejection.
- Recurring working hours, overlap rejection, time off, appointment-impact refusal,
  available-slot preview, archived exception release and timezone/DST rules.
- Pending appointment creation, version-checked rescheduling, confirmation,
  cancellation and persisted created/rescheduled/confirmed/cancelled history in
  one disposable operations workflow. Existing tests also cover automatic mode,
  double-booking exclusion, concurrent requests and idempotency.
- Existing text editing, LV/RU/EN switching, draft/preview/publish/history restore.
- Expanded created-content browser coverage from news alone to **news, information
  pages and FAQs**, including public route/SEO checks, unpublish/restore and missing
  translation guidance. Expanded PostgreSQL tests to all three content types.
- Price-row edit/add/order/archive, metadata editing, persistent editor/navigation
  state, authorization failures, unavailable/error states and responsive layouts.

## Test results

The final build and unit run includes the schedule-link accessibility refinement.

- Production build: PASS (`npm run build`). Existing >500KB chunk warning remains.
- Frontend unit/HTTP tests: PASS, 93 tests, zero failures/skips.
- Go and real PostgreSQL integration: PASS, final run after expanded tests;
  `bash backend/scripts/test-media-local.sh` runs `go test -count=1 -p 1 ./...`.
- `go vet ./...`: PASS.
- Hero lock: PASS, all 15 approved files match.
| Browser suite | Result |
|---|---|
| Created news/pages/FAQ | PASS, 72 locale/viewport workflows, including missing-language guidance |
| Operational services | PASS, 24 scenarios |
| Specialists | PASS, 24 scenarios |
| Schedules | PASS, 24 scenarios; final rerun includes empty setup guidance and screenshot |
| Appointments | PASS, 24 scenarios |
| Price editor | PASS, 24 scenarios |
| Existing CMS | PASS, 214 checks; zero real Supabase requests |
| CMS navigation persistence | PASS, 135 checks; all writes intercepted |
| Media | PASS, 45 checks; zero production requests |
| Admin authorization/navigation/responsive | PASS, 299 checks, zero errors |
| Booking | PASS, 172 layouts and 31 flows |
| Auth | PASS, 96 layouts plus registration/login/session/logout/recovery/confirmation flows |
| Contact | PASS, 24 layouts and 24 validation/no-delivery flows |
| SEO | PASS, 120 rendered checks |
| Public routes | PASS, 480 checks across 20 routes |
| Missing API production build | PASS, 132 public checks and 6 unavailable/Auth checks; zero unexpected requests |

Responsive matrices cover LV/RU/EN and widths 320, 375, 390, 430, 768, 1024,
1440 and 1920 where supported by each suite. Database and browser tests passed
without any production write tests. The bundle-size warning is advisory, not a
failed build or a claim of measured field performance.

Logs are local `/tmp/adminqa-*`; they are not committed artifacts. Synthetic
mobile evidence: `/tmp/adminqa-schedules-mobile.png`.

Reproduction from the repository root:

```sh
(cd frontend && npm run build && node --test tests/*.test.mjs)
bash backend/scripts/test-media-local.sh
(cd backend && go vet ./...)
node frontend/scripts/check-hero-lock.mjs
```

Browser suites require a separate local Vite instance with `envDir:false`,
`VITE_API_URL=/api`, synthetic `VITE_SUPABASE_URL=https://integration-test.supabase.co`,
a synthetic publishable key and `VITE_BOOKING_DEMO=false`. Do not reuse the
production-connected frontend for synthetic writes. Set `TEST_BASE_URL` to that
loopback instance and `PLAYWRIGHT_MODULE` to the installed Playwright module, then
run `node frontend/tests/<suite>-browser.cjs` (`--all` for the admin suite).
The missing-API regression creates its own isolated production build/preview.

## Exact files changed by this acceptance task

- `frontend/src/i18n/admin.ts`
- `frontend/src/i18n/operations.ts`
- `frontend/src/i18n/created.ts`
- `frontend/src/views/admin/AdminCatalogView.vue`
- `frontend/src/views/admin/AdminSchedulesView.vue`
- `frontend/src/views/admin/AdminCreatedContentView.vue`
- `frontend/tests/created-content-browser.cjs`
- `frontend/tests/schedules-browser.cjs`
- `backend/internal/booking/operations_integration_test.go`
- `docs/ADMIN_ACCEPTANCE_QA.md`

The working tree contains additional earlier uncommitted final-development work;
those files are not new changes attributable to this QA task.

## Remaining limitations and release gates

- Clinic-confirmed operational services, durations, specialists, eligibility,
  schedules and booking privacy notice still require owner-approved setup. Public
  booking was not enabled by this task.
- Media uploads remain disabled. Real Storage upload verification and separate
  authorization are still required before activation.
- Contact-question intake is unavailable; no provider/database or email delivery
  was added. Resend remains excluded.
- Dashboard specialist total/recent-activity aggregation and CMS booking settings /
  notifications remain incomplete features, clearly labelled as unavailable.
- Real hosted backend/edge behavior and a full-stack browser write rehearsal with
  genuine staging Auth require a disposable staging environment. The current
  production-connected browser was intentionally read-only.
- Staff/owner clinical and editorial sign-off is still required; automated QA does
  not establish that unconfigured clinical facts or policies are approved.

No deployment, commit, merge, push, production migration or production write was
performed. Stop for review after local acceptance checks.

## Admin UX simplification follow-up — 2026-10-10

This is a separate local refinement of the earlier acceptance baseline. The
implementation report and 16 before/after screenshots are in
[ADMIN_SIMPLE_UX_IMPLEMENTATION.md](ADMIN_SIMPLE_UX_IMPLEMENTATION.md).

### Successful employee journeys

- Doctors, Services, News, Pages and FAQ now expose their own heading-level Add
  actions. Doctor/service entry drops from at least two navigation clicks to one.
- Guided doctor setup: photo, localized profile, service selection, weekly intervals,
  inactive save and guarded activation. Synthetic browser cases cover one save,
  persisted editor/deep link, focus revalidation and all eight viewport sizes.
- Actual disposable PostgreSQL tests independently prove atomic setup, privacy
  rejection/rollback, idempotent retry, eligible public selector, accurate actual
  slots, any-doctor selection and full-day absence exclusion.
- Existing service/price ownership, doctor eligibility, schedule impact prevention,
  appointment create/reschedule/confirm/cancel/history, CMS draft/publish/restore
  and protected media safeguards passed the real database suite.
- News/Page/FAQ creation starts in the matching module, preserves LV/RU/EN, saves
  drafts and publishes only deliberately. Public dynamic content and metadata are
  checked using synthetic intercepted API responses; backend publication is tested
  separately against PostgreSQL. This is not a production write test.
- Existing price editor, Auth, Booking wizard, contact no-delivery state and public
  fallback are covered by retained browser regressions.

### Fixes during acceptance

- Operational lists wait for verified admin identity before fetching; harmless
  revalidation preserves editor state.
- Manual service addresses survive name edits; contextual edit routes reload the
  correct record. Missing configuration remains an honest unavailable state.
- Blank hours cannot advertise activation readiness. Server checks remain final.
- Empty duplicate content headings removed after screenshot review; subsidiary
  list headings remain smaller than the page title.
- Legacy browser fixtures now account for new read-only doctor/service list calls.
  The session-expiry test keeps its simulated 401 until the login link is clicked,
  avoiding a fixture race with automatic role revalidation.

### Evidence boundaries

No real clinic content, Supabase records, uploads, roles or booking configuration
were changed. Actual signed-in local UI was inspected read-only; all save/publish
flows used intercepted synthetic APIs or the disposable PostgreSQL test cluster.
No employee usability study, full screen-reader certification or live Storage
write was performed. See KNOWN_LIMITATIONS.md for activation requirements.

Final follow-up result: PASS for safe local scope. Production build, all 96 unit
tests, all listed browser suites, Go tests with actual isolated PostgreSQL, vet and
15 Hero locks passed. Exact counts, commands, files and screenshot comparisons:
[final UX report](ADMIN_SIMPLE_UX_IMPLEMENTATION.md#final-verification-results).
The latest local Go process is running; read-only health 200 and unauthorized admin
401 verified. No real clinic records were changed.
