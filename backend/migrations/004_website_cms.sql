BEGIN;
CREATE TABLE public.cms_documents (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 180),
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  draft_revision uuid,
  published_revision uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cms_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key text NOT NULL REFERENCES public.cms_documents(key),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) IN ('object','array')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(document_key,id)
);
ALTER TABLE public.cms_documents ADD CONSTRAINT cms_draft_owned FOREIGN KEY(key,draft_revision) REFERENCES public.cms_revisions(document_key,id);
ALTER TABLE public.cms_documents ADD CONSTRAINT cms_published_owned FOREIGN KEY(key,published_revision) REFERENCES public.cms_revisions(document_key,id);
CREATE INDEX cms_revision_history ON public.cms_revisions(document_key,created_at DESC);
CREATE TABLE public.cms_media (
  id text PRIMARY KEY,
  url text NOT NULL UNIQUE,
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata)='object'),
  protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cms_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_key text NOT NULL REFERENCES public.cms_documents(key),
  revision_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('imported','draft_saved','published','rolled_back')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(document_key,revision_id) REFERENCES public.cms_revisions(document_key,id)
);
CREATE INDEX cms_events_document ON public.cms_events(document_key,created_at DESC);
-- Editorial offerings are NOT automatically bookable procedures. Mappings require verification.
CREATE TABLE public.cms_booking_service_links (
  document_key text NOT NULL REFERENCES public.cms_documents(key),
  service_id uuid NOT NULL REFERENCES public.services(id),
  PRIMARY KEY(document_key,service_id)
);
ALTER TABLE public.cms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_booking_service_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cms_documents,public.cms_revisions,public.cms_media,public.cms_events,public.cms_booking_service_links FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.cms_events_id_seq FROM PUBLIC,anon,authenticated;
INSERT INTO public.schema_migrations(version) VALUES ('004_website_cms');
COMMIT;
