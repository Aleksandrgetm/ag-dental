# Simple AG Dental administration — implementation and acceptance

Date: 2026-10-11. Branch: `feature/final-development`.

This report covers the Radical Admin Simplification brief and the subsequent confirmed restriction on service/price/duration management. The pre-existing uncommitted implementation was preserved. No production database, Storage, migration, booking configuration, upload flag, deployment or Git history changes were made.

## Checkpoint 1 — Three sections

The client navigation contains exactly **Appointments, Specialists, News**. `/admin` redirects to `/admin/appointments`. Remembered CMS destinations no longer override section links.

Service creation/editing, prices, schedules, pages, general CMS, media, SEO, history and settings routes are no longer mounted as client editors. Old links redirect to a supported section, clearing stale queries. The generic news editor is mounted only for approved article identities; arbitrary document keys, cross-section `part` values and created-page keys cannot open service/price editors. Login return destinations follow the new route boundary.

This is a client UI boundary, not a replacement for API authorization. Existing privileged backend maintenance capabilities remain intact and continue requiring verified JWT and server-side admin role checks.

## Checkpoint 2 — Appointments

The existing week calendar is the landing view. Date selection, day/month/list views, patient search, details, manual creation, availability, confirmation, rescheduling, cancellation and history remain. Creation uses the existing public eligible-doctor/availability API and protected admin booking API; there are no invented slots or frontend duration/price overrides. Historical doctor filters remain usable for existing appointments.

Removed the service-management setup link. With no approved catalog/privacy configuration, creation remains honestly unavailable. Uncertain-response retries retain their idempotency key; collision/version conflicts retain their existing handling.

## Checkpoint 3 — Specialists

One specialist list presents portrait, name, booking status and Edit, with Add doctor at the heading. Removed duplicate setup links and website-state clutter.

The editor retains name, portrait, localized description/title, selection of existing configured services, working days and intervals, explicit activation and clinic confirmation. No create-service, price, duration or duration-override controls are reachable. Existing assigned inactive services are preserved so they can be deselected; new choices come from configured active booking services. Hidden qualifications/order values are preserved, not blanked.

Saving stays in the specialist editor. Breaks, blocked days and vacations are embedded below its main form; they use the same secure time-off service, Riga timezone conversion, version checks and appointment-impact protection. Availability preview is in this same section. A new doctor must be saved before exceptions can reference its ID.

Dr. Anda Gutovska remains an explicit existing editorial identity. Linking requires confirmation; no name matching or duplicate creation is introduced. Existing biography/portrait publication and revision restoration remain inside this editor. Saving a new operational doctor does not silently create a new public website template.

## Checkpoint 4 — News

Add news remains directly visible. New articles require localized title/body, image selection and publication date. Slugs are generated from titles; summaries and initial SEO values derive from entered content. Slug/order/SEO controls are hidden. Existing URLs and hidden metadata remain preserved when editing. LV/RU/EN completion validation, preview, draft save, publish, archive and restore remain.

Imported articles retain their established paragraph structure and complete revision history. Locked slug/source fields no longer clutter the form. Added safe withdrawal for imported articles using the existing `unpublished` lifecycle event supported by migration 006. The public API returns only withdrawn **identities**, never draft text. The frontend removes those articles from listings and article routes; publication/restore brings them back. A zero-article guard prevents the homepage news section from accessing a missing first article. No public styles or Hero code changed.

No new migration is needed. The current migration-006 backend must be running for the new imported-news withdrawal behavior.

## Checkpoints 5–6 — Inline images and reduced complexity

Specialist and News image controls open the existing secure picker inline. Computer upload controls remain gated by the backend configuration; they are not enabled by this work. Disabled uploads explain that an existing photograph can be selected. Image pickers accept image extensions, omit maintenance metadata, copy/archive/delete actions and indirect content-location links. Reference protection, server validation and protected Hero media remain unchanged.

Removed client-facing service/price editors and navigation levels, specialist ordering/qualification fields, duplicate actions, generic CMS intro text and technical locked article fields. Embedded schedule headings use h2 instead of introducing a second page h1. Existing focus handling, dirty-form protection, confirmations, role revalidation and responsive visual identity remain.

