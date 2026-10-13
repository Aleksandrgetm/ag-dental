package server

// Opt-in local browser demonstration. Never compiled into the application binary.
import (
	"context"
	"fmt"
	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"testing"
	"time"
)

type calendarIdentity struct{}

func (calendarIdentity) Verify(_ context.Context, token string) (auth.Identity, error) {
	if token == "isolated-calendar-user" {
		return auth.Identity{ID: "11111111-1111-4111-8111-111111111112"}, nil
	}
	if token != "isolated-calendar-admin" {
		return auth.Identity{}, auth.ErrInvalid
	}
	return auth.Identity{ID: "11111111-1111-4111-8111-111111111111", Email: "cms@example.invalid"}, nil
}
func TestCalendarBrowser(t *testing.T) {
	if os.Getenv("CALENDAR_BROWSER") != "disposable" {
		t.Skip("opt-in disposable browser demonstration")
	}
	dsn := os.Getenv("CALENDAR_DATABASE_URL")
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil || cfg.Host != "127.0.0.1" || cfg.Database != "ag_calendar_test" {
		t.Fatal("requires isolated loopback ag_calendar_test")
	}
	db, e := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if e != nil {
		t.Fatal(e)
	}
	raw, _ := db.DB()
	defer raw.Close()
	for _, table := range []string{"appointments", "doctors", "services", "auth.users"} {
		var count int64
		if err := db.Table(table).Count(&count).Error; err != nil || count != 0 {
			t.Fatal("requires empty disposable fixture")
		}
	}
	loc, _ := time.LoadLocation("Europe/Riga")
	base := time.Now().In(loc).AddDate(0, 0, 8)
	for base.Weekday() != time.Monday {
		base = base.AddDate(0, 0, 1)
	}
	day := base.Format("2006-01-02")
	sql := `INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('11111111-1111-4111-8111-111111111112'); UPDATE user_roles SET role='admin' WHERE user_id='11111111-1111-4111-8111-111111111111';
 UPDATE booking_settings SET privacy_notice_version='synthetic-review-v1', minimum_advance_minutes=0,confirmation_mode='manual';
 INSERT INTO services(id,slug,name_lv,name_ru,name_en,duration_minutes,active,booking_enabled,provenance) VALUES
 ('20000000-0000-4000-8000-000000000001','review-consultation','Konsultācija','Консультация','Consultation',30,true,true,'development_fixture'),
 ('20000000-0000-4000-8000-000000000002','review-hygiene','Zobu higiēna','Гигиена зубов','Dental hygiene',60,true,true,'development_fixture');
 INSERT INTO doctors(id,name,active,booking_enabled,provenance) VALUES
 ('30000000-0000-4000-8000-000000000001','Dr. Anna — SYNTHETIC',true,true,'development_fixture'),
 ('30000000-0000-4000-8000-000000000002','Dr. Marks — SYNTHETIC',true,true,'development_fixture');
 INSERT INTO doctor_services(doctor_id,service_id) SELECT d.id,s.id FROM doctors d CROSS JOIN services s;
 INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) SELECT id,day,'09:00'::time,'12:00'::time FROM doctors CROSS JOIN generate_series(1,5) day;
 INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) SELECT id,day,'13:00'::time,'17:00'::time FROM doctors CROSS JOIN generate_series(1,5) day;`
	conn, e := pgx.ConnectConfig(context.Background(), cfg)
	if e != nil {
		t.Fatal(e)
	}
	defer conn.Close(context.Background())
	if _, e = conn.Exec(context.Background(), sql); e != nil {
		t.Fatal(e)
	}
	names := []string{"Laura", "Roberts", "Elina", "Martins", "Sofia", "Daniels"}
	for offset := 0; offset < 19; offset++ {
		d := base.AddDate(0, 0, offset)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		for i, hour := range []int{9, 10, 11, 13, 14, 16} {
			start := time.Date(d.Year(), d.Month(), d.Day(), hour, 0, 0, 0, loc)
			status := []string{"pending", "confirmed", "confirmed", "cancelled", "pending", "confirmed"}[i]
			doctor := fmt.Sprintf("30000000-0000-4000-8000-%012d", i%2+1)
			if e = db.Exec(`INSERT INTO appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint) VALUES (?, ?, ?, ?, 'Synthetic', '+37120000000','patient@example.invalid',?,?,?,'synthetic-review-v1',now(),gen_random_uuid(),repeat('a',64))`, fmt.Sprintf("REVIEW-%02d-%d", offset, i), fmt.Sprintf("20000000-0000-4000-8000-%012d", i%2+1), doctor, names[i], start, start.Add(time.Duration(30*(i%2+1))*time.Minute), status).Error; e != nil {
				t.Fatal(e)
			}
		}
	}
	if e = db.Exec(`INSERT INTO appointment_events(appointment_id,event_type,actor_user_id) SELECT id,'created','11111111-1111-4111-8111-111111111111' FROM appointments`).Error; e != nil {
		t.Fatal(e)
	}
	cmsSnapshot := ""
	snapshot := func() string {
		var value string
		if err := db.Raw(`SELECT md5(string_agg(row_to_json(d)::text,'' ORDER BY key)) FROM cms_documents d`).Scan(&value).Error; err != nil {
			t.Fatal(err)
		}
		return value
	}
	if os.Getenv("PROFILE_BROWSER") == "disposable" {
		if _, err := (&cms.Store{DB: db}).Import(context.Background(), true); err != nil {
			t.Fatal(err)
		}
	}
	if os.Getenv("PROFILE_BROWSER") == "disposable" {
		cmsSnapshot = snapshot()
		reproduceLegacyProfile(t, dsn)
	}
	srv := httptest.NewServer(New(db, calendarIdentity{}, []string{"http://127.0.0.1:5187"}))
	defer srv.Close()
	for _, c := range []struct {
		token  string
		status int
	}{{"", 401}, {"invalid", 401}, {"isolated-calendar-user", 403}} {
		req, _ := http.NewRequest("GET", srv.URL+"/api/admin/health", nil)
		if c.token != "" {
			req.Header.Set("Authorization", "Bearer "+c.token)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != c.status {
			t.Fatal("authorization boundary failed")
		}
	}
	script := "../../../frontend/tests/calendar-realistic-browser.cjs"
	if os.Getenv("SCHEDULE_BROWSER") == "disposable" {
		script = "../../../frontend/tests/schedule-realistic-browser.cjs"
	}
	if os.Getenv("PROFILE_BROWSER") == "disposable" {
		script = "../../../frontend/tests/profile-realistic-browser.cjs"
	}
	cmd := exec.Command("node", script)
	cmd.Env = append(os.Environ(), "CALENDAR_API="+srv.URL, "CALENDAR_DATE="+day)
	out, e := cmd.CombinedOutput()
	t.Log(string(out))
	if e != nil {
		t.Fatal("browser review failed", e)
	}
	if cmsSnapshot != "" && snapshot() != cmsSnapshot {
		t.Fatal("browser changed CMS documents")
	}
}
