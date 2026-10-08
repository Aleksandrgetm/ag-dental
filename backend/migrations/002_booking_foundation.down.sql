BEGIN;
SELECT pg_advisory_xact_lock(714092002);
-- Deliberately refuse destructive rollback once bookings/audit records exist.
-- Exporting data and deleting it is a separate, reviewed operator operation.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.appointments) OR
     EXISTS (SELECT 1 FROM public.appointment_events) OR
     EXISTS (SELECT 1 FROM public.notification_outbox) OR
     EXISTS (SELECT 1 FROM public.services WHERE provenance <> 'development_fixture') OR
     EXISTS (SELECT 1 FROM public.doctors WHERE provenance <> 'development_fixture') OR
     EXISTS (SELECT 1 FROM public.booking_settings WHERE
       confirmation_mode <> 'manual' OR booking_horizon_days <> 60 OR
       minimum_advance_minutes <> 120 OR slot_interval_minutes <> 15 OR
       cancellation_policy <> '{}'::jsonb OR
       (privacy_notice_version IS NOT NULL AND privacy_notice_version <> 'development-fixture-v1')) THEN
    RAISE EXCEPTION 'Booking rollback refused: real catalog or appointment data exists';
  END IF;
END;
$$;
DROP TABLE public.notification_outbox;
DROP TABLE public.appointment_events;
DROP TABLE public.appointments;
DROP TABLE public.doctor_time_off;
DROP TABLE public.doctor_schedules;
DROP TABLE public.doctor_services;
DROP TABLE public.doctors;
DROP TABLE public.services;
DROP TABLE public.booking_settings;
DROP FUNCTION public.enforce_appointment_status_transition();
DROP FUNCTION public.touch_booking_updated_at();
-- btree_gist may be used by other applications and is deliberately retained.
DELETE FROM public.schema_migrations WHERE version = '002_booking_foundation';
COMMIT;
