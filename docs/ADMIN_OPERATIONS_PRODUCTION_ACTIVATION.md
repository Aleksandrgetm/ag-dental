# Migration 006 production activation — 2026-10-10

## Result

**PASS.** Owner-approved migration `006_admin_operations` was applied once to AG
Dental Supabase project `dcdgrbziounizuigmjcm`, at **2026-10-10 13:33:42.900410 UTC**.
Only 006 ran. Earlier migrations, clinic content, Auth, Booking configuration and
Storage policies were not replayed or modified. No fixtures, imports, uploads,
appointments, doctors or services were created. No deployment, commit, merge or push.
Work remains uncommitted on `feature/final-development` (HEAD `6300bc1a6c040970d4393264f3612ce96b277537`).

The local backend was rebuilt and restarted from current source. The actual
administrator browser now loads Appointments and Schedules without the prior
schema-unavailable error. An already-open failed screen needed its Refresh action.

## Runner integration

- `--apply-admin-operations` is explicit and mutually exclusive with adoption/rollback.
- Ordinary migration execution still uses the 001–005 manifest; it cannot silently
  activate 006. Ledger validation recognizes 006 only after 005.
- First activation requires the complete existing 001–005 baseline.
- The runner pins the approved SQL hash, executes those same bytes, validates object
  conflicts, old CMS event constraint, extension, schedule overlap and service links.
- Existing advisory locking remains; 006 uses a 5-second lock timeout and 60-second
  statement timeout. The SQL transaction is unchanged.
- Successful execution verifies the ledger and new schema. Repeat activation checks
  the schema and performs no writes; incompatible history or weakened RLS is rejected.
- Error messages no longer imply a confirmed rollback after an uncertain connection
  failure. Inspect ledger/schema before any retry. No production retry was needed.

The approved SQL remains byte-for-byte at
`backend/migrations/proposed/006_admin_operations.sql`. Its historical header/location
is retained to preserve the reviewed checksum; this report records its activation.

| Artifact | SHA-256 |
|---|---|
| 006 SQL | `94f143141af6d896ad6c0bca8d4b0e5ef0b78ee5eb0024d6200032dd8489e002` |
| `backend/cmd/migrate/main.go` | `b201c823253ca0a47e0919a429ff2c9973658b4eb5329adde193737e5337e995` |
| `backend/cmd/migrate/operations.go` | `340a2ff7f3441fae8e6d82a56190d01e19674500a8b4e35436159a523f0c47e9` |
| Built migration runner | `017b210e1b041502b4126227bee01d46f08277c00fbb26b4ecb1097c2eb186c5` |

Actual execution, from `backend`, used the locally compiled tested runner:

```sh
env -u DATABASE_URL /tmp/ag006-migrate --apply-admin-operations
```

Removing an inherited DATABASE_URL ensures the runner reads the verified private
`backend/.env`. No credentials appeared in command arguments or logs. The equivalent
source command is `env -u DATABASE_URL go run ./cmd/migrate --apply-admin-operations`.
Do not rerun activation as a smoke test; it is already complete.

## Fresh safety gates

