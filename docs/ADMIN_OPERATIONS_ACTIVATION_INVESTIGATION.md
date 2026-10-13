# Admin operations activation investigation — 2026-10-10

## Decision

**Investigation and recovery rehearsal PASS. Production activation NOT performed.**
Migration 006 remains proposed and unapplied. Runner integration and explicit owner
approval are still required. No production application records, policies, roles,
appointments, prices, Storage objects or CMS content were changed by this work.
No deployment, commit, merge or push. Existing uncommitted work was preserved on
`feature/final-development`, HEAD `6300bc1a6c040970d4393264f3612ce96b277537`.

## Root causes, reproduced in the actual browser

The authenticated local Chrome session at `http://localhost:5173` displayed the
reported Russian unavailable message on both `/admin/appointments` and
`/admin/schedules`. Schedule selectors were empty and create/preview controls disabled.

1. **Stale running Go executable.** Vite uses `http://localhost:8080/api`; a Go API
   is listening on 8080 (observed PID 35075, process start Oct 10 00:27:05 as reported
   by the host). Its temporary `go-build…/exe/api` binary predates the new routes.
   `/api/health` returns 200 and `database: connected`, but the new appointment
   options, appointment search and operations routes return **404**. Existing
   `/api/admin/cms/documents` returns 401 without a token, and the authenticated
   browser loads the imported CMS page list. This is not a missing frontend URL,
   disconnected database or failed admin login. A source edit does not rebuild an
   already running `go run` executable.
2. **006 is absent.** After rebuilding/restarting the backend, operations catalog
   reads/writes still need `admin_operation_events`, new eligibility/active columns,
   profile tables and constraints. `Store.Operations` fails closed without the audit
   table. CMS `CreateContent` explicitly requires ledger version `006_admin_operations`.
3. **No operational clinic data or privacy readiness.** Production has zero services,
   doctors, assignments, schedules, time-off rows and appointments. Booking settings
   use automatic confirmation, Europe/Riga, 60-day horizon, 120-minute advance and
   15-minute intervals, but `privacy_notice_version` is NULL. Migration 006 does not
   supply any of these missing clinic facts. Local `.env.local` has
   `VITE_BOOKING_DEMO=true`; this explains simulated wizard options, not admin data.
   It must never be used to seed production or as evidence of live availability.

**Important distinction:** current appointment listing/search and its options query
use schema 001–005 and can work after the backend restart without 006. The added
rehearsal verifies an empty appointment list on 001–005. Migration 006 alone cannot
fix missing HTTP routes. Manual appointments still require real bookable catalogs,
assignments, working hours and a configured privacy notice.

### CMS creation browser finding

`/admin/pages/created` renders the new localized news/page/FAQ form and enables its
Save control after the existing CMS list request succeeds. No content was entered,
saved or published. The UI does not probe creation capability before enabling Save.
Therefore a rendered form is **not** proof that creation is operational. The stale
backend lacks its new POST handler; the current source returns an unavailable error
on a valid creation request until 006 is recorded. Both source behavior and the
pre-006 gate were verified locally with synthetic tests, not production POSTs.

## Affected modules and exact dependencies

| Admin function | Current blocker / dependency | Effect of 006 plus current backend |
|---|---|---|
| Appointment calendar, private search, options | New routes missing from running binary; existing schema supports reads | Restart current source restores reads; empty production calendar is expected |
| Manual appointment creation, rescheduling, lifecycle/history | Current routes; verified admin; real catalog/schedules/privacy; existing appointment constraints/outbox | 006 does not create data or complete clinic configuration |
| `/admin/services/booking` create/edit/archive/order/assignments/history | New operations routes; audit table; `doctor_services.booking_enabled`; unique CMS service link | Becomes schema-capable, initially empty |
| `/admin/doctors/booking` operational profiles/archive/order/portraits/history | New routes; audit, `doctor_profiles`, `admin_profile_media_references` | Becomes schema-capable; no doctor is automatically created |
| `/admin/schedules` recurring intervals/time off/history | New routes; audit; active columns; schedule exclusion | Becomes schema-capable; needs operational doctors |
| Schedule availability preview | New preview route plus eligible service/doctor, duration, intervals, exceptions and booking settings | Still no slots until real configuration exists |
| New CMS news/pages/FAQ creation | New POST route and explicit 006 ledger gate | Can create drafts under verified admin authorization |
| New content unpublish/restore | Current handlers and `unpublished` CMS event type | Event constraint supports unpublish; history retained |
| Existing Pages, service descriptions/prices, editorial doctor bio, imported News, SEO and website settings | Existing CMS 004/005 plus working admin API | Already readable; 006 does not require reimport or rewrite. No production write tests performed |
| Media list/registered assets | Existing 005 and API | Independent of 006; registry preserved |
| Actual media uploads/replacement | `MEDIA_UPLOADS_ENABLED=false`, credentials and real Storage verification | Remains disabled; 006 is not upload approval |
| Contact inbox/delivery | Intentionally unimplemented pending privacy/retention; messages route is a placeholder | Not solved by 006; no email/Resend implemented |
| Public hosting/API access | Local backend is not deployed | Not solved by migration; no deployment performed |

