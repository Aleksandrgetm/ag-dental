BEGIN;
LOCK TABLE public.cms_documents,public.cms_revisions,public.cms_media,public.cms_events,public.cms_booking_service_links IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT FROM public.cms_documents) OR EXISTS(SELECT FROM public.cms_media) THEN
  RAISE EXCEPTION 'CMS contains content; destructive rollback refused. Use revision rollback or a reviewed forward migration.';
 END IF;
END $$;
ALTER TABLE public.cms_documents DROP CONSTRAINT cms_draft_owned, DROP CONSTRAINT cms_published_owned;
DROP TABLE public.cms_booking_service_links,public.cms_events,public.cms_revisions,public.cms_media,public.cms_documents;
DELETE FROM public.schema_migrations WHERE version='004_website_cms';
COMMIT;
