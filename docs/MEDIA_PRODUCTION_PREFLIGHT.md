# Media Library production activation — fresh preflight

Historical preflight record. The subsequently approved activation completed on 2026-10-10; see [MEDIA_PRODUCTION_ACTIVATION.md](MEDIA_PRODUCTION_ACTIVATION.md) for the executed operations and final state.

2026-10-10 · `feature/admin-media` · project `dcdgrbziounizuigmjcm`

**Recovery verified. Production activation has NOT been performed.** The user's current authorization covers read-only production inspection, an encrypted backup and isolated restoration. Migration 005, bucket creation and Storage policies require the next explicit approval. No clinic content, Auth roles, appointments or production records were written.

## Production baseline

The actual Session Pooler is `aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`, pinned to the expected project identity. The configured Auth project URL matches. PostgreSQL reports 17.6. All diagnostic connections and pg_dump used `sslmode=verify-full`; Go also inspected the verified certificate chain and checked the hostname. Trusted CA SHA-256: `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.

| Migration | Applied at UTC |
| --- | --- |
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |

005 is absent. Its new relation names and six new `cms_media` column names have no conflicts. The five current CMS tables have RLS enabled and no PUBLIC, anonymous or authenticated grants/policies; the existing CMS event sequence also denies browser access. All existing CMS indexes are valid/ready and constraints validated.

| Object/data | Count/result |
| --- | --- |
| CMS documents / revisions / import events | 194 / 194 / 194 |
| Media registry | 12 original records |
| Published content values | 2,198, exact approved manifest equality |
| Public documents / protected Hero references | 192 / 2 |
| Protected media | Hero video and poster, 2 |
| Public services / price categories / price rows / articles | 8 / 6 / 69 / 4 |
| Auth users / identities / user roles | 1 / 1 / 1; admin role preserved |
| Missing/orphan roles or identities | 0 |
| Booking services, doctors, assignments, schedules, time off | All 0 |
| Appointments, appointment events, notification outbox | All 0 |
| Booking settings / settings events | 1 / 1 |
| Confirmation / timezone | automatic / Europe/Riga |
| Storage buckets / objects / policies | 0 / 0 / 0 |

Booking's overlap exclusion constraint remains validated. Booking remains unavailable for real reservations: catalogs/schedules are empty and the privacy notice version is unconfigured.

Compared with the retained post-CMS-import baseline, schema and role names are identical; all public CMS and Booking fingerprints match. Only `auth.users`, `auth.sessions` and `auth.refresh_tokens` fingerprints differ from that older snapshot. This is pre-existing intervening activity, not activity caused by this task; its specific cause was not inferred. The fresh snapshot captures the current values. All **56** source table fingerprints, schema, sequences and role names remained unchanged between this backup's snapshot and its postcheck.

## Verified fresh recovery point

- Encrypted destination: `/Volumes/AG-Dental-Secure`.
- Backing image: `~/Backups/AG-Dental/AG-Dental-Secure.sparsebundle`; APFS, AES-256 encrypted image verified using mounted-image metadata and the public encryption header. The filesystem inside the encrypted image need not report separate APFS encryption.
- Actual directory: `/Volumes/AG-Dental-Secure/AG-Dental-20261010T105049Z-backup`.
- Snapshot capture began: **2026-10-10 10:50:49 UTC**. Later activity is not covered.
- Archive: `database.dump`, PostgreSQL custom format, **591,479 bytes**.
- SHA-256: **`5e678482018417279dad894b9956f76df179b3ea91d0ba14e8f7690cc78f8822`**.
- Owner-only directory permissions 0700 and files 0600. Mounted permissions enforcement and a temporary write/fsync/read probe passed. Credential staging was removed. No password was printed, generated or saved in a command argument.
- Full logical database dump plus separate role definitions without role passwords. Fingerprints and supplementary schema metadata share the exported read-only dump snapshot. Role-global capture is separately read-only.
- Archive TOC parsing and complete offline pg_restore decoding passed.
- Restored **770** selected TOC entries into a unique PostgreSQL 17 container, with `--network=none`, no ports, no Docker logs, read-only archive bind and RAM-only database storage. No production connection or credential was available inside the restore target.
- **52/52 public/Auth/Storage table fingerprints match**, including current CMS data and Auth material. Schema comparison covers 52 tables, 27 functions, 227 constraints, 167 indexes, 13 user triggers, 10 enum types and 15 default-ACL groups. Sequence states and supplementary metadata match.
- Initial literal ACL comparison reported differences. Grant ordering accounted for 23 differences; the remaining CMS sequence had explicit owner grants in the source and PostgreSQL's identical implicit owner defaults after restore. A read-only PostgreSQL `acldefault` comparison proved exact effective equivalence and zero browser/PUBLIC grants. No source or restored grants were repaired or changed. The initial diagnostic is preserved alongside `verification-result.json`, which records the semantic verification.
- Disposable restore container removed; encrypted archive and private evidence retained. `manifest.json` records artifact checksums.

This verifies application/Auth/Storage **database** recovery in standalone PostgreSQL, not a complete hosted Supabase platform reconstruction. The original dump retains provider objects; 114 provider-specific TOC entries (Realtime/Vault/GraphQL/pgbouncer/extension hooks) were explicitly excluded from the standalone rehearsal. All public/Auth/Storage data was included. Source role names were recreated as isolated NOLOGIN placeholders, not as operational Supabase services. Hosted recovery requires a separately reviewed destination-specific procedure and must not blindly replace managed schemas. Project API keys, Auth service configuration and Storage bytes are not included; current Storage objects are empty. Future uploaded bytes require a separate object backup strategy.

## Reviewed activation inputs

| File | SHA-256 |
| --- | --- |
| `backend/migrations/005_cms_media.sql` | `2aa81e0f1e4268dcf52c654bdc45cb845cd9bd0a953214a8208d3a9c4992cce8` |
| `backend/migrations/005_cms_media.down.sql` | `730a63f337bb5bd4399735dcccc23d135002839940239b80ec7832c2303b747a` |
| `backend/storage/cms_media_policies.sql` | `235dbaf6fc1e78ef1ccfed674af5ef1f5a2c53047988e3018ca4a37f661f04fd` |
| `backend/cmd/migrate/main.go` | `392093623611a5f22ccc92ba726cd8b897f3ad74afb4f62a74054ceee7450778` |
| `backend/internal/cms/content.json` | `b8e387b0e13b03cfb8820cc838fd63f552172d228a0ed89abfde0472c918f831` |

Migration/down/policy checksums match the implementation review. Runner and content checksums are pinned here for the next fresh check.

005 is additive: it extends existing registry rows with registered/ready defaults, upload provenance/state/timestamps, unique upload identifiers and an Auth actor reference; adds upload-hash/library indexes; creates `cms_media_references` and `cms_media_events` plus supporting keys/index/identity sequence; enables RLS and revokes browser grants. It does not update CMS payloads or revisions, Auth users/roles, or Booking records. Existing media URLs, IDs, hashes and metadata are retained. Registered rows receive new default fields as explicitly intended by the migration.

Rollback is not automatic. The down migration refuses removal once uploads, references or media events exist. After use, prefer a reviewed forward repair; a coordinated recovery must include Storage objects as well as database state.

## Exact operations proposed for approval — not executed

1. Repeat identity/TLS, checksum, ledger, conflict, backup-accessibility and fresh fingerprint checks. Establish an authorized Supabase management session before starting production activation. If the schema or reviewed files differ, stop. Account explicitly for legitimate activity since the backup snapshot.
2. From the repository's `backend` directory, with the existing private verified-TLS configuration, execute **`go run ./cmd/migrate`**. The pinned runner's manifest is exactly 001–005; ledger 001–004 means only `005_cms_media.sql` executes. The runner also reasserts its existing ledger RLS/grant hardening; no earlier migrations are replayed. No raw migration SQL, fixtures or AutoMigrate.
3. Immediately verify ledger 001–005, seven CMS tables, all six added columns, valid constraints/indexes and denied browser table/column/sequence grants. Compare all pre-existing data fingerprints; compare existing registry fields excluding the six intentional additions. Stop on any error or uncertain commit and inspect state before retrying.
4. Use the supported Storage API or authorized Dashboard to create exactly one bucket. For the Storage API, the operation is `POST https://dcdgrbziounizuigmjcm.supabase.co/storage/v1/bucket` with the following JSON; authenticate only through a private server-side credential. Do not echo the credential or insert Storage metadata directly:

   ```json
   {
     "id": "ag-dental-cms",
     "name": "ag-dental-cms",
     "public": false,
     "file_size_limit": 33554432,
     "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]
   }
   ```

