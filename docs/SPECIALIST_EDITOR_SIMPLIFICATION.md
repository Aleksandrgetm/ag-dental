# Specialist editor simplification

2026-10-11 · `feature/final-development` · local implementation only.

The existing dirty working tree was preserved. No production Supabase, clinic record, upload flag, public Booking setting, migration, deployment, commit, merge or push was changed. No UI/UX skill or email functionality was used.

## Checkpoints 1–4: Task-oriented editor

The specialist editor now has exactly three accessible tabs:

- **Profile:** name, portrait, professional title where supported, biography and one LV/RU/EN editing-language selector.
- **Services:** selection of existing approved booking services. No service creation, prices or durations. Search appears only for a larger catalog; an empty approved catalog has actionable plain-language guidance.
- **Schedule:** seven working/not-working day controls, with start/end inputs for working days. Existing multiple working periods and their IDs/effective dates are retained; an additional period is optional. No default hours are invented.

Doctor name and portrait remain at the top. One **Save changes** action saves the current tab. Profile and service fields do not remain visible in Schedule. Tabs support arrow keys, Home/End, tab roles, selection state and labelled panels.

Breaks, vacations and blocked dates are available within Schedule. Their explicit secondary forms keep their own save/cancel action; they do not submit the weekly-hours form. Slot preview is a closed secondary disclosure rather than another large form shown by default.

## Checkpoint 5: Explicit booking activation

Replaced Active / Enable booking / Clinic confirmed / Existing profile confirmed checkbox rows with one booking-status section. Before activation it shows:

1. Services selected.
2. Working hours configured.
3. Required clinic settings confirmed.

**Enable online booking** is disabled for unsaved or incomplete configuration. It requires an explicit confirmation that the clinic approved the services/hours. The backend still independently checks readiness and authorization. Disabling new bookings is also explicit and preserves existing appointments.

Ordinary task saves do not toggle activation. Clinical approval is explicitly confirmed when saving, not silently inferred. The existing `clinic_verified` provenance, authenticated operation event and editorial-link confirmation payload are retained. The interface simplification does not replace any backend validation or audit event.

## Checkpoints 2, 6–7: Profile, publication, identity and saves

For the existing Dr. Anda profile, the editor loads the latest permitted drafts/publications of the existing biography, title and portrait documents. It edits only their supported fields and preserves all unrelated fields and languages.

One editing-language selector applies to the whole profile context. The separate biography/title/portrait sub-navigation and duplicate CMS language selector are gone. Raw keys, IDs and revision identifiers are never rendered. Previous published versions are available in a closed disclosure.

**Save changes** saves drafts. **Publish on website** is a separate, explicit follow-up. Unsaved profile data blocks publication/restoration. The existing shared-document publication warning remains an explicit confirmation: title/portrait documents can contain other pending website changes. No draft is automatically published.

Each task save starts from the last persisted operational snapshot and replaces only that task's fields. For example, saving Services leaves an unsaved name/biography edit in place. A profile operation and its CMS drafts use their existing separately versioned APIs; they are not claimed to be one cross-API database transaction. Successfully saved parts retain their new versions, failed parts stay editable, and a partial-save message identifies the incomplete result. Retry does not intentionally replay an already saved operational mutation.

The existing CMS-to-doctor identity remains explicit. Creating its missing operational link requires confirmation. Choosing an already existing operational doctor preserves that doctor's services, schedule, IDs and version. Repeated saves do not create a second doctor. No name matching or inferred linking is introduced.

Unsaved edits remain in memory when switching editor tabs or browser windows. Route-leave/before-unload protection remains. Focus/role revalidation does not reload an already loaded editor; role revocation removes it. Version conflicts keep the user's edits and offer explicit reload rather than silently replacing them.

## Checkpoints 8–9: Localization and responsive behavior

New task labels, status/readiness explanations, approval prompts, save/partial-save/conflict states and publication text exist in LV/RU/EN using the existing vue-i18n architecture.

Browser workflows exercised all requested widths: **320, 375, 390, 430, 768, 1024, 1440, 1920**. No horizontal overflow was detected. Native time/date controls, existing dialog focus handling, accessible labels and minimum touch targets remain. Desktop Schedule and mobile Profile were visually inspected, followed by a final screenshot refresh.

## Checkpoint 10: Executed tests

Browser workflows use synthetic identities and intercepted APIs. The inline upload test uses mocked Storage/API transport and does **not** claim real Supabase upload delivery. Backend integration tests use the existing guarded disposable PostgreSQL 17.11 runner, which loads no production `.env` and cleans up its own container.