Settings navigation edits website CMS settings. It is not a complete Booking policy
configuration UI; migration 006 does not add one. The dashboard can read Booking
settings through existing endpoints.

### Editorial and operational doctor linkage

Published `clinic.doctorBio` exists. Production contains **zero operational doctors**
and no `doctor_profiles` table, so no real doctor linkage exists yet. The new code
accepts an empty editorial key or exactly `clinic.doctorBio`; the proposed unique
foreign key prevents two profiles claiming the same editorial document. Doctor IDs,
service eligibility and operational profiles are distinct from website biography.
An operational profile does not automatically replace the published biography.
The disposable suite verifies explicit linkage, portrait history retention and Hero
portrait/video protection. Link the real doctor only in a separately authorized,
clinic-confirmed data-entry step; do not invent qualifications or schedules.

## Fresh production preflight

Connection: AG Dental project `dcdgrbziounizuigmjcm`; Session Pooler
`aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`, PostgreSQL 17.6.
Both the database project identifier and configured Supabase Auth URL were checked.
The Go connection used `sslmode=verify-full`, the pinned trusted CA, nonempty TLS
verified chains and explicit hostname verification. Read-only repeatable-read
transactions and `default_transaction_read_only=on` were used. No credentials are
included here. The backend database role is privileged: RLS is not a substitute for
server-side verified JWT/admin authorization.

| Version | Recorded applied_at (UTC) |
|---|---|
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |
| 005_cms_media | 2026-10-10 11:00:43.465901 |

- Current schema fingerprint exactly matches the approved 005 post-Storage-activation
  snapshot. All public/Storage row fingerprints and role names also match that prior
  baseline. Only Auth user/session/refresh-token activity differs.
- 006 absent; its three table names, proposed indexes and added columns absent.
- No duplicate CMS-to-service links; no overlapping recurring intervals.
- Auth users 1, identities 1, roles 1, admins 1; no missing/orphan roles or identities.
- CMS documents/revisions/events: **194 / 194 / 194**; media records **12**.
- All 194 published payloads and source hashes match the approved embedded manifest;
  all **2,198 declared content fields** preserved; no missing/extra groups.
- Public CMS API: HTTP 200, **192** documents. Two protected Hero media records
  remain protected; protected reference documents remain excluded from public/admin editing.
- Booking operational catalogs/appointments: **0**; settings preserved.
- All inspected public tables have RLS and deny anonymous/authenticated table access.
- `appointments_doctor_no_overlap` is validated and excludes overlapping pending,
  confirmed, completed and no_show appointments. Cancelled/rejected do not block.
- `btree_gist 1.7`, `pgcrypto 1.3` already installed.
- Private bucket `ag-dental-cms`: 33,554,432 bytes; JPEG/PNG/WebP/AVIF/MP4/WebM;
  zero Storage objects. Uploads remain false. No Storage policy changes made.

## Fresh encrypted backup and isolated restore

**VERIFIED**, captured `2026-10-10T13:18:28Z`:

`/Volumes/AG-Dental-Secure/AG-Dental-20261010T131828Z-backup/database.dump`

SHA-256:
`93f957f547e7cc0adcce06d9bb69626b11f9fdc2bbfef41dd1d151e2e1599c67`

The mounted APFS destination was writable and owner-only. `hdiutil isencrypted`
confirmed encryption, and the public sparsebundle header identified AES, 256-bit.
No password was read, generated or stored. Archive/evidence files are 0600, directory
0700; all remain outside Git on the encrypted volume.

The full logical pg_dump archive shared an exported read-only snapshot with source
fingerprints. Full archive decode and TOC validation passed. A separate roles
reference excludes role passwords. PostgreSQL 17.11 restored 793 selected TOC entries
with no errors in a unique container: network disabled, no published ports, tmpfs
PGDATA, no production credentials, Docker logging disabled. **54 public/Auth/Storage
tables** matched snapshot row fingerprints; 238 constraints, 173 indexes, 13 user
triggers, 27 functions, 10 enums, 15 default-ACL groups and sequence states were
compared. Effective schema and permissions match.

