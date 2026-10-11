-- Prepared only. Run read-only after a separately approved 006 activation.
-- Compare with the fresh private baseline, never assume counts imply row equality.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT current_database(), current_user, current_setting('transaction_read_only');
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;
SELECT extname, extversion FROM pg_extension WHERE extname IN ('btree_gist','pgcrypto');
SELECT table_name,column_name,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' AND
 ((table_name='doctor_services' AND column_name='booking_enabled') OR
  (table_name IN ('doctor_schedules','doctor_time_off') AND column_name='active'));
SELECT relname,relrowsecurity,
 has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS anon_access,
 has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS authenticated_access,
 EXISTS(SELECT FROM aclexplode(COALESCE(relacl,acldefault('r',relowner))) a WHERE a.grantee=0) AS public_grant
FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN
 ('admin_operation_events','doctor_profiles','admin_profile_media_references');
SELECT conrelid::regclass,conname,convalidated,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid IN
 ('public.admin_operation_events'::regclass,'public.doctor_profiles'::regclass,
  'public.admin_profile_media_references'::regclass,'public.doctor_schedules'::regclass,
  'public.appointments'::regclass,'public.cms_events'::regclass)
ORDER BY conrelid,conname;
SELECT c.relname,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid)
FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
WHERE c.relname IN ('doctor_working_intervals_no_overlap','cms_booking_single_editorial_source',
 'admin_operation_history','admin_profile_media_asset');
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN
 ('admin_operation_events','doctor_profiles','admin_profile_media_references');
SELECT 'auth_users' AS object,count(*) FROM auth.users
UNION ALL SELECT 'roles',count(*) FROM public.user_roles
UNION ALL SELECT 'services',count(*) FROM public.services
UNION ALL SELECT 'doctors',count(*) FROM public.doctors
UNION ALL SELECT 'schedules',count(*) FROM public.doctor_schedules
UNION ALL SELECT 'time_off',count(*) FROM public.doctor_time_off
UNION ALL SELECT 'appointments',count(*) FROM public.appointments
UNION ALL SELECT 'cms_documents',count(*) FROM public.cms_documents
UNION ALL SELECT 'cms_revisions',count(*) FROM public.cms_revisions
UNION ALL SELECT 'cms_events',count(*) FROM public.cms_events
UNION ALL SELECT 'cms_media',count(*) FROM public.cms_media
UNION ALL SELECT 'admin_operation_events',count(*) FROM public.admin_operation_events
UNION ALL SELECT 'doctor_profiles',count(*) FROM public.doctor_profiles
UNION ALL SELECT 'admin_profile_media_references',count(*) FROM public.admin_profile_media_references;
SELECT count(*) AS missing_roles FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id=u.id WHERE r.user_id IS NULL;
SELECT count(*) AS orphan_roles FROM public.user_roles r LEFT JOIN auth.users u ON u.id=r.user_id WHERE u.id IS NULL;
SELECT confirmation_mode,timezone,booking_horizon_days,minimum_advance_minutes,slot_interval_minutes,privacy_notice_version
FROM public.booking_settings;
SELECT status,count(*) FROM public.appointments GROUP BY status ORDER BY status;
ROLLBACK;
-- Also compare private row fingerprints and all CMS payloads with the captured
-- baseline. Do not create production records to test constraints or authorizations.
