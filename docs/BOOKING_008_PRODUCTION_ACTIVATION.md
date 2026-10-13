# Migration 008 production activation

2026-10-13 · AG Dental `dcdgrbziounizuigmjcm` · `feature/final-development`

**SUCCESS. Only migration 008 was applied. Public Booking remains unactivated; existing Booking settings and clinic records were preserved.** No DEMO change, schedule/service creation, upload, notification integration, deployment, commit, merge or push occurred. Hero and Welcome Intro were not modified.

## 1. Exact operation and result

Executed from `backend`, after successful fresh safety gates:

```sh
env -u DATABASE_URL go run ./cmd/migrate --apply-booking-horizon
```

The runner loads the ignored backend configuration. Removing any inherited DATABASE_URL ensures the verified local configuration is used; no URL or credential was printed.

Result:

```text
Applied 008_calendar_month_horizon; schema and ledger committed atomically; existing settings preserved
```

Applied at **2026-10-13 16:18:23.456037 UTC**. No retry or rollback was necessary. Earlier migrations were not replayed.

Reviewed migration SHA-256 remains:

```text
2b1db4fc48db4bfd36b7296bce67317aa5eb2e5ed13650c573e695c938069394
```

All migration files 001–008, including their existing rollback files, matched their pre-task checksums.

## 2. Safety gates

- Exact Supabase project-qualified database username and Auth project hostname verified.
- Session Pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, database `postgres`, PostgreSQL 17.6.
- `sslmode=verify-full`, verified trusted certificate chain and matching hostname; insecure fallback rejected.
- Trusted CA SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
- Exact ledger 001–007, no 008 column/constraint conflicts.
- All 61 production table fingerprints, schema, role inventory and sequences matched the approved preflight baseline immediately before activation.
- Encrypted mounted backup and checksum verified; isolated restore evidence remains valid.

Approved recovery archive:

```text
/Volumes/AG-Dental-Secure/AG-Dental-20261013T160454Z-backup/database.dump
SHA-256: e5278246785d4127791ec356b67e591e5f69f1f3f78672b0a5be2195a34a227a
```

The prior isolated restore verified all 57 public/Auth/Storage tables, schema, constraints, indexes, RLS and sequence state. The backup is the pre-008 recovery point, not a post-migration backup or PITR guarantee. External Storage bytes/platform secrets are not included in database recovery coverage. No new backup or restore was needed in this activation task.

## 3. Final ledger

| Version | Applied UTC |
| --- | --- |
| 001_user_roles | 2026-10-08 14:45:26.347660 |
| 002_booking_foundation | 2026-10-08 14:45:52.875126 |
| 003_automatic_confirmation | 2026-10-08 14:45:53.358552 |
| 004_website_cms | 2026-10-09 21:20:38.885622 |
| 005_cms_media | 2026-10-10 11:00:43.465901 |
| 006_admin_operations | 2026-10-10 13:33:42.900410 |
| 007_news_archive | 2026-10-11 20:06:12.069040 |
| 008_calendar_month_horizon | 2026-10-13 16:18:23.456037 |

Existing seven ledger rows and timestamps were unchanged.

## 4. Schema and configuration

Added only:

- `booking_settings.booking_horizon_months integer NOT NULL DEFAULT 0`.
- Validated `booking_settings_booking_horizon_months_check`, enforcing 0–12.
- Reviewed explanatory column comment, verified by the runner before commit.

No new table, index, extension, trigger, RLS policy or grant was introduced. Full post-migration schema comparison equals the baseline after excluding the expected new column and check. Existing appointment collision constraint remains unchanged.

Settings comparison removed only the new field and matched the original row exactly, including updated_at:

| Setting | Preserved value |
| --- | --- |
| confirmation_mode | automatic |
| booking_horizon_days | 60 |
| booking_horizon_months | **0 — new capability inactive** |
| minimum_advance_minutes | 120 |
| slot_interval_minutes | 15 |
| timezone | Europe/Riga |
| privacy_notice_version | NULL |
| cancellation_policy | unchanged empty object |

The requested future manual confirmation, one-month horizon and 24-hour notice have **not** been activated. Applying capability support is not approval to change clinic policy.

## 5. Preservation and security

Postchecks used read-only verified-TLS connections. Of 61 source tables, 59 have identical row counts and fingerprints. The only changed tables are:

1. `schema_migrations`: one new 008 row; prior rows identical.
2. `booking_settings`: existing row gains `booking_horizon_months:0`; every prior field identical.

Preserved counts:

