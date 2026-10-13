-- Explicit operator-only rollback. Do not discard an active month rule silently.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.booking_settings WHERE booking_horizon_months<>0) THEN
  RAISE EXCEPTION 'Calendar month rule is active; approve a replacement rule before rollback';
 END IF;
END $$;
ALTER TABLE public.booking_settings DROP COLUMN booking_horizon_months;
COMMIT;
