BEGIN;
-- Additive: retain all existing IDs, URLs, metadata and CMS revisions.
ALTER TABLE public.cms_media
 ADD COLUMN origin text NOT NULL DEFAULT 'registered' CHECK (origin IN ('registered','upload')),
 ADD COLUMN state text NOT NULL DEFAULT 'ready' CHECK (state IN ('processing','ready','failed','archived','deleted')),
 ADD COLUMN upload_key uuid UNIQUE,
 ADD COLUMN actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN published_at timestamptz,
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX cms_media_upload_hash ON public.cms_media(source_hash) WHERE origin='upload' AND state <> 'deleted';
CREATE INDEX cms_media_library ON public.cms_media(origin,state,created_at DESC);
CREATE TABLE public.cms_media_references (
 revision_id uuid NOT NULL REFERENCES public.cms_revisions(id),
 media_id text NOT NULL REFERENCES public.cms_media(id),
 field_path text NOT NULL,
 PRIMARY KEY(revision_id,media_id,field_path)
);
CREATE INDEX cms_media_reference_asset ON public.cms_media_references(media_id);
CREATE TABLE public.cms_media_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 media_id text NOT NULL REFERENCES public.cms_media(id),
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK(event_type IN ('upload_started','upload_ready','upload_failed','archived','deleted')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_media_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cms_media,public.cms_media_references,public.cms_media_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.cms_media_events_id_seq FROM PUBLIC,anon,authenticated;
-- No browser policies. The trusted Go DB role is independently authorized on every request.
INSERT INTO public.schema_migrations(version) VALUES ('005_cms_media');
COMMIT;
