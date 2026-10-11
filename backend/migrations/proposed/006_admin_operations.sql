-- PREPARED ONLY. Not in the production runner; separate review/approval required.
BEGIN;
ALTER TABLE public.doctor_services ADD COLUMN booking_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.doctor_schedules ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.doctor_time_off ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_working_intervals_no_overlap
 EXCLUDE USING gist (doctor_id WITH =,weekday WITH =,
 daterange(effective_from,effective_until,'[]') WITH &&,
 numrange(extract(epoch FROM start_time),extract(epoch FROM end_time),'[)') WITH &&) WHERE(active);
CREATE UNIQUE INDEX cms_booking_single_editorial_source ON public.cms_booking_service_links(service_id);
CREATE TABLE public.admin_operation_events (
 operation_id uuid PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK (kind IN ('services','doctors','schedules','time-off','assignments','profiles')),
 entity_id text NOT NULL,
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 before_value jsonb,
 after_value jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_operation_history ON public.admin_operation_events(kind,entity_id,created_at DESC);
CREATE TABLE public.doctor_profiles (
 doctor_id uuid PRIMARY KEY REFERENCES public.doctors(id) ON DELETE RESTRICT,
 editorial_key text UNIQUE REFERENCES public.cms_documents(key) ON DELETE RESTRICT,
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'),
 portrait_id text REFERENCES public.cms_media(id) ON DELETE RESTRICT
);
CREATE TABLE public.admin_profile_media_references (
 operation_id uuid NOT NULL REFERENCES public.admin_operation_events(operation_id) ON DELETE RESTRICT,
 doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
 media_id text NOT NULL REFERENCES public.cms_media(id) ON DELETE RESTRICT,
 PRIMARY KEY(operation_id,media_id)
);
CREATE INDEX admin_profile_media_asset ON public.admin_profile_media_references(media_id);
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profile_media_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_profiles,public.admin_profile_media_references FROM PUBLIC,anon,authenticated;
ALTER TABLE public.admin_operation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_operation_events FROM PUBLIC,anon,authenticated;
ALTER TABLE public.cms_events DROP CONSTRAINT cms_events_event_type_check;
ALTER TABLE public.cms_events ADD CONSTRAINT cms_events_event_type_check CHECK(event_type IN ('imported','draft_saved','published','rolled_back','unpublished'));
INSERT INTO public.schema_migrations(version) VALUES ('006_admin_operations');
COMMIT;
