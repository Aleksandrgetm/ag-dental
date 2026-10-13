# Fresh production backup and isolated restore — VERIFIED

Completed 2026-10-11 on `feature/final-development`, under explicit backup/restore authorization. Migration 007 was not applied. No production records, roles, policies, uploads, Booking settings or existing backups were modified.

## Recovery point

- Project: AG Dental, `dcdgrbziounizuigmjcm`.
- Directory: `/Volumes/AG-Dental-Secure/AG-Dental-20261011T200046Z-backup`.
- Archive: `database.dump` (613,796 bytes).
- Snapshot timestamp: approximately **2026-10-11 20:00:46 UTC**.
- SHA-256: `de90bac49ea5772bbdb644f63871adb7f11ee4617ee1b81a5a793f50729254b9`.
- Checksums: `manifest.json` records archive and role-reference hashes; `SHA256SUMS` records all retained backup/evidence files. `verification-result.json` records VERIFIED status.

## Safety and capture

Verified the existing mounted sparsebundle identity, `hdiutil` encrypted status and public `encrcdsa` header AES algorithm with 256-bit key length. No password, wrapped key or credentials were printed. The outer image supplies encryption; the inner APFS filesystem need not have a second encryption layer. `imageinfo` was unavailable for the mounted image; mount inventory, encrypted status and header checks independently verified it.

The volume had over 3 GiB free, and its underlying disk over 300 GiB. Owner/private writable-file test passed. Source database size was checked against the capture budget. New directory creation was exclusive, permissions 0700; sensitive files 0600. No old backups were overwritten.

The Session Pooler hostname/port, database, project-specific username and Auth URL were verified without exposing the connection string. `sslmode=verify-full`, pinned trusted CA, verified certificate chain and explicit hostname validation all passed. Exact source ledger 001–006 was required.

A read-only repeatable-read transaction exported the snapshot used by `pg_dump` and all source data/schema fingerprints. Full custom-format database dump includes application, Auth, CMS, Booking and Storage metadata. Roles were exported separately without role passwords. PostgreSQL 17.11 tools were used against source 17.6. Private credential staging existed only on the encrypted volume and was removed. Every production connection enforced read-only mode; no production restore or migration was attempted.

The private capture helper was adapted from the previously reviewed helper to expect 006, preserve the new operational tables, reject 007 presence through verification, and compare effective sequence ACLs. Original helpers and historical evidence were preserved.

## Integrity and isolated restore

- Complete archive decoding: PASS; archive hash unchanged after restoration.
- New disposable PostgreSQL 17.11 container: no network, no exposed ports, no production credentials, logging disabled, read-only archive mount, tmpfs database, no persistent Docker volume.
- Single-transaction restore: PASS, zero pg_restore errors.
- **57 tables**: all row counts and sorted SHA-256 row fingerprints match the capture snapshot.
- **253 constraints**, **181 indexes**, **27 functions**, **13 user triggers**, **10 enum types** and **15 default-ACL groups** match.
- RLS, policies, owners, grants, sequence state and supplementary metadata match. Twenty-three raw ACL differences were ordering only; normalized privilege sets are identical. Effective sequence ACLs were compared consistently from the start.
- Browser roles retain no direct public-table access; signup function protection intact; no missing/orphan Auth role relationships.
- Ledger exactly: `001_user_roles`, `002_booking_foundation`, `003_automatic_confirmation`, `004_website_cms`, `005_cms_media`, `006_admin_operations`. No 007/archive column.

Preserved snapshot counts:

| Object | Rows |
|---|---:|
| CMS documents | 195 |
| CMS revisions | 195 |
| CMS events | 197 |
| CMS media registry | 12 |
| Operational doctors / editorial links | 1 / 1 |
| Doctor schedules | 1 |
| Booking services / appointments | 0 / 0 |
| Auth users / user roles / identities | 1 / 1 / 1 |
| Storage buckets / objects | 1 / 0 |

News is preserved within the complete CMS documents and revision fingerprints, including unpublished content. No article was modified as a test.

## Production preservation and cleanup

Read-only comparisons immediately after capture and again after restoration matched **all** captured table fingerprints, schema, roles, sequences and supplementary metadata. No independently occurring changes were observed during those checks. This claim ends at the final comparison; future activity is outside this snapshot.

Only the uniquely named `ag-dental-disposable-restore-20261011t200046z` container was stopped and removed after success; its tmpfs contents were discarded. Existing containers and backend processes were untouched. Backup and evidence remain encrypted and mounted. All 15 Hero locks and `git diff --check` passed.

## Scope and limitations

This is verified application-database recovery in standalone PostgreSQL, not full hosted Supabase service recovery. The full archive retains provider objects; the standalone rehearsal selected 820 entries and explicitly excluded 114 provider-specific entries (for example platform extensions). Public/Auth/Storage objects were retained, using unprivileged NOLOGIN placeholders for source roles; provider role capabilities and live service configuration were not recreated.

Storage object bytes, API/JWT secrets, OAuth/mail configuration and other external project settings are not pg_dump contents. The source contained zero Storage objects. The archive contains sensitive Auth/session data and must remain private. Only one local encrypted copy was created; no upload, second copy or paid service was used. Activity after the snapshot is not covered.

## Remaining migration 007 requirements

The fresh-backup blocker in `NEWS_ARCHIVE_007_PREFLIGHT.md` is resolved for this snapshot. Activation still requires:

1. A reviewed, checksum-pinned, ledger-aware 007 runner operation and disposable tests, including repeat/no-op, partial/conflicting ledger and preservation checks. Raw 007 is not idempotent and does not record itself in the ledger.
2. Fresh identity/TLS/ledger/schema/data-drift and backup-hash checks immediately before activation.
3. Separate explicit production migration approval. None was requested or inferred from backup authorization.
4. Approved application, read-only postchecks and backend readiness verification without deleting actual clinic news.

Stop here. No migration, deployment, commit, merge or push performed.

## Files

Repository: this report only. Private ignored helpers under `backend/.tls/news007-*` and encrypted evidence/operator copies in the new backup directory. Existing uncommitted application changes were preserved.
