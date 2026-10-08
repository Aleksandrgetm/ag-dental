-- SYNTHETIC DEVELOPMENT DATA. Not clinic facts, real staff, prices or working hours.
-- This file is NEVER automatically run by the migration runner.
BEGIN;
SELECT pg_advisory_xact_lock(714092002);
DO $$
BEGIN
  IF current_setting('booking.allow_development_fixtures', true) IS DISTINCT FROM 'yes' OR
     current_database() !~ '^(booking_development|booking_test_[a-z0-9_]+|[a-z0-9_]+_test)$' THEN
    RAISE EXCEPTION 'Development fixtures require an explicitly enabled, isolated booking development/test database';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments) OR
     EXISTS (SELECT 1 FROM public.services) OR
     EXISTS (SELECT 1 FROM public.doctors) THEN
    RAISE EXCEPTION 'Development fixtures require empty catalog and appointment tables';
  END IF;
END;
$$;
INSERT INTO public.services (
  id, slug, name_lv, name_ru, name_en, duration_minutes, active, booking_enabled, provenance
) VALUES (
  '10000000-0000-4000-8000-000000000001', 'development-only-test-service',
  'IZSTRĀDES TESTS — sintētisks pakalpojums',
  'ТЕСТ РАЗРАБОТКИ — вымышленная услуга',
  'DEVELOPMENT ONLY — synthetic test service', 60, true, true, 'development_fixture'
);
INSERT INTO public.doctors(id, name, active, booking_enabled, provenance) VALUES (
  '20000000-0000-4000-8000-000000000001',
  'DEVELOPMENT ONLY — synthetic test doctor (not clinic staff)', true, true, 'development_fixture'
);
INSERT INTO public.doctor_services(doctor_id, service_id) VALUES (
  '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'
);
INSERT INTO public.doctor_schedules(doctor_id, weekday, start_time, end_time)
SELECT '20000000-0000-4000-8000-000000000001'::uuid, weekday, hours.start_time, hours.end_time
FROM generate_series(1, 5) AS weekday
CROSS JOIN (VALUES (time '09:00', time '12:00'), (time '13:00', time '17:00')) AS hours(start_time, end_time);
UPDATE public.booking_settings SET privacy_notice_version = 'development-fixture-v1' WHERE id = 1;
COMMIT;
