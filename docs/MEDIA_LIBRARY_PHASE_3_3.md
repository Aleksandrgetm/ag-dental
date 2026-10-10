# Phase 3.3 — Media Library implementation and activation plan

Date: 2026-10-10. Branch: `feature/admin-media`. Local implementation only. No production database, bucket, object or content was changed; nothing was committed or pushed.

## Architecture and audit

The starting tree was clean. The existing CMS has 194 content groups, 2,198 values, 26 route entries and 12 registered assets. The approved manifest, content IDs, translations and revisions are unchanged. The registry contains five ordinary clinic JPEG photographs, the protected Hero video/poster, and five logo/SVG/source references. All are repository assets; none were already externally hosted. Ordinary photographs can be selected; system assets cannot be replaced/deleted through this library. Shared `clinic.media` aliases are used across pages; service/article image fields can instead hold a location-specific reference.

This implementation extends `cms_media`; it does not create a second registry. Migration 005 adds upload state/provenance and two supporting tables, `cms_media_references` and `cms_media_events`. All media references are attached to the existing immutable CMS revisions, including retained history. Existing optimistic version checks, draft/publication pointers and rollback actions remain authoritative.

The dedicated **private** bucket is `ag-dental-cms`. Vue sends files to the Go API after verified JWT/current database administrator checks. The server validates and processes files, reserves a journal entry, and writes immutable `v1/<random-id>/<variant>` objects through Supabase's Storage API. A CMS field holds `cms-media:upload.<id>`, not a user-supplied URL. Public delivery goes through the Go publication gate; no signed bearer URLs or privileged keys reach browsers.

