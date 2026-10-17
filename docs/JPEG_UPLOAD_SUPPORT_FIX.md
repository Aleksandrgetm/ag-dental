# JPG/JPEG upload support and local runtime correction

2026-10-16 — `feature/remove-section-numbering`

## Findings and root cause

The current source already accepts both `.jpg` and `.jpeg` (case-insensitive), identifies JPEG bytes as `image/jpeg`, normalizes the stored original to `original.jpg`, and creates WebP display variants. Frontend input accept filters and preflight checks also support both extensions. Storage receives the validated server-derived MIME type. No extension/security workaround was needed.

The actual local runtime was stale. The frontend uses `http://localhost:8080/api`, but two old AG Dental binaries were listening:

- PID 31663, `/tmp/ag-catalog-ready-api`, started October 12, listening on IPv4 loopback.
- PID 65973, Go temporary `api` executable, started October 15, listening on IPv6.

Neither binary contained `ValidOptionalAlt` or `UpdateMediaMetadata`. Both predated the October 16 optional-upload-metadata implementation. The old multipart endpoint required all three nonempty descriptions; the new frontend sends empty upload metadata. Consequently a valid JPG can preview locally but be rejected by the stale backend, independently of its extension. Resolving localhost through different address families also selected different old API versions.

The user subsequently supplied the Desktop path for `9015c0599221e0ce58dadc50a822b9a9.jpg`. The exact file is 25,361 bytes, 800 × 566 pixels, with a valid JPEG signature. The current Go processor accepted its actual bytes under both `.jpg` and `.jpeg` names, producing the private original and all three WebP variants with MIME `image/jpeg`. This verifies that the supplied file is not rejected by current extension, signature, dimensions or decoding checks. No Storage calls or uploads were made.

## Correction

Preserved the existing format/signature/security implementation and optional-metadata UX. Built the latest source, revalidated both old PID/executable identities, stopped only those two processes, and started one current local API:

- Executable: `/tmp/ag-jpeg-current-api/api`
- PID at verification: 90216
- Private process files/log: `/tmp/ag-jpeg-current-api/`
- `/api/health`: HTTP 200 through `127.0.0.1`, `localhost`, and `::1`.
- Exactly one listener PID; compiled optional-alt validator and metadata-edit endpoint confirmed present.

No `.env` or upload flag was changed. Startup was inspected: connection, ping and route registration only; no migration/AutoMigrate or record writes. This was a local restart, not hosted deployment. Production-connected checks were health reads only.

## Added regression coverage

- Real processor: `.jpg`, `.jpeg`, `.JPG`, `.JPEG`, and the user's example filename with synthetic JPEG bytes; `image/jpeg` output and `original.jpg` normalization.
- Rejection of non-image bytes renamed JPG, PNG bytes renamed JPG, truncated JPEG signatures and oversized JPEGs.
- HTTP ingestion of PNG/JPG/JPEG/WebP/AVIF without metadata against disposable PostgreSQL, plus JPEG with optional LV-only metadata preserved exactly.
- Frontend preflight: both JPEG extensions, casing and the example filename at 25 KB.
- Real browser/Go/local Supabase Auth/PostgreSQL/Storage: all five formats; JPEG multipart MIME `image/jpeg`, upload without descriptions, private preview, later metadata editing, stale-edit rejection, anonymous/user denial and selection.
- Existing synthetic News publication, public image delivery, replacement, multilingual rendering, unpublish, restore and published/unpublished archival workflows retained.

Identical JPG/JPEG fixture bytes initially triggered correct hash deduplication, preserving earlier metadata. Distinct synthetic fixtures were then used to verify fresh ingestion for both extensions. Deduplication behavior was not weakened.

## Results

- `node --test tests/*.test.mjs`: **157/157 passed**.
- `npm run build`: **passed**; existing bundle-size warning remains.
- `node scripts/check-hero-lock.mjs`: **15/15 passed**, no protected file/hash changes for this task.
- `sh backend/scripts/test-media-local.sh`: **passed**, executing `go test -count=1 -p 1 ./...` with disposable PostgreSQL 17.11, including Auth, Booking, CMS, Media, migrations and server packages.
- `QA_MEDIA_ONLY=1 python3 backend/scripts/acceptance-local.py`: **passed** with real disposable local Auth/Storage and Chrome. Temporary containers, network and credentials removed.
- `git diff --check`: **passed**.

Evidence: `/tmp/ag-jpeg-unit.log`, `/tmp/ag-jpeg-build.log`, `/tmp/ag-jpeg-lock.log`, `/tmp/ag-jpeg-integration.log`, `/tmp/ag-jpeg-browser.log`.

## Exact files changed in this task

1. `backend/internal/media/process_test.go`
2. `backend/internal/cms/media_test.go`
3. `frontend/tests/media.test.mjs`
4. `frontend/tests/media-upload-real-browser.cjs`
5. `docs/JPEG_UPLOAD_SUPPORT_FIX.md`

All pre-existing working-tree changes were preserved. No production Supabase or Storage mutation, clinic-content change, upload, migration, Hero change, Booking change, specialist change, commit, push, merge or deployment occurred.

## Remaining verification

The exact user file passed `TestProvidedJPEGLocalOnly` against the actual current processor (both extensions, 0.67 seconds). The test was supplied through a temporary Go overlay outside Git; the overlay and processor temporary output were removed. The original was not modified or copied into the repository. No database connection or Storage call was involved.

Retry from the existing local admin against the restarted backend. File processing is verified, but no production upload of the user file was attempted. If the UI still fails, the remaining evidence needed is the sanitized HTTP status/error from that attempt.

This runtime correction supersedes the “local backend not restarted” limitation recorded in `MEDIA_UPLOAD_UX_SIMPLIFICATION.md`; that report accurately describes the earlier task.
