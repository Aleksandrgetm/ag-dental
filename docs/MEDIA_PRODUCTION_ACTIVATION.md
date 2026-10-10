# Media Library — production infrastructure activated

2026-10-10 · `feature/admin-media` · AG Dental · `dcdgrbziounizuigmjcm`

The user explicitly approved only migration 005, the private bucket with its exact limits, the two reviewed restrictive policies and read-only verification. All completed successfully. **Uploads remain disabled. No files were uploaded.** No backend/frontend deployment, content edits, role changes, commit, merge, push or rollback occurred.

## Fresh safety checks

- Correct project confirmed both through the authenticated Supabase Dashboard and the existing PostgreSQL Session Pooler configuration.
- `sslmode=verify-full` used; trusted certificate chain and pooler hostname verified independently in Go.
- Ledger was exactly 001–004 before writes. New media table/column names were absent; all 56 table fingerprints and the schema matched the fresh approved baseline.
- Encrypted volume remained mounted. Backup archive and VERIFIED restore evidence were accessible. Archive SHA-256 matched `5e678482018417279dad894b9956f76df179b3ea91d0ba14e8f7690cc78f8822` at `/Volumes/AG-Dental-Secure/AG-Dental-20261010T105049Z-backup/database.dump`.
- Migration, policy and runner checksums matched `MEDIA_PRODUCTION_PREFLIGHT.md`. Existing `.env` still specifies `MEDIA_UPLOADS_ENABLED=false`.

The management-authority question from preflight was resolved before migration. Read-only Dashboard queries showed `postgres` is a member of `supabase_privileged_role`, and `supautils.policy_grants` explicitly delegates policy DDL on both `storage.objects` and `storage.buckets` to `postgres`. This is Supabase's supported mechanism for non-owner policy management, documented in [supautils](https://github.com/supabase/supautils). No ownership, memberships, role attributes or server settings were changed. The same delegation was checked on the verified-TLS connection immediately before policy execution. Dashboard policy previews were discarded without saving; no temporary policy was created.

## Migration result

Executed the existing reviewed runner from `backend`: `go run ./cmd/migrate`.

It skipped already-recorded 001–004 and applied only **005_cms_media**. The runner's existing migration-ledger hardening was reasserted without altering prior ledger rows. Immediate read-only verification passed before bucket creation.

| Version | Applied at UTC |
| --- | --- |
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |
| 005_cms_media | 2026-10-10 11:00:43.465901 |

The database now has seven CMS tables. `cms_media_references` and `cms_media_events` are new, with the event identity sequence. The existing registry gained the six reviewed columns and upload/library indexes. All relevant constraints are validated and indexes valid/ready. All three media tables have RLS; browser/PUBLIC table and column privileges are absent, including on the new event sequence. Sequences do not have RLS themselves; their grants enforce access.

The 12 existing registry rows have the migration's intended `origin=registered`, `state=ready` and timestamp defaults. Their original IDs, URLs, source hashes, metadata, protection flags and creation times are unchanged. No upload keys, actor references or publication values were assigned. This intentional schema/default extension is distinct from editing any original media record content.

## Storage result

Created through the authenticated project Dashboard's supported Storage workflow:

| Setting | Verified value |
| --- | --- |
| Bucket ID/name | `ag-dental-cms` |
| Public | `false` — private |
| File-size limit | **33,554,432 bytes** |
| MIME allowlist | `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/webm` |
| Objects | **0** |

The creation form used bytes explicitly, avoiding decimal/binary size ambiguity; PostgreSQL verification confirmed the exact integer. No global Storage setting was changed.

Applied the unchanged `backend/storage/cms_media_policies.sql` as its own transaction through the verified-TLS connection and Supabase's existing policy delegation. The operator rechecked its SHA-256, ledger, exact private bucket configuration, empty objects and absence of pre-existing policies before executing it. The transaction completed successfully and the connection returned to read-only mode. No privileged API credential was retrieved or exposed.

