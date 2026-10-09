# Booking frontend — Phase 2

Route: `/pieraksts`. Public guest booking; no account is required. Backend, database, Auth flows, header and Welcome Intro are unchanged. Booking CTA destinations now use this route. The Hero exception is exactly its CTA `to` value; the original 15-file lock manifest is retained and the checker normalizes only this approved change.

## Architecture

- `views/BookingView.vue`: five-step service, specialist, date/time, contact/account, review flow and actual receipt; scoped design, desktop live summary, mobile collapsible summary.
- `components/booking/`: calendar, labelled contact fields and reusable summary.
- `stores/booking.ts`: Pinia state, existing Supabase Auth adapter and explicit development mode boundary.
- `services/booking/flow.ts`: independently tested orchestration, selection invalidation, registration and idempotent submission.
- `services/booking/api.ts`: typed Go contract adapter, runtime response checks, aborts, 18-second timeouts, no-store requests and sanitized errors.
- `services/booking/calendar.ts`: Europe/Riga display, Monday-first calendar and daylight-saving-safe formatting of server instants.
- `services/booking/storage.ts`: same-tab recovery of submitted attempts.
- `i18n/booking.ts`: complete LV/RU/EN UI messages. Service names, descriptions and price displays come from the corresponding API language fields. Personal doctor names are preserved.

No new runtime dependency, schema change or backend endpoint is required.

## API and calendar

Uses `GET /api/booking/services`, `GET /api/booking/doctors?service_id=…`, `GET /api/booking/availability?service_id=…&date=…[&doctor_id=…]`, and `POST /api/booking/appointments`. Base URL is the existing `VITE_API_URL`, including `/api`.

The existing API is daily, not monthly. Only the visible month's dates from Riga today onward are loaded. Two workers cap concurrent month requests; selecting a date adds at most one fresh daily request. Service, doctor or month changes abort obsolete work; response generations prevent stale updates. A 30-second in-memory cache is bounded to 93 dates. An outage stops the batch. Unknown, unavailable and past dates are disabled. There is no background scan of future months.

The API does not expose its booking horizon to public clients. The frontend therefore does not invent a cutoff: the backend returns empty dates outside its horizon or minimum notice window. All actual instants, durations, eligibility, time off and occupied intervals remain server-authoritative. Calendar UTC-noon arithmetic is used only for labels, never to manufacture a production slot. Time labels use clean `HH:mm` in Europe/Riga, without GMT/UTC suffixes on slots, summaries or review. DST conversion is retained; repeated autumn hours remain separate server instants and slot keys.

“Any specialist” omits `doctor_id` on availability requests. Each returned time retains its real doctor ID. Selecting a time shows that specialist in review and submits that explicit doctor. No staff or schedules are inferred.

## Submission and recovery

Contact validation is local feedback; Go still validates everything. The request contains only contact fields, service/doctor IDs, the server start instant, and explicit privacy acknowledgement/version. No status, price, duration, role or medical information is submitted.

A random UUID v4 idempotency key and immutable normalized request are persisted **before** POST. Duplicate clicks are ignored. Network failures, malformed responses and uncertain server errors retain the original key, payload and authenticated identity. The user can retry but cannot edit that unresolved attempt. A reload restores it. A 401 permits one token refresh for the same user; it never silently converts an authenticated attempt to a guest request. Rate limits honor Retry-After. An idempotency conflict is distinct from a slot conflict and must not receive a new key automatically.

A definitive `409 slot_unavailable` clears the rejected intent, refreshes dates, returns to time selection and preserves contact fields. Validation/not-found responses require review or reselection. The result screen uses the API receipt and actual status, including pending or a later terminal status returned on replay. No email delivery is promised.

Submitted contact fields are retained in **sessionStorage only for an unresolved attempt**, never localStorage. Passwords and tokens are never stored by booking code. A successful receipt replaces the contact payload with non-contact receipt metadata. Closing the tab clears this storage. Uncertain attempts do not expire automatically: losing their key could cause duplicate appointments. Storage failure before POST prevents submission; corrupt recovery data fails closed. Recovery after the tab is closed or across devices is not provided by this API and requires contacting the clinic.

## Optional registration

An unchecked account-creation checkbox reveals the existing Auth password fields; privacy acknowledgement is a separate unchecked checkbox. Signed-in users do not see registration. Only confirmed account email/phone are prefilled; arbitrary profile metadata is not trusted.

