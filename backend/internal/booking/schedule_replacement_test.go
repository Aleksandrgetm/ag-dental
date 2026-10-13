package booking_test

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"testing"
	"time"
)

func TestAtomicWeeklyReplacement(t *testing.T) {
	dsn := os.Getenv("OPERATIONS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires disposable database")
	}
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil || cfg.Host != "127.0.0.1" || cfg.Database != "ag_operations_test" || os.Getenv("OPERATIONS_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("unsafe database")
	}
	db, e := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if e != nil {
		t.Fatal(e)
	}
	raw, _ := db.DB()
	defer raw.Close()
	actor := "50000000-0000-4000-8000-000000000001"
	if e = db.Exec("INSERT INTO auth.users(id) VALUES (?);", actor).Error; e != nil {
		t.Fatal(e)
	}
	db.Exec("UPDATE user_roles SET role='admin' WHERE user_id=?", actor)
	s := booking.NewStore(db)
	ctx := context.Background()
	data := map[string]any{"name": "Synthetic schedule", "active": false, "booking_enabled": false, "sort_order": 0, "provenance": "development_fixture", "profile": map[string]any{"biography": map[string]string{"lv": "", "ru": "", "en": ""}, "qualifications": map[string]string{"lv": "", "ru": "", "en": ""}}, "setup": booking.DoctorSetup{Hours: []booking.DoctorHours{{Weekday: 1, StartMinute: 540, EndMinute: 720}, {Weekday: 1, StartMinute: 780, EndMinute: 1020}}}}
	payload, _ := json.Marshal(data)
	row, e := s.SaveOperation(ctx, "doctors", "", actor, booking.OperationRequest{OperationID: "50000000-0000-4000-8000-000000000002", Data: payload})
	if e != nil {
		t.Fatal(e)
	}
	var returned struct{ Hours []struct{ ID string } }
	json.Unmarshal(row.Data, &returned)
	data["setup"] = booking.DoctorSetup{Hours: []booking.DoctorHours{{ID: returned.Hours[0].ID, Weekday: 1, StartMinute: 540, EndMinute: 840}, {ID: returned.Hours[1].ID, Weekday: 1, StartMinute: 840, EndMinute: 1020}}}
	payload, _ = json.Marshal(data)
	row, e = s.SaveOperation(ctx, "doctors", row.ID, actor, booking.OperationRequest{OperationID: "50000000-0000-4000-8000-000000000003", ExpectedVersion: row.Version, Data: payload})
	if e != nil {
		t.Fatalf("valid final set rejected: %v", e)
	}
	var active int64
	db.Table("doctor_schedules").Where("doctor_id=? AND active", row.ID).Count(&active)
	if active != 2 {
		t.Fatal("active periods lost")
	}
	// Removing coverage must roll back the entire replacement, not just one row.
	service := "50000000-0000-4000-8000-000000000004"
	if err := db.Exec(`INSERT INTO services(id,slug,name_lv,name_ru,name_en,provenance) VALUES (?,'atomic-synthetic','Test','Test','Test','development_fixture')`, service).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO doctor_services(doctor_id,service_id) VALUES (?,?)`, row.ID, service).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint) VALUES ('ATOMIC-TEST',?,?,'Synthetic','Test','+37120000000','test@example.invalid','2026-10-12T06:30:00Z','2026-10-12T07:00:00Z','pending','synthetic',now(),gen_random_uuid(),repeat('a',64))`, service, row.ID).Error; err != nil {
		t.Fatal(err)
	}
	s.Now = func() time.Time { return time.Date(2026, 10, 11, 0, 0, 0, 0, time.UTC) }
	rows, err := s.Operations(ctx, "doctors")
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range rows {
		if r.ID == row.ID {
			row = r
		}
	}
	data["setup"] = booking.DoctorSetup{ServiceIDs: []string{service}, Hours: []booking.DoctorHours{{ID: returned.Hours[0].ID, Weekday: 1, StartMinute: 600, EndMinute: 840}, {ID: returned.Hours[1].ID, Weekday: 1, StartMinute: 840, EndMinute: 1020}}}
	payload, _ = json.Marshal(data)
	_, err = s.SaveOperation(ctx, "doctors", row.ID, actor, booking.OperationRequest{OperationID: "50000000-0000-4000-8000-000000000005", ExpectedVersion: row.Version, Data: payload})
	var impact *booking.ScheduleImpactError
	if !errors.As(err, &impact) {
		t.Fatalf("appointment coverage not protected: %v", err)
	}
	var start string
	db.Table("doctor_schedules").Select("start_time").Where("id=? AND active", returned.Hours[0].ID).Scan(&start)
	if start != "09:00:00" {
		t.Fatal("rejected replacement changed working hours")
	}

}
