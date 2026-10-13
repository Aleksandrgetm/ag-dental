# Inline Media — Production Readiness

> Status clarification — 2026-10-13: The missing-credential and smoke-test gates below were subsequently completed. [Production smoke evidence](INLINE_MEDIA_SMOKE_TEST.md) and [local-only upload activation](ADMIN_IMAGE_UPLOADS_LOCAL_ACTIVATION.md) record those separately authorized operations. Hosted upload deployment is not activated by these reports.

2026-10-12 · `feature/final-development` · AG Dental

## Decision

**Local inline image functionality is ready for a separately authorized production smoke test. Production upload activation remains BLOCKED** by the absent backend Storage credential and unperformed hosted Storage write verification. `MEDIA_UPLOADS_ENABLED=false` remains unchanged. No production writes, migrations, uploads, content edits, deployment or Git history operations were performed.

## 1. Implementation review

News and Specialist editors use the existing in-editor image picker. There is no separate Media Library navigation section. A local file selection produces a blob preview; XHR reports transfer progress, followed by a processing state. The employee supplies LV/RU/EN alternative descriptions, uploads, selects the resulting image, then publishes News or saves the Specialist. Uploading alone does not publish content. Replacing an image selects a new immutable media reference; old revision/profile-history references remain protected.

Existing registered photographs remain selectable; protected Hero video/poster are excluded. Picker mode hides technical usage paths and media management controls. Originals remain private. Public image variants are delivered by the Go API only when publication rules permit; the Storage bucket is not public.

Server processing checks signatures and decodes the file, bounds bytes/dimensions, uses private temporary files, and produces aspect-preserving WebP variants (maximum 1920, 960 and 320 pixels; quality 82). Public derivatives strip metadata. Original bytes can contain metadata and remain private. Image limit is 12 MiB; video infrastructure limit is 32 MiB. Photo pickers accept JPEG, PNG, WebP and AVIF only.

### Defects fixed

1. The picker input's `accept` attribute excluded video, but the shared validation still accepted MP4/WebM. Drag/drop or file-input override could upload an unusable video from a photo-only editor. Added explicit image-only validation when `picker=true`; general media validation remains unchanged.
2. Rejecting an invalid replacement left the previously selected file and preview active. The picker now clears the stale file, blob URL and upload key on invalid selection, preventing an unintended old-file upload.

No backend, Auth, Booking, public-design or authorization behavior was changed.

## 2. Fresh production read-only verification

Verified the configured project reference `dcdgrbziounizuigmjcm`, matching Supabase URL and Session Pooler identity. PostgreSQL uses `sslmode=verify-full`, trusted verified certificate chain and matching hostname. Checks ran in a read-only, repeatable-read transaction. Credentials were never printed.

Ledger is exactly:

1. `001_user_roles`
2. `002_booking_foundation`
3. `003_automatic_confirmation`
4. `004_website_cms`
5. `005_cms_media`
6. `006_admin_operations`
7. `007_news_archive`

Bucket `ag-dental-cms`: private; 33,554,432-byte maximum; allowed MIME types `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/webm`. Zero Storage objects.

Exactly the two reviewed RESTRICTIVE/ALL policies target anon/authenticated: `ag_cms_no_browser_objects` excludes this bucket for USING/WITH CHECK, and `ag_cms_no_browser_bucket_changes` excludes its bucket row. RLS is enabled on Storage objects/buckets and all three media tables. Anon/authenticated have no INSERT/UPDATE/DELETE grants on media tables. No policies were changed. Catalog checks are not a claim of hosted upload success.

Current production baseline contains 195 CMS documents, 195 revisions, 12 registered media records, zero media events/references, one Auth user, one role, one doctor, zero services and zero appointments. These are current observed counts, not an assumption that the historical 194-document import is the whole current database. Both Hero assets remain protected/registered/ready.

Before/after full-row digests and counts match for Auth users, user roles, appointments, doctors, services, booking settings, CMS documents/revisions, media/refs/events and Storage buckets/objects. No existing data changed during these checks.

Required backend configuration: `SUPABASE_URL`, verified `DATABASE_URL`, existing Auth verifier configuration, `SUPABASE_STORAGE_SECRET_KEY`, and processing tools `ffmpeg`, `ffprobe`, `cwebp`. All three tools exist locally. **The Storage secret is absent.** The implementation supports backend-only `sb_secret_...` keys or legacy service-role JWTs; rejects publishable keys and non-HTTPS Storage URLs; never follows redirects carrying credentials. No credential was provisioned or retrieved.

## 3. Security and lifecycle

