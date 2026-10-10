# AG Dental — production backup and restore verification

**VERIFIED — the manual backup was created, restored into isolated PostgreSQL 17, and passed application-database recovery checks.** This verifies the captured application database, including Auth records and Storage metadata; it is not a complete Supabase-platform recovery or PITR claim.

Completed 10 October 2026, Europe/Riga (9 October UTC). The owner explicitly authorized the backup, disposable restore and AES-256 encrypted destination. **No production migration, CMS import, application deployment, production data/role/RLS change, commit, merge or push was performed.**

## 1. Recovery point and files

- Encrypted disk image: `/Users/aleksandrgetmanenko/Backups/AG-Dental/AG-Dental-Secure.sparsebundle`.
- Verified actual mount: `/Volumes/AG-Dental-Secure`.
- Backup directory: `/Volumes/AG-Dental-Secure/AG-Dental-20261009T210634Z-backup`.
- Capture transaction/snapshot started at approximately **2026-10-09 21:06:34 UTC**; archive header creation time **21:06:41 UTC**. All row fingerprints and the database dump shared the same exported read-only, repeatable-read snapshot.
- Format: PostgreSQL **custom archive**, gzip level 6, without schema/data exclusions.
- Source: PostgreSQL **17.6**, database `postgres`, AG Dental project **`dcdgrbziounizuigmjcm`**.
- Client and disposable server: **PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)**, official cached image pinned to `postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675`.

| File | Size | SHA-256 |
| --- | ---: | --- |
| `database.dump` | 499,760 bytes | `a32819eb14a74d22c21de24ac84acc12368e0906fce671ee23e4b8b090ddd766` |
| `roles-reference.sql` | 5,900 bytes | `755b0726349f83f5989c623beb0a105553b8e7fff7108f4f680dbe97b339b1b6` |

The backup directory also contains `manifest.json`, source/restored fingerprints and schema metadata, the original TOC, explicit restore inclusion/exclusion lists, local role bootstrap, private logs, verification results and exact operator helper sources. `verification-result.json` is the final application recovery assessment. Intermediate diagnostics are retained and explained below; they are not silently deleted or relabeled as successful runs.

The separate `pg_dumpall --roles-only --no-role-passwords` export is reference material, not a script to replay blindly into an existing Supabase project. Global role metadata uses a separate read-only transaction; it is not part of the exported database snapshot. PostgreSQL login-role passwords are deliberately omitted. **Supabase Auth password hashes/session material are included in the encrypted database archive**, because they are part of Auth recovery.

## 2. Encrypted destination and permissions

The image did not exist before the owner created it through private interactive `hdiutil` password prompts. The parent directories were checked for symlink redirection and known cloud roots. They are outside Git, iCloud Drive, Dropbox and detected File Provider directories; `~/Library/CloudStorage` was empty. No known cloud/File Provider attributes were found. This does not audit arbitrary custom synchronization jobs.

Verified after creation:

- `hdiutil info -plist` maps the exact sparsebundle to **`/Volumes/AG-Dental-Secure`**, reports an encrypted, writable image owned by uid 501.
- `hdiutil isencrypted` reports encryption enabled, one passphrase key and no private-key recipient.
- The image's version-2 `encrcdsa` header reports AES algorithm `0x80000001` and **256 key bits**. Only the nonsecret header fields were inspected; no wrapped keys or password material were read or printed. [Format reference](https://github.com/nlitsme/encrypteddmg/blob/master/readencrcdsa.py).
- `diskutil` confirms APFS and writable media/volume. Its inner-APFS `Encryption=false` flag describes the inner filesystem: encryption is provided by the **outer AES-256 disk image**, not a second APFS encryption layer.
- Ownership was initially ignored. The empty inner volume was unmounted and remounted with `-mountOptions owners`; subsequent checks confirmed **`GlobalPermissionsEnabled=true`**. The outer image remained attached/unlocked.
- Image, mount root and backup directory: **0700**; backup/evidence files: **0600**, owned by the current user. A harmless create/write/fsync/read/delete probe passed.
- No password was generated, entered into chat/tool arguments, logged, stored in a helper or saved to Keychain by the agent. The encryption password remains with the owner.
- Temporary database credential staging existed only on the encrypted volume with restrictive permissions and was removed after capture. No staging directory remains.

The encrypted volume remains mounted for the owner. Mounted encryption does not stop the signed-in owner/root from reading files. Eject it when finished. On future mounts use ownership enforcement again, for example `hdiutil attach -owners on -noautoopen "$HOME/Backups/AG-Dental/AG-Dental-Secure.sparsebundle"`, entering the password privately at the Terminal prompt.

## 3. Production safety and capture

