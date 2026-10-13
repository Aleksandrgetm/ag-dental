BEGIN;
ALTER TABLE public.cms_documents ADD COLUMN archived_at timestamptz;
ALTER TABLE public.cms_documents ADD CONSTRAINT cms_archive_unpublished CHECK (archived_at IS NULL OR published_revision IS NULL);
CREATE INDEX cms_documents_archive ON public.cms_documents(archived_at) WHERE archived_at IS NOT NULL;
ALTER TABLE public.cms_events DROP CONSTRAINT cms_events_event_type_check;
ALTER TABLE public.cms_events ADD CONSTRAINT cms_events_event_type_check CHECK(event_type IN ('imported','draft_saved','published','rolled_back','unpublished','archived','restored'));
COMMIT;
