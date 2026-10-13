-- DISPOSABLE acceptance runner ONLY. Confirmed services; ALL working hours synthetic.
UPDATE booking_settings SET confirmation_mode='manual',booking_horizon_months=1,minimum_advance_minutes=1440,privacy_notice_version='synthetic-acceptance-v1';
UPDATE services SET name_lv='Konsultācija pie zobārsta (ārstēšana, ķirurģija, protezēšana)',name_ru='Консультация стоматолога (лечение, хирургия, протезирование)',name_en='Dental consultation (treatment, surgery, prosthetics)',duration_minutes=30 WHERE id='20000000-0000-4000-8000-000000000001';
UPDATE services SET name_lv='Pilna mutes dobuma higiēna',name_ru='Полная гигиена полости рта',name_en='Full oral hygiene',duration_minutes=60 WHERE id='20000000-0000-4000-8000-000000000002';
UPDATE services SET name_lv='Zobārsta vizīte (ar iekļautu manipulāciju)',name_ru='Приём стоматолога (с включённой процедурой)',name_en='Dental visit (including a procedure)',duration_minutes=60 WHERE id='20000000-0000-4000-8000-000000000003';
UPDATE doctors SET name='Dr. Anda Gutovska' WHERE id='30000000-0000-4000-8000-000000000001';
UPDATE doctors SET name='Henriete Jete Otto' WHERE id='30000000-0000-4000-8000-000000000002';
UPDATE doctor_services SET booking_enabled=(doctor_id='30000000-0000-4000-8000-000000000001' AND service_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003')) OR (doctor_id='30000000-0000-4000-8000-000000000002' AND service_id='20000000-0000-4000-8000-000000000002');
UPDATE doctor_schedules SET active=false;
-- SYNTHETIC HOURS, NOT CLINIC FACTS: 09:00–17:00 for isolated tests.
INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) VALUES ('30000000-0000-4000-8000-000000000001',3,'09:00','17:00'),('30000000-0000-4000-8000-000000000001',5,'09:00','17:00');
INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time,effective_from,effective_until)
SELECT '30000000-0000-4000-8000-000000000002',extract(dow FROM d)::int,'09:00'::time,'17:00'::time,d,d FROM (SELECT (now() AT TIME ZONE 'Europe/Riga')::date+i AS d FROM generate_series(2,32,2) i) dates;