## Checkpoint 7 — Preservation

- All service records, durations, prices, backend service-management capabilities and public price-list code remain intact.
- Supabase Auth, JWT/role verification, Booking collision protection, idempotency, CMS versions/history, media reference protection and RLS remain.
- No production records, doctors, appointments or synthetic content were created.
- No production upload or public Booking activation; no email functionality.
- All 15 Hero-lock checks pass. Welcome Intro unchanged.
- Public route/SEO structure unchanged. The only homepage template edit is the empty-news guard described above.

## Checkpoints 8–9 — Executed verification

Browser checks use intercepted synthetic APIs and identities. They are **not** claimed as real production Storage delivery or a browser-to-production end-to-end test. Database tests run against a newly created loopback-only disposable PostgreSQL 17.11 container, with synthetic data and explicit local/test-name guards. Its cleanup removes only its own container. No `.env` or production database connection is loaded by that runner.

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk warning remains |
| Frontend unit tests | 99 passed, 0 failed/skipped |
| Three-section navigation/legacy route browser checks | 9 locale/viewport cases; 16 legacy paths each; no service writes |
| Admin access browser checks | 12 guest/user/unavailable-identity cases; zero privileged requests |
| New specialist workflow | 24 LV/RU/EN × eight widths: image, services, hours, activation, atomic save, reload |
| Existing specialist/CMS workflow | 24 cases: explicit link, deduplication, draft/publish/restore, portrait scope, role revocation |
| Embedded time off | 6 LV/RU/EN × mobile/desktop cases: break, blocked day, vacation, impact rejection, slot preview |
| Appointment browser regression | 24 cases: calendar modes, details, conflict, idempotent retry, reschedule |
| New news workflow | 24 cases: all languages, generated slug, image selection, preview/publish/archive/restore |
| Imported news lifecycle | 6 cases: draft/publish/withdraw/restore and public listing; all-articles-withdrawn homepage case |
| Public Booking browser regression | 172 layout checks, 31 flows, no browser errors |
| Auth browser regression | 96 layout checks; registration/login/session/logout/recovery/confirmation |
| Production build without API configuration | 132 public checks, 6 unavailable/Auth checks; no unexpected requests or browser errors |
| Go `go test -count=1 -p 1 ./...` through disposable runner | PASS across migration, Auth, Booking, CMS, database, Media, server packages |
| Go vet and API compilation | PASS |
| Hero locks | 15/15 |
| Whitespace | PASS excluding the two unchanged pre-approved OFL files |

Database integration tests cover actual transactions, service/doctor eligibility, availability, appointments and concurrency, authorization, CMS revisions and media safeguards. Added a real PostgreSQL regression for imported-news withdrawal, published-payload exclusion, revision preservation, restoration and rejection of withdrawal on unrelated content. The CMS test database now applies existing migration 006 to exercise the current event constraint.

The old broad browser scripts that assume Dashboard/Services/Pages/standalone Schedules/Media are still client features are historical maintenance coverage, not acceptance tests for this simplified interface. The new route, specialist, inline-time-off, news and access suites cover their supported replacements. No pass is claimed for those obsolete route expectations.

### Commands

```sh
cd frontend
npm run build
node --test tests/*.test.mjs
node scripts/check-hero-lock.mjs
# Set TEST_BASE_URL to an isolated local Vite server with synthetic Supabase configuration.
# Set PLAYWRIGHT_MODULE to the installed Playwright module when it is not on Node's path.
node tests/simple-admin-browser.cjs
node tests/simple-admin-access-browser.cjs
node tests/admin-simple-workflows-browser.cjs
node tests/unified-doctors-browser.cjs
node tests/specialist-time-off-browser.cjs
node tests/appointments-browser.cjs
node tests/created-content-browser.cjs
node tests/news-archive-browser.cjs
node tests/booking-browser.cjs
node tests/auth-browser.cjs
node tests/missing-api-browser.cjs
cd ..
bash backend/scripts/test-media-local.sh
cd backend
go vet ./...
go build -o /tmp/ag-simple-admin-api ./cmd/api
```

## Files changed by this refinement

This is an incremental list, not the entire pre-existing dirty working tree.