| Policy | Table | Verified behavior |
| --- | --- | --- |
| `ag_cms_no_browser_objects` | `storage.objects` | RESTRICTIVE, ALL, anon/authenticated; USING and WITH CHECK both `bucket_id <> 'ag-dental-cms'` |
| `ag_cms_no_browser_bucket_changes` | `storage.buckets` | RESTRICTIVE, ALL, anon/authenticated; USING and WITH CHECK both `id <> 'ag-dental-cms'` |

Exactly these two policies exist. Storage RLS remains enabled; anonymous and authenticated roles have neither superuser nor BYPASSRLS. Read-only transactions using each role returned zero visible bucket/object rows. The catalog confirms the reviewed guards cover reads, inserts, updates and deletes. No production write was attempted under a browser role to test denial, and no actual upload/overwrite/delete test was performed. Hosted HTTP behavior with real object bytes remains a separate gate; this report does not equate catalog checks with an upload end-to-end test.

## Preservation and verification

- 194 documents, 194 revisions and 194 original import events unchanged.
- 12 original media records preserved, including protected Hero video/poster.
- All 2,198 scalar content values match the approved manifest exactly; no price, article, translation or service discrepancy.
- 192 public documents and two excluded system/Hero references preserved.
- Auth user, identity, session/token data and user-role fingerprints unchanged throughout activation; one user, one identity, one admin role.
- All Booking table fingerprints unchanged; no doctors, services, schedules or appointments created. Automatic confirmation, timezone and existing safeguards retained.
- New media reference/event tables empty; zero uploaded objects.
- Final comparison found no unrelated schema changes. Only the reviewed registry extension, two new tables/one sequence, migration-ledger entry, one Storage bucket and two policies changed.
- Existing `MEDIA_POST_MIGRATION_VERIFY.sql` and parameterized `CMS_BASELINE_VERIFY.sql` passed after complete activation.
- Actual Go router read-only production checks: health 200, correct empty/unconfigured Booking results, unauthenticated admin routes 401, public CMS 200 with exactly 192 approved payloads, conditional GET 304. The temporary loopback server closed afterward; nothing was exposed publicly.
- All 15 Hero-lock checks passed again. No application source changed, so build/unit suites were not unnecessarily repeated; the immediately preceding preflight build, 85 frontend tests, Go tests and 138 browser checks are recorded separately.

Private fingerprint/query evidence is retained on the encrypted volume in `activation-preflight`, `after-migration005` and `after-storage-activation` beneath the verified backup directory. The archive itself remains unchanged. A non-secret Dashboard configuration screenshot is available at `/tmp/ag-dental-media-bucket-activated.png`.

No step failed or had an uncertain commit outcome. No automatic retry or rollback was necessary.

## Remaining gates before real uploads

1. Provision a backend-only Supabase Storage credential through an approved secure secret-management path. It is still absent locally; never use a Vite variable or expose it to the browser.
2. Verify actual Storage behavior in disposable staging, or obtain separate approval for a tightly scoped synthetic test. Cover private draft/original bytes, browser-role upload/list/overwrite/delete denial, successful server upload, publication delivery and cleanup without changing clinic content.
3. Before public use, separately configure/deploy the Go backend, processing tools, resource limits, HTTPS/CORS and private temporary storage. No deployment is authorized by this task.
4. Plan encrypted backups of uploaded object bytes as well as the database; the current verified pre-005 archive contains no future uploads or later activity.
5. Obtain explicit approval to enable uploads only after these checks succeed. **`MEDIA_UPLOADS_ENABLED=false` remains in effect.**

Repository changes made in this activation turn are this report and a historical-status link in `MEDIA_PRODUCTION_PREFLIGHT.md`. Existing feature implementation changes were preserved. No frontend, backend source, credentials, Hero or Welcome Intro files were edited.
