# Unified doctor administration

2026-10-11 · feature/final-development. Existing dirty working tree preserved.

## Architecture and plan

The split UI renders operational rows and a separate CMS navigator. Existing
Dr. Anda Gutovska has a stable `clinic.doctorBio` identity; the portrait is the
`doctor` field of `clinic.media`. `doctor_profiles.editorial_key` is a unique
foreign key. Names are never identity keys. No production record will be created.

Use a unified list derived from explicit links. An unlinked existing editorial
profile gets a setup action, not a false empty-state warning. Setup remains an
explicit confirmed operational save; CMS data is preserved. A linked editor keeps
website drafts/publication separate from operational save/activation. Existing
schedules and media APIs remain authoritative. No migration is required.

## Checkpoint status

1. Architecture inspected and IDs/links documented.
2. Unified list implemented; existing editorial-only profile remains one card.
3. One editor provides general details, services, hours, readiness and website publication.
4. Add doctor retains single-form state, idempotency and inactive defaults.
5. Public doctor selector now requires privacy readiness and sufficient working intervals.
6. Existing profile setup requires explicit confirmation; linking an existing operational ID is supported.
7. Website draft/publish/restore remains separate from operational save and activation.
8. Schedule links carry exact doctor ID; selection is preserved in the URL.
9. Existing authorized media picker/preview used; no uploads enabled.
10. Search, empty, setup and error states use localized employee-facing language.
11. LV/RU/EN implemented; no manual alternate language system.
12. All eight requested widths covered by synthetic browser workflows.
13. Existing security/transactions retained; duplicate links rejected atomically.
14. Disposable PostgreSQL and all relevant browser regressions passed.
15. Report and six screenshots complete; stopped for review.


## Before and after

Before: a published editorial card, an empty operational list, and a separate
"Manage booking offerings" path suggested that the same person must be entered twice.
After: one searchable list joins only explicit identities. The existing profile
shows publication status and "Online booking is not configured yet", with Edit and
Set up online booking. Existing names are never used as matching keys.

The list reads existing CMS publication state and authorized operational records.
New setup pre-fills only approved published biography and registered portrait;
services, qualifications and hours are not invented. Save remains inactive unless
the administrator explicitly activates a ready doctor. Linking an existing row
preserves its UUID, assignments, schedule and historical references.

## Data and API changes

No new table, migration, production write or import is required. The existing
`doctor_profiles.editorial_key` UNIQUE foreign key remains the identity authority.
The existing admin operation payload accepts `confirm_editorial_link` and optional
localized `profile.title`. New explicit links require confirmation. A conflicting
link fails before creating a duplicate doctor. Configuration locking, idempotent
operation IDs and optimistic versions remain unchanged.

`GET /api/booking/doctors` now filters incomplete configurations: an active,
bookable service/doctor relationship alone is insufficient. Privacy configuration
and a nonexpired interval long enough for the selected service/override are also
required. Availability and any-doctor requests still use the existing schedule,
time-off, duration and Riga/DST engine. Compatibility with migration-002-only test
schemas is retained through the existing optional-active-column strategy.

The unified editor uses the existing CMS draft/publish/rollback API. Biography,
professional title and portrait belong to their existing approved document fields;
other fields are preserved. Publication uses current versions and explicit
confirmation, including the shared-document scope warning. No unfinished website
content is automatically published by an operational save.

## Safety and capability boundaries

- All write tests use intercepted browser APIs or disposable PostgreSQL. No clinic
  doctor, appointment, schedule, price, CMS revision or role was changed in Supabase.
- Operational doctor setup is one transaction. Website publication is an explicit
  separate operation; failure there does not pretend to undo or publish operational
  data. The editor retains unsaved text after conflicts/errors.
- New doctors can be configured for Booking without a website page. The approved
  site currently has one existing editorial doctor profile. Arbitrary new public
  doctor page/list templates are not introduced under the no-public-redesign rule;
  the UI honestly says when a doctor has no website section.
- Leave/blocked dates use the existing Schedule editor after a doctor has an ID.
  No second schedule store or invented availability is introduced.
- Uploads, real clinic setup and public booking activation remain separately gated.
  No Resend/email, deployment or Git publication is included.
- Automated tests are not a clinic employee usability study or WCAG certification.

## Exact task files

Backend:
- `backend/internal/booking/profiles.go`
- `backend/internal/booking/store.go`
- `backend/internal/booking/operations_integration_test.go`