| Test | Result |
| --- | --- |
| `npm run build` | PASS; pre-existing large-chunk warning remains |
| `node --test tests/*.test.mjs` | **100 passed**, 0 failed/skipped |
| `specialist-editor-browser.cjs` | **24** LV/RU/EN × 8 widths: scoped saves, all biography languages, portrait, draft/publish, previous-version restore, hours, explicit activation, optimistic conflict retention, browser-tab/focus revalidation and revoked roles |
| `admin-simple-workflows-browser.cjs` | **24** cases: create profile, choose portrait, save service assignment, save hours, explicitly activate, refresh/deep link |
| `specialist-link-browser.cjs` | **6** cases: missing vs existing operational identity, explicit link consent, preserved assignments/hours, no duplicate writes, unchanged CMS revisions |
| `specialist-time-off-browser.cjs` | **6** cases: breaks, vacation, blocked date, appointment-impact rejection and slot preview |
| `specialist-media-browser.cjs` | **3** locales: disabled upload gate, protected Hero exclusions, rejected SVG, immediate preview, failed upload/retry with stable key, image selection; all upload transport mocked |
| `simple-admin-access-browser.cjs` | **12** guest/ordinary-user/unavailable-identity cases; no privileged requests |
| `created-content-browser.cjs` | **24** existing News CMS/image/draft/publish/archive/restore regression cases |
| `booking-browser.cjs` | **172** layout checks, **31** flows, no browser errors |
| `auth-browser.cjs` | **96** layout checks plus registration/login/session/logout/recovery/confirmation flows |
| `bash backend/scripts/test-media-local.sh` | PASS: actual disposable PostgreSQL migration/Auth/Booking/CMS/database/Media/server integration and Go package tests |
| `go vet ./...` | PASS |
| `node scripts/check-hero-lock.mjs` | **15/15** |
| `git diff --check` | PASS, with the existing exemption for the two unchanged font-license files |

The disposable backend suite includes incomplete-doctor rejection, explicit editorial-link confirmation, eligibility/readiness, schedule impact/overlap/DST, appointment collision protection, CMS version/revision safeguards and media authorization/reference protections. Backend source was not changed in this refinement.

Older browser scripts that assumed the removed checkbox-heavy specialist editor are superseded by the tabbed editor/link/time-off/inline-media tests above. No pass is claimed for obsolete UI selectors. Other section behavior is preserved; this task does not reinstate hidden service or media administration routes.

### Reproduction

Use an isolated local Vite server configured with synthetic Supabase credentials and intercepted APIs. Set `TEST_BASE_URL` and `PLAYWRIGHT_MODULE` for browser scripts. Do not point them at production.

```sh
cd frontend
npm run build
node --test tests/*.test.mjs
node scripts/check-hero-lock.mjs
node tests/specialist-editor-browser.cjs
node tests/admin-simple-workflows-browser.cjs
node tests/specialist-link-browser.cjs
node tests/specialist-time-off-browser.cjs
node tests/specialist-media-browser.cjs
node tests/simple-admin-access-browser.cjs
node tests/created-content-browser.cjs
node tests/booking-browser.cjs
node tests/auth-browser.cjs
cd ..
bash backend/scripts/test-media-local.sh
cd backend
go vet ./...
```

## Exact files changed in this task

Implementation:

- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/src/components/admin/DoctorPublication.vue`
- `frontend/src/views/admin/AdminSchedulesView.vue`
- `frontend/src/i18n/specialistEditor.ts` — new
- `frontend/src/main.ts` — register the new translation namespace

Tests:

- `frontend/tests/admin-simple-workflows-browser.cjs`
- `frontend/tests/specialist-time-off-browser.cjs`
- `frontend/tests/specialist-editor.test.mjs` — new
- `frontend/tests/specialist-editor-browser.cjs` — new
- `frontend/tests/specialist-link-browser.cjs` — new
- `frontend/tests/specialist-media-browser.cjs` — new

Documentation/evidence:

- `docs/SPECIALIST_EDITOR_SIMPLIFICATION.md`
- `docs/screenshots/specialist-editor/before-390.png`
- `docs/screenshots/specialist-editor/before-1440.png`
- `docs/screenshots/specialist-editor/profile-390.png`
- `docs/screenshots/specialist-editor/profile-1440.png`
- `docs/screenshots/specialist-editor/services-390.png`
- `docs/screenshots/specialist-editor/services-1440.png`
- `docs/screenshots/specialist-editor/schedule-390.png`
- `docs/screenshots/specialist-editor/schedule-1440.png`

The before images preserve the preceding implementation's browser captures, copied before this edit. After images are generated by this task's synthetic browser workflows. All prior unrelated dirty files remain outside this incremental list.

## Before / after

| View | Desktop | Mobile |
| --- | --- | --- |
| Previous long editor | [Before](screenshots/specialist-editor/before-1440.png) | [Before](screenshots/specialist-editor/before-390.png) |
| Profile | [After](screenshots/specialist-editor/profile-1440.png) | [After](screenshots/specialist-editor/profile-390.png) |
| Services | [After](screenshots/specialist-editor/services-1440.png) | [After](screenshots/specialist-editor/services-390.png) |
| Schedule | [After](screenshots/specialist-editor/schedule-1440.png) | [After](screenshots/specialist-editor/schedule-390.png) |

## Remaining limitations

- Production uploads remain disabled. Real Storage delivery still needs the separately approved activation/verification process; existing-image selection remains available.
- Real booking eligibility still requires the approved catalog, verified durations, clinic/privacy settings, working hours and explicit activation. This task did not enable public Booking.
- A newly created operational specialist is not automatically added to a new public website template. Existing Dr. Anda website content remains linked and uses explicit draft/publication operations. Name editing updates the operational doctor record; this task does not rewrite hardcoded public identity text or public layouts.
- Shared title/portrait documents retain their existing shared publication scope and warning. A future per-field publication API would require a separately reviewed backend/content model change.
- Operational and CMS profile saves are separately versioned transactions. Partial-save states are explicitly handled; no cross-API atomicity is claimed.
- No production smoke writes, real doctors, deployment, commit, merge or push were performed. Existing user-owned backend/frontend processes were not replaced.

The final desktop/mobile screenshot refresh passed two additional synthetic workflows. The temporary synthetic Vite server was stopped after verification; user-owned application processes were left running.