- Correct project identity in database pooler configuration and Supabase Auth URL.
- Session Pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`.
- `sslmode=verify-full`, pinned trusted CA, verified certificate chain and matching
  hostname. All diagnostic connections used read-only transactions.
- Exact 001–005 preflight ledger; no proposed object/column/constraint conflicts.
- Existing schema and all table fingerprints matched the approved investigation's
  post-snapshot baseline, including Auth. No intervening data repair was needed.
- Migration 001–005 files (including existing down files) retain their prior hashes.
- CMS payload/source-hash parity: 194 groups, 2,198 declared fields, zero differences.
- All application RLS/browser restrictions intact; uploads false.

Approved encrypted recovery archive remained accessible:

`/Volumes/AG-Dental-Secure/AG-Dental-20261010T131828Z-backup/database.dump`

SHA-256: `93f957f547e7cc0adcce06d9bb69626b11f9fdc2bbfef41dd1d151e2e1599c67`.

Rehashed archive, verified isolated-restore evidence, `hdiutil` encryption and AES-256
header all passed. Prior restore matched 54 application/Auth/Storage tables and
effective schema/ACLs. No new restore was necessary for this approved archive; no
live restore was performed. It represents its 13:18:28 UTC snapshot, not later Auth
session activity or migration 006. The investigation report documents its standalone
Supabase-platform recovery limitations.

## Exact resulting ledger

| Version | applied_at UTC |
|---|---|
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |
| 005_cms_media | 2026-10-10 11:00:43.465901 |
| 006_admin_operations | 2026-10-10 13:33:42.900410 |

## Post-migration verification

Executed the reviewed `docs/ADMIN_OPERATIONS_POST_MIGRATION_VERIFY.sql` read-only,
plus full row/schema fingerprints and approved CMS manifest comparisons.

- Three new tables: `admin_operation_events`, `doctor_profiles`,
  `admin_profile_media_references`, each **zero rows**.
- Three NOT NULL boolean columns with true defaults:
  `doctor_services.booking_enabled`, `doctor_schedules.active`, `doctor_time_off.active`.
- Eight new indexes, including implicit primary/unique indexes, validated by the
  runner; all four explicitly named postcheck indexes valid and ready.
- Schedule GiST exclusion and unique editorial service link exist. Seven new foreign
  keys validated. Existing appointment overlap constraint/status behavior unchanged.
- New tables have RLS, no policies granting browser access, and no PUBLIC/anon/
  authenticated table privileges. Actual API still requires verified JWT and admin
  roles; the privileged backend database role must not rely on RLS alone.
- CMS event check retains all existing values and adds `unpublished`.
- Only expected schema changes found: the three new tables and five explicitly
  altered old tables. Functions, sequences and unrelated schema objects unchanged.
- Full existing-row fingerprints: **only `schema_migrations` changed**. This was true
  immediately after migration and again after all authenticated browser checks.
- Auth users **1**, roles **1**, admins **1**, no missing/orphan role relationships.
- CMS documents **194**, revisions **194**, events **194**, media registry **12**.
- **2,198 content fields match** the approved manifest; no missing/extra groups.
- Public CMS returns **192** published documents; two Hero references stay excluded
  and two Hero media assets remain protected.
- Services/doctors/assignments/schedules/time off/appointments remain empty.
- Automatic confirmation, Europe/Riga and all other booking settings unchanged.
  Privacy notice version remains NULL. Storage objects remain zero.

Encrypted evidence is in the approved backup directory under `activation006-before`,
`activation006-after`, and `activation006-after-browser`. Query results and private
fingerprints were not added to Git.

## Local backend and actual browser

Old API PID 35075 was stopped only after database verification. Latest-source binary
`/tmp/ag006-api` is running as PID **61917**, using unchanged private environment
configuration and port 8080. Logs are in ignored `backend/.tls/ag006-api.log` with
owner-only permissions. A private launch helper initially used a wrong relative
path; it was corrected before launch. This did not affect the migration or data.

| Verification | Result |
|---|---|
| `/api/health` | 200, database connected |
| New schedules/options/search routes, no JWT | 401 (previously 404) |
| CMS creation POST route, no JWT and no payload | 401; no record created |
| Existing Auth/CMS protected routes, no JWT | 401 |
| Actual signed-in administrator session | Accepted; existing CMS lists accessible |
| Appointments | Empty calendar renders, no unavailable alert |
| Schedules | Empty list renders, no unavailable alert; no eligible doctor options yet |
| Operational Services | Empty management list renders |
| Operational Doctors | Empty management list renders |
| Existing Prices/Services CMS | Existing categories, 69 rows and eight services visible |
| Existing doctor editorial CMS | Published Dr. Anda Gutovska content visible |
| CMS creation | News/page/FAQ form renders; no save or publication attempted |
| Public CMS | 200, 192 documents |
| Public booking catalog | 200, zero services, privacy configuration absent |

The unauthenticated POST checks established route registration and authorization
without patient/content payloads. No authorized production write endpoint was used
as a test. Actual create/edit/publish success is supported by disposable integration
tests, not a live clinic write test. Existing operational-to-editorial doctor linkage
is still absent because no real operational doctor has been configured.

## Tests executed

- `bash backend/scripts/test-media-local.sh`: **PASS**, real disposable PostgreSQL
  17.11 and synthetic data. All Go packages, Auth, Booking, CMS, Media and migration
  integrations executed with explicit disposable connection guards.
- Updated activation test: default command stays at 005; altered checksum refused;
  incomplete/unknown/gapped ledger refused; valid explicit upgrade passes; duplicate
  execution is a verified no-op; weakened RLS refused; original data preserved;
  overlapping schedule failure is atomic; post-migration SQL runs successfully.
- Existing operation/API tests: profiles, price linkage, appointment collision,
  status/reschedule, schedule impact, CMS create/publish/unpublish/restore and
  ordinary-user/unauthenticated denial: **PASS** in disposable databases.
- `go vet ./...`: **PASS**; API and runner builds **PASS**.
- Hero locks: **15/15 PASS**. No frontend files changed in this activation.
- New/changed file whitespace checks: **PASS**.

## Available now / remaining blockers

Local authorized admins can access the current Appointments, Schedules, operational
Services/Doctors, CMS creation and existing editorial CMS modules. Schema and route
activation are complete. Empty catalogs are an honest state, not an outage.

Remaining separately authorized work:

1. Clinic-confirmed services/durations, operational doctor and editorial linkage,
   assignments, schedules/exceptions and required privacy configuration. No demo data.
2. Real Storage behavior verification and credentials before upload activation;
   `MEDIA_UPLOADS_ENABLED=false` remains unchanged.
3. Contact inbox/legal retention requirements; no email/Resend delivery exists.
4. Public backend hosting/deployment and hosted acceptance; none performed here.
5. Production content/appointment write acceptance only under a separate scope.

The API runs from a temporary local binary, not a deployed service. After a machine
restart or temporary-file cleanup, rebuild/start the local backend normally from
this branch. No automatic service installation was performed.

## Files changed in this activation

- `backend/cmd/migrate/main.go`
- `backend/cmd/migrate/operations.go`
- `backend/cmd/migrate/operations_activation_test.go`
- `docs/ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md`
- `docs/ADMIN_OPERATIONS_ACTIVATION.md`
- `docs/FINAL_IMPLEMENTATION_STATUS.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/DEPLOYMENT_GUIDE.md`

Private ignored helpers: `backend/.tls/operations006-postcheck.go`,
`operations006-verify-sql.go`, `operations006-start-api.go`; private API log and
new encrypted evidence directories as listed above. Migration SQL, frontend, Hero,
Welcome Intro, `.env`, Auth flows and Booking configuration were not edited.

Activation complete. Stop here; no further production changes are authorized by
this completed smoke verification.
