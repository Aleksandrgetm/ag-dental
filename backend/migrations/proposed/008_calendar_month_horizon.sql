-- PROPOSED ONLY. Additive capability; preserves all existing booking rules.
BEGIN;
ALTER TABLE public.booking_settings ADD COLUMN booking_horizon_months integer NOT NULL DEFAULT 0 CHECK (booking_horizon_months BETWEEN 0 AND 12);
COMMENT ON COLUMN public.booking_settings.booking_horizon_months IS '0 uses existing day horizon; positive values use Riga calendar months, clamped to the target month final day, inclusive.';
COMMIT;
