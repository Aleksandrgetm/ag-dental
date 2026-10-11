# Existing doctor profile validation fix

Date: 2026-10-11. Branch: `feature/final-development`.

## Root cause and reproduction

The local API on port 8080 was an older compiled executable (PID 75962; binary timestamp 2026-10-11 17:44 local time). Its doctor request contract did not accept `confirm_editorial_link` or `profile.title`. The current editor sends both. The strict JSON decoder therefore returned HTTP 400 `{"error":"invalid_request"}` before checking the displayed name, biography or portrait. The frontend mapped this to the misleading Russian message about checking every profile field.

This is confirmed by executing that same old binary again in an isolated process with a **fresh disposable PostgreSQL 17.11 database**, a synthetic HTTPS Auth server and an explicitly constructed environment. No production `.env` was loaded by that process:

1. Current-shaped synthetic request: HTTP 400 `invalid_request`.
2. Remove `confirm_editorial_link`, retain `profile.title`: HTTP 400 `invalid_request`.
3. Remove the old-unsupported title field as well: HTTP 200.
4. Send the full current contract to the current Go implementation: HTTP 200.

The successful legacy-shaped request was only a diagnostic in the disposable database. The fix does **not** remove confirmation, title support or strict decoding from the application.

Safe payload inspection identified these exact relevant properties:

- `expected_version: ""` for creating the initial operational link.
- `data.name: "Dr. Anda Gutovska"` in the approved-content local reproduction.
- `data.editorial_key: "clinic.doctorBio"`.
- `data.confirm_editorial_link: true` after explicit user confirmation.
- `data.profile`: LV/RU/EN biography, title and qualifications maps.
- `data.portrait_id: "media.a5efea0fa7154c32"`.
- `active: false`, `booking_enabled: false`, empty service and schedule selections for the initial link.
- A generated operation UUID; no tokens or connection credentials were recorded.

The initial current-source reproduction succeeded but exposed a second defect: the displayed professional title was sent as three empty strings. The parent loaded the published biography, while the embedded CMS editor selected draft-or-published content independently. Portrait changes in that editor also only updated its display URL, not necessarily the operational media reference.

## Changes

- Copy the **same visible CMS draft-or-published** biography and professional title to the operational profile on Profile save. Retain all approved LV/RU/EN values verbatim; do not infer qualifications or translate missing values.
- Resolve the existing portrait URL through the authorized media registry, requiring a ready, unprotected image. The approved existing portrait resolves without an upload. Invalid references fail visibly rather than silently clearing the portrait.
- Compare localized maps independently of JSON property order. Reopening and saving unchanged content does not create another doctor or unnecessary operational writes.
- Keep explicit editorial-link consent, stable identity, expected-version conflict checks and idempotent operation IDs.
- Show the invalid field and locale, switch to the affected language, and mark visible text inputs with accessible error attributes. Server responses contain allowlisted codes and field/locale identifiers, never submitted text or SQL errors.
- Validate portrait references under the existing transaction/media lock before the profile foreign-key write; missing/protected/unready/non-image assets remain rejected. Keep historical media references and archive protections.
- Explain a stale/incompatible request as an API compatibility problem instead of blaming valid visible content.
- Preserve the separate CMS draft/publication workflow. Initial linking does not save CMS drafts, publish, restore or alter revision history.

## Local runtime correction

After successful core regressions, replaced only the identified stale local process with a backend compiled from the current source (`/tmp/ag-doctor-profile-api`). It uses the existing verified-TLS configuration; `MEDIA_UPLOADS_ENABLED=false` is explicitly enforced. Startup was inspected: no AutoMigrate, fixtures, migration application or record writes occur.

Read-only smoke checks on the restarted local API:

| Check | Result |
|---|---|
| `GET /api/health` | 200, database connected |
| Unauthenticated `GET /api/admin/operations/doctors` | 401 |
| Unauthenticated `GET /api/auth/me` | 401 |

No actual clinic profile was saved through the production-connected API. Reload the editor before saving to ensure it has the latest frontend code. The first real operational linking save remains the administrator's action.

## Tests and evidence