5. Through a management execution path with verified authority, execute the **unchanged** `backend/storage/cms_media_policies.sql` transaction. Its two policies are `ag_cms_no_browser_objects` on `storage.objects` and `ag_cms_no_browser_bucket_changes` on `storage.buckets`: RESTRICTIVE, ALL commands, roles anon/authenticated, with both USING and WITH CHECK excluding only `ag-dental-cms`. Do not create permissive browser policies or change owners/roles/unrelated policies.
6. Run `docs/MEDIA_POST_MIGRATION_VERIFY.sql` and the bound-parameter `docs/CMS_BASELINE_VERIFY.sql`, repeating full existing-field fingerprints and public API checks. Check that both policies are restrictive with exact roles/expressions, the bucket is private with the exact size/MIME values, and no Storage objects were created. Validate effective permissions for anonymous/authenticated roles using read-only catalog/role checks. Actual hosted upload/overwrite/delete behavior remains a separate staging or explicitly approved synthetic-test gate.
7. Keep uploads disabled. Stop and report migration/bucket/policy outcomes and preserved data. Do not deploy a public backend or frontend.

**Management access limitation:** the current PostgreSQL role is non-superuser `postgres` with BYPASSRLS. `storage.buckets` and `storage.objects` are owned by `supabase_storage_admin`, and the connection has no inherited owner role privileges. We have not proved a supported production policy-creation path. Do not assume database connectivity authorizes Storage DDL or bypass this by changing ownership/grants. A project-authorized Dashboard/management capability must be established; stop if Supabase denies it. No privileged Storage key is currently configured in backend/.env. No key was retrieved or exposed in this task. The next approval does not by itself supply missing credentials/access.

