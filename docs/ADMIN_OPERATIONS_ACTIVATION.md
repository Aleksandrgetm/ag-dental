# Migration 006 activation review and outcome

## Current outcome — ACTIVATED with explicit owner approval

Migration 006 committed at 2026-10-10 13:33:42.900410 UTC. The explicit opt-in runner,
fresh safety gates, unchanged-data fingerprints and actual browser checks passed.
See [the production activation report](ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md)
for exact ledger, checksums, tests and remaining clinic-data requirements. The local
backend was restarted and the Appointments/Schedules unavailable errors resolved.
Do not replay migration 006 or treat it as permission to enable booking/uploads.

The following investigation/review text is historical preparation evidence.

## Fresh investigation — 2026-10-10

See [the activation investigation](ADMIN_OPERATIONS_ACTIVATION_INVESTIGATION.md)
for actual browser reproduction, verified live 001–005 baseline, fresh AES-256
backup/isolated restore, populated synthetic migration regression and module matrix.
The immediate 404 cause is a stale running Go binary; missing 006 separately gates
operations and CMS creation. Runner integration and production approval remain
pending. The steps below are the earlier review outline, not a claim that preflight
or recovery verification is still unperformed.

006_admin_operations.sql remains under backend/migrations/proposed and outside the
reviewed 001–005 runner manifest. It has been tested on disposable PostgreSQL only.
Do not copy it into production migrations or run it manually during this task.

## Next review package

1. Obtain owner approval for read-only fresh production preflight and backup scope.
   Verify project dcdgrbziounizuigmjcm, actual pooler and verify-full CA/hostname.
2. Establish a fresh encrypted backup and isolated restore appropriate to the actual
   project. Preserve Auth/roles/CMS/history/media/Booking. Storage bytes are separate.
3. Check the following read-only queries and schema fingerprints. Unexpected results
   require review, never automatic deletion, overlap repair or role changes.
4. Integrate 006 into the runner only in a reviewed local change with checksum and
   compatibility tests; obtain explicit approval for that exact release/migration.
5. Apply via the reviewed runner once approved, inspect ledger/schema immediately,
   then verify counts/fingerprints and authorization without production test records.
6. Configure real clinic data separately; a successful migration does not activate
   public booking, uploads, contact delivery or email.

## Read-only preconditions (do not execute against an unapproved connection)

```sql
SELECT version FROM public.schema_migrations ORDER BY version;
SELECT extname FROM pg_extension WHERE extname = 'btree_gist';
SELECT to_regclass('public.admin_operation_events'),
       to_regclass('public.doctor_profiles'),
       to_regclass('public.admin_profile_media_references');
-- All three target tables and migration 006 must be absent before first application.
SELECT service_id, count(*) FROM public.cms_booking_service_links
GROUP BY service_id HAVING count(*) > 1;
-- Must return no rows; never silently choose one price source.
SELECT a.id, b.id FROM public.doctor_schedules a
JOIN public.doctor_schedules b ON a.id < b.id AND a.doctor_id = b.doctor_id
 AND a.weekday = b.weekday
 AND daterange(a.effective_from,a.effective_until,'[]') &&
     daterange(b.effective_from,b.effective_until,'[]')
 AND a.start_time < b.end_time AND b.start_time < a.end_time;
-- Must return no rows for the new exclusion constraint.
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.cms_events'::regclass;
-- Confirm the existing event constraint's name and allowed events match reviewed SQL.
SELECT 'auth_users' AS object, count(*) FROM auth.users
UNION ALL SELECT 'roles',count(*) FROM public.user_roles
UNION ALL SELECT 'appointments',count(*) FROM public.appointments
UNION ALL SELECT 'cms_documents',count(*) FROM public.cms_documents
UNION ALL SELECT 'cms_revisions',count(*) FROM public.cms_revisions
UNION ALL SELECT 'cms_media',count(*) FROM public.cms_media;
```

Record aggregate fingerprints of complete rows in approved private tooling as well
as counts; counts alone cannot establish data preservation. Account for independent
activity between snapshots. Do not print patient details or Auth records.

## Read-only postconditions

- Ledger includes 006 exactly once; prior versions unchanged.
- doctor_services.booking_enabled, doctor_schedules.active and doctor_time_off.active
  exist with NOT NULL true defaults, preserving current eligibility.
- doctor_working_intervals_no_overlap and cms_booking_single_editorial_source exist.
- admin_operation_events, doctor_profiles, admin_profile_media_references exist with
  indexes, FKs and RLS. anon/authenticated/PUBLIC have no table privileges.
- CMS event constraint adds unpublished without removing existing event types.
- Existing data/revisions/roles/appointments and statuses match the fresh baseline,
  except independently documented legitimate activity.
- No fixtures, doctors, services, schedules, appointments or uploads were added.

The migration contains no record deletion; it adds constraints that can reject an
incompatible existing state. A constraint replacement is transactional. No destructive
down migration is provided: preserve audit/reference history and review a forward
correction. If COMMIT outcome is uncertain, inspect ledger/objects before retrying.
