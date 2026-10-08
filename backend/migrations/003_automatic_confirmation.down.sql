BEGIN;
SELECT pg_advisory_xact_lock(714092002);

-- Admin audit history is durable user data, including events whose actor was
-- subsequently deleted from Auth. Never remove it to force a rollback.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.booking_settings_events WHERE source <> 'migration') THEN
    RAISE EXCEPTION 'Confirmation rollback refused: administrator settings audit history exists';
  END IF;
END;
$$;

-- Explicit operator rollback restores the prior default for FUTURE bookings.
-- Existing appointments retain their statuses and protected time ranges.
ALTER TABLE public.booking_settings ALTER COLUMN confirmation_mode SET DEFAULT 'manual';
UPDATE public.booking_settings SET confirmation_mode = 'manual' WHERE id = 1 AND confirmation_mode <> 'manual';

-- Safe only after the guard: remaining rows describe this reverted migration.
DROP TABLE public.booking_settings_events;
DELETE FROM public.schema_migrations WHERE version = '003_automatic_confirmation';
COMMIT;
