BEGIN;

-- btree_gist supplies UUID equality for the doctor/time exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  name_lv text NOT NULL CHECK (length(name_lv) BETWEEN 1 AND 200),
  name_ru text NOT NULL CHECK (length(name_ru) BETWEEN 1 AND 200),
  name_en text NOT NULL CHECK (length(name_en) BETWEEN 1 AND 200),
  description_lv text,
  description_ru text,
  description_en text,
  duration_minutes integer CHECK (duration_minutes BETWEEN 1 AND 1440),
  price_display_lv text,
  price_display_ru text,
  price_display_en text,
  active boolean NOT NULL DEFAULT false,
  booking_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  provenance text NOT NULL DEFAULT 'clinic_verified' CHECK (provenance IN ('clinic_verified', 'development_fixture')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT booking_enabled OR duration_minutes IS NOT NULL)
);

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  active boolean NOT NULL DEFAULT false,
  booking_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  provenance text NOT NULL DEFAULT 'clinic_verified' CHECK (provenance IN ('clinic_verified', 'development_fixture')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.doctor_services (
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  duration_override_minutes integer CHECK (duration_override_minutes BETWEEN 1 AND 1440),
  PRIMARY KEY (doctor_id, service_id)
);
CREATE INDEX doctor_services_service_idx ON public.doctor_services(service_id, doctor_id);

CREATE TABLE public.doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- Sunday = 0
  start_time time NOT NULL,
  end_time time NOT NULL,
  effective_from date,
  effective_until date,
  CHECK (start_time < end_time),
  CHECK (extract(second FROM start_time) = 0 AND extract(second FROM end_time) = 0),
  CHECK (effective_from IS NULL OR effective_until IS NULL OR effective_from <= effective_until)
);
CREATE INDEX doctor_schedules_lookup_idx ON public.doctor_schedules(doctor_id, weekday);

CREATE TABLE public.doctor_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT 'other' CHECK (reason IN ('holiday', 'vacation', 'other')),
  full_day boolean NOT NULL DEFAULT false,
  CHECK (isfinite(starts_at) AND isfinite(ends_at) AND starts_at < ends_at)
);
CREATE INDEX doctor_time_off_range_idx ON public.doctor_time_off USING gist (doctor_id, tstzrange(starts_at, ends_at, '[)'));

CREATE TABLE public.booking_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  confirmation_mode text NOT NULL DEFAULT 'manual' CHECK (confirmation_mode IN ('manual', 'automatic')),
  booking_horizon_days integer NOT NULL DEFAULT 60 CHECK (booking_horizon_days BETWEEN 1 AND 730),
  minimum_advance_minutes integer NOT NULL DEFAULT 120 CHECK (minimum_advance_minutes BETWEEN 0 AND 525600),
  slot_interval_minutes integer NOT NULL DEFAULT 15 CHECK (slot_interval_minutes BETWEEN 1 AND 120),
  cancellation_policy jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(cancellation_policy) = 'object'),
  timezone text NOT NULL DEFAULT 'Europe/Riga' CHECK (timezone = 'Europe/Riga'),
  privacy_notice_version text CHECK (length(privacy_notice_version) BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Operational defaults, not clinic-confirmed rules. Booking is disabled until real
-- catalog/schedules and an approved privacy notice version have been configured.
INSERT INTO public.booking_settings(id) VALUES (1);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL UNIQUE CHECK (length(booking_reference) BETWEEN 8 AND 64),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  first_name text NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (length(btrim(last_name)) BETWEEN 1 AND 100),
  phone text NOT NULL CHECK (length(phone) BETWEEN 7 AND 32),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show')),
  privacy_notice_version text NOT NULL CHECK (length(privacy_notice_version) BETWEEN 1 AND 100),
  privacy_acknowledged_at timestamptz NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (doctor_id, service_id) REFERENCES public.doctor_services(doctor_id, service_id) ON DELETE RESTRICT,
  CHECK (isfinite(starts_at) AND isfinite(ends_at) AND starts_at < ends_at),
  CHECK (ends_at - starts_at <= interval '24 hours'),
  CONSTRAINT appointments_doctor_no_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed', 'completed', 'no_show'))
);
CREATE INDEX appointments_starts_at_idx ON public.appointments(starts_at);
CREATE INDEX appointments_service_status_idx ON public.appointments(service_id, status, starts_at);
CREATE INDEX appointments_doctor_status_idx ON public.appointments(doctor_id, status, starts_at);
CREATE INDEX appointments_auth_user_idx ON public.appointments(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE FUNCTION public.enforce_appointment_status_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled', 'rejected')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled', 'no_show'))
  ) THEN
    RAISE EXCEPTION 'Invalid appointment status transition' USING ERRCODE = '23514';
  END IF;
  IF OLD.status IN ('completed', 'cancelled', 'rejected', 'no_show') AND
    (OLD.starts_at, OLD.ends_at, OLD.doctor_id, OLD.service_id) IS DISTINCT FROM
    (NEW.starts_at, NEW.ends_at, NEW.doctor_id, NEW.service_id) THEN
    RAISE EXCEPTION 'Terminal appointments cannot be rescheduled' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER appointments_status_transition BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_status_transition();

CREATE TABLE public.appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'confirmed', 'rescheduled', 'cancelled', 'rejected', 'completed', 'no_show')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_events_appointment_idx ON public.appointment_events(appointment_id, created_at);

CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_event_id uuid REFERENCES public.appointment_events(id) ON DELETE RESTRICT,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('booking_received', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'administrator_notification', 'appointment_reminder')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  available_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'delivered') = (delivered_at IS NOT NULL)),
  UNIQUE (appointment_event_id, kind)
);
CREATE INDEX notification_outbox_pending_idx ON public.notification_outbox(available_at, id) WHERE status IN ('pending', 'failed');

CREATE FUNCTION public.touch_booking_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_booking_updated_at();
CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.touch_booking_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_booking_updated_at();
CREATE TRIGGER booking_settings_updated_at BEFORE UPDATE ON public.booking_settings FOR EACH ROW EXECUTE FUNCTION public.touch_booking_updated_at();

-- No public policies: booking operations go through the authenticated/validated Go
-- API. RLS does NOT constrain table owners, superusers or BYPASSRLS connections.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.services, public.doctors, public.doctor_services,
  public.doctor_schedules, public.doctor_time_off, public.booking_settings,
  public.appointments, public.appointment_events, public.notification_outbox
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_appointment_status_transition(), public.touch_booking_updated_at() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_migrations(version) VALUES ('002_booking_foundation');
COMMIT;