Registration runs **before** booking through the existing `auth.register`, with no privileged role input. A successful account followed by a failed booking remains an account; the booking can be retried without another sign-up. Failed registration or sign-up without a session sends no appointment request until the person explicitly chooses guest booking or resolves sign-in. If they continue as a guest and booking succeeds, the result distinguishes this from account creation. No account or appointment is deleted as compensation.

## Development demo

Set the following only in the ignored `frontend/.env.local`, then restart Vite:

```dotenv
VITE_BOOKING_DEMO=true
```

Run `npm run dev` from `frontend` and open `/pieraksts`. The visible DEMO banner identifies simulated availability. Demo service names and descriptions are derived from the eight services in `content/clinic.ts`; their six category labels reuse `localizedPrices` in `content/pricing.ts`. All LV/RU/EN content comes from those existing sources. The demo offers “Any available specialist” and Dr. Anda Gutovska; this does not establish actual service eligibility or a working schedule. Use synthetic contact details only. No price or appointment duration is displayed for demo services: their verified durations are unknown. A technical 30-minute fixture range satisfies the Slot/Receipt contract only; it is not attached to a service or shown as a treatment duration. Both booking and optional registration are simulated in memory; the demo adapter imports no network or Supabase client. Demo storage has a separate `demo-website-v2-` namespace so earlier fictional demo receipts cannot be restored into these selections. Errors and empty real catalogs never activate demo mode.

The guard is `import.meta.env.DEV && VITE_BOOKING_DEMO === 'true'`. Vite removes the demo dynamic import from production, even when the flag is present during a production build. Leave the flag false for real API work.

## Verification commands

From `frontend`:

```sh
npm run build
node --test tests/*.test.mjs
node scripts/check-hero-lock.mjs
```

Browser tests require Playwright and a local Vite server, with synthetic frontend-safe Auth configuration. They intercept all booking/Auth traffic; they are **not live database reservation tests**. Set `PLAYWRIGHT_MODULE` to an installed Playwright module if it is not available on the normal module path.

```sh
VITE_SUPABASE_URL=https://integration-test.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_integration_test VITE_API_URL=http://127.0.0.1:5184/api VITE_BOOKING_DEMO=false npm run dev -- --host 127.0.0.1 --port 5184 --strictPort
# In another terminal:
TEST_BASE_URL=http://127.0.0.1:5184 node tests/booking-browser.cjs
TEST_BASE_URL=http://127.0.0.1:5184 node tests/auth-browser.cjs
```

For the isolated demo check, restart the local test server with `VITE_BOOKING_DEMO=true`, then run `node tests/booking-browser.cjs --demo`. Never point these scripts at a live deployment. Screenshots are written outside the repository in the system temporary directory.

## Launch dependencies and Phase 3

Real booking remains unavailable while the catalog is empty or the API privacy-notice version is unset. Before launch, the clinic must supply/approve real bookable services and all three language fields, verified procedure durations and any doctor-specific overrides, real doctors and service mappings, recurring hours and absences, prices if displayed, booking horizon and notice/slot settings, and the applicable privacy notice/version, controller/contact and retention information.

Existing legal documents were not edited in this phase; they need clinic review for the new account and online-booking processing before live launch. No legal-compliance claim is made. The general-questions form on `/kontakti` retains its existing non-sending adapter; only misleading appointment copy changed. Resend, reminders, cancellation/self-service management, admin UI and cross-device recovery are outside this phase.

Phase 3 can use the existing protected admin APIs to manage verified catalogs, schedules, settings and appointments. No Admin Panel implementation has started here.

## Executed verification — 8 October 2026

- `npm run build`: passed, including TypeScript. Also passed with `VITE_BOOKING_DEMO=true`; inspection of all 20 emitted JavaScript assets found no demo adapter, fictional fixture IDs, or demo chunk.
- `node --test tests/*.test.mjs`: **48 passed, 0 failed** (25 existing and 23 booking tests).
- `tests/booking-browser.cjs`: **172 layout checks, 31 booking scenarios, no browser errors**, with mocked booking/Auth APIs. Covers 320, 375, 390, 430, 768, 1024, 1440 and 1920 pixels and LV/RU/EN, keyboard calendar navigation, reduced motion, invalid fields, empty/unconfigured/unavailable catalogs, guest and authenticated booking, optional registration, pending/confirmed responses, conflicts and recovery after a failed response/reload. Desktop calendar and mobile contact/calendar screenshots were visually inspected.
- `tests/booking-browser.cjs --demo`: **5 layout checks and 1 complete simulated registration/booking flow**, zero booking API or Supabase Auth requests.
- Existing `tests/auth-browser.cjs`: **96 layout checks** plus registration, login, session persistence, logout, password recovery and confirmation handling, no errors.
- Hero lock: **all 15 original hashes pass** after normalizing only the authorized `/kontakti` → `/pieraksts` CTA destination. A separate byte comparison against HEAD confirms that exact one-line Hero change.
- Tracked and new text-file whitespace checks passed. Auth implementation, header, Welcome Intro, backend, legal documents, pricing/news pages and shared styles have no diff. No live database, Auth users or appointments were modified; live booking integration/reservation tests were not run.
- Branch remains `feature/booking-frontend` at `0875ff5f5511e47b94319ba70fc349e0fcca587a`; changes remain uncommitted. No merge, push or branch movement.

