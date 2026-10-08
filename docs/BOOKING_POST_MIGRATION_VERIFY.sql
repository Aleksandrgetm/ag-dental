-- Run ONLY after the separately approved migration sequence.
-- This file is read-only. It returns metadata/aggregate counts, never patient contacts.
-- Expected values describe this project's FIRST booking deployment, before setup/use.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- 1. Exactly 001_user_roles, 002_booking_foundation, 003_automatic_confirmation.
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;

-- 2. btree_gist in public (expected version 1.7 on the inspected server).
-- Existing pgcrypto in extensions remains unchanged. Core UUID/range functions exist.
SELECT e.extname, e.extversion, n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('btree_gist', 'pgcrypto') ORDER BY e.extname;
SELECT to_regprocedure('pg_catalog.gen_random_uuid()') IS NOT NULL AS core_uuid,
       to_regprocedure('pg_catalog.tstzrange(timestamp with time zone,timestamp with time zone,text)') IS NOT NULL AS time_range;

-- 3. Ten existing booking tables: RLS=true; policies=0; all browser/PUBLIC access=false.
WITH expected(name) AS (
  VALUES ('services'), ('doctors'), ('doctor_services'), ('doctor_schedules'),
         ('doctor_time_off'), ('appointments'), ('appointment_events'),
         ('booking_settings'), ('notification_outbox'), ('booking_settings_events')
), relations AS (
  SELECT e.name, c.oid, c.relrowsecurity, c.relowner, c.relacl
  FROM expected e LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || e.name)
)
SELECT r.name, r.oid IS NOT NULL AS table_exists, r.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=r.name) AS policy_count,
       EXISTS (SELECT 1 FROM aclexplode(COALESCE(r.relacl, acldefault('r',r.relowner))) a WHERE a.grantee=0) AS public_table_grant,
       EXISTS (SELECT 1 FROM pg_attribute col CROSS JOIN LATERAL aclexplode(col.attacl) a WHERE col.attrelid=r.oid AND a.grantee=0) AS public_column_grant,
       has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS anon_table_access,
       has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES') AS anon_column_access,
       has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS authenticated_table_access,
       has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES') AS authenticated_column_access
FROM relations r ORDER BY r.name;

-- 4. Exactly one automatic/Riga singleton; default automatic; privacy remains unconfigured.
SELECT pg_get_expr(d.adbin,d.adrelid) AS confirmation_mode_default
FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attrelid='public.booking_settings'::regclass AND a.attname='confirmation_mode';
SELECT count(*) AS settings_rows,
       count(*) FILTER (WHERE id=1 AND confirmation_mode='automatic' AND timezone='Europe/Riga') AS automatic_riga_rows
FROM public.booking_settings;
SELECT confirmation_mode, booking_horizon_days, minimum_advance_minutes,
       slot_interval_minutes, timezone,
       privacy_notice_version IS NULL AS privacy_unconfigured,
       cancellation_policy='{}'::jsonb AS empty_cancellation_policy
FROM public.booking_settings WHERE id=1;
-- Expected automatic / 60 / 120 / 15 / Europe/Riga / true / true.

-- 5. One validated, nondeferrable exclusion constraint and a ready/valid GiST index.
-- Must use doctor equality + overlapping HALF-OPEN tstzrange [).
-- Predicate: pending, confirmed, completed, no_show; excludes cancelled/rejected.
SELECT con.conname, con.convalidated, con.condeferrable, con.condeferred,
       am.amname AS index_method, idx.indisvalid, idx.indisready,
       pg_get_constraintdef(con.oid) AS constraint_definition,
       pg_get_indexdef(idx.indexrelid) AS index_definition,
       pg_get_expr(idx.indpred,idx.indrelid) AS occupied_status_predicate