The first strict comparison correctly flagged ACL representation differences.
Review established only ACL array ordering plus two explicit owner-only sequence
ACLs restored as NULL/default ACLs. PostgreSQL's `acldefault('s', owner)` returned the
same privileges; no grants were repaired or weakened. See PostgreSQL's
[access privilege information functions](https://www.postgresql.org/docs/17/functions-info.html).
Initial failure evidence and the separate successful reviewed comparison are retained.

After the snapshot, Auth session/refresh-token activity occurred. A hashed field
comparison found only `auth.users.updated_at` changed in the user row, along with
session timestamps and refresh-token rows. This is consistent with the active
browser session; no role, user-profile or account-password changes were found. All public and
Storage table fingerprints, schema and role names stayed unchanged. The backup does
**not** claim to contain activity after its snapshot.

Limits: this rehearses application/Auth/Storage SQL recovery, not a complete Supabase
platform deployment or working Auth login service. Provider Realtime/Vault/GraphQL/
pgbouncer definitions remain in the full archive but 114 provider TOC entries were
excluded from standalone restoration; source roles were unprivileged NOLOGIN local
placeholders. No Storage bytes exist to restore. The owned restore container was
removed after verification; encrypted archive and evidence remain available.

## Migration review and compatibility

Reviewed SQL: `backend/migrations/proposed/006_admin_operations.sql`.
SHA-256: `94f143141af6d896ad6c0bca8d4b0e5ef0b78ee5eb0024d6200032dd8489e002`.
This is a newly recorded review checksum, not a claim of a previous approval.

Changes, within one BEGIN/COMMIT transaction:

1. Add `doctor_services.booking_enabled`, `doctor_schedules.active`,
   `doctor_time_off.active`, all NOT NULL DEFAULT true; preserve old eligibility.
2. Add `doctor_working_intervals_no_overlap`: GiST exclusion on doctor, weekday,
   overlapping inclusive effective date ranges and half-open daily time intervals,
   limited to active schedules. Adjacent intervals remain possible.
3. Add unique `cms_booking_single_editorial_source(service_id)`.
4. Create `admin_operation_events` with actor FK, idempotency/request hash, minimal
   before/after operation data and history index.
5. Create `doctor_profiles` with doctor/editorial/media FKs and unique editorial key.
6. Create `admin_profile_media_references` retaining audit-linked portrait references.
7. Enable RLS/revoke browser grants on all three tables.
8. Replace the CMS event check, preserving every existing event type and adding
   `unpublished`; record 006 in the ledger.

No appointment status/default, Auth table/trigger, role, CMS payload/revision, media
asset, Storage policy or real clinic row is rewritten. Current Booking reads use
JSON-column fallbacks for the new optional columns and are compatible before/after
006. Existing availability and appointment exclusion remain intact. No new extension
is needed beyond existing btree_gist.

Risks: new constraints fail on duplicate links or overlapping schedules; DDL takes
locks. Rerun preconditions immediately before activation and use bounded lock/statement
timeouts. Do not auto-repair conflicting data. No destructive down migration exists;
retain audit/history and prefer a reviewed forward correction. If a COMMIT response
is lost, inspect ledger and schema before any retry; do not infer rollback from a
connection error. The current runner's generic error wording alone is insufficient
proof of rollback in that situation.

## Runner integration and exact activation sequence

Current runner SHA-256:
`392093623611a5f22ccc92ba726cd8b897f3ad74afb4f62a74054ceee7450778` — matches the earlier
005 review. It still applies only 001–005 and rejects unknown ledger versions.
**It has not been modified.** Copying 006 to `migrations/` or using `--dir proposed`
will not solve this. Running the current command does not apply 006.

Recommended narrowly scoped local integration, before any production command:

1. Add an explicit `--apply-admin-operations` operation, mutually exclusive with
   adoption/rollback flags. Keep ordinary migration execution limited to its current
   reviewed versions; do not silently turn normal startup into 006 activation.
2. Update accepted ledger validation to recognize 006 only after 005, preserving all
   earlier checks. The dedicated operation requires exactly 001–005 before its first
   execution; a verified already-applied 006 is a read-only no-op.
3. Under the existing advisory lock, validate the exact proposed SQL checksum above,
   check table/column/index/constraint conflicts, overlap and duplicate-link queries,
   and invoke the existing transaction executor on the proposed file. Apply no earlier
   migrations, fixtures, imports or automatic rollback. Use bounded lock and statement
   timeouts. Handle uncertain commit outcomes explicitly.
4. Add runner tests for default non-activation, explicit 005→006, repeat/no-op,
   unexpected/gapped ledger, checksum refusal, atomic failure and preserved rows.
   The new populated-baseline test added in this investigation proves the SQL itself,
   not this as-yet unimplemented CLI flag. Update its deliberate current-runner
   rejection assertion when integrating 006.
5. Rerun the full disposable suite and record the final runner checksum for approval.
   Do not treat this report as permission to modify production.
6. After explicit owner approval: verify project/TLS, archive checksum/accessibility,
   ledger, schema/row fingerprints, current clinic activity and every conflict again.
   Refresh backup if the accepted recovery point no longer covers required activity.
   Coordinate a quiet activation window; never discard legitimate intervening activity.
7. From `backend`, execute the future reviewed command:

   ```sh
   go run ./cmd/migrate --apply-admin-operations
   ```

   **This flag does not exist yet. Do not execute it before steps 1–6.** Do not use
   raw SQL or `--adopt-auth-baseline` for this activation.
8. Immediately run `docs/ADMIN_OPERATIONS_POST_MIGRATION_VERIFY.sql` through the
   verified read-only connection. Compare saved fingerprints and all intentional
   column defaults. Stop on an unexpected outcome; no automatic rollback/retry.
9. Rebuild/restart the local backend from the current branch, with its existing private
   verified-TLS configuration and `MEDIA_UPLOADS_ENABLED=false`. Verify the intended
   process owns port 8080. Do not start a second conflicting process or deploy publicly.
10. Read-only browser/API checks: health 200; protected new routes return 401/403 for
    untrusted access, admin lists/options load, existing CMS returns 192 documents,
    empty operational catalogs remain empty. No production save/publish/appointment tests.
11. Obtain separate authorization and clinic-confirmed data for real service durations,
    eligible doctor/editorial linkage, schedules, exceptions and privacy settings.
    Migration 006 is not approval to enable public booking, uploads or email.

## Executed tests and scope

| Check | Result |
|---|---|
| Actual authenticated Chrome Appointments and Schedules | Unavailable state reproduced; read-only navigation |
| Actual CMS Pages and new creation form | Existing content loads; creation form renders; no save attempted |
| Local health/public catalog/public CMS | 200; empty services with NULL privacy version; 192 published documents |
| Missing new routes / existing protected route | 404 / 401, supporting stale-process diagnosis |
| Fresh production TLS/schema/conflict/manifest checks | PASS; read-only only |
| Encrypted archive decode and isolated snapshot restore | PASS after documented semantic ACL review |
| `bash backend/scripts/test-media-local.sh` | PASS in all three runs; final run includes new activation rehearsal and postcheck SQL validation; PostgreSQL 17.11, synthetic data |
| New `TestProposedOperationsActivation` | PASS: 001–005 appointment reads; old-schema operations/CMS gates; populated preservation; overlap failure fully atomic; defaults/RLS; post-006 operations |
| Existing backend integration coverage | PASS: Auth/role rejection, booking concurrency/DST/lifecycle, CMS draft/publish/unpublish/restore, profiles/portrait protection, price linkage, schedule impact, Media and runner safeguards |
| `go vet ./...` | PASS |
| `node --test tests/*.test.mjs` | 93 PASS, zero skipped. Initial sandbox run had 2 loopback EPERM failures; rerun with permitted loopback access passed |
| `npm run build` | PASS; existing >500 kB chunk warning remains |
| Hero lock | 15/15 PASS |

No real Supabase appointment, content mutation, role change, Storage upload or email
was used as a test. Production end-to-end write functionality remains untested by
design. Browser tests in this investigation were read-only, not a rerun of all prior
responsive/synthetic browser suites.

## Files changed in this investigation

- `backend/cmd/migrate/operations_activation_test.go` — disposable activation regression.
- `docs/ADMIN_OPERATIONS_ACTIVATION_INVESTIGATION.md` — this report.
- `docs/ADMIN_OPERATIONS_POST_MIGRATION_VERIFY.sql` — prepared read-only postchecks.
- `docs/ADMIN_OPERATIONS_ACTIVATION.md` — link to fresh evidence and current root causes.
- `docs/FINAL_IMPLEMENTATION_STATUS.md` — investigation addendum.
- `docs/KNOWN_LIMITATIONS.md` — distinguish historical evidence from this fresh inspection.

Private ignored helpers created under `backend/.tls`: `operations-preflight.go`,
`operations-backup-capture.go`, `operations-backup-extra.sql`,
`operations-backup-postcheck.go`, `operations-auth-drift.go`,
`operations-content-check.go`. Encrypted backup tooling, logs and fingerprints are
inside the backup directory above. These are not release files or credentials to
commit. No `.env`, migration SQL, production runner, frontend component, Hero,
Welcome Intro or runtime configuration was edited.

**Next approval boundary:** approve the scoped activation sequence above before
any production migration. First complete and test the explicit runner integration;
then repeat the fresh safety gates. This investigation stops here.