Repository `/Users/aleksandrgetmanenko/Desktop/Projects/Dental`, branch `feature/admin-cms`, HEAD `3a07279970f3bf24745baa40998d41e7ac6656ae`. Existing uncommitted CMS work was preserved.

The private configuration was parsed without shell evaluation or printing credentials. Project identity was pinned against the Supabase Auth hostname and database username suffix. The connection used the existing Session Pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, **`sslmode=verify-full`**, the trusted CA and matching hostname. pgx reported a verified certificate chain. The earlier TLS diagnostic also passed wrong-hostname/empty-trust negative checks and the actual GORM connector.

Trusted CA PEM SHA-256: `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.

Production sessions were forced to `default_transaction_read_only=on`. Inspection transactions used repeatable read/read only and ended in rollback. Capture used:

```sh
pg_dump --no-password --format=custom --compress=gzip:6 \
  --lock-wait-timeout=5s --snapshot=<exported-read-only-snapshot> \
  --file=/backup/database.dump
pg_dumpall --no-password --roles-only --no-role-passwords \
  --database=postgres --file=/backup/roles-reference.sql
```

Connection details were supplied privately through libpq environment settings, a mode-0600 temporary `PGPASSFILE` and trusted CA, not a URL/password argument. `PGSSLMODE=verify-full` and read-only `PGOPTIONS` were passed explicitly. No credentials were copied into the restore server. The configured production `postgres` role is non-superuser with BYPASSRLS; RLS was not assumed to filter/protect this privileged connection. All required tables were readable. Both capture commands completed successfully with **empty error logs**.

## 4. Archive integrity

- Nonzero custom archive and separate roles export: PASS.
- PostgreSQL 17 `pg_restore --list`: PASS; 851 total archive TOC entries, 844 listed object entries.
- Required schemas, table/data entries, functions, triggers, constraints, indexes, ACLs and sequence state are represented: PASS.
- Schema extraction and full archive decoding to a discarded stream: PASS.
- SHA-256 recorded and original archive unchanged throughout rehearsal: PASS.
- Actual restoration and source comparison, beyond decoding alone: PASS.

An initial schema-extraction invocation omitted the required `--file`/`--dbname` option. It exited before restoration; the corrected `--schema-only --file=-` and full `--file=-` checks passed. Its diagnostic remains in the encrypted evidence directory.

## 5. Isolated restore and Supabase adaptations

Disposable container: **`ag-dental-disposable-restore-20261009t210634z`**; database **`ag_dental_restore_test`**.

Isolation was checked through Docker metadata:

- `--network=none`, **no published ports**, PostgreSQL TCP listening disabled. Restore commands used the container's Unix socket, so they could not resolve/connect to production.
- No production credentials, database URL or Supabase configuration in the restore container.
- Read-only root filesystem and archive bind mount.
- PGDATA, socket directory and temporary files on **tmpfs**, not a persistent Docker volume. A 1 GiB memory limit with equal memory-swap limit disabled container swap.
- Docker logging disabled to avoid retaining accidental sensitive database diagnostics on unencrypted host storage; controlled restore diagnostics were written only to the encrypted destination.
- Unique task label/name; existing unrelated containers were preserved.

`restore-selection.list` selects **730 object entries**. `restore-excluded.list` explicitly records **114 platform-only entries** not replayed in standalone PostgreSQL. The original full archive is unchanged.

Included: every public/Auth/Storage table and its data, application and Auth/Storage functions, types, constraints, indexes, triggers, RLS, original object owners/grants, relevant default privileges, refresh-token sequence state, `btree_gist`, `pgcrypto`, `uuid-ossp`, and the public `ensure_rls` event trigger.

Excluded from this rehearsal: Realtime schema/metadata/publication, Vault extension and data entry, GraphQL/pgbouncer service helpers, `pg_stat_statements` objects, their dependent grants/default privileges, one provider `pg_catalog` ACL and six provider event triggers/helpers. These remain in the full archive for a compatible Supabase recovery. Vault had zero secrets; Storage had zero buckets/objects. No application/Auth/Storage table was excluded.

Source role names other than local `postgres` were created as **NOLOGIN, non-superuser, non-BYPASSRLS placeholders**, allowing original ownership and ACLs to be restored without reproducing Supabase server privileges or passwords. The local restore `postgres` is a disposable superuser. Source service-role attributes, memberships and hosted authentication behavior are **not** proven by these placeholders and require compatible platform provisioning during a real recovery.

The selected restore used **`--exit-on-error --single-transaction`**, committed successfully and produced an empty restore error log. No restoration errors were ignored. No CMS migration, fake doctor, schedule, booking or test account was created.

## 6. Comparison results

All restored data was compared to the **capture snapshot**, using sorted per-row SHA-256 hashes and a table-level SHA-256, with UTC serialization. No personal rows or tokens were printed.

| Check | Result |
| --- | --- |
| All 12 public tables | Exact row-count and data-fingerprint matches |
| All 27 Auth tables | Exact row-count and data-fingerprint matches |
| All 8 Storage tables | Exact row-count and data-fingerprint matches |
| Total restored tables compared | **47 / 47 PASS** |
| Columns, defaults, types, owners, RLS/force-RLS, policies | PASS |
| Constraints, including validations | **204 match** |
| Indexes, including valid/ready states | **158 match** |
| Non-extension functions and their definitions/owners/grants | **27 match** |
| User triggers and enabled states | **13 match** |
| Enum types / default-ACL groups | **10 / 15 match** |
| Sequence definition, owner, grants and captured value | PASS |
| `ensure_rls` event trigger | PASS |
| Browser table access, including MAINTAIN | Denied across public tables, matching source |
| Signup function protection | SECURITY DEFINER, fixed empty search path; browser execution denied |
| CMS objects and migration 004 | Absent in source and restored database |
| Hero lock | **15 / 15 PASS** |

Twenty-three raw ACL strings had a different array order after restoration. Sorting the identical grant entries produced exact equality; no privilege was added, removed or rewritten to make the comparison pass.

Restored Auth: one user, one identity, one matching role; zero missing/orphan roles or orphan identities. The role row, Auth records, password hashes and session data are verified through exact snapshot fingerprints; no real-user login was attempted.

The ten Booking tables are `services`, `doctors`, `doctor_services`, `doctor_schedules`, `doctor_time_off`, `appointments`, `appointment_events`, `notification_outbox`, `booking_settings`, `booking_settings_events`. Operational catalogs/appointments/events/outbox are empty; settings and settings-event tables each contain one original row.

Booking configuration matches: **automatic** confirmation, `Europe/Riga`, 60-day horizon, 120-minute minimum advance and 15-minute slot interval; privacy notice version remains NULL. The validated GiST `appointments_doctor_no_overlap` constraint matches and protects half-open ranges for `pending`, `confirmed`, `completed`, `no_show`. This was checked structurally, not by creating production test appointments.

Exact restored and production ledger:

| Migration | Applied at, UTC |
| --- | --- |
| `001_user_roles` | `2026-10-08 14:45:26.34766+00` |
| `002_booking_foundation` | `2026-10-08 14:45:52.875126+00` |
| `003_automatic_confirmation` | `2026-10-08 14:45:53.358552+00` |

### Later live activity and diagnostic corrections

A final read-only production inspection found that `auth.refresh_tokens` increased from 13 to 14 rows, while `auth.sessions` and `auth.users` each retained one row with changed fingerprints. The refresh-token sequence advanced from 22 to 23. This is consistent with live Auth/session activity after capture; the actor/cause was not established. The agent did not call login/refresh APIs or perform production writes.

All twelve public tables, role rows, ledger, schema and role-name inventory remained unchanged. The restore matches **the captured Auth state and sequence value 22**, not subsequent live changes. This is a point-in-time manual backup, not PITR; later changes are outside this recovery point.

The first supplementary metadata query required an explicit PostgreSQL `"char"`-to-text cast; it failed read-only and was corrected. A deliberately strict first postcheck then failed an assumption that all live fingerprints would remain unchanged. Investigation identified the above Auth activity, with no restore mismatch. Original diagnostics and `comparison-final.json` are retained; **`verification-result.json`** records the final, correctly scoped recovery assessment. Supplementary types, default ACLs, extension versions and security checks match; the live sequence difference is explicitly separated from captured sequence recovery.

## 7. Recovery coverage and limitations

| Area | Verified coverage | Limit |
| --- | --- | --- |
| Public application / Booking / role / migration data | All rows and schema recovered | Snapshot only; subsequent changes absent |
| Auth database | All 27 tables, relationships, grants and records recovered | Hosted GoTrue/Auth service, JWT/signing keys, OAuth/email settings and actual login not restored/tested |
| Storage database metadata | All eight tables and schema recovered | Object bytes are not in pg_dump; zero buckets/objects at capture |
| PostgreSQL roles | Role-reference export without role passwords; original object ownership/ACLs recoverable | Local placeholders do not reproduce Supabase role attributes/memberships/service privileges |
| Realtime / GraphQL / Vault / pgBouncer / provider hooks | Dumpable definitions/data retained in original archive | Not exercised in standalone restore; compatible Supabase platform required |
| Vault / large objects | No Vault secrets or PostgreSQL large objects observed | Vault encryption roots and external secret services are not included |
| External application/platform configuration | Outside this backup | API/JWT keys, project settings, SMTP/OAuth providers, Edge Functions, integrations, DNS and repository media need separate recovery |

This project still has no verified managed automatic backup/PITR entitlement on the inspected Free plan. The new recovery point is this **manual encrypted archive**. A single local copy shares the laptop's loss/failure risk; no second copy or upload was authorized or performed. Losing the image password makes the archive inaccessible. Keep the password under the owner's separate secure control.

Supabase documents different treatment for managed Auth/Storage schemas, project configuration and object bytes. A standalone restore does not authorize overwriting managed schemas in a live project. Sources: [Supabase backup/restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [PostgreSQL 17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

## 8. Repeat the isolated recovery or recover in an emergency

For a later rehearsal, unlock the image privately, verify its mount/ownership and the archive checksum, then use a **new uniquely named** local container. Never point this sequence at the production connection, pass production credentials, or use the role-reference dump as a platform reset script.

The exact tested operator sources and selection/bootstrap are saved with the backup. The equivalent standalone restore sequence is:

```sh
ag_backup='/Volumes/AG-Dental-Secure/AG-Dental-20261009T210634Z-backup'
ag_restore='ag-dental-disposable-restore-NEW-UNIQUE-NAME'
ag_image='postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675'
shasum -a 256 "$ag_backup/database.dump"
# Must equal a32819eb14a74d22c21de24ac84acc12368e0906fce671ee23e4b8b090ddd766.
# Stop if the chosen container name already exists. Do not remove it automatically.
docker run -d --pull=never --name "$ag_restore" \
  --network=none --log-driver=none --read-only --security-opt=no-new-privileges \
  --memory=1g --memory-swap=1g \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=512m \
  --tmpfs /var/run/postgresql:rw,nosuid,size=16m \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount "type=bind,src=$ag_backup,dst=/backup,readonly" \
  --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=ag_dental_restore_test \
  --env TZ=UTC "$ag_image" postgres \
  -c listen_addresses= -c log_statement=none -c log_min_error_statement=panic
