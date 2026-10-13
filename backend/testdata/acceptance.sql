-- ONLY applied by acceptance-local.py to its newly created ag_acceptance_test.
UPDATE booking_settings SET confirmation_mode='manual',privacy_notice_version='synthetic-acceptance-v1',minimum_advance_minutes=0,booking_horizon_days=90;
INSERT INTO services(id,slug,name_lv,name_ru,name_en,duration_minutes,active,booking_enabled,provenance) VALUES
('20000000-0000-4000-8000-000000000001','synthetic-consultation','TESTS Konsultācija','ТЕСТ Консультация','TEST Consultation',30,true,true,'development_fixture'),
('20000000-0000-4000-8000-000000000002','synthetic-hygiene','TESTS Higiēna','ТЕСТ Гигиена','TEST Hygiene',60,true,true,'development_fixture'),
('20000000-0000-4000-8000-000000000003','synthetic-review','TESTS Pārbaude','ТЕСТ Осмотр','TEST Review',45,true,true,'development_fixture');
INSERT INTO doctors(id,name,active,booking_enabled,provenance) VALUES
('30000000-0000-4000-8000-000000000001','Dr. Synthetic One',true,true,'development_fixture'),
('30000000-0000-4000-8000-000000000002','Dr. Synthetic Two',true,true,'development_fixture');
INSERT INTO doctor_services(doctor_id,service_id) SELECT d.id,s.id FROM doctors d CROSS JOIN services s;
INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) SELECT id,day,'09:00'::time,'17:00'::time FROM doctors CROSS JOIN generate_series(0,6) day;
INSERT INTO doctor_time_off(doctor_id,starts_at,ends_at,reason) SELECT id,(((now() AT TIME ZONE 'Europe/Riga')::date + day) + '12:00'::time) AT TIME ZONE 'Europe/Riga',(((now() AT TIME ZONE 'Europe/Riga')::date + day) + '13:00'::time) AT TIME ZONE 'Europe/Riga','other' FROM doctors CROSS JOIN generate_series(0,35) day;
INSERT INTO doctor_time_off(doctor_id,starts_at,ends_at,reason) SELECT id,((now() AT TIME ZONE 'Europe/Riga')::date+40)::timestamp AT TIME ZONE 'Europe/Riga',((now() AT TIME ZONE 'Europe/Riga')::date+44)::timestamp AT TIME ZONE 'Europe/Riga','vacation' FROM doctors;
