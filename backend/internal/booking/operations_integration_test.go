package booking_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/jackc/pgx/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type countQueries struct {
	logger.Interface
	count atomic.Int64
}

func (l *countQueries) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	l.count.Add(1)
}

func TestOperationsIntegration(t *testing.T) {
	dsn := os.Getenv("OPERATIONS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires isolated operations test database")
	}
	config, err := pgx.ParseConfig(dsn)
	if err != nil || config.Host != "127.0.0.1" || config.Database != "ag_operations_test" || os.Getenv("OPERATIONS_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("requires explicitly disposable loopback operations database")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal("local test connection failed")
	}
	raw, _ := db.DB()
	defer raw.Close()
	if err = db.Exec("INSERT INTO auth.users(id) VALUES (?)", actorID).Error; err != nil {
		t.Fatal(err)
	}
	if err = db.Exec("UPDATE user_roles SET role='admin' WHERE user_id=?", actorID).Error; err != nil {
		t.Fatal(err)
	}
	store := booking.NewStore(db)
	payload := json.RawMessage(`{"slug":"synthetic-test","name_lv":"Test LV","name_ru":"Test RU","name_en":"Test EN","active":false,"booking_enabled":false,"sort_order":0,"provenance":"development_fixture"}`)
	request := booking.OperationRequest{OperationID: uuid(801), Data: payload}
	created, err := store.SaveOperation(ctx, "services", "", actorID, request)
	if err != nil {
		t.Fatal(err)
	}
	replay, err := store.SaveOperation(ctx, "services", "", actorID, request)
	if err != nil || replay.ID != created.ID {
		t.Fatalf("idempotent retry: %v", err)
	}
	counter := &countQueries{Interface: logger.Default.LogMode(logger.Silent)}
	rows, err := booking.NewStore(db.Session(&gorm.Session{Logger: counter})).Operations(ctx, "services")
	if err != nil || len(rows) != 1 || rows[0].Version == "" {
		t.Fatalf("catalog: %v", err)
	}
	if counter.count.Load() != 2 || rows[0].Version != created.Version {
		t.Fatal("list must use two queries and match mutation revision")
	}
	request.ExpectedVersion = created.Version
	request.Data = json.RawMessage(`{"slug":"synthetic-test","name_lv":"Edited LV","name_ru":"Test RU","name_en":"Test EN","active":false,"booking_enabled":false,"sort_order":1,"provenance":"development_fixture"}`)
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			r := request
			r.OperationID = uuid(802 + i)
			_, e := store.SaveOperation(ctx, "services", created.ID, actorID, r)
			results <- e
		}(i)
	}
	wg.Wait()
	close(results)
	successes, conflicts := 0, 0
	for e := range results {
		if e == nil {
			successes++
		} else if errors.Is(e, booking.ErrConflict) {
			conflicts++
		} else {
			t.Fatal(e)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("stale writer protection: %d successes %d conflicts", successes, conflicts)
	}
	var count int64
	db.Table("admin_operation_events").Count(&count)
	if count != 2 {
		t.Fatalf("audit count %d", count)
	}
	if err = db.Exec("UPDATE user_roles SET role='user' WHERE user_id=?", actorID).Error; err != nil {
		t.Fatal(err)
	}
	request.OperationID = uuid(804)
	if _, err = store.SaveOperation(ctx, "services", created.ID, actorID, request); err == nil {
		t.Fatal("revoked admin accepted")
	}
	if _, err = store.Operations(ctx, "services;DROP TABLE services"); !errors.Is(err, booking.ErrInvalid) {
		t.Fatal("unsupported table accepted")
	}
	if err = db.Exec("UPDATE user_roles SET role='admin' WHERE user_id=?", actorID).Error; err != nil {
		t.Fatal(err)
	}
	request.ExpectedVersion = ""
	request.Data = json.RawMessage(`{"role":"admin"}`)
	if _, err = store.SaveOperation(ctx, "services", "", actorID, request); !errors.Is(err, booking.ErrInvalid) {
		t.Fatalf("unknown field accepted: %v", err)
	}

	t.Run("published price ownership and assignment preservation", func(t *testing.T) {
		content := cms.Store{DB: db}
		if _, e := content.Import(ctx, true); e != nil {
			t.Fatal(e)
		}
		doctor, e := store.SaveDoctor(ctx, "", booking.DoctorInput{Name: "Synthetic specialist", Active: true, BookingEnabled: true, Provenance: "development_fixture"})
		if e != nil {
			t.Fatal(e)
		}
		duration := 30
		input := booking.ServiceOperationInput{ServiceInput: booking.ServiceInput{Slug: "linked-synthetic", NameLV: "LV", NameRU: "RU", NameEN: "EN", DurationMinutes: &duration, Active: true, BookingEnabled: true, Provenance: "development_fixture"}, EditorialKey: "service.konsultacija", Assignments: []booking.ServiceAssignment{{DoctorID: doctor.ID, BookingEnabled: true}}}
		raw, _ := json.Marshal(input)
		row, e := store.SaveOperation(ctx, "services", "", actorID, booking.OperationRequest{OperationID: uuid(810), Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		public, e := store.Services(ctx)
		if e != nil || len(public) != 1 || public[0].PriceDisplayEN == nil || *public[0].PriceDisplayEN != "50.00" {
			t.Fatalf("published source not used: %v", e)
		}
		incomplete, err := store.Doctors(ctx, row.ID)
		if err != nil || len(incomplete) != 0 {
			t.Fatal("incomplete doctor exposed", err)
		}
		if err = db.Exec("UPDATE booking_settings SET privacy_notice_version='synthetic-test' WHERE id=1").Error; err != nil {
			t.Fatal(err)
		}
		if err = db.Exec("INSERT INTO doctor_schedules(doctor_id,weekday,start_time,end_time) VALUES (?,2,'09:00','12:00')", doctor.ID).Error; err != nil {
			t.Fatal(err)
		}
		eligible, e := store.Doctors(ctx, row.ID)
		if e != nil || len(eligible) != 1 {
			t.Fatalf("eligibility: %v", e)
		}
		doc, _, e := content.Detail(ctx, "prices.0")
		if e != nil {
			t.Fatal(e)
		}
		definition, _ := cms.DefinitionFor("prices.0")
		var payload map[string]any
		json.Unmarshal(definition.Data, &payload)
		payload["items"].([]any)[0].(map[string]any)["price"] = "57.00"
		rawPrice, _ := json.Marshal(payload)
		draft, e := content.Change(ctx, "prices.0", actorID, "draft_saved", "", doc.Version, rawPrice)
		if e != nil {
			t.Fatal(e)
		}
		public, e = store.Services(ctx)
		if e != nil || *public[0].PriceDisplayEN != "50.00" {
			t.Fatal("draft price leaked")
		}
		if _, e = content.Change(ctx, "prices.0", actorID, "published", *draft.DraftRevision, draft.Version, nil); e != nil {
			t.Fatal(e)
		}
		public, e = store.Services(ctx)
		if e != nil || *public[0].PriceDisplayEN != "57.00" {
			t.Fatal("published price not refreshed")
		}
		input.Assignments[0].BookingEnabled = false
		raw, _ = json.Marshal(input)
		_, e = store.SaveOperation(ctx, "services", row.ID, actorID, booking.OperationRequest{OperationID: uuid(811), ExpectedVersion: row.Version, Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		eligible, e = store.Doctors(ctx, row.ID)
		if e != nil || len(eligible) != 0 {
			t.Fatal("disabled assignment remains bookable")
		}
		var relations int64
		db.Table("doctor_services").Where("service_id=?", row.ID).Count(&relations)
		if relations != 1 {
			t.Fatal("historical relation deleted")
		}
		wrong := "99"
		input.PriceDisplayEN = &wrong
		raw, _ = json.Marshal(input)
		if _, e = store.SaveOperation(ctx, "services", "", actorID, booking.OperationRequest{OperationID: uuid(812), Data: raw}); !errors.Is(e, booking.ErrInvalid) {
			t.Fatal("divergent client price accepted")
		}
	})

	t.Run("registered CMS portrait links without rewriting approved content", func(t *testing.T) {
		tx := db.Begin()
		defer tx.Rollback()
		content := cms.Store{DB: tx}
		before, revisions, err := content.Detail(ctx, "clinic.doctorBio")
		if err != nil {
			t.Fatal(err)
		}
		var biography map[string]string
		for _, r := range revisions {
			if r.ID == *before.PublishedRevision {
				if err = json.Unmarshal(r.Payload, &biography); err != nil {
					t.Fatal(err)
				}
			}
		}
		input := booking.DoctorOperationInput{DoctorInput: booking.DoctorInput{Name: "Synthetic existing CMS doctor", Provenance: "development_fixture"}, Profile: booking.DoctorProfile{Biography: biography, Qualifications: map[string]string{"lv": "", "ru": "", "en": ""}}, PortraitID: "media.a5efea0fa7154c32", EditorialKey: "clinic.doctorBio", ConfirmEditorialLink: true}
		raw, _ := json.Marshal(input)
		local := booking.NewStore(tx)
		row, err := local.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(899), Data: raw})
		if err != nil {
			t.Fatal(err)
		}
		replay, err := local.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(899), Data: raw})
		if err != nil || row.ID != replay.ID {
			t.Fatal("identity/retry changed", err)
		}

		for n, portrait := range []string{"missing-portrait", "media.e701c42cea1722d5"} {
			input.PortraitID = portrait
			bad, _ := json.Marshal(input)
			_, err := local.SaveOperation(ctx, "doctors", row.ID, actorID, booking.OperationRequest{OperationID: uuid(890 + n), ExpectedVersion: row.Version, Data: bad})
			var detail *booking.ValidationDetail
			if !errors.As(err, &detail) || detail.Code != "portraitInvalid" || detail.Field != "portrait" {
				t.Fatal("portrait error must be specific", err)
			}
		}
		after, history, err := content.Detail(ctx, "clinic.doctorBio")
		if err != nil || before.Version != after.Version || *before.PublishedRevision != *after.PublishedRevision || *before.DraftRevision != *after.DraftRevision || len(revisions) != len(history) {
			t.Fatal("CMS state changed", err)
		}
	})
	t.Run("doctor profiles protect portrait history and Hero", func(t *testing.T) {
		portrait := "upload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
		if e := db.Exec(`INSERT INTO cms_media(id,url,source_hash,metadata,origin) VALUES (?,? ,repeat('a',64),'{"kind":"image"}'::jsonb,'upload')`, portrait, "cms-media:"+portrait).Error; e != nil {
			t.Fatal(e)
		}
		input := booking.DoctorOperationInput{DoctorInput: booking.DoctorInput{Name: "Synthetic profile", Provenance: "development_fixture"}, Profile: booking.DoctorProfile{Biography: map[string]string{"lv": "Synthetic LV", "ru": "Synthetic RU", "en": "Synthetic EN"}, Qualifications: map[string]string{"lv": "", "ru": "", "en": ""}}, PortraitID: portrait, EditorialKey: "clinic.doctorBio", ConfirmEditorialLink: true}
		beforeCMS, _, err := (&cms.Store{DB: db}).Detail(ctx, "clinic.doctorBio")
		if err != nil {
			t.Fatal(err)
		}
		input.ConfirmEditorialLink = false
		denied, _ := json.Marshal(input)
		if _, err := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(819), Data: denied}); !errors.Is(err, booking.ErrInvalid) {
			t.Fatal("unconfirmed link accepted", err)
		}
		input.ConfirmEditorialLink = true
		raw, _ := json.Marshal(input)
		row, e := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(820), Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		content := cms.Store{DB: db}
		if _, err := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(818), Data: raw}); !errors.Is(err, booking.ErrConflict) {
			t.Fatal("duplicate explicit link accepted", err)
		}
		afterCMS, _, err := content.Detail(ctx, "clinic.doctorBio")
		if err != nil || beforeCMS.Version != afterCMS.Version || *beforeCMS.PublishedRevision != *afterCMS.PublishedRevision {
			t.Fatal("setup changed CMS", err)
		}
		if e = content.ArchiveMedia(ctx, portrait, actorID); !errors.Is(e, cms.ErrReferenced) {
			t.Fatalf("portrait archive not blocked: %v", e)
		}
		input.PortraitID = ""
		input.Active = false
		raw, _ = json.Marshal(input)
		updated, e := store.SaveOperation(ctx, "doctors", row.ID, actorID, booking.OperationRequest{OperationID: uuid(821), ExpectedVersion: row.Version, Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		if updated.ID != row.ID {
			t.Fatal("doctor ID changed")
		}
		if e = content.ArchiveMedia(ctx, portrait, actorID); !errors.Is(e, cms.ErrReferenced) {
			t.Fatal("historical portrait unprotected")
		}
		for _, asset := range cms.Baseline.Media {
			if asset.Protected {
				input.PortraitID = asset.ID
				break
			}
		}
		raw, _ = json.Marshal(input)
		if _, e = store.SaveOperation(ctx, "doctors", row.ID, actorID, booking.OperationRequest{OperationID: uuid(822), ExpectedVersion: updated.Version, Data: raw}); !errors.Is(e, booking.ErrInvalid) {
			t.Fatalf("Hero portrait accepted: %v", e)
		}
		var failedEvents int64
		db.Table("admin_operation_events").Where("operation_id=?", uuid(822)).Count(&failedEvents)
		if failedEvents != 0 {
			t.Fatal("failed portrait left audit mutation")
		}
	})
	t.Run("created CMS content shares revisions and protects publication", func(t *testing.T) {
		for index, kind := range []string{"news", "page", "faq"} {
			t.Run(kind, func(t *testing.T) {
				content := cms.Store{DB: db}
				text := cms.LocalText{LV: "Synthetic LV", RU: "Synthetic RU", EN: "Synthetic EN"}
				payload := cms.CreatedContent{Slug: "synthetic-created-" + kind, Date: "2026-10-10", Title: text, Summary: text, Body: text, SEOTitle: text, SEODescription: text}
				raw, _ := json.Marshal(payload)
				key := "created." + kind + "." + uuid(840+index*3)
				d, e := content.CreateContent(ctx, key, actorID, raw)
				if e != nil {
					t.Fatal(e)
				}
				retry, e := content.CreateContent(ctx, key, actorID, raw)
				if e != nil || retry.Version != d.Version {
					t.Fatal("create retry", e)
				}
				if _, e = content.CreateContent(ctx, "created."+kind+"."+uuid(841+index*3), actorID, raw); !errors.Is(e, cms.ErrConflict) {
					t.Fatal("duplicate slug", e)
				}
				published, e := content.Published(ctx)
				if e != nil {
					t.Fatal(e)
				}
				for _, row := range published {
					if row.Key == key {
						t.Fatal("draft leaked")
					}
				}
				d, e = content.Change(ctx, key, actorID, "published", *d.DraftRevision, d.Version, nil)
				if e != nil {
					t.Fatal(e)
				}
				published, e = content.Published(ctx)
				found := false
				for _, row := range published {
					if row.Key == key {
						found = true
					}
				}
				if e != nil || !found {
					t.Fatal("publication missing", e)
				}
				payload.Slug = "changed-address"
				changed, _ := json.Marshal(payload)
				if _, e = content.Change(ctx, key, actorID, "draft_saved", "", d.Version, changed); !errors.Is(e, cms.ErrInvalid) {
					t.Fatal("permanent slug changed", e)
				}
				d, e = content.Change(ctx, key, actorID, "unpublished", *d.DraftRevision, d.Version, nil)
				if e != nil || d.PublishedRevision != nil {
					t.Fatal("unpublish", e)
				}
				_, history, e := content.Detail(ctx, key)
				if e != nil || len(history) != 1 {
					t.Fatal("archive destroyed history", e)
				}
				if _, e = content.Change(ctx, key, actorID, "rolled_back", history[0].ID, d.Version, nil); e != nil {
					t.Fatal("restore publication", e)
				}
			})
		}
	})

	t.Run("schedule overlap, impact and retained exceptions", func(t *testing.T) {
		store.Now = func() time.Time { return time.Date(2026, 10, 10, 0, 0, 0, 0, time.UTC) }
		var doctor, service string
		if e := db.Table("doctors").Select("id").Where("name=?", "Synthetic specialist").Scan(&doctor).Error; e != nil {
			t.Fatal(e)
		}
		db.Table("services").Select("id").Where("slug=?", "linked-synthetic").Scan(&service)
		if e := db.Exec("UPDATE doctor_services SET booking_enabled=true WHERE doctor_id=? AND service_id=?", doctor, service).Error; e != nil {
			t.Fatal(e)
		}
		if e := db.Exec("UPDATE booking_settings SET privacy_notice_version='synthetic-v1',minimum_advance_minutes=0,confirmation_mode='manual'").Error; e != nil {
			t.Fatal(e)
		}
		input := booking.ScheduleOperationInput{ScheduleInput: booking.ScheduleInput{DoctorID: doctor, Weekday: time.Monday, StartMinute: 540, EndMinute: 1020}, Active: true}
		raw, _ := json.Marshal(input)
		row, e := store.SaveOperation(ctx, "schedules", "", actorID, booking.OperationRequest{OperationID: uuid(830), Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		if _, e = store.SaveOperation(ctx, "schedules", "", actorID, booking.OperationRequest{OperationID: uuid(831), Data: raw}); !errors.Is(e, booking.ErrUnavailable) {
			t.Fatalf("overlap accepted: %v", e)
		}
		slots, _, e := store.Availability(ctx, service, doctor, "2026-10-12")
		if e != nil || len(slots) == 0 {
			t.Fatalf("preview: %v", e)
		}
		request := booking.CreateRequest{ServiceID: service, DoctorID: doctor, FirstName: "Synthetic", LastName: "Test", Phone: "+37120000000", Email: "schedule@example.invalid", StartsAt: slots[0].StartsAt, PrivacyAcknowledged: true, PrivacyNoticeVersion: "synthetic-v1"}
		receipt, _, e := store.Create(ctx, request, uuid(832), "", "", false)
		if e != nil {
			t.Fatal(e)
		}
		input.Active = false
		raw, _ = json.Marshal(input)
		var impact *booking.ScheduleImpactError
		if _, e = store.SaveOperation(ctx, "schedules", row.ID, actorID, booking.OperationRequest{OperationID: uuid(833), ExpectedVersion: row.Version, Data: raw}); !errors.As(e, &impact) || impact.Count != 1 {
			t.Fatalf("appointment impact missed: %v", e)
		}
		var active bool
		db.Table("doctor_schedules").Select("active").Where("id=?", row.ID).Scan(&active)
		if !active {
			t.Fatal("conflicting edit persisted")
		}
		off := booking.TimeOffOperationInput{DoctorID: doctor, StartLocal: "2026-10-12T00:00", EndLocal: "2026-10-13T00:00", FullDay: true, Active: true, Reason: "holiday"}
		raw, _ = json.Marshal(off)
		if _, e = store.SaveOperation(ctx, "time-off", "", actorID, booking.OperationRequest{OperationID: uuid(834), Data: raw}); !errors.As(e, &impact) {
			t.Fatalf("absence appointment impact missed: %v", e)
		}
		appointment, e := store.Get(ctx, receipt.ID)
		if e != nil || len(appointment.Version) != 64 {
			t.Fatalf("missing appointment revision: %v", e)
		}
		if receipt.Status != "pending" {
			t.Fatal("manual acceptance booking must start pending")
		}
		if _, e = store.Reschedule(ctx, receipt.ID, actorID, booking.RescheduleRequest{DoctorID: doctor, StartsAt: slots[2].StartsAt, ExpectedVersion: appointment.Version}); e != nil {
			t.Fatal("acceptance reschedule", e)
		}
		appointment, e = store.Get(ctx, receipt.ID)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = store.TransitionChecked(ctx, receipt.ID, "confirmed", actorID, appointment.Version); e != nil {
			t.Fatal("acceptance confirmation", e)
		}
		appointment, e = store.Get(ctx, receipt.ID)
		if e != nil {
			t.Fatal(e)
		}
		matches, e := store.List(ctx, booking.Filter{DateFrom: "2026-10-12", DateTo: "2026-10-12", Search: "schedule@example.invalid"})
		if e != nil || len(matches) != 1 {
			t.Fatalf("private search: %v", e)
		}
		matches, e = store.List(ctx, booking.Filter{DateFrom: "2026-10-12", DateTo: "2026-10-12", Search: "%"})
		if e != nil || len(matches) != 0 {
			t.Fatal("search wildcard not escaped")
		}
		if _, e = store.List(ctx, booking.Filter{DateFrom: "2026-10-12", DateTo: "2027-01-12"}); !errors.Is(e, booking.ErrInvalid) {
			t.Fatal("unbounded date range")
		}
		if _, e = store.TransitionChecked(ctx, receipt.ID, "cancelled", actorID, "stale"); !errors.Is(e, booking.ErrConflict) {
			t.Fatalf("stale appointment accepted: %v", e)
		}
		if _, e = store.TransitionChecked(ctx, receipt.ID, "cancelled", actorID, appointment.Version); e != nil {
			t.Fatal(e)
		}
		var lifecycle []string
		if e = db.Table("appointment_events").Where("appointment_id=?", receipt.ID).Order("created_at,id").Pluck("event_type", &lifecycle).Error; e != nil {
			t.Fatal(e)
		}
		for _, required := range []string{"created", "rescheduled", "confirmed", "cancelled"} {
			found := false
			for _, event := range lifecycle {
				if event == required {
					found = true
				}
			}
			if !found {
				t.Fatalf("missing acceptance history event %s: %v", required, lifecycle)
			}
		}
		absence, e := store.SaveOperation(ctx, "time-off", "", actorID, booking.OperationRequest{OperationID: uuid(835), Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		slots, _, e = store.Availability(ctx, service, doctor, "2026-10-12")
		if e != nil || len(slots) != 0 {
			t.Fatal("absence does not block availability")
		}
		off.Active = false
		raw, _ = json.Marshal(off)
		if _, e = store.SaveOperation(ctx, "time-off", absence.ID, actorID, booking.OperationRequest{OperationID: uuid(836), ExpectedVersion: absence.Version, Data: raw}); e != nil {
			t.Fatal(e)
		}
		slots, _, e = store.Availability(ctx, service, doctor, "2026-10-12")
		if e != nil || len(slots) == 0 {
			t.Fatal("archived exception blocks availability")
		}
	})

	t.Run("guided doctor setup is atomic and drives real booking", func(t *testing.T) {
		store.Now = func() time.Time { return time.Date(2026, 10, 10, 0, 0, 0, 0, time.UTC) }
		var service string
		if e := db.Table("services").Select("id").Where("slug=?", "linked-synthetic").Scan(&service).Error; e != nil {
			t.Fatal(e)
		}
		text := map[string]string{"lv": "", "ru": "", "en": ""}
		input := booking.DoctorOperationInput{DoctorInput: booking.DoctorInput{Name: "Synthetic guided doctor", Active: true, BookingEnabled: true, Provenance: "development_fixture"}, Profile: booking.DoctorProfile{Biography: text, Qualifications: text}, Setup: &booking.DoctorSetup{ServiceIDs: []string{service}, Hours: []booking.DoctorHours{{Weekday: time.Monday, StartMinute: 600, EndMinute: 720}}}}
		raw, _ := json.Marshal(input)
		if e := db.Exec("UPDATE booking_settings SET privacy_notice_version=NULL").Error; e != nil {
			t.Fatal(e)
		}
		if _, e := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(910), Data: raw}); !errors.Is(e, booking.ErrNotConfigured) {
			t.Fatal("incomplete privacy activation accepted", e)
		}
		var count int64
		db.Table("doctors").Where("name=?", input.Name).Count(&count)
		if count != 0 {
			t.Fatal("failed activation left a partial doctor")
		}
		if e := db.Exec("UPDATE booking_settings SET privacy_notice_version='synthetic-v1'").Error; e != nil {
			t.Fatal(e)
		}
		row, e := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(911), Data: raw})
		if e != nil {
			t.Fatal(e)
		}
		retry, e := store.SaveOperation(ctx, "doctors", "", actorID, booking.OperationRequest{OperationID: uuid(911), Data: raw})
		if e != nil || retry.ID != row.ID {
			t.Fatal("duplicate doctor on retry", e)
		}
		eligible, e := store.Doctors(ctx, service)
		if e != nil {
			t.Fatal(e)
		}
		found := false
		for _, d := range eligible {
			if d.ID == row.ID {
				found = true
			}
		}
		if !found {
			t.Fatal("doctor absent from selector")
		}
		slots, _, e := store.Availability(ctx, service, row.ID, "2026-10-12")
		if e != nil || len(slots) == 0 {
			t.Fatal("doctor has no actual slots", e)
		}
		all, _, e := store.Availability(ctx, service, "", "2026-10-12")
		if e != nil {
			t.Fatal(e)
		}
		found = false
		for _, slot := range all {
			if slot.DoctorID == row.ID {
				found = true
			}
		}
		if !found {
			t.Fatal("any-doctor excludes new eligible doctor")
		}
		off, _ := json.Marshal(booking.TimeOffOperationInput{DoctorID: row.ID, StartLocal: "2026-10-12T00:00", EndLocal: "2026-10-13T00:00", Reason: "vacation", FullDay: true, Active: true})
		if _, e := store.SaveOperation(ctx, "time-off", "", actorID, booking.OperationRequest{OperationID: uuid(912), Data: off}); e != nil {
			t.Fatal(e)
		}
		slots, _, e = store.Availability(ctx, service, row.ID, "2026-10-12")
		if e != nil || len(slots) != 0 {
			t.Fatal("vacation did not remove slots", e)
		}
	})

}
