# Media Library upload simplification

Date: 2026-10-16. Branch: `feature/remove-section-numbering`.

## Follow-up status

The later News save fix permits the existing localized article title as the contextual alt fallback for News only; other CMS publication requirements remain unchanged. See `NEWS_FEATURED_IMAGE_SAVE_FIX.md`. The local runtime was subsequently restarted as documented there and in `JPEG_UPLOAD_SUPPORT_FIX.md`. The observations below describe the original upload-simplification checkpoint.

## Root cause

`MediaLibrary.vue` rejected uploads before making a request whenever any of the three alternative-text fields was blank. The Go multipart handler independently required `ValidAlt`, which requires three nonempty localized descriptions. This incorrectly applied public-content requirements to private file ingestion. The existing detail view displayed metadata but provided no editing action afterward.

## Implemented behavior

- Selecting or dropping one supported file starts uploading immediately. The existing inline library stays inside News/Specialists; no new navigation section or standalone Media Library route was added.
- File preview, progress, processing, cancellation, genuine success and same-idempotency-key retry remain available. Invalid selection does not offer a misleading network retry. Format and size failures have specific LV/RU/EN messages.
- Uploads send empty metadata. Go accepts missing, empty or partial localized descriptions while still rejecting unknown locales, markup/control characters and descriptions over 300 characters.
- Optional image details are edited after upload in a collapsed secondary panel. `PATCH /api/admin/cms/media/:id/metadata` updates only alt/decorative JSON fields; existing variants, filenames, storage objects and references are preserved. Registered repository assets remain read-only.
- Edits require verified JWT/admin authorization plus a fresh database-role check inside a transaction. Row/advisory locks and an expected `updated_at` timestamp prevent stale overwrites. Protected/non-ready/non-upload assets cannot be edited.
- Selecting “decorative” does not erase stored descriptions. Public metadata exposes the explicit decorative flag; the existing public alt helper returns empty alt only when explicitly decorative. Informative images retain existing contextual locale fallback behavior.
- Private draft references may be saved before descriptions are complete. Publishing an informative CMS image still requires valid LV/RU/EN descriptions. Already-published informative assets cannot have those descriptions cleared. Decorative assets may have empty alt.
- Uploading or editing private media metadata does not publish it. Anonymous delivery remains unavailable until the existing publication lifecycle permits it. No filenames are substituted as image descriptions.
- Metadata is shared by all uses of an asset, as indicated in the editor. It is not a separate per-placement caption system. Metadata edits use the existing JSONB record, not CMS document revisions; existing document/audit history is untouched. No database migration is needed.

## Security preserved

Real file signature/content inspection, image processing, size/dimension limits, private Storage transport, backend-only credentials, authorization, immutable media object paths, reference-safe archival/deletion, protected Hero exclusions and idempotent retry behavior remain intact. The metadata endpoint accepts no Storage path, publication state, source URL or role from the client. Public CMS ETags include media metadata, so metadata changes are revalidated correctly.

## Verification

- `npm run build`: PASS. Existing large-chunk warning remains; this task does not change bundling strategy.
- `node --test tests/*.test.mjs`: 156/156 PASS.
- `node scripts/check-hero-lock.mjs`: all 15 protected files match the approved baseline. No protected files or hashes changed for this task.
- `go vet ./...`: PASS.
- `sh backend/scripts/test-media-local.sh`: PASS, running `go test -count=1 -p 1 ./...` against new loopback-only disposable PostgreSQL 17.11 databases. Auth, Booking, CMS, Media, migrations and server packages passed. The script never reads production `.env`; containers were removed.
- Go integration exercises real PNG/JPEG/WebP processing and metadata-free HTTP ingestion, optional metadata PATCH, stale-edit rejection, preservation of other JSON fields, duplicate-upload preservation of existing descriptions, private delivery, draft/publication separation, informative-alt rejection, decorative empty-alt delivery, reference protection, partial Storage failure/retry and revoked/unauthorized roles.
- `specialist-media-browser.cjs`: six LV/RU/EN × 390/1440px flows PASS with synthetic mocked transport. Invalid SVG/video, oversized input, preview/progress, failed upload/retry, optional metadata editing, selection, no overflow and protected-asset exclusion.
- `media-browser.cjs`: six LV/RU/EN × 390/1440px inline News library flows PASS with mocked transport. Drag/drop JPG/PNG/WebP without descriptions, later edits retained after reopening, selection, contextual alt fallback and explicit decorative empty alt.
- `QA_MEDIA_ONLY=1 python3 backend/scripts/acceptance-local.py`: PASS with real disposable local Supabase Auth, PostgreSQL, Storage, Go API and Chrome. All three formats uploaded automatically without metadata; private previews decoded; anonymous/user access was denied; metadata persisted and stale edits received 409. Reused synthetic News lifecycle verified direct publication, public image delivery, replacement, LV/RU/EN, refresh, unpublication, revision restoration and published/unpublished archival. No production credentials or endpoints were used. Temporary services and credentials were removed.
- `git diff --check`: PASS.

Test harness corrections during verification: valid synthetic Auth configuration, explicit test locale, open-state-aware metadata panel interactions, cwebp fixture encoding, and accepting synthetic confirmation dialogs. An existing fixed Storage-object-count assertion was updated to use the test's failure threshold because the new upload cases intentionally add objects. No production checks were weakened.

Local browser evidence: `/tmp/ag-media-{lv,ru,en}-{390,1440}.png`. Browser tests use desktop Chrome with responsive viewports, not physical devices. Logs: `/tmp/ag-media-build.log`, `/tmp/ag-media-unit.log`, `/tmp/ag-media-integration.log`, `/tmp/ag-media-real.log`, `/tmp/ag-media-browser.log`, `/tmp/ag-media-news-browser.log`, `/tmp/ag-media-hero.log`.

## Exact files changed for this task

Backend:
- `backend/internal/cms/media_http.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/media_test.go`
- `backend/internal/media/process.go`
- `backend/internal/media/process_test.go`
- `backend/internal/media/types.go`
- `backend/scripts/acceptance-local.py`

Frontend:
- `frontend/src/components/admin/MediaLibrary.vue`
- `frontend/src/i18n/media.ts`
- `frontend/src/services/cms/media.ts`
- `frontend/src/services/cms/mediaModel.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/tests/acceptance-workflows.cjs`
- `frontend/tests/helpers/cms-fixture.cjs`
- `frontend/tests/helpers/news-real-workflow.cjs`
- `frontend/tests/media-browser.cjs`
- `frontend/tests/specialist-media-browser.cjs`
- `frontend/tests/media-upload-real-browser.cjs` (new)

Documentation:
- `docs/MEDIA_UPLOAD_UX_SIMPLIFICATION.md` (new)

## Remaining limitations and activation

Both the frontend and Go backend must run this source version; an older Go process still enforces mandatory upload descriptions and has no metadata PATCH route. The production-connected local backend was not restarted or used for writes. No upload configuration was changed. Production Storage success is not claimed from these isolated tests.

Descriptions are entered by an administrator; no translations, clinical claims or filename-based alt text are generated. Informative public images still need appropriate descriptions before publication. Existing registered repository assets remain read-only in this library.

Earlier section-numbering and homepage-localization working-tree changes were preserved. No production Supabase/Storage, public News content, specialist profiles, Booking configuration, Hero or Welcome Intro was modified. No commit, push, merge or deployment was performed.
