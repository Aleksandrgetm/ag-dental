-- READ ONLY. Run only after the separately approved migration/setup.
BEGIN READ ONLY;
SELECT version FROM public.schema_migrations ORDER BY version;
SELECT table_name,column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN ('cms_media','cms_media_references','cms_media_events')
 ORDER BY table_name,ordinal_position;
SELECT c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('cms_media','cms_media_references','cms_media_events');
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public'
 AND tablename IN ('cms_media','cms_media_references','cms_media_events') ORDER BY indexname;
SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid IN ('public.cms_media'::regclass,'public.cms_media_references'::regclass,'public.cms_media_events'::regclass)
 ORDER BY relation,conname;
SELECT origin,state,protected,count(*) FROM public.cms_media GROUP BY origin,state,protected ORDER BY origin,state,protected;
SELECT count(*) AS documents FROM public.cms_documents;
SELECT count(*) AS revisions FROM public.cms_revisions;
SELECT count(*) AS media_references FROM public.cms_media_references;
SELECT event_type,count(*) FROM public.cms_media_events GROUP BY event_type;
-- Counts/fingerprints must be compared with a FRESH baseline; independent activity may occur.
SELECT (SELECT count(*) FROM auth.users) AS auth_users,
 (SELECT count(*) FROM public.user_roles) AS roles,
 (SELECT count(*) FROM public.appointments) AS appointments;
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='ag-dental-cms';
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
 WHERE schemaname='storage' AND tablename IN ('buckets','objects') ORDER BY tablename,policyname;
-- Integrity only; no filenames, signed links, credentials or original contents.
SELECT count(*) AS invalid_public_assets FROM public.cms_media
 WHERE published_at IS NOT NULL AND (origin<>'upload' OR state<>'ready' OR protected);
SELECT count(*) AS invalid_references FROM public.cms_media_references r
 JOIN public.cms_media m ON m.id=r.media_id WHERE m.state<>'ready' OR m.protected;
ROLLBACK;