# Wait for readiness, then inspect isolation before restoring.
docker exec "$ag_restore" pg_isready -U postgres -d ag_dental_restore_test
docker exec -i "$ag_restore" psql -X -q -v ON_ERROR_STOP=1 \
  -U postgres -d ag_dental_restore_test < "$ag_backup/restore-bootstrap.sql"
docker exec "$ag_restore" pg_restore --no-password --exit-on-error \
  --single-transaction --use-list=/backup/restore-selection.list \
  --dbname=ag_dental_restore_test --username=postgres /backup/database.dump
```

Run commands individually, stopping on every error. Route any potentially sensitive diagnostics to mode-0600 files on the encrypted volume. Re-run the saved schema/data comparison methodology and security checks before declaring success. Stop/remove only that confirmed disposable container after verification; preserve the archive and evidence.

For actual emergency recovery, first obtain explicit recovery authorization and provision a **fresh compatible target**. Identify the desired recovery point and accept loss of post-snapshot changes. On a new Supabase target, preserve provider-created roles, managed schema versions and platform ownership; reconcile Auth/Storage migrations and customizations under Supabase's documented restore procedure rather than replaying the standalone selection blindly. Use the full archive and role-reference material to prepare a target-specific reviewed plan. Restore schema/data in dependency order, restore application grants/RLS/triggers, configure external services/secrets separately, and validate fingerprints plus Auth/API behavior before routing traffic. **Recovery into a fresh hosted Supabase project was not executed in this task.**

## 9. Cleanup, retention and next action

The task's disposable container was stopped and removed; its tmpfs database contents were discarded. It had no persistent Docker data volume. Other containers were preserved. Credential staging was removed. The encrypted archive, role reference, manifest and evidence remain intact. The mounted image remains available to the owner; eject it when no longer needed.

Retain this pre-CMS recovery point until CMS activation/post-import validation is complete and at least one newer verified recovery point exists. Do not automatically delete it. Agree on ongoing retention and a separately authorized encrypted second copy, accounting for sensitive Auth/session records.

**Application database recovery readiness: VERIFIED.** The prior absence-of-a-recovery-point blocker is resolved for the captured application database. Platform-service recovery limitations, single-copy risk and post-snapshot data loss remain explicit. This is not approval to deploy CMS.

**Next action:** await separate explicit approval for the exact reviewed **`004_website_cms.sql`** and the 194-group import. Immediately before any deployment, repeat the project/TLS/ledger/schema/checksum checks against the current state and assess backup freshness. No 004/import action was taken here.

Files changed by this backup task: this report, plus a dated cross-reference in `CMS_PRODUCTION_PREFLIGHT.md`. Private Git-ignored operator helpers/metadata live under `backend/.tls`; copied reproducible helpers, backup artifacts, manifest and verification evidence are outside Git on the encrypted volume. No application, migration, frontend, Hero, Welcome, Auth or Booking implementation was modified.
