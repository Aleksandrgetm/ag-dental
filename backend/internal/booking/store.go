package booking

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// All configuration/admin writers take this lock exclusively; booking creation
// takes it shared. A future writer must use WithConfigurationLock as well.
const configurationLock int64 = 714092002

type Store struct {
	DB  *gorm.DB
	Now func() time.Time
}

func NewStore(db *gorm.DB) *Store { return &Store{DB: db, Now: time.Now} }
func (s *Store) now() time.Time   { return s.Now().UTC() }
func (s *Store) WithConfigurationLock(ctx context.Context, fn func(*gorm.DB) error) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", configurationLock).Error; e != nil {
			return e
		}
		return fn(tx)
	})
}
func (s *Store) Services(ctx context.Context) ([]Service, error) {
	rows := []Service{}
	err := s.DB.WithContext(ctx).Where("active AND booking_enabled AND duration_minutes IS NOT NULL").Order("sort_order,id").Find(&rows).Error
	return rows, err
}
func (s *Store) Doctors(ctx context.Context, serviceID string) ([]Doctor, error) {
	if !ValidID(serviceID) {
		return nil, ErrInvalid
	}
	return eligible(s.DB.WithContext(ctx), serviceID, "")
}
func bookableService(tx *gorm.DB, id string) (Service, error) {
	var v Service
	e := tx.Where("id = ? AND active AND booking_enabled AND duration_minutes IS NOT NULL", id).Take(&v).Error
	if errors.Is(e, gorm.ErrRecordNotFound) {
		return v, ErrNotFound
	}
	return v, e
}
func eligible(tx *gorm.DB, serviceID, doctorID string) ([]Doctor, error) {
	if _, e := bookableService(tx, serviceID); e != nil {
		return nil, e
	}
	q := tx.Table("doctors AS d").Select("d.*").Joins("JOIN doctor_services ds ON ds.doctor_id=d.id").Where("ds.service_id=? AND d.active AND d.booking_enabled", serviceID)
	if doctorID != "" {
		q = q.Where("d.id=?", doctorID)
	}
	rows := []Doctor{}
	e := q.Order("d.sort_order,d.id").Scan(&rows).Error
	return rows, e
}
func settings(tx *gorm.DB) (Settings, error) { var v Settings; e := tx.First(&v, 1).Error; return v, e }
func (s *Store) Settings(ctx context.Context) (Settings, error) {
	return settings(s.DB.WithContext(ctx))
}

func loadAvailability(tx *gorm.DB, serviceID, doctorID, date string, now time.Time, exclude ...string) ([]Slot, Settings, error) {
	cfg, e := settings(tx)
	if e != nil {
		return nil, cfg, e
	}
	if cfg.PrivacyNoticeVersion == nil || *cfg.PrivacyNoticeVersion == "" {
		return nil, cfg, ErrNotConfigured
	}
	service, e := bookableService(tx, serviceID)
	if e != nil {
		return nil, cfg, e
	}
	doctors, e := eligible(tx, serviceID, doctorID)
	if e != nil {
		return nil, cfg, e
	}
	if doctorID != "" && len(doctors) == 0 {
		return nil, cfg, ErrNotFound
	}
	loc, e := time.LoadLocation(cfg.Timezone)
	if e != nil {
		return nil, cfg, e
	}
	day, e := time.ParseInLocation("2006-01-02", date, loc)
	if e != nil || day.Format("2006-01-02") != date {
		return nil, cfg, ErrInvalid
	}
	end := day.AddDate(0, 0, 1)
	inputs := make([]DoctorAvailability, 0, len(doctors))
	for _, d := range doctors {
		item := DoctorAvailability{ID: d.ID, DurationMinutes: *service.DurationMinutes}
		var relation struct{ DurationOverrideMinutes *int }
		if e = tx.Table("doctor_services").Where("doctor_id=? AND service_id=?", d.ID, serviceID).Take(&relation).Error; e != nil {
			return nil, cfg, e
		}
		if relation.DurationOverrideMinutes != nil {
			item.DurationMinutes = *relation.DurationOverrideMinutes
		}
		var scheduleRows []struct {
			Weekday                       int
			StartMinute, EndMinute        int
			EffectiveFrom, EffectiveUntil string
		}
		e = tx.Raw(`SELECT weekday,(EXTRACT(HOUR FROM start_time)*60+EXTRACT(MINUTE FROM start_time))::int AS start_minute,
   (EXTRACT(HOUR FROM end_time)*60+EXTRACT(MINUTE FROM end_time))::int AS end_minute,
   COALESCE(effective_from::text,'') AS effective_from,COALESCE(effective_until::text,'') AS effective_until
   FROM doctor_schedules WHERE doctor_id=?`, d.ID).Scan(&scheduleRows).Error
		if e != nil {
			return nil, cfg, e
		}
		for _, v := range scheduleRows {
			item.Schedules = append(item.Schedules, WorkingInterval{time.Weekday(v.Weekday), v.StartMinute, v.EndMinute, v.EffectiveFrom, v.EffectiveUntil})
		}
		e = tx.Table("doctor_time_off").Select("starts_at,ends_at").Where("doctor_id=? AND starts_at < ? AND ends_at > ?", d.ID, end, day).Scan(&item.TimeOff).Error
		if e != nil {
			return nil, cfg, e
		}
		busy := tx.Table("appointments").Select("starts_at,ends_at").Where("doctor_id=? AND status IN ? AND starts_at < ? AND ends_at > ?", d.ID, []string{"pending", "confirmed", "completed", "no_show"}, end, day)
		if len(exclude) > 0 {
			busy = busy.Where("id <> ?", exclude[0])
		}
		e = busy.Scan(&item.Appointments).Error
		if e != nil {
			return nil, cfg, e
		}
		inputs = append(inputs, item)
	}
	slots, e := GenerateSlots(now, date, cfg.availability(), inputs)
	if e != nil {
		return nil, cfg, ErrInvalid
	}
	return slots, cfg, nil
}
func (s *Store) Availability(ctx context.Context, serviceID, doctorID, date string) ([]Slot, Settings, error) {
	if !ValidID(serviceID) || (doctorID != "" && !ValidID(doctorID)) {
		return nil, Settings{}, ErrInvalid
	}
	var slots []Slot
	var cfg Settings
	// A consistent read prevents mixing settings and schedules from different revisions.
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := tx.Exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY").Error; e != nil {
			return e
		}
		var e error
		slots, cfg, e = loadAvailability(tx, serviceID, doctorID, date, s.now())
		return e
	})
	return slots, cfg, e
}