FROM pg_constraint con
JOIN pg_index idx ON idx.indexrelid=con.conindid
JOIN pg_class ic ON ic.oid=idx.indexrelid
JOIN pg_am am ON am.oid=ic.relam
WHERE con.conrelid='public.appointments'::regclass
  AND con.conname='appointments_doctor_no_overlap' AND con.contype='x';

-- 6. All 25 expected booking indexes must exist on the intended table and be ready/valid.
WITH expected(table_name,index_name) AS (
  VALUES ('services','services_pkey'),('services','services_slug_key'),
    ('doctors','doctors_pkey'),('doctor_services','doctor_services_pkey'),
    ('doctor_services','doctor_services_service_idx'),
    ('doctor_schedules','doctor_schedules_pkey'),('doctor_schedules','doctor_schedules_lookup_idx'),
    ('doctor_time_off','doctor_time_off_pkey'),('doctor_time_off','doctor_time_off_range_idx'),
    ('booking_settings','booking_settings_pkey'),
    ('appointments','appointments_pkey'),('appointments','appointments_booking_reference_key'),
    ('appointments','appointments_idempotency_key_key'),('appointments','appointments_doctor_no_overlap'),
    ('appointments','appointments_starts_at_idx'),('appointments','appointments_service_status_idx'),
    ('appointments','appointments_doctor_status_idx'),('appointments','appointments_auth_user_idx'),
    ('appointment_events','appointment_events_pkey'),('appointment_events','appointment_events_appointment_idx'),
    ('notification_outbox','notification_outbox_pkey'),
    ('notification_outbox','notification_outbox_appointment_event_id_kind_key'),
    ('notification_outbox','notification_outbox_pending_idx'),
    ('booking_settings_events','booking_settings_events_pkey'),
    ('booking_settings_events','booking_settings_events_created_idx')
)
SELECT e.table_name,e.index_name,i.oid IS NOT NULL AS index_exists,
       COALESCE(x.indrelid=to_regclass('public.'||e.table_name),false) AS table_matches,
       x.indisvalid,x.indisready
FROM expected e LEFT JOIN pg_class i ON i.oid=to_regclass('public.'||e.index_name)
LEFT JOIN pg_index x ON x.indexrelid=i.oid
ORDER BY e.table_name,e.index_name;

-- 7. Check/FK/unique constraints: all validated. Inspect positive finite appointment
-- duration <=24h; service durations1..1440; eligibility composite FK; reference/key uniqueness.
-- Auth links on appointments/events use SET NULL; user_roles FK retains CASCADE.
SELECT con.conrelid::regclass AS table_name, con.conname, con.contype,
       con.convalidated, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
WHERE con.conrelid IN (
  'public.services'::regclass,'public.doctors'::regclass,'public.doctor_services'::regclass,
  'public.doctor_schedules'::regclass,'public.doctor_time_off'::regclass,
  'public.booking_settings'::regclass,'public.appointments'::regclass,
  'public.appointment_events'::regclass,'public.notification_outbox'::regclass,
  'public.booking_settings_events'::regclass,'public.user_roles'::regclass)
AND con.contype IN ('c','f','u') ORDER BY table_name,con.conname;

-- 8. Both Auth and appointment status triggers remain enabled (O).
-- Also check the four updated_at triggers on newly created booking tables.
SELECT t.tgrelid::regclass AS table_name, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN (
  'auth.users'::regclass,'public.services'::regclass,'public.doctors'::regclass,
  'public.appointments'::regclass,'public.booking_settings'::regclass)
ORDER BY table_name,t.tgname;
SELECT p.oid::regprocedure AS function_name, p.prosecdef AS security_definer,
       p.proconfig, pg_get_functiondef(p.oid) AS definition,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p WHERE p.oid IN (
  'public.create_user_role()'::regprocedure,
  'public.enforce_appointment_status_transition()'::regprocedure,
  'public.touch_booking_updated_at()'::regprocedure);
