# News publication validation — 2026-10-12

Branch: `feature/final-development`. Existing uncommitted work preserved.

## Root cause and actual-session evidence

The local API was stale. PID 19109 listened on `127.0.0.1:8080` using `/tmp/ag-local-media-api`, built at 15:08:30. The current `created.go` article schema was updated at 15:26:43. The old executable lacked the `category,omitempty` and `author,omitempty` JSON fields; the newer editor sends those optional localized fields. Its strict JSON decoder rejected them before publication. The strict decoder is retained.

Read-only inspection of the actual authenticated Chrome editor found the reported generic error. LV, RU and EN each had nonempty title, introduction, body, category and author. The date was `2026-10-12`. The selected image was the registered `/media/clinic/tour-room.jpg`, not an uploaded Storage ID. No re-upload was needed. The body is required for new articles in every language; it was NOT missing in this case.

The historical production request/response was not retained in accessible browser logs. We did not press Publish against production to capture another request. Thus the following HTTP evidence is explicitly from isolation, not a claimed production replay:

- Ran the exact old executable against disposable PostgreSQL/Auth/Storage.
- `POST /api/admin/cms/documents/created.news.<synthetic UUID>/save-publish`, `expected_version: 0`, valid synthetic title/summary/body/SEO in LV/RU/EN, date, registered image, category and author: **422**, `{"error":"invalid_content"}`.
- Same synthetic payload with only category/author removed: **200**.
- Latest source with category and author: real browser direct publication **200**, public article visible in LV/RU/EN, including refresh.

No tokens, real draft text or credentials are included in this report. The old executable test environment was destroyed afterward.

## Changes

- Rebuilt and restarted the local loopback API from latest source. New PID at verification: 24208. Health HTTP 200. Executable SHA-256 `02c1bf2b36de5e45c13085fd4de798656f0c76e3c06fd9f83e4d8d548d423840`. PID/hash describe this local build, not a deployment.
- Added safe field-path errors for required localized text, date, optional metadata and invalid/unavailable image references. Existing `ErrInvalid` semantics, strict schema, role checks, transaction rollback and media protection remain intact.
- Frontend handles these paths without exposing raw API/SQL errors. Unknown schema rejection asks for API/version investigation instead of blaming unspecified missing fields.
- Localized inline feedback, required markers and first-invalid-field focus. Hidden invalid translations automatically select the corresponding language. Browser native validation no longer masks cross-language validation.
- Strict calendar validation and UTF-8 byte checks match Go validation. Derived SEO excerpts are truncated on whole UTF-8 characters within the backend's byte limit; no translations are generated.
- Failure leaves title/body/optional metadata/date/image selection intact; one-click publication retained.
- Actual open draft was inspected before changes and restored in all three languages with the same registered image after Vite hot reload. No save/publication was performed.

## Verification

- `npm run build`: PASS; existing large-chunk advisory remains.
- `node --test tests/*.test.mjs`: **117 PASS**, zero failures/skips.
- `go test ./...`: PASS. Standalone run does not imply database integration.
- `sh scripts/test-media-local.sh`: PASS against disposable PostgreSQL, including CMS, Booking, Auth, Media, migration, database and server packages. Cluster stopped.
- `QA_NEWS_ONLY=1 ... python3 backend/scripts/acceptance-local.py`: PASS real browser → Go → disposable Auth/PostgreSQL/Storage. Valid LV/RU/EN publication; public listing/detail/refresh; registered/uploaded image validation and replacement; unpublish/restore/archive; revision preservation; idempotency; role revocation; private access/file rejection.
- New direct invalid API cases: `title.lv`, `body.ru`, impossible date, nonexistent Media ID all return **422** with exact field; zero partial documents.
- `news-validation-browser.cjs`: **6 PASS**, LV/RU/EN × 390/1440, missing title/body/date, language switch/focus, backend image error and retained content/image. Initial invocation omitted the fixture URL and its isolation guard stopped it; rerun with explicit `TEST_BASE_URL` passed.
- `news-admin-browser.cjs`: **24 PASS**, locale/responsive publication/error retention/edit/unpublish/republication/public persistence.
- `specialist-media-browser.cjs`: **6 PASS**, invalid file/video rejection, failed upload/retry, preview/selection and Hero exclusion. Transport mocked; real Storage evidence above is separate.
- `simple-admin-access-browser.cjs`: **12 PASS**, denied guest/ordinary-user/forged metadata/unavailable identity; no privileged requests.
- `auth-browser.cjs`: **96 layout checks PASS**, registration/login/persistence/logout/recovery/confirmation, no browser errors.
- `admin-refresh-browser.cjs`: PASS desktop/mobile focus and token events, 30 accelerated minutes, outage recovery and revocation; unsaved editor/schedule state retained.
- All **15 Hero locks PASS**.

## Exact task files

Backend:
- `backend/internal/cms/validation.go` (new)
- `backend/internal/cms/created.go`
- `backend/internal/cms/news.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/news_test.go`

Frontend:
- `frontend/src/services/cms/newsValidation.ts` (new)
- `frontend/src/services/cms/admin.ts`
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/src/i18n/newsAdmin.ts`
- `frontend/tests/news-validation.test.mjs` (new)
- `frontend/tests/news-validation-browser.cjs` (new)
- `frontend/tests/helpers/news-real-workflow.cjs`

Evidence:
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json` (regenerated synthetic evidence)
- `docs/NEWS_PUBLICATION_VALIDATION_FIX.md` (this report)

Temporary `/tmp` test harness/logs/build artifacts were used; local executable replaced. No `.env`, credentials, database migration or protected/public design file was changed by this task.

## Limits and handover

Production publication was deliberately not tested. The user may retry their draft when they actually intend it to become public. The verified fix is the current backend plus frontend validation; restarting an older executable would reintroduce the schema mismatch. Keep local/backend builds aligned with frontend changes.

No production CMS/Booking/Auth/Storage records were written, no production migration or upload ran, and nothing was committed, pushed, merged or deployed. Hero and Welcome Intro remain unchanged.
