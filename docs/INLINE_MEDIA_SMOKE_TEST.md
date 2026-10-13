# Production inline-media smoke test — PASS

> Status clarification — 2026-10-13: Uploads were subsequently enabled for the local backend only under separate authorization; see [local activation](ADMIN_IMAGE_UPLOADS_LOCAL_ACTIVATION.md). The disabled flag below is the final state of this earlier scoped smoke test.

2026-10-12 · `feature/final-development` · AG Dental (`dcdgrbziounizuigmjcm`)

## Authorization and safeguards

Executed only the authorized fresh encrypted backup/isolated restore and one synthetic image upload with exact-asset cleanup. No clinic image, News, Specialist, Booking, Auth, role, policy or migration changes. No deployment, commit, merge or push.

The provided credential is a supported Supabase `sb_secret_` backend secret, authenticated with the `apikey` header by the existing Storage adapter. A read-only bucket request verified the correct project/bucket. The backend `.env` is ignored; scanning tracked working-tree files and frontend source, environment files and build output found no copy of the secret. Credential values were never printed or copied into reports. This is a privileged backend credential, not a bucket-scoped browser credential.

Fresh safety checks verified Session Pooler identity, trusted TLS chain and hostname with `sslmode=verify-full`, ledger exactly 001–007, private bucket `ag-dental-cms`, 33,554,432-byte cap, reviewed MIME allowlist, both restrictive Storage policies, RLS and browser-table grant restrictions. Pre-test data matched the preceding readiness fingerprints.

## Fresh encrypted backup and isolated restore

Directory: `/Volumes/AG-Dental-Secure/AG-Dental-20261012T115618Z-backup`

Archive: `database.dump`

SHA-256: `3a305397e53e1bb54b2d9aa3d2125320c42cb01696afb039405115e489441dcb`

The existing AES-256 sparsebundle was mounted and reported encrypted, with sufficient free space. Capture used a new private directory, read-only repeatable-read snapshot shared by pg_dump and row fingerprints, verified TLS, and separate roles reference without role passwords. Temporary credential staging was removed. Archive/evidence permissions are private; no existing backup was overwritten.

Full archive decoding passed. Isolated PostgreSQL restore used a pinned PostgreSQL 17 image, no network or exposed ports, tmpfs database, disabled Docker logs, no production credentials, and a read-only archive mount. All 57 table row counts/fingerprints, 254 constraints, 182 indexes, 27 functions, 13 user triggers, 10 enum types and 15 default-ACL groups matched. Twenty-three textual ACL differences were ordering only; normalized privileges match. RLS, supplemental checks, sequences and the complete 001–007 ledger passed. Production fingerprints remained unchanged during capture/restore.

The disposable restore container was removed after verification. The archive SHA-256 was verified again after the smoke test. The backup includes database/Auth/Storage metadata, not external object bytes or API secrets. Hosted provider-specific objects remain archived but were explicitly excluded from the standalone restore rehearsal (821 selected TOC entries, 114 exclusions); this is not a claim of full hosted Supabase platform recovery. The snapshot precedes the authorized smoke-test tombstone/audit additions.

## Exact test

A temporary harness compiled the current backend source and used its existing router, JWT verifier, database admin authorization and media handlers. It listened only on `127.0.0.1:58086`. Environment enablement applied to that process only; normal backend configuration remained false.

An additional harness guard permitted one upload attempt containing exactly the generated PNG bytes and filename. All unrelated writes were blocked; archive/delete were allowed only for the ID returned by that upload. The existing authenticated Chrome session supplied its user JWT directly to this loopback backend; it was not extracted into tool output or files. The private Storage secret stayed in the backend process. The temporary operator page did not modify the website implementation or public design and was removed afterward.