- All Media admin routes require verified JWT and server-side admin role. Database writes recheck the role.
- Uploads are explicitly gated; one processing request per server, rate/quota controls, bounded request sizes and decoder execution.
- Content sniffing and actual decode supplement extension checks; SVG/executable/oversized content rejected.
- Filenames are normalized; object paths use random server-generated IDs and a fixed variant allowlist. No caller-selected Storage paths or upsert.
- Upload keys/source hashes support idempotent retries. Existing immutable object bytes are checked after uncertain Storage outcomes.
- Failed uploads are marked failed; partially uploaded private objects remain associated with that registry record and can be retried safely. This is quarantine/retry, not automatic immediate deletion. Unreferenced failed/ready assets can be archived and explicitly removed through the guarded API. A process crash may leave processing state until the five-minute stale-retry recovery. No background orphan-cleanup service is claimed.
- Historical CMS and doctor-profile references block archive/deletion. Publication, reference changes and deletion use the existing serialization safeguards.
- Original private bytes and unpublished variants are not anonymously delivered. Protected Hero assets cannot be selected, replaced or deleted through this flow.
- Decoder subprocesses receive no database/Auth/Storage secrets. Hosting still needs CPU/memory/process limits, secure temp storage, HTTPS and secret management.

## 4. Tests

Commands executed:

- `npm run build` — passed; existing large-chunk warning only.
- `node --test tests/*.test.mjs` — 112 passed.
- `sh backend/scripts/test-media-local.sh` (from repository root with equivalent script path) — all Go packages passed against newly created disposable PostgreSQL databases, including Auth, Booking, CMS, Media, migrations and operations. This runs `go test -count=1 -p 1 ./...`; database tests were actually executed, not merely skipped.
- `python3 backend/scripts/acceptance-local.py` with local Playwright module — real local Supabase Auth, PostgreSQL and Storage; browser network restricted to loopback; no production environment loaded. Synthetic credentials/files and disposable services are removed on exit.
- `specialist-media-browser.cjs` — six LV/RU/EN × 390/1440 cases passed: disabled state, Hero exclusion, SVG/video rejection, stale-selection clearing, preview, retry with same key and selection. These transport tests are mocked and are identified as such.
- All 15 Hero-lock checks passed.

Expanded isolated browser coverage adds portrait file selection → preview → actual upload → save → replacement → persisted portrait after navigation/reload → 409 protection of old historical reference. News covers actual upload, duplicate-image reuse, publish, public image loading in LV/RU/EN, replacement, revision protection, article archive/restoration and removal from public delivery. Separate synthetic unreferenced media verifies preview, unpublished denial, archive and actual object deletion. Security checks cover JWT tampering, ordinary-user/anonymous denials, direct Storage list/read/write/overwrite/delete denials, limits and private originals.

Test-harness corrections: preserve `?lang=en` on Specialist reload before looking for an English tab, and accept the existing duplicate-upload message when News reuses a synthetic portrait image. Neither required application behavior changes.

Legacy `media-browser.cjs` failed because it still navigates to the removed `/admin/media` and service-editor routes; the redirect reaches an appointments API not implemented in that old fixture. It is not reported as passing. The current inline picker and real integration workflows replace its relevant coverage; restoring that obsolete navigation would violate the simplified admin requirement.

Final real-browser and Auth rerun results are recorded below after completion.

## 5. Scoped production smoke-test plan — NOT EXECUTED

Separate approval must cover **one synthetic image upload plus its generated derivatives and media registry/audit writes**, temporary process-only upload enablement, and cleanup. This is not permission to edit/publish any News or Specialist.

1. Securely provision the correct project's backend-only Storage secret using a local ignored environment/secret manager. Do not send it through chat or put it in Vite. Supabase backend secret/service-role credentials are privileged; do not claim they are bucket-scoped. Limit operational use to the verified `ag-dental-cms` bucket. Use the existing verified administrator JWT for the Go API, never a frontend role assertion.
2. Recheck project, verify-full, 001–007 ledger, private bucket/policies, disabled main backend and before fingerprints. Confirm no concurrent clinic editing during the short test. Review current recovery evidence. Stop on unexplained drift.
3. Start a separate current-source backend through a reviewed operator harness using the existing server constructor and an explicit `127.0.0.1:<unused-port>` listener (the normal CLI currently listens on all interfaces, so do not use it directly for this test); inject `MEDIA_UPLOADS_ENABLED=true` into that process only, with its required processing tools. Do not edit `.env`, restart the employee-facing backend with uploads enabled, or deploy. Close the process in a guaranteed cleanup/finally path.
4. Generate ONE nonclinical solid-color PNG, e.g. 800×800, named `ag-dental-smoke-YYYYMMDDTHHMMSSZ.png`, with synthetic LV/RU/EN alt text. Record SHA-256 and a fresh upload idempotency UUID. No people, patient data, embedded metadata or clinic imagery.
5. POST once through `/api/admin/cms/media`, authenticated as the existing admin. Let the backend generate `upload.<32-hex>`; expected Storage prefix is `v1/<32-hex>/`. Expected files: `original.png`, `display.webp`, `medium.webp`, `thumb.webp`. Do not force an arbitrary object key or overwrite a registered asset.
6. Verify ready state, dimensions/types, optimized byte integrity and authorized previews. Verify anonymous/ordinary-user preview denials and direct Storage list/read restrictions using read-only requests. Verify public `/api/cms/media/:id/display.webp` remains unavailable because the image is unreferenced/unpublished. Do not attach it to existing content. No production public-publication smoke test is included; that remains covered in isolation.
7. Confirm zero CMS/profile references and that the ID/prefix belongs only to this test. Archive through the admin API, then explicitly DELETE that one archived asset. Verify its four Storage objects are absent. Preserve the expected deleted registry tombstone and audit events rather than destructive SQL cleanup. Do not change existing media rows.
8. Compare preservation fingerprints for all pre-existing Auth/Booking/CMS/media records and bucket policies. New test media/audit rows are the only expected database additions. Stop the temporary backend and verify normal configuration still has uploads disabled.
9. If request/commit outcome is uncertain, inspect by the recorded upload key/ID and compare immutable bytes before retrying. Never issue a second random upload or delete unknown prefixes. If partial upload/cleanup fails, stop, disable the temporary process, retain the exact private test ID and report the residue; seek approval for any recovery beyond the scoped API cleanup.

