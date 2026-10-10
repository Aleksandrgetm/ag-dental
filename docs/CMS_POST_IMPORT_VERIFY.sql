-- READ ONLY. Run only after the separately approved migration/import.
-- These initial-import expectations apply BEFORE any editorial writes.
-- Also execute CMS_BASELINE_VERIFY.sql with content.json as its bound $1 JSONB parameter.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_setting('transaction_read_only') AS read_only,
       current_setting('transaction_isolation') AS isolation;
SELECT version, applied_at AT TIME ZONE 'UTC' AS applied_at_utc
FROM public.schema_migrations ORDER BY version;
-- Expect exactly 001_user_roles, 002_booking_foundation,
-- 003_automatic_confirmation, 004_website_cms. Never replay 001–003.

-- Expect five rows, RLS true, browser access false, PUBLIC ACL entries zero.
SELECT c.relname, c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS anon_access,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS authenticated_access,
 (SELECT count(*) FROM aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) AS public_grants,
 (SELECT count(*) FROM pg_attribute att CROSS JOIN LATERAL aclexplode(att.attacl) a
  WHERE att.attrelid=c.oid AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid)) AS browser_column_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
 ('cms_documents','cms_revisions','cms_media','cms_events','cms_booking_service_links') ORDER BY c.relname;
-- Expect zero rows: no browser RLS policy needed for this server-owned API.
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_policies
WHERE schemaname='public' AND tablename LIKE 'cms_%';
-- Expect false / false / zero. Identity sequence must also deny browser access.
SELECT has_sequence_privilege('anon','public.cms_events_id_seq','USAGE,SELECT,UPDATE') AS anon_access,
 has_sequence_privilege('authenticated','public.cms_events_id_seq','USAGE,SELECT,UPDATE') AS authenticated_access,
 (SELECT count(*) FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('s',c.relowner))) a
  WHERE c.oid='public.cms_events_id_seq'::regclass AND a.grantee=0) AS public_grants;
-- Backend postgres has BYPASSRLS: JWT verification + current user_roles lookup
-- are the application boundary. Never ship this privileged DB connection to a browser.
SELECT rolname,rolsuper,rolbypassrls FROM pg_roles
WHERE rolname IN (current_user,'anon','authenticated') ORDER BY rolname;

-- Expect nine indexes, all valid/ready; every constraint validated.
SELECT t.relname AS table_name,i.relname AS index_name,x.indisvalid,x.indisready
FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid
WHERE t.relnamespace='public'::regnamespace AND t.relname LIKE 'cms_%' ORDER BY 1,2;
SELECT conrelid::regclass AS table_name,conname,contype,convalidated,pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid IN
 ('cms_documents'::regclass,'cms_revisions'::regclass,'cms_media'::regclass,'cms_events'::regclass,'cms_booking_service_links'::regclass)
ORDER BY 1,2;

-- Initial import: 194 documents/revisions/events; 12 media; zero Booking mappings.
SELECT count(*) AS documents,
 count(*) FILTER(WHERE draft_revision IS NULL OR published_revision IS NULL) AS incomplete,
 count(*) FILTER(WHERE version<>1 OR draft_revision<>published_revision) AS changed_from_initial_state
FROM public.cms_documents;
SELECT (SELECT count(*) FROM public.cms_revisions) AS revisions,
 (SELECT count(*) FROM public.cms_events) AS events,
 (SELECT count(*) FROM public.cms_media) AS media,
 (SELECT count(*) FROM public.cms_booking_service_links) AS booking_links,
 (SELECT count(*) FROM public.cms_events WHERE event_type<>'imported' OR actor_id IS NOT NULL) AS unexpected_initial_events;
SELECT count(*) AS invalid_pointers FROM public.cms_documents d
LEFT JOIN public.cms_revisions p ON p.id=d.published_revision AND p.document_key=d.key
LEFT JOIN public.cms_revisions r ON r.id=d.draft_revision AND r.document_key=d.key
WHERE p.id IS NULL OR r.id IS NULL OR p.published_at IS NULL;