-- Auth function must still be SECURITY DEFINER with empty search_path and literal
-- INSERT role 'user'. It must never derive role from registration metadata.

-- 9. Existing Auth/ledger protection is retained, with no role gaps or orphan roles.
SELECT t.relname, t.relrowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.relname) AS policy_count
FROM pg_class t WHERE t.oid IN ('public.user_roles'::regclass,'public.schema_migrations'::regclass);
SELECT role_name, table_name,
       has_table_privilege(role_name,format('public.%I',table_name),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS any_table_access,
       has_any_column_privilege(role_name,format('public.%I',table_name),'SELECT,INSERT,UPDATE,REFERENCES') AS any_column_access
FROM unnest(ARRAY['anon','authenticated']) AS r(role_name)
CROSS JOIN unnest(ARRAY['user_roles','schema_migrations']) AS t(table_name)
ORDER BY role_name,table_name;
SELECT (SELECT count(*) FROM public.user_roles) AS role_rows,
       (SELECT count(*) FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id=u.id WHERE r.user_id IS NULL) AS auth_users_without_role,
       (SELECT count(*) FROM public.user_roles r LEFT JOIN auth.users u ON u.id=r.user_id WHERE u.id IS NULL) AS orphan_roles;
-- Preflight: 1 role row, 0 gaps, 0 orphans. Legitimate intervening signups can raise count.

-- 10. Empty catalog/booking tables, no development fixtures, no delivered messages.
SELECT (SELECT count(*) FROM public.services) AS services,
       (SELECT count(*) FROM public.doctors) AS doctors,
       (SELECT count(*) FROM public.doctor_services) AS doctor_services,
       (SELECT count(*) FROM public.doctor_schedules) AS schedules,
       (SELECT count(*) FROM public.doctor_time_off) AS time_off,
       (SELECT count(*) FROM public.appointments) AS appointments,
       (SELECT count(*) FROM public.appointment_events) AS appointment_events,
       (SELECT count(*) FROM public.notification_outbox) AS outbox_rows,
       (SELECT count(*) FROM public.services WHERE provenance='development_fixture') AS fixture_services,
       (SELECT count(*) FROM public.doctors WHERE provenance='development_fixture') AS fixture_doctors;
SELECT count(*) AS outbox_rows,
       count(*) FILTER (WHERE status='delivered' OR delivered_at IS NOT NULL) AS delivered_rows,
       count(*) FILTER (WHERE kind='appointment_reminder') AS reminder_rows
FROM public.notification_outbox;
-- All above counts zero immediately after first deployment; nothing has been seeded/sent.

-- 11. Exactly one source=migration event, manual->automatic, no admin events.
SELECT source, previous_settings->>'confirmation_mode' AS previous_mode,
       new_settings->>'confirmation_mode' AS new_mode,
       count(*) AS event_count, count(actor_user_id) AS known_actors
FROM public.booking_settings_events
GROUP BY source,previous_settings->>'confirmation_mode',new_settings->>'confirmation_mode';

-- 12. No occupied overlap or invalid duration, without returning any patient rows.
SELECT count(*) AS occupied_overlap_pairs FROM public.appointments a
JOIN public.appointments b ON a.doctor_id=b.doctor_id AND a.id<b.id
 AND a.starts_at<b.ends_at AND b.starts_at<a.ends_at
WHERE a.status IN ('pending','confirmed','completed','no_show')
  AND b.status IN ('pending','confirmed','completed','no_show');
SELECT count(*) AS invalid_durations FROM public.appointments
WHERE NOT isfinite(starts_at) OR NOT isfinite(ends_at) OR starts_at>=ends_at
   OR ends_at-starts_at>interval '24 hours';
SELECT status,count(*) AS appointment_count FROM public.appointments GROUP BY status ORDER BY status;
-- Zero pairs / zero invalid durations / no status rows on this first deployment.
-- No INSERT/UPDATE collision test is performed on production by this script.
ROLLBACK;