- Frontend production build: PASS (existing large-chunk warning only).
- Frontend unit suite: **107 passed**, zero failed/skipped.
- `bash backend/scripts/test-media-local.sh`: PASS. Actual disposable PostgreSQL 17.11, all `go test -count=1 -p 1 ./...` packages. Includes migrations, Auth, Booking availability/collision/idempotency, CMS, Media, Admin authorization and operations.
- `go vet ./...`: PASS.
- Real current Go API/PostgreSQL browser test: **6 LV/RU/EN × 390/1440 px cases passed**. Exact approved translations, registered portrait, field/language errors, stale-API feedback, successful CMS-only linking, Services/Schedule continuation, repeated saves and no horizontal overflow.
- The real browser test made exactly one operational link creation across all six cases and zero CMS writes. Document snapshots before/after matched. The separate integration test verifies unchanged draft/published revision IDs, version and history length, plus idempotent doctor identity.
- Old executable reproduction: PASS, both incompatible fields independently identified.
- Existing specialist editor: 24 responsive/language cases passed.
- Existing specialist linking: 6 cases passed.
- Embedded breaks/vacations: 6 cases passed.
- Inline media: 3 language cases passed on retry. Initial run timed out waiting for a mocked RU upload-error message; isolated rerun passed. No actual Storage uploads occurred.
- Simplified doctor creation/setup workflows: 24 responsive/language cases passed.
- Admin authorization: 12 guest, ordinary-user/forged-metadata and unavailable-identity cases passed; zero privileged requests.
- Appointment UI: 24 responsive/language cases passed.
- Created CMS content: 24 responsive/language cases passed.
- Booking: 172 layout checks and 31 mocked-API flows passed, zero browser errors.
- Auth: 96 layout checks plus registration/login/persistence/logout/recovery/confirmation flows passed, zero browser errors.
- Hero locks: all 15 match the approved baseline.
- Whitespace: PASS, retaining the previously approved exemptions for the two unchanged font-license files.

Screenshots from the isolated real-API reproduction:

- `docs/screenshots/doctor-profile/linked-390.png`
- `docs/screenshots/doctor-profile/linked-1440.png`

The browser harness uses a synthetic authenticated identity and real local database-role authorization. The stale-binary reproduction uses a trusted synthetic HTTPS Auth endpoint. These are not claims of live Supabase end-to-end sign-in; the separate Auth regression suite tests its existing authentication boundaries.

## Exact task files

Implementation:

1. `backend/internal/booking/profiles.go`
2. `backend/internal/booking/operations.go`
3. `backend/internal/booking/validation_detail.go`
4. `backend/internal/cms/profile_media.go`
5. `frontend/src/views/admin/AdminDoctorSetup.vue`
6. `frontend/src/components/admin/DoctorPublication.vue`
7. `frontend/src/services/admin/doctorProfile.ts` (new)
8. `frontend/src/services/admin/operations.ts`
9. `frontend/src/i18n/specialistEditor.ts`

Tests:

10. `backend/internal/booking/validation_detail_test.go`
11. `backend/internal/booking/operations_integration_test.go`
12. `backend/internal/server/calendar_browser_test.go`
13. `backend/internal/server/profile_legacy_test.go` (new)
14. `frontend/tests/doctor-profile.test.mjs` (new)
15. `frontend/tests/profile-realistic-browser.cjs` (new)

Documentation/evidence:

16. `docs/DOCTOR_PROFILE_VALIDATION_FIX.md` (new)
17. `docs/screenshots/doctor-profile/linked-390.png` (new)
18. `docs/screenshots/doctor-profile/linked-1440.png` (new)

Existing browser suites also regenerate their six `docs/screenshots/specialist-editor/{profile,services,schedule}-{390,1440}.png` and two `docs/screenshots/appointment-calendar/after-{390,1440}.png` acceptance artifacts. The many other pre-existing uncommitted project changes were preserved; this list describes this task, not the entire dirty working tree.

## Restrictions and remaining limitations

- No production clinic/Auth/Booking/CMS/Media records were written. No migration or production upload was performed.
- No booking or upload enablement, public design/Hero/Welcome changes, commit, merge, push or deployment.
- Production-connected verification was restricted to health and unauthorized GET requests after the local restart. The real clinic save was intentionally not used as a smoke test.
- If a production CMS draft differs from the approved local manifest or its portrait has subsequently been archived, the editor will show its actual field/reference error. The tests do not claim an audit of current private production drafts.
- No new translations or clinical qualifications were invented. Missing or malformed required language maps remain errors.
