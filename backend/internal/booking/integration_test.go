package booking_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/Aleksandrgetm/Dental/internal/server"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const serviceID = "10000000-0000-4000-8000-000000000001"
const doctorID = "20000000-0000-4000-8000-000000000001"
const actorID = "30000000-0000-4000-8000-000000000001"
const secondDoctorID = "20000000-0000-4000-8000-000000000002"

var ctx = context.Background()

func uuid(n int) string { return fmt.Sprintf("40000000-0000-4000-8000-%012d", n) }

type testVerifier struct{}

func (testVerifier) Verify(_ context.Context, token string) (auth.Identity, error) {
	if token == "valid" {
		return auth.Identity{ID: actorID}, nil
	}
	return auth.Identity{}, auth.ErrInvalid
}

// This suite changes ONLY an explicitly confirmed disposable database. It never
// reads .env or DATABASE_URL and requires migrations to have been applied first.
func TestPostgresIntegration(t *testing.T) {
	dsn := os.Getenv("BOOKING_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires BOOKING_TEST_DATABASE_URL and BOOKING_TEST_DATABASE_CONFIRM=disposable")
	}
	config, e := pgx.ParseConfig(dsn)
	if e != nil || !strings.HasSuffix(config.Database, "_test") || os.Getenv("BOOKING_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("requires explicitly disposable database ending _test")
	}
	db, e := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if e != nil {
		t.Fatal("test database connection failed")
	}
	raw, _ := db.DB()
	defer raw.Close()
	raw.SetMaxOpenConns(12)
	fixture, e := os.ReadFile("../../migrations/fixtures/booking_development.sql")
	if e != nil {
		t.Fatal(e)
	}
	conn, e := pgx.ConnectConfig(ctx, config)
	if e != nil {
		t.Fatal("test database unavailable")
	}
	defer conn.Close(ctx)
	s := booking.NewStore(db)
	s.Now = func() time.Time { return time.Date(2026, 10, 11, 0, 0, 0, 0, time.UTC) }
	// Include the additive CMS FK when present, without CASCADE or touching
	// unknown tables. The opt-in disposable database guard above still applies.
	truncateTables := "booking_settings_events,notification_outbox,appointment_events,appointments,doctor_time_off,doctor_schedules,doctor_services,doctors,services"
	var hasCMS bool
	if e := db.Raw("SELECT to_regclass('public.cms_booking_service_links') IS NOT NULL").Scan(&hasCMS).Error; e != nil {
		t.Fatal(e)
	}
	if hasCMS {
		truncateTables += ",cms_booking_service_links"
	}
	reset := func(t *testing.T) {
		t.Helper()
		_, e := conn.Exec(ctx, "TRUNCATE "+truncateTables+`;
   UPDATE booking_settings SET confirmation_mode=DEFAULT,booking_horizon_days=60,minimum_advance_minutes=120,slot_interval_minutes=15,timezone='Europe/Riga',privacy_notice_version=NULL,cancellation_policy='{}';
   INSERT INTO auth.users(id) VALUES ('30000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
   UPDATE user_roles SET role='admin' WHERE user_id='30000000-0000-4000-8000-000000000001';
   SET booking.allow_development_fixtures='yes';`)
		if e != nil {
			t.Fatal("test reset failed: apply migrations first", e)
		}
		if _, e = conn.Exec(ctx, string(fixture)); e != nil {
			t.Fatal("fixture failed", e)
		}
	}
	request := func() booking.CreateRequest {
		return booking.CreateRequest{ServiceID: serviceID, DoctorID: doctorID, FirstName: "Synthetic", LastName: "Test", Phone: "+371 20000000", Email: "booking-test@example.invalid", StartsAt: time.Date(2026, 10, 12, 6, 0, 0, 0, time.UTC), PrivacyAcknowledged: true, PrivacyNoticeVersion: "development-fixture-v1"}
	}
	mustCreate := func(t *testing.T, key string) booking.Receipt {
		t.Helper()
		a, _, e := s.Create(ctx, request(), key, "", "", false)
		if e != nil {
			t.Fatal(e)
		}
		return a
	}
	t.Run("catalog and eligibility", func(t *testing.T) {
		reset(t)
		services, e := s.Services(ctx)
		if e != nil || len(services) != 1 || services[0].NameRU == "" || services[0].Provenance != "development_fixture" {
			t.Fatalf("services: %+v %v", services, e)
		}
		doctors, e := s.Doctors(ctx, serviceID)
		if e != nil || len(doctors) != 1 || doctors[0].ID != doctorID {
			t.Fatal(doctors, e)
		}
		if _, e = s.Doctors(ctx, uuid(900)); !errors.Is(e, booking.ErrNotFound) {
			t.Fatal(e)
		}
	})
	t.Run("normal offday timeoff and duration gap", func(t *testing.T) {
		reset(t)
		slots, _, e := s.Availability(ctx, serviceID, "", "2026-10-12")
		if e != nil || len(slots) != 22 {
			t.Fatalf("normal slots %d %v", len(slots), e)
		}
		slots, _, e = s.Availability(ctx, serviceID, "", "2026-10-18")
		if e != nil || len(slots) != 0 {
			t.Fatal("offday", e)
		}
		if e = db.Exec(`INSERT INTO doctor_time_off(doctor_id,starts_at,ends_at) VALUES (?,?::timestamptz,?::timestamptz)`, doctorID, "2026-10-12T06:30:00Z", "2026-10-12T07:30:00Z").Error; e != nil {
			t.Fatal(e)
		}
		slots, _, e = s.Availability(ctx, serviceID, doctorID, "2026-10-12")
		if e != nil {
			t.Fatal(e)
		}
		for _, v := range slots {
			if v.StartsAt.Before(time.Date(2026, 10, 12, 7, 30, 0, 0, time.UTC)) {
				t.Fatal("60-minute service fitted into30-minute gap")
			}
		}
		if e = db.Exec(`INSERT INTO doctor_time_off(doctor_id,starts_at,ends_at,full_day) VALUES (?,?::timestamptz,?::timestamptz,true)`, doctorID, "2026-10-11T21:00:00Z", "2026-10-12T21:00:00Z").Error; e != nil {
			t.Fatal(e)
		}
		slots, _, e = s.Availability(ctx, serviceID, doctorID, "2026-10-12")
		if e != nil || len(slots) != 0 {
			t.Fatal("full day", e)
		}
	})
	t.Run("manual reserves and cancellation releases", func(t *testing.T) {
		reset(t)
		cfg, _ := s.Settings(ctx)
		cfg.ConfirmationMode = "manual"
		if e := s.UpdateSettings(ctx, cfg, actorID); e != nil {
			t.Fatal(e)
		}
		a := mustCreate(t, uuid(1))
		if a.Status != "pending" {
			t.Fatal(a.Status)
		}
		if _, _, e = s.Create(ctx, request(), uuid(2), "", "", false); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatal(e)
		}
		if _, e = s.Transition(ctx, a.ID, "cancelled", actorID); e != nil {
			t.Fatal(e)
		}
		mustCreate(t, uuid(3))
		if _, e = s.Transition(ctx, a.ID, "confirmed", actorID); !errors.Is(e, booking.ErrTransition) {
			t.Fatal("terminal transition allowed", e)
		}
	})
	t.Run("default guest confirmation reserves and cancellation releases", func(t *testing.T) {
		reset(t)
		cfg, err := s.Settings(ctx)
		if err != nil || cfg.ConfirmationMode != "automatic" {
			t.Fatal(cfg, err)
		}
		a := mustCreate(t, uuid(1))
		if a.Status != "confirmed" {
			t.Fatal(a.Status)
		}
		stored, err := s.Get(ctx, a.ID)
		if err != nil || stored.AuthUserID != nil {
			t.Fatal("guest unexpectedly linked to account", err)
		}
		if _, _, err = s.Create(ctx, request(), uuid(2), "", "", false); !errors.Is(err, booking.ErrUnavailable) {
			t.Fatal(err)
		}
		if _, err = s.Transition(ctx, a.ID, "cancelled", actorID); err != nil {
			t.Fatal(err)
		}
		replacement := mustCreate(t, uuid(3))
		if replacement.Status != "confirmed" {
			t.Fatal(replacement.Status)
		}
	})

	t.Run("automatic auth association and outbox atomicity", func(t *testing.T) {
		reset(t)
		cfg, _ := s.Settings(ctx)
		if cfg.ConfirmationMode != "automatic" {
			t.Fatal("default must be automatic", cfg.ConfirmationMode)
		}
		a, _, e := s.Create(ctx, request(), uuid(1), actorID, "", false)
		if e != nil || a.Status != "confirmed" {
			t.Fatal(a, e)
		}
		stored, e := s.Get(ctx, a.ID)
		if e != nil || stored.AuthUserID == nil || *stored.AuthUserID != actorID {
			t.Fatal(stored, e)
		}
		var events, outbox, delivered int64
		db.Table("appointment_events").Count(&events)
		db.Table("notification_outbox").Count(&outbox)
		db.Table("notification_outbox").Where("delivered_at IS NOT NULL").Count(&delivered)
		if events != 2 || outbox != 3 || delivered != 0 {
			t.Fatal(events, outbox, delivered)
		}
	})
	t.Run("simultaneous different keys exactly one booking", func(t *testing.T) {
		reset(t)
		var wg sync.WaitGroup
		start := make(chan struct{})
		errs := make([]error, 2)
		for i := range errs {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				<-start
				_, _, errs[i] = s.Create(ctx, request(), uuid(i+1), "", "", false)
			}(i)
		}
		close(start)
		wg.Wait()
		success, conflict := 0, 0
		for _, e := range errs {
			if e == nil {
				success++
			} else if errors.Is(e, booking.ErrUnavailable) {
				conflict++
			} else {
				t.Fatal(e)
			}
		}
		if success != 1 || conflict != 1 {
			t.Fatal(errs)
		}
		var n, events int64
		db.Model(&booking.Appointment{}).Count(&n)
		db.Table("appointment_events").Count(&events)
		if n != 1 || events != 2 {
			t.Fatal(n, events)
		}
	})
	t.Run("database exclusion independent of Go locking", func(t *testing.T) {
		reset(t)
		base := mustCreate(t, uuid(1))
		a, e := s.Get(ctx, base.ID)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = s.Transition(ctx, a.ID, "cancelled", actorID); e != nil {
			t.Fatal(e)
		}
		start := make(chan struct{})
		errs := make([]error, 2)
		var wg sync.WaitGroup
		for i := range errs {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				copy := a
				copy.ID = uuid(i + 20)
				copy.IdempotencyKey = uuid(i + 30)
				copy.BookingReference = fmt.Sprintf("RAW-TEST-%d", i)
				copy.Status = "pending"
				<-start
				errs[i] = db.Create(&copy).Error
			}(i)
		}
		close(start)
		wg.Wait()
		success, conflict := 0, 0
		for _, e := range errs {
			var pg *pgconn.PgError
			if e == nil {
				success++
			} else if errors.As(e, &pg) && pg.Code == "23P01" {
				conflict++
			} else {
				t.Fatal(e)
			}
		}
		if success != 1 || conflict != 1 {
			t.Fatal(errs)
		}
	})
	t.Run("simultaneous idempotency and changed payload", func(t *testing.T) {
		reset(t)
		var wg sync.WaitGroup
		start := make(chan struct{})
		a := make([]booking.Receipt, 2)
		replays := make([]bool, 2)
		errs := make([]error, 2)
		for i := range a {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				<-start
				a[i], replays[i], errs[i] = s.Create(ctx, request(), uuid(1), "", "", false)
			}(i)
		}
		close(start)
		wg.Wait()
		if errs[0] != nil || errs[1] != nil || a[0].ID != a[1].ID || replays[0] == replays[1] {
			t.Fatal(a, replays, errs)
		}
		req := request()
		req.FirstName = "Different"
		if _, _, e = s.Create(ctx, req, uuid(1), "", "", false); !errors.Is(e, booking.ErrConflict) {
			t.Fatal(e)
		}
		if _, _, e = s.Create(ctx, request(), uuid(1), actorID, "", false); !errors.Is(e, booking.ErrConflict) {
			t.Fatal("key not bound to identity", e)
		}
	})
	t.Run("invalid input unavailable service doctor horizon advance and stale consent", func(t *testing.T) {
		reset(t)
		for name, change := range map[string]func(*booking.CreateRequest){"name": func(r *booking.CreateRequest) { r.FirstName = "" }, "phone": func(r *booking.CreateRequest) { r.Phone = "abc" }, "email": func(r *booking.CreateRequest) { r.Email = "bad" }, "consent": func(r *booking.CreateRequest) { r.PrivacyAcknowledged = false }, "stale consent": func(r *booking.CreateRequest) { r.PrivacyNoticeVersion = "old" }, "uuid": func(r *booking.CreateRequest) { r.DoctorID = "bad" }, "seconds": func(r *booking.CreateRequest) { r.StartsAt = r.StartsAt.Add(time.Second) }} {
			t.Run(name, func(t *testing.T) {
				r := request()
				change(&r)
				if _, _, e := s.Create(ctx, r, uuid(1), "", "", false); !errors.Is(e, booking.ErrInvalid) {
					t.Fatal(e)
				}
			})
		}
		r := request()
		r.DoctorID = uuid(10)
		if _, _, e = s.Create(ctx, r, uuid(1), "", "", false); !errors.Is(e, booking.ErrNotFound) {
			t.Fatal(e)
		}
		r = request()
		r.StartsAt = r.StartsAt.AddDate(0, 0, 70)
		if _, _, e = s.Create(ctx, r, uuid(1), "", "", false); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatal(e)
		}
		cfg, _ := s.Settings(ctx)
		cfg.MinimumAdvanceMinutes = 72 * 60
		if e = s.UpdateSettings(ctx, cfg, actorID); e != nil {
			t.Fatal(e)
		}
		if _, _, e = s.Create(ctx, request(), uuid(1), "", "", false); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatal(e)
		}
		db.Exec("UPDATE services SET booking_enabled=false")
		if _, _, e = s.Create(ctx, request(), uuid(1), "", "", false); !errors.Is(e, booking.ErrNotFound) {
			t.Fatal(e)
		}
	})
	t.Run("any doctor assigns actual eligible alternative", func(t *testing.T) {
		reset(t)
		mustCreate(t, uuid(1))
		db.Exec(`INSERT INTO doctors(id,name,active,booking_enabled,provenance) VALUES (?,'DEVELOPMENT ONLY second doctor',true,true,'development_fixture')`, secondDoctorID)
		db.Exec(`INSERT INTO doctor_services(doctor_id,service_id,duration_override_minutes) VALUES (?,?,30)`, secondDoctorID, serviceID)
		db.Exec(`INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) VALUES (?,1,'09:00','12:00')`, secondDoctorID)
		r := request()
		r.DoctorID = ""
		a, _, e := s.Create(ctx, r, uuid(2), "", "", false)
		if e != nil || a.DoctorID != secondDoctorID || a.EndsAt.Sub(a.StartsAt) != 30*time.Minute {
			t.Fatal(a, e)
		}
	})
	t.Run("admin reschedule lifecycle and atomic failure", func(t *testing.T) {
		reset(t)
		a := mustCreate(t, uuid(1))
		if _, e = s.Transition(ctx, a.ID, "confirmed", actorID); e != nil {
			t.Fatal(e)
		}
		moved, e := s.Reschedule(ctx, a.ID, actorID, booking.RescheduleRequest{DoctorID: doctorID, StartsAt: a.StartsAt.Add(15 * time.Minute)})
		if e != nil || !moved.StartsAt.Equal(a.StartsAt.Add(15*time.Minute)) {
			t.Fatal(moved, e)
		}
		if _, e = s.Reschedule(ctx, a.ID, actorID, booking.RescheduleRequest{DoctorID: doctorID, StartsAt: a.StartsAt.Add(3 * time.Hour)}); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatal("lunch invalid", e)
		}
		unchanged, _ := s.Get(ctx, a.ID)
		if !unchanged.StartsAt.Equal(moved.StartsAt) {
			t.Fatal("failed mutation changed booking")
		}
		if _, e = s.Transition(ctx, a.ID, "completed", actorID); !errors.Is(e, booking.ErrTransition) {
			t.Fatal("future completion", e)
		}
	})
	t.Run("admin service and doctor reassignment audits and collision protection", func(t *testing.T) {
		reset(t)
		original := mustCreate(t, uuid(1))
		next := request()
		next.StartsAt = original.EndsAt
		occupied, _, err := s.Create(ctx, next, uuid(2), "", "", false)
		if err != nil {
			t.Fatal(err)
		}
		duration := 90
		alternative, err := s.SaveService(ctx, "", booking.ServiceInput{Slug: "development-only-alternative", NameLV: "TESTS", NameRU: "ТЕСТ", NameEN: "TEST", DurationMinutes: &duration, Active: true, BookingEnabled: true, Provenance: "development_fixture"})
		if err != nil {
			t.Fatal(err)
		}
		if err = s.SetDoctorService(ctx, doctorID, alternative.ID, nil); err != nil {
			t.Fatal(err)
		}
		change := booking.RescheduleRequest{ServiceID: alternative.ID, DoctorID: doctorID, StartsAt: original.StartsAt}
		if _, err = s.Reschedule(ctx, original.ID, actorID, change); !errors.Is(err, booking.ErrUnavailable) {
			t.Fatal("longer service collision accepted", err)
		}
		if _, err = s.Reschedule(ctx, original.ID, actorID, booking.RescheduleRequest{DoctorID: doctorID, StartsAt: occupied.StartsAt}); !errors.Is(err, booking.ErrUnavailable) {
			t.Fatal("occupied time accepted", err)
		}
		unchanged, err := s.Get(ctx, original.ID)
		if err != nil || unchanged.ServiceID != serviceID || !unchanged.EndsAt.Equal(original.EndsAt) {
			t.Fatal("failed change mutated original", err)
		}
		var failedEvents int64
		db.Table("appointment_events").Where("appointment_id=? AND event_type='rescheduled'", original.ID).Count(&failedEvents)
		if failedEvents != 0 {
			t.Fatal("failed changes created audit events")
		}
		duration = 30
		if err = s.SetDoctorService(ctx, doctorID, alternative.ID, &duration); err != nil {
			t.Fatal(err)
		}
		changed, err := s.Reschedule(ctx, original.ID, actorID, change)
		if err != nil || changed.ServiceID != alternative.ID || changed.EndsAt.Sub(changed.StartsAt) != 30*time.Minute || changed.Status != "confirmed" {
			t.Fatal(changed, err)
		}
		var audit struct {
			ActorUserID string
			Metadata    []byte
		}
		if err = db.Table("appointment_events").Select("actor_user_id,metadata").Where("appointment_id=? AND event_type='rescheduled'", original.ID).Take(&audit).Error; err != nil {
			t.Fatal(err)
		}
		var meta map[string]any
		if err = json.Unmarshal(audit.Metadata, &meta); err != nil || audit.ActorUserID != actorID || meta["previous_service_id"] != serviceID || meta["service_id"] != alternative.ID {
			t.Fatal("missing service audit", err)
		}
		replacementDoctor, err := s.SaveDoctor(ctx, "", booking.DoctorInput{Name: "DEVELOPMENT ONLY reassignment", Active: true, BookingEnabled: true, Provenance: "development_fixture"})
		if err != nil {
			t.Fatal(err)
		}
		change.DoctorID = replacementDoctor.ID
		if _, err = s.Reschedule(ctx, original.ID, actorID, change); !errors.Is(err, booking.ErrNotFound) {
			t.Fatal("ineligible reassignment accepted", err)
		}
		if err = s.SetDoctorService(ctx, replacementDoctor.ID, alternative.ID, &duration); err != nil {
			t.Fatal(err)
		}
		if _, err = s.AddSchedule(ctx, booking.ScheduleInput{DoctorID: replacementDoctor.ID, Weekday: time.Monday, StartMinute: 9 * 60, EndMinute: 12 * 60}); err != nil {
			t.Fatal(err)
		}
		changed, err = s.Reschedule(ctx, original.ID, actorID, change)
		if err != nil || changed.DoctorID != replacementDoctor.ID {
			t.Fatal(changed, err)
		}
	})
	t.Run("admin confirmation mode is audited and changes future bookings only", func(t *testing.T) {
		reset(t)
		original := mustCreate(t, uuid(1))
		cfg, err := s.Settings(ctx)
		if err != nil {
			t.Fatal(err)
		}
		cfg.ConfirmationMode = "manual"
		if err = s.UpdateSettings(ctx, cfg, actorID); err != nil {
			t.Fatal(err)
		}
		next := request()
		next.StartsAt = original.EndsAt
		pending, _, err := s.Create(ctx, next, uuid(2), "", "", false)
		if err != nil || pending.Status != "pending" {
			t.Fatal(pending, err)
		}
		if err = s.UpdateSettings(ctx, cfg, actorID); err != nil {
			t.Fatal(err)
		}
		var count int64
		db.Table("booking_settings_events").Count(&count)
		if count != 1 {
			t.Fatal("identical update duplicated audit", count)
		}
		var snapshot struct {
			ActorUserID, Source           string
			PreviousSettings, NewSettings []byte
		}
		if err = db.Table("booking_settings_events").Take(&snapshot).Error; err != nil {
			t.Fatal(err)
		}
		if snapshot.ActorUserID != actorID || snapshot.Source != "admin" || !bytes.Contains(snapshot.PreviousSettings, []byte(`"automatic"`)) || !bytes.Contains(snapshot.NewSettings, []byte(`"manual"`)) {
			t.Fatal("mode change not audited")
		}
		cfg.ConfirmationMode = "automatic"
		if err = s.UpdateSettings(ctx, cfg, actorID); err != nil {
			t.Fatal(err)
		}
		unchanged, _ := s.Get(ctx, original.ID)
		stillPending, _ := s.Get(ctx, pending.ID)
		if unchanged.Status != "confirmed" || stillPending.Status != "pending" {
			t.Fatal("setting changed existing statuses")
		}
		confirmed, err := s.Transition(ctx, pending.ID, "confirmed", actorID)
		if err != nil || confirmed.Status != "confirmed" {
			t.Fatal(confirmed, err)
		}
	})
	t.Run("settings audit failure rolls back configuration", func(t *testing.T) {
		reset(t)
		if err := db.Exec("ALTER TABLE booking_settings_events ADD CONSTRAINT test_reject_admin CHECK(source <> 'admin') NOT VALID").Error; err != nil {
			t.Fatal(err)
		}
		defer db.Exec("ALTER TABLE booking_settings_events DROP CONSTRAINT test_reject_admin")
		cfg, err := s.Settings(ctx)
		if err != nil {
			t.Fatal(err)
		}
		cfg.ConfirmationMode = "manual"
		if err = s.UpdateSettings(ctx, cfg, actorID); err == nil {
			t.Fatal("audit failure not returned")
		}
		cfg, err = s.Settings(ctx)
		if err != nil || cfg.ConfirmationMode != "automatic" {
			t.Fatal("partial configuration persisted", err)
		}
	})

	t.Run("HTTP health guests authorization strict input and no reference access", func(t *testing.T) {
		reset(t)
		router := server.New(db, testVerifier{}, []string{"http://localhost:5173"})
		send := func(method, path, body, token string) *httptest.ResponseRecorder {
			r := httptest.NewRequest(method, path, strings.NewReader(body))
			r.RemoteAddr = "192.0.2.1:1234"
			r.Header.Set("Content-Type", "application/json")
			r.Header.Set("Idempotency-Key", uuid(99))
			if token != "" {
				r.Header.Set("Authorization", "Bearer "+token)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			return w
		}
		if w := send("GET", "/api/health", "", ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"database":"connected"`) {
			t.Fatal(w.Code, w.Body.String())
		}
		for _, path := range []string{"/api/admin/booking/appointments", "/api/admin/booking/settings"} {
			if w := send("GET", path, "", ""); w.Code != 401 {
				t.Fatal(path, w.Code)
			}
		}

		if w := send("POST", "/api/admin/booking/appointments/"+uuid(1)+"/reschedule", `{}`, ""); w.Code != 401 {
			t.Fatal(w.Code)
		}
		if w := send("GET", "/api/booking/settings", "", ""); w.Code != 404 {
			t.Fatal("settings exposed publicly", w.Code)
		}
		if w := send("GET", "/api/booking/services", "", ""); w.Code != 200 || strings.Contains(w.Body.String(), "confirmation_mode") {
			t.Fatal("confirmation mode exposed", w.Code, w.Body.String())
		}
		db.Exec("UPDATE user_roles SET role='user' WHERE user_id=?", actorID)
		if w := send("GET", "/api/admin/booking/appointments", "", "valid"); w.Code != 403 {
			t.Fatal(w.Code)
		}
		if w := send("POST", "/api/booking/appointments", `{}`, "invalid"); w.Code != 401 {
			t.Fatal(w.Code)
		}
		if w := send("POST", "/api/booking/appointments", `{"status":"confirmed","role":"admin"}`, ""); w.Code != 400 {
			t.Fatal(w.Code)
		}
		if w := send("GET", "/api/booking/appointments/reference/AG-guess", "", ""); w.Code != 404 {
			t.Fatal(w.Code)
		}
		db.Exec("UPDATE user_roles SET role='admin' WHERE user_id=?", actorID)
		if w := send("GET", "/api/admin/booking/appointments", "", "valid"); w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		// Use a current valid future slot for the real router's clock.
		nowStore := booking.NewStore(db)
		var slot booking.Slot
		found := false
		for i := 1; i < 8; i++ {
			date := time.Now().AddDate(0, 0, i).Format("2006-01-02")
			slots, _, err := nowStore.Availability(ctx, serviceID, doctorID, date)
			if err != nil {
				t.Fatal(err)
			}
			if len(slots) > 0 {
				slot = slots[0]
				found = true
				break
			}
		}
		if !found {
			t.Fatal("no test slot")
		}
		req := request()
		req.StartsAt = slot.StartsAt
		body, _ := json.Marshal(req)
		w := send("POST", "/api/booking/appointments", string(body), "")
		if w.Code != 201 || !strings.Contains(w.Body.String(), `"status":"confirmed"`) {
			t.Fatal(w.Code, w.Body.String())
		}
		for _, private := range []string{req.Email, req.Phone, req.FirstName, "auth_user_id", "request_fingerprint"} {
			if bytes.Contains(w.Body.Bytes(), []byte(private)) {
				t.Fatal("private data leaked")
			}
		}
		w = send("POST", "/api/booking/appointments", string(body), "")
		if w.Code != 200 || w.Header().Get("Idempotency-Replayed") != "true" {
			t.Fatal(w.Code, w.Body.String())
		}
		w = send("POST", "/api/booking/appointments", string(body), "")
		if w.Code != 200 {
			t.Fatal(w.Code)
		}
		w = send("POST", "/api/booking/appointments", string(body), "")
		if w.Code != 429 {
			t.Fatal("rate limit", w.Code)
		}
	})
	t.Run("configuration methods and time off safety", func(t *testing.T) {
		reset(t)
		doc, e := s.SaveDoctor(ctx, "", booking.DoctorInput{Name: "DEVELOPMENT ONLY configured doctor", Active: true, BookingEnabled: true, Provenance: "development_fixture"})
		if e != nil {
			t.Fatal(e)
		}
		input := booking.ServiceInput{Slug: "development-only-configured", NameLV: "TESTS", NameRU: "ТЕСТ", NameEN: "TEST", Active: true, BookingEnabled: true, Provenance: "development_fixture"}
		service, e := s.SaveService(ctx, "", input)
		if e != nil || service.BookingEnabled {
			t.Fatal("missing duration must disable", e)
		}
		duration := 30
		input.DurationMinutes = &duration
		service, e = s.SaveService(ctx, service.ID, input)
		if e != nil || !service.BookingEnabled {
			t.Fatal(e)
		}
		if e = s.SetDoctorService(ctx, doc.ID, service.ID, nil); e != nil {
			t.Fatal(e)
		}
		schedule, e := s.AddSchedule(ctx, booking.ScheduleInput{DoctorID: doc.ID, Weekday: time.Monday, StartMinute: 9 * 60, EndMinute: 10 * 60})
		if e != nil {
			t.Fatal(e)
		}
		slots, _, e := s.Availability(ctx, service.ID, doc.ID, "2026-10-12")
		if e != nil || len(slots) != 3 {
			t.Fatal(slots, e)
		}
		if e = s.RemoveSchedule(ctx, schedule); e != nil {
			t.Fatal(e)
		}
		a := mustCreate(t, uuid(1))
		if _, e = s.AddTimeOff(ctx, booking.TimeOffInput{DoctorID: doctorID, StartsAt: a.StartsAt, EndsAt: a.EndsAt, Reason: "vacation"}); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatal("overlapping leave", e)
		}
		leave, e := s.AddTimeOff(ctx, booking.TimeOffInput{DoctorID: doctorID, StartsAt: a.EndsAt, EndsAt: a.EndsAt.Add(time.Hour), Reason: "other"})
		if e != nil {
			t.Fatal(e)
		}
		if e = s.RemoveTimeOff(ctx, leave); e != nil {
			t.Fatal(e)
		}
	})
	t.Run("event outbox failure rolls back entire booking", func(t *testing.T) {
		reset(t)
		if e = db.Exec("ALTER TABLE notification_outbox ADD CONSTRAINT test_reject_received CHECK(kind <> 'booking_received') NOT VALID").Error; e != nil {
			t.Fatal(e)
		}
		defer db.Exec("ALTER TABLE notification_outbox DROP CONSTRAINT test_reject_received")
		if _, _, e = s.Create(ctx, request(), uuid(1), "", "", false); e == nil {
			t.Fatal("outbox failure not returned")
		}
		var appointments, events int64
		db.Table("appointments").Count(&appointments)
		db.Table("appointment_events").Count(&events)
		if appointments != 0 || events != 0 {
			t.Fatal("partial booking persisted", appointments, events)
		}
	})
	t.Run("concurrent HTTP bookings return safe 201 and409", func(t *testing.T) {
		reset(t)
		currentStore := booking.NewStore(db)
		var slot booking.Slot
		for i := 1; i < 8; i++ {
			slots, _, err := currentStore.Availability(ctx, serviceID, doctorID, time.Now().AddDate(0, 0, i).Format("2006-01-02"))
			if err != nil {
				t.Fatal(err)
			}
			if len(slots) > 0 {
				slot = slots[0]
				break
			}
		}
		if slot.StartsAt.IsZero() {
			t.Fatal("missing test slot")
		}
		router := server.New(db, nil, []string{"http://localhost:5173"})
		req := request()
		req.StartsAt = slot.StartsAt
		body, _ := json.Marshal(req)
		start := make(chan struct{})
		responses := make([]*httptest.ResponseRecorder, 2)
		var wg sync.WaitGroup
		for i := range responses {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				r := httptest.NewRequest("POST", "/api/booking/appointments", bytes.NewReader(body))
				r.RemoteAddr = fmt.Sprintf("192.0.2.%d:1234", i+10)
				r.Header.Set("Content-Type", "application/json")
				r.Header.Set("Idempotency-Key", uuid(i+1))
				responses[i] = httptest.NewRecorder()
				<-start
				router.ServeHTTP(responses[i], r)
			}(i)
		}
		close(start)
		wg.Wait()
		created, conflict := 0, 0
		for _, w := range responses {
			switch w.Code {
			case 201:
				created++
			case 409:
				conflict++
				if strings.TrimSpace(w.Body.String()) != `{"error":"slot_unavailable"}` {
					t.Fatal(w.Body.String())
				}
			default:
				t.Fatal(w.Code, w.Body.String())
			}
		}
		if created != 1 || conflict != 1 {
			t.Fatal(created, conflict)
		}
	})

	t.Run("browser privileges and positive database duration", func(t *testing.T) {
		reset(t)
		tables := []string{"services", "doctors", "doctor_services", "doctor_schedules", "doctor_time_off", "booking_settings", "appointments", "appointment_events", "notification_outbox", "booking_settings_events"}
		for _, table := range tables {
			for _, role := range []string{"anon", "authenticated"} {
				for _, privilege := range []string{"SELECT", "INSERT", "UPDATE", "DELETE"} {
					var allowed bool
					if e = db.Raw("SELECT has_table_privilege(?, ?, ?)", role, "public."+table, privilege).Scan(&allowed).Error; e != nil || allowed {
						t.Fatal(table, role, privilege, e)
					}
				}
			}
			var rls bool
			db.Raw("SELECT relrowsecurity FROM pg_class WHERE oid=?::regclass", "public."+table).Scan(&rls)
			if !rls {
				t.Fatal(table)
			}
		}
		a := mustCreate(t, uuid(1))
		if e = db.Exec("UPDATE appointments SET ends_at=starts_at WHERE id=?", a.ID).Error; e == nil {
			t.Fatal("nonpositive duration accepted")
		}
		if e = db.Exec("UPDATE appointments SET status='pending' WHERE id=?", a.ID).Error; e == nil {
			t.Fatal("invalid raw SQL transition accepted")
		}
	})
}