This test cannot validate a future hosted backend's routing, CORS, resource limits or uptime. No paid services or deployment are included. Encrypted backup/restore coverage for future object bytes is a separate operational requirement; database backups alone do not contain them.

## 6. Files changed in this task

Application:
- `frontend/src/components/admin/MediaLibrary.vue` — image-only picker check and clear rejected stale selection.
- `frontend/src/services/cms/mediaModel.ts` — optional image-only validation.

Tests:
- `frontend/tests/media.test.mjs` — image-only validation regression.
- `frontend/tests/specialist-media-browser.cjs` — invalid replacement and six locale/viewport cases.
- `frontend/tests/acceptance-workflows.cjs` — real portrait upload/replacement/history protection.
- `frontend/tests/helpers/news-real-workflow.cjs` — duplicate-upload result assertion.

Evidence:
- `docs/INLINE_MEDIA_PRODUCTION_READINESS.md` — this report.
- `docs/FINAL_E2E_EVIDENCE.json` and regenerated synthetic `docs/screenshots/final-e2e/*` artifacts listed in the completion appendix.

Local ignored diagnostic: `backend/.tls/inline-readiness.go` (strict read-only queries; contains no credentials). Sanitized snapshots/test logs are under `/tmp/ag-inline-*`. Existing unrelated working-tree edits were preserved.

## 7. Remaining activation gates

Backend Storage credential provisioning; explicit scoped-smoke approval; successful hosted test/cleanup; then separate approval for ongoing uploads. Do not enable production uploads based on isolated success alone. No public Booking, email, Hero, Welcome Intro, public-design or database configuration changes were made.

## Completion appendix

Final isolated real-browser run **PASS**, including new portrait workflow, News uploads/publication/replacement/archive, Storage cleanup, real Auth/admin security, Booking collisions and 48 public route/locale/viewport checks. All disposable services and private credentials were removed by the harness. Expected `permission denied for table appointments` output came from deliberate browser-role denial tests.

Final Auth browser run: **96 checks PASS**. Current simplified Admin authorization: **12 cases PASS**, zero privileged requests for unauthorized identities. News/CMS locale/viewport deletion regressions: **12 cases PASS**. An earlier Auth attempt timed out at an account menu while source edits/HMR were occurring; the unchanged final source rerun passed. It is recorded rather than silently discarded.

Generated tracked screenshot changes from the full acceptance harness: `docs/screenshots/final-e2e/appointment-details.png`, `calendar-populated.png`, `public-home-1440.png`, `public-home-390.png`, `specialist-schedule.png`. These contain synthetic/local test state and are evidence artifacts, not public application modifications. Exact integration invocation was `sh scripts/test-media-local.sh` from `backend/`.

Final build and 112 unit tests passed; all 15 Hero locks passed again; changed application/test files passed whitespace validation. Production still has uploads disabled and no Storage secret, and before/after production fingerprints match.

## Authorized production smoke follow-up — 2026-10-12

The backend credential was securely provisioned by the user. A new encrypted backup containing migration 007 was restored and verified, and the separately authorized one-image production Storage test and exact-asset cleanup passed. See [INLINE_MEDIA_SMOKE_TEST.md](INLINE_MEDIA_SMOKE_TEST.md) for the archive checksum, HTTP results, expected retained audit/tombstone metadata and preservation evidence. Earlier missing-credential/untested-Storage statements above are historical. Permanent uploads remain disabled and require separate approval.