- Filename: `ag-dental-smoke-20261012T115618Z.png`
- Image: synthetic 64×64 PNG, 142 bytes, no clinic/patient content.
- Source SHA-256: `6b4872c3b184672a84b174e9e2615f11d4c2b7094db008369e35721ee18055a0`
- Registry ID: `upload.76e953b6a48a51300067390b05581478`
- Storage prefix: `v1/76e953b6a48a51300067390b05581478/`
- Four objects: `original.png`, `display.webp`, `medium.webp`, `thumb.webp`.

| Check | Result |
|---|---|
| Existing administrator authorization | HTTP 200 |
| One actual Go Media upload | HTTP 200; registry ready |
| Actual Storage persistence | Four objects; all variant byte counts match metadata; original hash matches |
| Admin original and optimized image retrieval | HTTP 200 for both |
| Anonymous admin preview | HTTP 401 |
| Unpublished public image route | HTTP 404 |
| Direct public/authenticated Storage paths with publishable key only | Both denied (4xx) |
| CMS and profile references | Zero |
| Archive exact test ID | HTTP 204 |
| Delete exact archived test ID | HTTP 204 |
| Storage after cleanup | Zero objects |

Valid content was decoded and optimized by the actual server pipeline. Invalid MIME/size/path cases were not submitted to production; existing isolated security regressions cover them. No ordinary-user account was created or used for this production smoke test: its restrictions were checked through existing policies/grants and earlier isolated tests, not falsely claimed as a live ordinary-user upload test. Public publication was deliberately not tested in production because that would require content changes.

## Cleanup and preservation

The documented safe cleanup deliberately retains the media record in `deleted` state and four lifecycle events (`upload_started`, `upload_ready`, `archived`, `deleted`). There are no remaining Storage objects, CMS/profile references, or selectable/public test media. No destructive SQL purge was used.

Full 57-table comparison against the fresh snapshot found only:

- `public.cms_media`: 12 → 13 (the one deleted test tombstone).
- `public.cms_media_events`: 0 → 4 (the expected lifecycle audit).

A separate full-row hash excluding the exact test ID verifies that all original 12 media records are unchanged. Every other table fingerprint matches, including Auth/session data, roles, CMS documents/revisions, News, Specialist records, Booking and Storage objects/buckets. Schema is identical. The audit sequence's advancement is expected from the four new events.

The temporary backend exited successfully; no listener remains on port 58086. Its process-only secret and upload-enable environment are gone. The temporary browser page was navigated away from, clearing its in-memory JWT, then removed along with the temporary executable. The normally provisioned backend credential remains in the user's ignored `.env`; it was not deleted or rotated. Final check confirms `MEDIA_UPLOADS_ENABLED=false`.

Private receipts, object verification, full fingerprints, restore evidence and checksums are retained in the encrypted backup directory. No raw patient data or credentials appear in this report.

## Tests and files

`go test ./...` passed for the current backend source. All 15 Hero-lock checks passed before and after. This task made no lasting application-source change and did not rerun the frontend build unnecessarily; the preceding readiness build and isolated suites remain documented separately.

Tracked changes in this turn: this report and an activation-result link in `docs/INLINE_MEDIA_PRODUCTION_READINESS.md`. Temporary frontend HTML/executable were removed. Ignored operator helpers under `backend/.tls/` contain no credential values: `storage-credential-check.go`, `media-smoke-backup-capture.go`, `media-smoke-backup-postcheck.go`, `media-smoke-extra.sql`, `media-smoke-restore.py`, `media-smoke-server.go`, `media-smoke-check.go`, `media-smoke-final-preservation.go`. They preserve existing helpers and restrict this operation to the reviewed project/test asset. All pre-existing unrelated working-tree edits were retained.

## Remaining permanent-activation steps

The actual production Storage transport gate is now verified. Permanent uploads are still disabled and require a separate explicit activation decision. Before ongoing use, confirm backend hosting/HTTPS/CORS, resource limits for decoders, secure temporary storage, secret management, operational monitoring, failed-upload recovery and encrypted backup of future Storage object bytes. Local success does not validate a future deployment's environment or uptime. No permanent enablement, public Booking activation, email integration or deployment was performed.