// Create is used for public bookings; trustedManual=true is only passed by the
// verified admin handler. Manual entries obey the same consent/schedule rules.
func (s *Store) Create(ctx context.Context, r CreateRequest, key, userID, actorID string, trustedManual bool) (Receipt, bool, error) {
	normalize(&r)
	key = strings.ToLower(key)
	if e := validate(r, key, userID); e != nil {
		return Receipt{}, false, e
	}
	if trustedManual && !ValidID(actorID) {
		return Receipt{}, false, ErrInvalid
	}
	if !trustedManual {
		actorID = userID
	}
	hash := fingerprint(r, userID, actorID)
	var receipt Receipt
	replayed := false
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Serialize same-key retries before availability checks. hash collisions only
		// serialize unrelated keys; the UUID unique constraint remains authoritative.
		if e := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 731))", key).Error; e != nil {
			return e
		}
		var existing Appointment
		e := tx.Where("idempotency_key=?", key).Take(&existing).Error
		if e == nil {
			if existing.RequestFingerprint != hash {
				return ErrConflict
			}
			receipt = existing.receipt()
			replayed = true
			return nil
		}
		if !errors.Is(e, gorm.ErrRecordNotFound) {
			return e
		}
		if e = tx.Exec("SELECT pg_advisory_xact_lock_shared(?)", configurationLock).Error; e != nil {
			return e
		}
		cfg, e := settings(tx)
		if e != nil {
			return e
		}
		if cfg.PrivacyNoticeVersion == nil {
			return ErrNotConfigured
		}
		if r.PrivacyNoticeVersion != *cfg.PrivacyNoticeVersion {
			return ErrInvalid
		}
		doctors, e := eligible(tx, r.ServiceID, r.DoctorID)
		if e != nil {
			return e
		}
		if len(doctors) == 0 {
			return ErrNotFound
		}
		loc, e := time.LoadLocation(cfg.Timezone)
		if e != nil {
			return e
		}
		date := r.StartsAt.In(loc).Format("2006-01-02")
		var selected *Slot
		// Stable doctor order prevents deadlocks for any-doctor requests. Per-doctor
		// locks give a clean recheck; the exclusion constraint also protects raw SQL.
		for _, d := range doctors {
			if e = tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 732))", d.ID).Error; e != nil {
				return e
			}
			slots, _, e := loadAvailability(tx, r.ServiceID, d.ID, date, s.now())
			if e != nil {
				return e
			}
			for _, slot := range slots {
				if slot.StartsAt.Equal(r.StartsAt) {
					copy := slot
					selected = &copy
					break
				}
			}
			if selected != nil {
				break
			}
		}
		if selected == nil {
			return ErrUnavailable
		}
		id, e := newID()
		if e != nil {
			return e
		}
		ref, e := newReference()
		if e != nil {
			return e
		}
		now := s.now()
		status := "pending"
		if cfg.ConfirmationMode == "automatic" {
			status = "confirmed"
		}
		var authID *string
		if userID != "" {
			authID = &userID
		}
		a := Appointment{ID: id, BookingReference: ref, AuthUserID: authID, ServiceID: r.ServiceID, DoctorID: selected.DoctorID,
			FirstName: r.FirstName, LastName: r.LastName, Phone: r.Phone, Email: r.Email, StartsAt: selected.StartsAt, EndsAt: selected.EndsAt, Status: status,
			PrivacyNoticeVersion: r.PrivacyNoticeVersion, PrivacyAcknowledgedAt: now, IdempotencyKey: key, RequestFingerprint: hash, CreatedAt: now, UpdatedAt: now}
		if e = tx.Create(&a).Error; e != nil {
			return databaseError(e)
		}
		meta := map[string]any{"status": status, "source": "public"}
		if trustedManual {
			meta["source"] = "admin"
		}
		if e = recordEvent(tx, a.ID, actorID, "created", meta, now, "booking_received", "administrator_notification"); e != nil {
			return e
		}
		if status == "confirmed" {
			if e = recordEvent(tx, a.ID, actorID, "confirmed", map[string]any{"automatic": true}, now, "booking_confirmed"); e != nil {
				return e
			}
		}
		receipt = a.receipt()
		return nil
	})
	return receipt, replayed, databaseError(e)
}
func databaseError(e error) error {
	var p *pgconn.PgError
	if errors.As(e, &p) {
		switch p.Code {
		case "23P01", "40001", "40P01":
			return ErrUnavailable
		case "23505":
			return ErrConflict
		}
	}
	return e
}
