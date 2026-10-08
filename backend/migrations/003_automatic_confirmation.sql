BEGIN;
SELECT pg_advisory_xact_lock(714092002);

CREATE TABLE public.booking_settings_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('migration', 'admin')),
  previous_settings jsonb NOT NULL CHECK (jsonb_typeof(previous_settings) = 'object'),
  new_settings jsonb NOT NULL CHECK (jsonb_typeof(new_settings) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_settings_events_created_idx ON public.booking_settings_events(created_at, id);
ALTER TABLE public.booking_settings_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_settings_events FROM PUBLIC, anon, authenticated;

-- Clinic-owner decision: new bookings are automatically confirmed by default.
-- This deliberate one-time configuration change also upgrades a 002 deployment
-- whose singleton still uses manual mode. It does not change any appointment.
ALTER TABLE public.booking_settings ALTER COLUMN confirmation_mode SET DEFAULT 'automatic';
WITH previous AS MATERIALIZED (
  SELECT to_jsonb(settings) - 'updated_at' AS snapshot
  FROM public.booking_settings AS settings WHERE id = 1 FOR UPDATE
), changed AS (
  UPDATE public.booking_settings AS settings SET confirmation_mode = 'automatic'
  FROM previous WHERE settings.id = 1 AND settings.confirmation_mode <> 'automatic'
  RETURNING previous.snapshot, to_jsonb(settings) - 'updated_at' AS new_snapshot
)
INSERT INTO public.booking_settings_events(source, previous_settings, new_settings)
SELECT 'migration', snapshot, new_snapshot FROM changed;

INSERT INTO public.schema_migrations(version) VALUES ('003_automatic_confirmation');
COMMIT;