Private buckets protect draft bytes; public buckets would not. Backend secret keys bypass Storage RLS, so server authorization remains essential. See [Supabase bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Implemented employee workflow

- Search and filter by filename, image/video, used/unused and registered/uploaded source. Details show dimensions, size, date where known, localized descriptions, protection and usage.
- Pick or drop one file, preview locally, enter LV/RU/EN descriptions, upload with progress, cancel or retry. Errors remain errors; missing API, bucket or processing configuration does not fabricate success.
- Open a CMS image field, choose **Replace image**, select/upload an ordinary photograph, preview, save a draft and publish separately. Shared aliases require a warning and confirmation; individual fields explain their local scope.
- Publication atomically registers the selected asset as public with the CMS pointer change. Optimized immutable URLs, responsive `srcset` and localized alt text are resolved at runtime, without rebuilding the public site for subsequent replacements.
- Restoring a revision restores its immutable media reference. Archive is limited to unreferenced uploads. Physical deletion is a separate explicit action for archived, never-published assets; registered repository files cannot be deleted here.
- Hero media appear only as protected filename/usage references. No protected thumbnail, video preview, replacement, deletion or CMS mutation is permitted.

## Limits and security

Images: JPEG, PNG, WebP, AVIF, maximum **12 MiB**, 32 million pixels and 12,000 pixels per dimension. The server checks signatures, extension/content agreement, decoder metadata and actual decoding. SVG, HTML, executables and unsupported formats are rejected. WebP derivatives fit within 320, 960 and 1920 pixels without cropping or upscaling. Orientation is normalized by the decoder; public derivatives strip source metadata. Originals remain private and may retain source metadata.

Videos: **32 MiB**, maximum 90 seconds and 3840×2160; MP4 H.264/AAC or WebM VP8/VP9 with Opus/Vorbis. Full decode validation, safe remuxing, metadata stripping and poster derivatives are implemented. There is no general transcoding service. The current approved content model has no ordinary editable video slot: library upload/preview works, but public video assignment is intentionally unavailable. The Hero is never used as such a slot.

Uploads are disabled by default. The API checks JWTs and database roles; reservation/finalization and destructive actions recheck the current role transactionally. Storage paths are server generated, redirects denied, writes non-upserting. Hash duplicates reuse existing assets, retaining their original descriptions. Idempotency keys cannot be reused for different bytes. One processor per API instance, 30 new reservations/hour/admin and a 2,000 active/recent upload ceiling bound use. Upload bodies, decoder time and tool output are bounded; deployment must also impose process/container memory, CPU, disk and concurrency limits.

The reservation journal precedes Storage writes. Partial uploads remain private under a known ID and can be retried against matching immutable bytes. A crashed `processing` reservation has a five-minute lease. Cancellation can race server completion; the UI explicitly advises refreshing. Failed/abandoned records are not silently purged. Deletion and publication/reference attachment share a PostgreSQL advisory lock. Every retained revision is checked, not just the 30 revisions shown by the editor. Storage deletion failure leaves the archive retryable; an uncertain database commit must be inspected before retrying.

Published assets remain accessible at immutable URLs after a rollback; they have already been public and may be cached. This is not a confidential-content recall mechanism. Originals are never public. The library is for clinic website assets, not patient records or medical photographs.

## API

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/admin/cms/media` | Verified administrator; metadata and capabilities |
| POST | `/api/admin/cms/media` | Verified administrator; multipart `file`, `alt` JSON; UUID `Idempotency-Key` |
| GET | `/api/admin/cms/media/:id/:variant` | Verified administrator; private preview, no-store |
| POST | `/api/admin/cms/media/:id/archive` | Verified administrator; reference-safe archive |
| DELETE | `/api/admin/cms/media/:id` | Verified administrator; guarded physical deletion |
| GET | `/api/cms/media/:id/:variant` | Only ready, previously published derivatives; originals denied |

`GET /api/cms/published` includes derivative/alt metadata only for its published content. Existing CMS draft/publish/restore endpoints are reused. Errors use safe structured codes; no decoder diagnostics, credentials or private Storage links are exposed.

## Production activation — approval required, not executed

1. Fresh read-only preflight: confirm project `dcdgrbziounizuigmjcm`, verified TLS, ledger 001–004, unchanged CMS/Auth/Booking fingerprints, no conflicting 005 objects. Review this exact diff and migration checksum. Never infer the live state from the local tests.
2. Obtain a fresh encrypted database backup and verified recovery procedure. The earlier backup does not contain activity after its snapshot. After activation, separately back up Storage **bytes** and registry metadata: a PostgreSQL dump alone is not a media-object backup. Record object checksums and verify an isolated restore.
3. With explicit approval, run the existing runner from `backend`: `go run ./cmd/migrate`. Its reviewed manifest must contain exactly 001–005; the ledger must already contain 001–004, so only `005_cms_media` runs. Do not run raw migration files, fixtures, AutoMigrate or replay earlier migrations against production. If commit outcome is uncertain, inspect ledger/schema before retrying.
4. Create bucket `ag-dental-cms` through the supported Supabase Dashboard/Storage API: **private**, limit **33,554,432 bytes**, MIME allowlist `image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm`. Do not insert/delete `storage.objects` manually. Review existing Storage grants/policies, then apply the separately reviewed `backend/storage/cms_media_policies.sql`. Its restrictive policies affect only this dedicated bucket and deny `anon`/`authenticated` direct access even if broader permissive policies exist. Test both ordinary authenticated and anonymous access before enabling uploads.
5. Deploy the Go backend with supported, patched `ffmpeg`, `ffprobe`, `cwebp` binaries on PATH, non-root execution, private bounded temporary disk, resource limits and outbound HTTPS to this project's Storage endpoint. Configure `SUPABASE_STORAGE_SECRET_KEY` only in the backend secret manager, existing `SUPABASE_URL`, existing verified PostgreSQL TLS settings, and `MEDIA_UPLOADS_ENABLED=false`. Never use a `VITE_` variable for the secret. No secret is added to local `.env` by this task.
6. Verify backend hosting, CORS allowlist/Authorization/Idempotency-Key handling, TLS and reverse-proxy body/time limits. Backend upload deadline is 120 seconds, server read/write timeouts 125/150 seconds. Vercel frontend deployment does **not** deploy Go or its processing tools. Public media depends on the hosted Go origin; a localhost API URL is unsuitable for deployed users.
7. Run the read-only queries in `docs/MEDIA_POST_MIGRATION_VERIFY.sql`. On a disposable staging project, verify Storage private ACLs, successful actual upload, draft privacy, publish, public derivative bytes, rollback and deletion with synthetic nonclinical assets. The local Storage mocks are not proof of the hosted Storage configuration.
8. Only after explicit activation approval and successful hosting/security verification, set `MEDIA_UPLOADS_ENABLED=true`. Verify capability response and a separately authorized nonclinical upload. Do not edit real clinic content for a smoke test. Publishing the frontend once installs runtime delivery; subsequent CMS image changes need no rebuild.

## Recovery and hosting implications

Disable uploads to stop new writes; keep read delivery and the current media-aware backend available so already-published references continue working. Restore previous CMS revisions for content recovery. Do not deploy an old media-unaware backend after references have been published.

The down migration refuses to remove the extension once any upload, reference or audit data exists. It is suitable only for an unused installation and is never run automatically. Used installations require a reviewed forward repair or an isolated coordinated database/object restore. Do not delete objects referenced by history to reduce storage costs.

Go proxies both Storage ingress and media delivery, so plan backend bandwidth and Storage egress as well as disk costs for originals plus variants. Use a CDN only for the public derivative route; never cache authenticated previews. Standard server uploads retry the whole file. Supabase recommends resumable transfers for larger uploads; TUS/resumable uploads, background transcoding, bulk uploads/deletion and automatic garbage collection are deferred. See [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## Validation and artifacts

Results and the exact changed-file inventory are recorded below after the final verification run. Browser writes use synthetic intercepted APIs. PostgreSQL integration uses a new loopback-only PostgreSQL 17 container with separate disposable databases; Storage is an in-memory test implementation plus an HTTP contract server. No automated write test uses production Supabase. A real hosted Supabase Storage end-to-end activation test remains a deployment gate.

### Final test results

| Check | Result |
| --- | --- |
| Frontend production build (`npm --prefix frontend run build`) | PASS: Vue/TypeScript and Vite; bundle-size warning remains |
| Frontend unit suites (`node --test frontend/tests/*.test.mjs`) | 85 passed, zero failures/skips |
| Media browser | 45 checks passed: all 12 asset details; 24 language/width combinations; invalid upload, progress, failure/retry, cancellation, replacement, draft preview, publication, public image/alt and rollback |
| Existing CMS browser | 214 passed |
| Persistent CMS navigation | 45 passed |
| Admin authorization, layouts, dashboard/security | 299 passed |
| Auth browser | 96 layouts plus registration/login/session/logout/recovery/confirmation flows passed |
| Booking browser | 172 layout checks and 31 flows passed, mocked API mode |
| Public routes | 20 routes × 3 languages × 2 widths = 120 passed |
| Missing-API production build/browser | 132 public checks and 6 unavailable/Auth checks passed; no unexpected requests |
| Hero locks | All 15 approved files match |
| CMS export parity | 194 groups, 2,198 values, 26 routes, 12 registered assets unchanged |
| `go test ./...` | PASS; unconfigured opt-in DB tests skip in this ordinary run |
| `backend/scripts/test-media-local.sh` | PASS: all opt-in Auth, Booking, CMS, Media and migration suites executed against fresh disposable PostgreSQL **17.11**, not production; no integration skip substituted for success |
| Storage HTTP contract + real format processing | PASS: private-bucket enforcement, immutable retries, unsafe paths; actual JPEG/PNG/WebP/AVIF/MP4/WebM decode/derivatives; unsupported codec/signature, dimensions/size, metadata and output bounds |
| Whitespace | `git diff --check` passed |

Media integration exercises verified-admin upload, invalid input, key conflicts, partial Storage success, repeat recovery, private preview, draft/public/history reference protection, publication, original-download denial, rollback, protected Hero rejection, archive/purge failure/retry, role revocation, browser grants/RLS and unchanged Booking catalogs. Full Booking integration includes existing collision/DST and administration safeguards. `/api/health` remains covered by the existing server tests.

All browser network traffic is local/intercepted and uses synthetic accounts/data. Real Supabase Storage, production credentials, buckets and production upload/publish workflows were **not** exercised. This is an explicit activation limitation, not a passed deployment test. Browser coverage uses Chromium/Chrome; device-native mobile pickers and other browser engines remain deployment QA items.

The final media UI was inspected visually at desktop and mobile sizes. The 320, 375, 390, 430, 768, 1024, 1440 and 1920 pixel layouts have no horizontal overflow in LV/RU/EN. File listings show usage locations and upload dates where known; thumbnails load in batches of 24. Hero previews are absent.

### Screenshots

- [Desktop library — EN](screenshots/media-phase-3-3/en-1440-library.png)
- [Mobile library — LV](screenshots/media-phase-3-3/lv-390-library.png)
- [Mobile library — RU](screenshots/media-phase-3-3/ru-390-library.png)
- [Upload workflow — EN](screenshots/media-phase-3-3/en-1440-upload.png)

### Review checksums

- `backend/migrations/005_cms_media.sql`: `2aa81e0f1e4268dcf52c654bdc45cb845cd9bd0a953214a8208d3a9c4992cce8`
- `backend/migrations/005_cms_media.down.sql`: `730a63f337bb5bd4399735dcccc23d135002839940239b80ec7832c2303b747a`
- `backend/storage/cms_media_policies.sql`: `235dbaf6fc1e78ef1ccfed674af5ef1f5a2c53047988e3018ca4a37f661f04fd`

### Exact files changed

This inventory includes new files and screenshots. No protected Hero/Welcome asset, public stylesheet, Header, Auth implementation, Booking implementation, dependency manifest/lockfile, `.env` or production connection file changed. Public component changes are runtime media URL/alt/responsive-delivery wiring and preserve the existing frames and design.

- `backend/.env.example`
- `backend/cmd/api/main.go`
- `backend/cmd/migrate/main.go`
- `backend/cmd/migrate/main_test.go`
- `backend/internal/cms/content.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/media_http.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/media_test.go`
- `backend/internal/cms/store.go`
- `backend/internal/media/process.go`
- `backend/internal/media/process_test.go`
- `backend/internal/media/registered.go`
- `backend/internal/media/registered_dimensions.json`
- `backend/internal/media/storage.go`
- `backend/internal/media/storage_test.go`
- `backend/internal/media/testdata/still.avif`
- `backend/internal/media/types.go`
- `backend/internal/server/router.go`
- `backend/migrations/005_cms_media.down.sql`
- `backend/migrations/005_cms_media.sql`
- `backend/scripts/test-media-local.sh`
- `backend/storage/cms_media_policies.sql`
- `docs/MEDIA_LIBRARY_PHASE_3_3.md`
- `docs/MEDIA_POST_MIGRATION_VERIFY.sql`
- `docs/screenshots/media-phase-3-3/en-1440-library.png`
- `docs/screenshots/media-phase-3-3/en-1440-upload.png`
- `docs/screenshots/media-phase-3-3/lv-390-library.png`
- `docs/screenshots/media-phase-3-3/ru-390-library.png`
- `frontend/src/components/admin/CmsNavigator.vue`
- `frontend/src/components/admin/MediaLibrary.vue`
- `frontend/src/components/home/ClinicGallery.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/i18n/media.ts`
- `frontend/src/main.ts`
- `frontend/src/services/cms/catalog.ts`
- `frontend/src/services/cms/content.ts`
- `frontend/src/services/cms/media.ts`
- `frontend/src/services/cms/mediaModel.ts`
- `frontend/src/services/cms/mediaPreviewCache.ts`
- `frontend/src/services/cms/mediaReference.ts`
- `frontend/src/services/cms/navigation.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/src/views/admin/AdminCmsView.vue`
- `frontend/tests/admin-browser.cjs`
- `frontend/tests/cms-browser.cjs`
- `frontend/tests/helpers/cms-fixture.cjs`
- `frontend/tests/media-browser.cjs`
- `frontend/tests/media.test.mjs`

### Recommended next action

Review this diff, migration 005, private-bucket policies and deployment gates. After explicit approval, perform a fresh production readiness/backup review and provision a disposable Supabase Storage staging environment for actual hosted Storage verification. Do not activate production uploads merely by deploying Vercel. No further production action is authorized or performed by this implementation.
