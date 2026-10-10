BEGIN;
LOCK TABLE public.cms_media,public.cms_media_references,public.cms_media_events IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT FROM public.cms_media WHERE origin='upload') OR EXISTS(SELECT FROM public.cms_media_references) OR EXISTS(SELECT FROM public.cms_media_events) THEN
  RAISE EXCEPTION 'Media data exists; destructive rollback refused. Keep objects and revisions; use a reviewed forward fix.';
 END IF;
END $$;
DROP TABLE public.cms_media_references,public.cms_media_events;
DROP INDEX public.cms_media_upload_hash,public.cms_media_library;
ALTER TABLE public.cms_media DROP COLUMN origin,DROP COLUMN state,DROP COLUMN upload_key,DROP COLUMN actor_id,DROP COLUMN published_at,DROP COLUMN updated_at;
DELETE FROM public.schema_migrations WHERE version='005_cms_media';
COMMIT;