Supabase documents that Storage metadata should be manipulated through its API, and that service keys bypass Storage RLS: [Storage schema](https://supabase.com/docs/guides/storage/schema/design), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Backend JWT verification and current database role checks remain mandatory even after restrictive browser policies exist.

## Backend and website readiness

`backend/.env` is ignored by Git and owner-only. This task explicitly added `MEDIA_UPLOADS_ENABLED=false`; all existing connection/Auth values remain unchanged. `SUPABASE_STORAGE_SECRET_KEY` is absent. `ffmpeg`, `ffprobe` and `cwebp` are available locally; production hosting/tool patching and resource limits remain deployment work. No public backend was started or deployed. A temporary loopback test server closed after read-only GET checks.

The current Go public CMS API works against migration 004 with the existing registered content. It returns exactly 192 approved payloads, no Hero/system documents, and working ETag/304 behavior. Admin CMS/Booking requests without JWTs receive 401. Media management tables are not yet available, so do not claim production Media Library activation or hosted Storage verification.

## Checks executed this task

| Check | Result |
| --- | --- |
| Verified TLS, project/ledger/conflicts and CMS manifest comparison | PASS |
| Encrypted pg_dump capture, full archive decode and isolated recovery | VERIFIED as scoped above |
| Post-capture 56 source table fingerprints/schema/roles/sequences | Unchanged |
| Actual Go router, read-only production database | 10 GET checks passed: health, Booking empty/unconfigured states, admin denial, published CMS and cache revalidation |
| `go test ./...` | PASS, cached; opt-in database integration tests were not enabled by this command |
| `node --test frontend/tests/*.test.mjs` | 85 passed, 0 failed/skipped |
| `npm --prefix frontend run build` | PASS; existing large-chunk warning |
| `frontend/tests/missing-api-browser.cjs` | 132 public + 6 unavailable/Auth checks passed; LV/RU/EN, mobile/desktop; no unexpected requests/browser errors |
| `node frontend/scripts/check-hero-lock.mjs` | All 15 approved files match |
| Production hosted Storage write testing | NOT performed; requires staging or separate synthetic-test approval |

Previously recorded local media integration results remain in `MEDIA_LIBRARY_PHASE_3_3.md`; they are not presented as newly executed production tests here.

## Files and next gate

New repository report: `docs/MEDIA_PRODUCTION_PREFLIGHT.md`. Private local configuration change: the explicit disabled upload flag in ignored `backend/.env`. Encrypted backup, fingerprint, restore and manifest artifacts live outside Git at the paths above; credential-free temporary operator helpers/binaries were used under `/tmp`. Existing application changes on `feature/admin-media` were preserved. No application source, Hero, Welcome Intro, content manifest, migration or Storage policy file changed in this activation-preparation task. No commit, merge or push.

**Next action:** obtain explicit approval for only migration 005, the private bucket and the two reviewed restrictive policies, with uploads remaining disabled. Establish the required management access before the first production write. Real Storage verification and later upload enablement remain separate gates.