Frontend:
- `frontend/src/main.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/i18n/unifiedDoctors.ts` (new)
- `frontend/src/services/admin/doctors.ts` (new)
- `frontend/src/views/admin/AdminDoctorsView.vue` (new)
- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/src/views/admin/AdminSchedulesView.vue`
- `frontend/src/components/admin/DoctorPublication.vue` (new)
- `frontend/src/components/admin/AdminNavigation.vue`

Tests:
- `frontend/tests/unified-doctors.test.mjs` (new)
- `frontend/tests/unified-doctors-browser.cjs` (new)
- `frontend/tests/cms-browser.cjs`
- `frontend/tests/cms-navigation-browser.cjs`
- `frontend/tests/admin-browser.cjs`

Documentation: this report. Six screenshots under `docs/screenshots/unified-doctors/`:
`before-list-390.png`, `before-list-1440.png`, `after-list-390.png`,
`after-list-1440.png`, `after-editor-390.png`, `after-editor-1440.png`.
Before images are the verified previous task's final synthetic baseline, copied
without alteration. After images use the current implementation and synthetic APIs.
Existing unrelated working-tree changes are preserved and excluded from this list.

| View | Before | After |
|---|---|---|
| Desktop list | [Before](screenshots/unified-doctors/before-list-1440.png) | [After](screenshots/unified-doctors/after-list-1440.png) |
| Mobile list | [Before](screenshots/unified-doctors/before-list-390.png) | [After](screenshots/unified-doctors/after-list-390.png) |
| Unified editor | — | [Desktop](screenshots/unified-doctors/after-editor-1440.png) · [Mobile](screenshots/unified-doctors/after-editor-390.png) |

## Final test results

| Verification | Result |
|---|---|
| Production frontend build | PASS; existing large-chunk warning retained |
| Frontend unit suite | 98 passed, no failures/skips |
| Unified doctor workflow | 24 cases, LV/RU/EN × all eight widths |
| Existing Add Doctor workflow | 24 passed |
| Existing doctor/media editing | 24 passed |
| Schedule browser | 24 passed |
| Appointment browser | 24 passed |
| Service operations / price editor | 24 each passed |
| CMS browser | 190 passed |
| CMS navigation and session recovery | 135 passed |
| Media browser | 45 passed |
| Admin authorization / responsive | 323 passed |
| Booking browser | 172 layout checks, 31 flows passed |
| Auth browser | 96 layouts plus auth flows passed |
| Structured News/Page/FAQ creation | 72 passed |
| Missing Go API production build/browser | 132 public, 6 unavailable/Auth checks; no unexpected requests |
| Go integration suite | PASS against actual disposable PostgreSQL 17.11 |
| go vet ./... | PASS |
| Go API build | PASS |
| Hero locks | All 15 PASS |
| Whitespace validation | PASS, unchanged font licenses excluded |

The unified browser flow verifies an editorial-only card, confirmed setup, a single
linked card after save, stable editor refresh, revalidation with unsaved text,
draft save, publication and previous-revision restoration. A portrait replacement
uses a permitted different JPEG; other media fields are compared unchanged and the
original publication is restored. Role revocation removes the editor. All writes
are intercepted synthetic calls. Existing Add Doctor tests independently cover
service selection, working hours, portrait selection and explicit activation.

Actual PostgreSQL tests verify confirmation enforcement, duplicate-link rejection,
unchanged CMS version/publication, stable doctor identity, atomic setup and rollback,
readiness, service/price ownership, public selector/availability, time off, appointment
conflicts, history, media references and authorization. The test script uses an
explicitly disposable loopback database and does not load production `.env`.

Commands:

```sh
(cd frontend && npm run build && node --test tests/*.test.mjs)
bash backend/scripts/test-media-local.sh
(cd backend && go vet ./... && go build -o /tmp/ag-unified-doctor-api ./cmd/api)
node frontend/scripts/check-hero-lock.mjs
# Browser suites ran against isolated Vite 127.0.0.1:5187 with envDir:false,
# synthetic Auth and intercepted APIs; missing-api creates its own isolated build.
```

Initial test failures were resolved rather than ignored: old browser fixtures
expected the split CMS list; these now test unified navigation while preserving
legacy editor deep links. New tests exposed an empty-ID confirmation edge case,
which is fixed server-side, and a portrait-loading warning, which is fixed. The
portrait fixture originally selected the existing image/nonselectable SVG; it now
selects a distinct permitted JPEG without weakening picker restrictions.

## Review / activation next steps

1. Review the unified list/editor and the explicit link confirmation with clinic staff.
2. Run the updated Go backend before using the new setup payload. The compiled API
   was verified locally, but this task did not replace the user's running backend
   process or deploy it. No database migration is required.
3. Separately approve any real doctor/link/service/hour configuration and privacy
   readiness. This task created no production operational records.
4. Keep uploads and public booking activation gated until their existing checks are
   approved. New public doctor templates require a separately reviewed content/design
   extension; the existing Dr. Anda website profile remains intact.

The task-only synthetic Vite server was stopped. Existing user development servers,
Supabase, public design, Hero and Welcome Intro were left unchanged. No commit,
merge, push, email delivery or deployment was performed.