Backend:

- `backend/internal/cms/store.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/integration_test.go`
- `backend/scripts/test-media-local.sh`

Frontend implementation:

- `frontend/src/router/admin.ts`
- `frontend/src/services/admin/navigation.ts`
- `frontend/src/services/admin/access.ts`
- `frontend/src/services/cms/content.ts`
- `frontend/src/components/admin/AdminNavigation.vue`
- `frontend/src/components/admin/AdminPageHeader.vue`
- `frontend/src/components/admin/MediaLibrary.vue`
- `frontend/src/views/admin/AdminAppointmentsView.vue`
- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/src/views/admin/AdminDoctorsView.vue`
- `frontend/src/views/admin/AdminSchedulesView.vue`
- `frontend/src/views/admin/AdminCmsView.vue`
- `frontend/src/views/admin/AdminCreatedContentView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/i18n/operations.ts`
- `frontend/src/i18n/media.ts`

Tests:

- `frontend/tests/admin-access.test.mjs`
- `frontend/tests/admin-localization.test.mjs`
- `frontend/tests/admin-simple.test.mjs`
- `frontend/tests/cms-navigation.test.mjs`
- `frontend/tests/admin-simple-workflows-browser.cjs`
- `frontend/tests/unified-doctors-browser.cjs`
- `frontend/tests/created-content-browser.cjs`
- `frontend/tests/helpers/cms-fixture.cjs`
- `frontend/tests/missing-api-browser.cjs`
- `frontend/tests/simple-admin-browser.cjs` (new)
- `frontend/tests/simple-admin-access-browser.cjs` (new)
- `frontend/tests/specialist-time-off-browser.cjs` (new)
- `frontend/tests/news-archive-browser.cjs` (new)

Documentation/evidence:

- `docs/SIMPLE_ADMIN_FINAL.md` (this report)
- `docs/screenshots/simple-admin/appointments-390.png`
- `docs/screenshots/simple-admin/appointments-1440.png`
- `docs/screenshots/simple-admin/doctors-390.png`
- `docs/screenshots/simple-admin/doctors-1440.png`
- `docs/screenshots/simple-admin/news-390.png`
- `docs/screenshots/simple-admin/news-1440.png`
- Existing unified-doctor browser evidence refreshed by that suite: `docs/screenshots/unified-doctors/after-list-390.png`, `after-list-1440.png`, `after-editor-390.png`, `after-editor-1440.png`.

## Visual evidence

New screenshots contain synthetic sessions with approved local website imagery; no production patient data.

- [Appointments desktop](screenshots/simple-admin/appointments-1440.png) / [mobile](screenshots/simple-admin/appointments-390.png)
- [Specialists desktop](screenshots/simple-admin/doctors-1440.png) / [mobile](screenshots/simple-admin/doctors-390.png)
- [News desktop](screenshots/simple-admin/news-1440.png) / [mobile](screenshots/simple-admin/news-390.png)
- Prior captured specialist list for comparison (historical, not a new before capture): [desktop](screenshots/unified-doctors/before-list-1440.png) / [mobile](screenshots/unified-doctors/before-list-390.png).

Specialist desktop and News mobile screenshots were visually inspected in addition to browser overflow checks.

## Remaining limits and next actions

1. Review these local changes; no commit/merge/push/deployment was performed.
2. Restart the existing local Go backend from the updated source before using imported-news archive. The existing user-owned backend process was not silently replaced. No schema migration is required beyond the already-approved 006 baseline.
3. Production uploads remain disabled. Actual computer-file delivery still requires the previously defined Storage verification and separate activation approval. Existing-image selection works; this task does not claim a real upload.
4. Real appointment creation depends on approved existing services/durations, doctor configuration, privacy configuration and explicit activation. Client users cannot create or change service prices/durations; that remains a trusted technical/clinic approval process outside this panel.
5. A newly added operational specialist is not automatically published into a new public specialist-page template. The existing Dr. Anda profile retains its reviewed publication workflow.
6. No live clinic content or appointment was used as a smoke test. Browser contracts and real disposable-database integration were verified separately.

The temporary synthetic Vite server was stopped after verification. Existing user-owned frontend/backend processes were left intact.
