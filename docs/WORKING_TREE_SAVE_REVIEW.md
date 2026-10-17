# Working-tree save review — 2026-10-17

Source branch: `feature/remove-section-numbering`.
Reviewed starting HEAD: `f3e4d2be36c8291f63a6c78bd1202885e7db1abe` (same as fetched `origin/feature/clinic-photography`). No staged changes existed at the start. The source branch had no remote branch yet.

## Scope and preservation

All changed and untracked files were inspected. Completed public numbering/localization/layout and Media/News persistence work is grouped by whole-file boundaries below: HomeView, ArticleView and NewsView contain overlapping approved tasks, so they are kept together rather than manufacturing partial intermediate versions.

The obsolete, untracked `docs/MOBILE_HERO_CLEANUP_PROPOSED.patch` is excluded and preserved locally. No debug captures, original media, private credentials, backups or temporary artifacts are included. Existing `.env` files remain ignored. Candidate scan found no private-key/token patterns, database connection strings, or matches to local privileged environment credentials; only paths/counts were reported. Test credentials are generated dynamically for disposable environments.

Hero component/video/iOS initialization, Welcome Intro, Booking code/configuration and production data remain unchanged. The only protected-source diff is the previously explicitly approved numbering-only style.css change; its existing approved lock hash and invariant test are retained. No new protected baseline changes were made during this save task.

## Fresh verification

- Frontend production build: passed; existing large-chunk advisory remains.
- Frontend unit tests: 157 passed, zero failed/skipped.
- Disposable PostgreSQL Go tests: all packages passed, including Auth, Booking, CMS, Media, migration runner and server.
- Real isolated Auth/PostgreSQL/Storage browser tests: passed for metadata-free PNG/JPG/JPEG/WebP/AVIF uploads, optional metadata edits, authorization, imported News image persistence and A→B replacement, homepage/detail rendering, text-only listing, new News publication/replacement/archive/restore. Containers, network and temporary credentials removed.
- Homepage News: 12 fallback/CMS locale/viewport cases passed, including live language switching and listing/detail text consistency.
- Text-only News listing: 15 LV/RU/EN × 320/375/390/768/1440 cases passed.
- Inline News media picker: six localized desktop/mobile cases passed (mocked transport).
- Specialist media picker: six localized desktop/mobile cases passed (mocked transport, no real profile writes).
- News validation: six localized desktop/mobile error/focus/data-preservation cases passed.
- Public numbering/navigation: 84 route/locale/viewport cases passed, including service alignment, mobile navigation and preserved functional numbers.
- All 15 Hero locks passed; whitespace validation passed.

All browser results are local Chromium/responsive emulation, not fresh physical-device acceptance. No production upload, migration or record write was performed.

## Deployment safety

`frontend/vercel.json` now explicitly sets `git.deploymentEnabled["feature/remove-section-numbering"]` to false. The exact-map guard test passes. No competing true/wildcard rule or repository GitHub Actions deployment workflow was found. This uses the existing frontend project configuration and the [documented Vercel branch-disable mechanism](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled). Only this source branch is authorized for push; the new Team/Booking branch is local only and must receive its own deployment review before any future push.

## Exact commit file manifests

### refactor(ui): remove numbering and synchronize public News

- `docs/HERO_LOCK.json`
- `docs/SECTION_NUMBERING_REMOVAL.md`
- `docs/HOMEPAGE_NEWS_LOCALIZATION.md`
- `docs/CMS_NEWS_IMAGE_MISMATCH_FIX.md`
- `frontend/src/components/home/PatientJourney.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/components/layout/SiteHeader.vue`
- `frontend/src/style.css`
- `frontend/src/styles/editorial.css`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/PricesView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/src/composables/usePublicNews.ts`
- `frontend/src/services/cms/newsImage.ts`
- `frontend/tests/hero-modes.test.mjs`
- `frontend/tests/section-numbering-browser.cjs`
- `frontend/tests/home-news-localization-browser.cjs`
- `frontend/tests/news-text-listing-browser.cjs`

### fix(media): simplify uploads and preserve News image references

- `backend/internal/cms/http.go`
- `backend/internal/cms/media_http.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/media_test.go`
- `backend/internal/cms/validation.go`
- `backend/internal/media/process.go`
- `backend/internal/media/process_test.go`
- `backend/internal/media/types.go`
- `backend/scripts/acceptance-local.py`
- `frontend/src/components/admin/MediaLibrary.vue`
- `frontend/src/i18n/media.ts`
- `frontend/src/i18n/newsAdmin.ts`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/services/cms/media.ts`
- `frontend/src/services/cms/mediaModel.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/tests/acceptance-workflows.cjs`
- `frontend/tests/helpers/cms-fixture.cjs`
- `frontend/tests/helpers/news-real-workflow.cjs`
- `frontend/tests/media-browser.cjs`
- `frontend/tests/media.test.mjs`
- `frontend/tests/news-validation-browser.cjs`
- `frontend/tests/specialist-media-browser.cjs`
- `frontend/tests/helpers/news-image-association.cjs`
- `frontend/tests/media-upload-real-browser.cjs`
- `docs/JPEG_UPLOAD_SUPPORT_FIX.md`
- `docs/MEDIA_UPLOAD_UX_SIMPLIFICATION.md`
- `docs/NEWS_FEATURED_IMAGE_SAVE_FIX.md`

### chore(ci): guard review branch deployments and record verification

- `frontend/vercel.json`
- `frontend/tests/deployment-guard.test.mjs`
- `docs/WORKING_TREE_SAVE_REVIEW.md`

## Remaining work

No Team/Booking implementation starts in this task. Remaining clinic/hosting activation decisions are unchanged. The old Hero proposal remains untracked and is not applied. Commit hashes and verified remote/new-branch HEAD are reported in the final task response.
