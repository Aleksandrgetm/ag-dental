BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.cms_documents WHERE archived_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.cms_events WHERE event_type IN ('archived','restored')) THEN
  RAISE EXCEPTION 'Refusing rollback: preserve News archive and audit history';
 END IF;
END $$;
DROP INDEX public.cms_documents_archive;
ALTER TABLE public.cms_documents DROP CONSTRAINT cms_archive_unpublished;
ALTER TABLE public.cms_documents DROP COLUMN archived_at;
ALTER TABLE public.cms_events DROP CONSTRAINT cms_events_event_type_check;
ALTER TABLE public.cms_events ADD CONSTRAINT cms_events_event_type_check CHECK(event_type IN ('imported','draft_saved','published','rolled_back','unpublished'));
COMMIT;