## Exact file inventory

Modified:

- `frontend/.env.example`
- `frontend/scripts/check-hero-lock.mjs`
- `frontend/src/components/ContactBand.vue`
- `frontend/src/components/home/PatientJourney.vue`
- `frontend/src/components/home/ScrollClinicHero.vue`
- `frontend/src/components/layout/SiteFooter.vue`
- `frontend/src/i18n/privacyAndContact.ts`
- `frontend/src/main.ts`
- `frontend/src/router/index.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ServiceView.vue`

Added:

- `docs/BOOKING_FRONTEND.md`
- `frontend/src/components/booking/BookingCalendar.vue`
- `frontend/src/components/booking/BookingContactFields.vue`
- `frontend/src/components/booking/BookingSummary.vue`
- `frontend/src/i18n/booking.ts`
- `frontend/src/services/booking/api.ts`
- `frontend/src/services/booking/calendar.ts`
- `frontend/src/services/booking/demo.ts`
- `frontend/src/services/booking/flow.ts`
- `frontend/src/services/booking/storage.ts`
- `frontend/src/services/booking/types.ts`
- `frontend/src/stores/booking.ts`
- `frontend/src/views/BookingView.vue`
- `frontend/tests/booking-browser.cjs`
- `frontend/tests/booking.test.mjs`

## Focused demo/time refinement — 9 October 2026

The development catalogue now derives these eight selections directly from the existing website, retaining its LV/RU/EN service names and descriptions:

- Konsultācija un diagnostika
- Zobu ārstēšana
- Sakņu kanālu ārstēšana
- Zobu higiēna
- Zobu balināšana
- Zobu ķirurģija
- Zobu protezēšana
- Bērnu zobārstniecība

The existing category indices supply six translated category groups from the existing pricing content; no clinical category assignments were invented. Native radio controls and labelled groups preserve keyboard access. Demo specialist options are the translated “Any available specialist” and the consistent name “Dr. Anda Gutovska”. Production still uses the Go API and retains its existing single-doctor simplification.

Time slots, summary, review and receipt use local `HH:mm` without GMT suffixes. Europe/Riga conversion and distinct UTC-based slot identity remain intact. No new doctor qualifications, portraits, schedules, prices or verified durations are asserted.

Files changed in this refinement (relative to the preserved, uncommitted Phase 2 implementation):

- `frontend/src/services/booking/demo.ts`
- `frontend/src/services/booking/types.ts`
- `frontend/src/services/booking/flow.ts`
- `frontend/src/services/booking/calendar.ts`
- `frontend/src/stores/booking.ts`
- `frontend/src/views/BookingView.vue`
- `frontend/src/i18n/booking.ts`
- `frontend/tests/booking.test.mjs`
- `frontend/tests/booking-browser.cjs`
- `docs/BOOKING_FRONTEND.md`

Verification: all **49 unit tests** passed; the existing mocked-API browser suite passed **172 layout checks and 31 scenarios**. The production build passed with the demo flag deliberately true, and all 20 JavaScript bundles were checked for demo implementation/fixtures: none were emitted. All **15 Hero-lock checks** passed; a separate worktree fingerprint comparison confirms this task did not alter the Hero, Header, Welcome Intro, backend or unrelated pages. No database queries or mutations were performed, and no branches were merged or pushed.

The expanded demo browser suite also passed **144 layout checks and 24 complete flows**, covering all eight requested widths and LV/RU/EN. It verified every website service/category label, all eight service selections, both specialist choices, in-place language switching, native radio keyboard navigation, clean time labels and hidden unverified durations/prices. It recorded **zero booking API calls and zero Supabase Auth calls**; registration and receipt remained simulated. The initial test waits and uppercase-text assertion were corrected before the passing run. Desktop and mobile screenshots were visually inspected. All earlier uncommitted Phase 2 changes remain preserved.