| Area | Count |
| --- | ---: |
| Auth users / identities / roles | 1 / 1 / 1 |
| Missing/orphan Auth relationships | 0 |
| CMS documents / revisions / events | 198 / 198 / 205 |
| Media registry / media events | 13 / 4 |
| Public catalog services / categories / prices | 8 / 6 / 69 |
| Operational services / eligibility links | 0 / 0 |
| Doctors / profiles / schedule intervals | 1 / 1 / 1 |
| Time off / appointments / appointment events | 0 / 0 / 0 |
| Notification outbox | 0 |
| Storage buckets / objects | 1 / 0 |

RLS, browser grants, policies, owners, Auth signup protection, role inventory, sequences and Storage metadata match the original baseline. No administrator role or API authorization behavior changed. No patient or clinic-content write was used for verification.

Private pre/post evidence remains in:

```text
/Volumes/AG-Dental-Secure/booking008-activation-20261013T161539Z
```

## 6. Runner implementation and tests

The new dedicated operation:

- Pins the approved SQL checksum and exact transaction envelope, including its initial comment.
- Uses the existing advisory migration lock and exact prerequisite ledger.
- Rejects conflicting columns, unknown/gapped history and insecure settings access.
- Uses a 5-second lock timeout and 60-second statement timeout.
- Locks settings, captures its original values, and atomically commits DDL plus ledger.
- Verifies exact schema/default/check/comment and preserved settings before commit.
- Supports verified repeat/no-op without changing the ledger timestamp.
- Reports uncertain COMMIT safely rather than automatically retrying or rolling back.

The first disposable run exposed an inherited verifier assumption: the 006 verifier expected its pre-007 CMS event constraint. It now chooses the exact reviewed 007 constraint only when 007 is recorded. This preserves strict validation without altering either migration. Final tests passed after this correction.

| Test | Result |
| --- | --- |
| All Go packages using `sh backend/scripts/test-media-local.sh` | PASS, including disposable PostgreSQL integration |
| 008 runner first apply and repeat/no-op | PASS |
| Checksum mismatch, unknown/gapped ledger, conflicting column | Rejected as expected |
| Injected ledger-insert failure after DDL | Transaction rollback verified; no partial column/ledger |
| Synthetic CMS/service/doctor/schedule data and settings preservation | PASS |
| Repeat with disabled settings RLS | Rejected as expected |
| `python3 backend/scripts/test-booking008-local.py` | PASS, populated synthetic appointment preservation, bounds/null validation, guarded down/up, raw repeat failure and injected transaction failure |
| Migrations 001–008 file checksum preservation | PASS |
| Production pre/post fingerprint/schema/security checks | PASS |
| Hero lock script | **15/15 PASS** |
| Whitespace check for changed runner files | PASS |

All write tests used disposable synthetic PostgreSQL. The only production write was the approved 008 migration transaction. No frontend code changed; frontend build/browser suites were not rerun for this migration-only task. Existing disposable clusters were removed by their test cleanup.

## 7. Exact files changed in this task

- `backend/cmd/migrate/main.go` — explicit 008 operation and ledger dependency.
- `backend/cmd/migrate/booking_horizon.go` — checksum-pinned transactional operation and verification.
- `backend/cmd/migrate/booking_horizon_test.go` — isolated runner regressions.
- `backend/cmd/migrate/operations.go` — version-aware verification of the already-approved 007 CMS constraint.
- `docs/BOOKING_008_PRODUCTION_ACTIVATION.md` — this report.
- Private ignored helper `backend/.tls/booking008-final.go` and encrypted activation evidence.

Preexisting working-tree changes were retained. No migration source, frontend, Hero, Welcome Intro, public design or production environment flags were edited.

## 8. Remaining real Booking activation requirements

Follow `REAL_BOOKING_ACTIVATION_PLAN.md` under separate approval:

- Confirm Anda's actual hours and Henriete's dated schedule.
- Resolve elapsed-24-hour versus working-day wording and approve calendar-month interpretation.
- Approve privacy/controller/retention details and publish the accurate localized notice.
- Review existing operational identities before configuring the three confirmed offerings and two specialists; do not duplicate records or guess prices/relationships.
- Separately approve manual confirmation, month horizon 1 and final minimum notice settings.
- Verify hosted Go Backend, frontend API connection, production DEMO-off configuration, staff handling of pending appointments and final controlled launch.
- Automatic email/WhatsApp notifications remain unavailable.

Stop after verification. No public Booking activation is included in this result.