-- Count all scalar leaves, including JSON null. Expected 2,198 total:
-- LV 651 + RU 651 + EN 651 + shared 245. The baseline verifier checks exact
-- paths and payload equality; language identity must not be inferred from text.
WITH RECURSIVE leaves(value) AS (
 SELECT r.payload FROM public.cms_documents d JOIN public.cms_revisions r ON r.id=d.published_revision
 UNION ALL
 SELECT child.value FROM leaves parent CROSS JOIN LATERAL (
  SELECT value FROM jsonb_each(CASE WHEN jsonb_typeof(parent.value)='object' THEN parent.value ELSE '{}'::jsonb END)
  UNION ALL
  SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(parent.value)='array' THEN parent.value ELSE '[]'::jsonb END)
 ) child
)
SELECT count(*) AS content_values FROM leaves WHERE jsonb_typeof(value) NOT IN ('object','array');
SELECT count(*) FILTER(WHERE d.key LIKE 'service.%') AS public_services,
 count(*) FILTER(WHERE d.key LIKE 'prices.%') AS price_categories,
 COALESCE(sum(jsonb_array_length(r.payload->'items')) FILTER(WHERE d.key LIKE 'prices.%'),0) AS price_rows,
 count(*) FILTER(WHERE d.key LIKE 'news.%') AS news_articles
FROM public.cms_documents d JOIN public.cms_revisions r ON r.id=d.published_revision;

-- Both system references are retained for provenance, excluded by server code
-- from admin lists/detail/mutations and the public feed. Expected 2 then 192.
SELECT count(*) FILTER(WHERE key IN ('messages.hero','literal.67e05d3c.0')) AS system_references,
 count(*) FILTER(WHERE key NOT IN ('messages.hero','literal.67e05d3c.0')) AS public_feed_candidates
FROM public.cms_documents;
SELECT id,url,protected,metadata->>'sha256' AS checksum FROM public.cms_media ORDER BY id;
-- Protected Hero video + poster: 2. No upload or file replacement is performed.
SELECT count(*) FILTER(WHERE protected) AS protected_assets FROM public.cms_media;

-- Preservation: compare against a FRESH preflight snapshot, not merely these counts.
SELECT (SELECT count(*) FROM auth.users) AS auth_users,
 (SELECT count(*) FROM auth.identities) AS auth_identities,
 (SELECT count(*) FROM public.user_roles) AS roles,
 (SELECT count(*) FROM public.services) AS services,
 (SELECT count(*) FROM public.doctors) AS doctors,
 (SELECT count(*) FROM public.doctor_services) AS doctor_services,
 (SELECT count(*) FROM public.doctor_schedules) AS schedules,
 (SELECT count(*) FROM public.doctor_time_off) AS time_off,
 (SELECT count(*) FROM public.appointments) AS appointments,
 (SELECT count(*) FROM public.appointment_events) AS appointment_events,
 (SELECT count(*) FROM public.notification_outbox) AS notification_outbox,
 (SELECT count(*) FROM public.booking_settings) AS booking_settings,
 (SELECT count(*) FROM public.booking_settings_events) AS booking_settings_events;
SELECT count(*) AS missing_roles FROM auth.users a LEFT JOIN public.user_roles r ON r.user_id=a.id WHERE r.user_id IS NULL;
SELECT count(*) AS orphan_roles FROM public.user_roles r LEFT JOIN auth.users a ON a.id=r.user_id WHERE a.id IS NULL;
SELECT role,count(*) FROM public.user_roles GROUP BY role;
SELECT confirmation_mode,timezone,privacy_notice_version FROM public.booking_settings;
SELECT conname,convalidated,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.appointments'::regclass AND contype='x';
ROLLBACK;
