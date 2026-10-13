# Local administrator image uploads — 2026-10-12

## Result

Enabled under the user's explicit authorization on `feature/final-development`. Only the ignored local Backend configuration now has `MEDIA_UPLOADS_ENABLED=true`. No production upload, content mutation, migration, deployment or Git commit was performed during this activation.

The current-source Backend is running as PID 19109 at `127.0.0.1:8080`; `/api/health` returns 200. The loopback-only launcher is deliberately narrower than the normal executable's all-interface binding. This PID is session-specific.

## Safety evidence

- Project verified: `dcdgrbziounizuigmjcm`; PostgreSQL Session Pooler connection uses `verify-full`, with verified chain and hostname.
- Ledger: `001_user_roles`, `002_booking_foundation`, `003_automatic_confirmation`, `004_website_cms`, `005_cms_media`, `006_admin_operations`, `007_news_archive`.
- Private bucket `ag-dental-cms`: 33,554,432-byte limit; JPEG, PNG, WebP, AVIF, MP4 and WebM bucket allowlist. Existing restrictive policies were unchanged. The simplified editors accept only JPEG, PNG, WebP and AVIF; this activation does not enable video selection in them.
- Backend supports the provisioned `sb_secret_` credential. A read-only bucket request authenticated successfully. The credential remains in ignored, mode-0600 `backend/.env`, absent from tracked files and frontend source/configuration/build output. No secret is reproduced here.
- Encrypted backup: `/Volumes/AG-Dental-Secure/AG-Dental-20261012T115618Z-backup/database.dump`.
- Verified SHA-256: `3a305397e53e1bb54b2d9aa3d2125320c42cb01696afb039405115e489441dcb`.
- Existing isolated restore result is VERIFIED; prior scoped production smoke result is PASS with zero remaining test Storage objects. See `INLINE_MEDIA_SMOKE_TEST.md`. Its retained deleted registry tombstone and audit records are part of the current baseline.
- Fresh before/after/final read-only fingerprints matched for Auth users, roles, appointments, doctors, services, booking settings, CMS documents/revisions, media/references/events, Storage objects and bucket configuration. Storage policies also matched. Protected Hero references remain unchanged.

## Verification

- Actual authenticated Chrome session: opened News image picker and Specialist portrait picker; both exposed enabled file inputs accepting `.jpg,.jpeg,.png,.webp,.avif`. No file was selected, uploaded, saved or published. Picker was closed afterward.
- Unauthenticated media API request: 401. Health: 200.
- `sh scripts/test-media-local.sh`: all Go packages passed against fresh disposable PostgreSQL, including Auth, Booking, CMS, Media, migrations, database and server. Disposable cluster stopped afterward.
- `specialist-media-browser.cjs`: six locale/viewport cases passed, covering upload gate, protected assets, invalid/video file rejection, preview, failed upload/retry and selection. These browser transport tests use mocks, not production Storage.
- `simple-admin-access-browser.cjs`: 12 unauthorized/ordinary-user/forged-metadata/unavailable-identity cases passed, with zero privileged requests.
- `node --test frontend/tests/media.test.mjs`: 7 passed.
- All 15 Hero locks passed.
- No additional production Storage test was performed. Real Storage persistence evidence comes from the separately authorized prior smoke test, not these mocked tests.

## Exact files changed in this activation

- Ignored `backend/.env`: upload flag only; permissions kept at 0600.
- Ignored `backend/.tls/local-media-api.go`: current API entrypoint with loopback-only listener.
- Ignored `backend/.tls/local-media-start.go`: private local process launcher requiring the expected project and enabled flag.
- This report: `docs/ADMIN_IMAGE_UPLOADS_LOCAL_ACTIVATION.md`.

Existing uncommitted application changes were preserved. No tracked application source was changed for activation. Temporary binary `/tmp/ag-local-media-api` is running; the isolated fixture frontend was stopped. The regular frontend was left available.

## Limitations and hosted requirements

This enables the local Backend only. A hosted Backend still needs an explicitly approved deployment, backend-only secret management, verified database TLS, HTTPS and appropriate frontend API/CORS configuration, image-decoder dependencies/resource limits, temporary disk capacity, monitoring and failed-upload cleanup operations. Database backups do not substitute for a backup of Storage object bytes.

The shared picker still has a generic size/type hint mentioning video formats even though these editors' file inputs and validation are image-only. One open picker disappeared during the live session and reopened successfully; this was not diagnosed in this configuration-only task. Neither observation was treated as proof of an upload failure.

No public Booking configuration was changed. No further production uploads are authorized by this verification task. Hosted deployment and any further production smoke upload require separate approval.
