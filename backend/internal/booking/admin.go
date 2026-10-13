package booking

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"strings"
	"time"
)

type Filter struct {
	Date, DoctorID, ServiceID, Status string
	DateFrom, DateTo, Search          string
	Limit, Offset                     int
}

func validStatus(s string) bool {
	switch s {
	case "pending", "confirmed", "completed", "cancelled", "rejected", "no_show":
		return true
	}
	return false
}
func (s *Store) List(ctx context.Context, f Filter) ([]Appointment, error) {
	if (f.DoctorID != "" && !ValidID(f.DoctorID)) || (f.ServiceID != "" && !ValidID(f.ServiceID)) || (f.Status != "" && !validStatus(f.Status)) || f.Offset < 0 || f.Offset > 10000 {
		return nil, ErrInvalid
	}
	if f.Limit == 0 {
		f.Limit = 50
	}
	if f.Limit < 1 || f.Limit > 200 {
		return nil, ErrInvalid
	}
	q := s.DB.WithContext(ctx).Model(&Appointment{})
	if len(f.Search) > 100 {
		return nil, ErrInvalid
	}
	if f.Search != "" {
		needle := "%" + strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(strings.TrimSpace(f.Search)) + "%"
		q = q.Where("first_name ILIKE ? OR last_name ILIKE ? OR booking_reference ILIKE ? OR email ILIKE ? OR phone ILIKE ?", needle, needle, needle, needle, needle)
	}
	if f.DateFrom != "" || f.DateTo != "" {
		loc, _ := time.LoadLocation("Europe/Riga")
		start, e := time.ParseInLocation("2006-01-02", f.DateFrom, loc)
		if e != nil {
			return nil, ErrInvalid
		}
		end, e := time.ParseInLocation("2006-01-02", f.DateTo, loc)
		if e != nil || end.Before(start) || end.After(start.AddDate(0, 0, 42)) || f.Date != "" {
			return nil, ErrInvalid
		}
		q = q.Where("starts_at >= ? AND starts_at < ?", start, end.AddDate(0, 0, 1))
	}
	if f.DoctorID != "" {
		q = q.Where("doctor_id=?", f.DoctorID)
	}
	if f.ServiceID != "" {
		q = q.Where("service_id=?", f.ServiceID)
	}
	if f.Status != "" {
		q = q.Where("status=?", f.Status)
	}
	if f.Date != "" {
		loc, _ := time.LoadLocation("Europe/Riga")
		d, e := time.ParseInLocation("2006-01-02", f.Date, loc)
		if e != nil || d.Format("2006-01-02") != f.Date {
			return nil, ErrInvalid
		}
		q = q.Where("starts_at >= ? AND starts_at < ?", d, d.AddDate(0, 0, 1))
	}
	rows := []Appointment{}
	e := q.Order("starts_at,id").Limit(f.Limit).Offset(f.Offset).Find(&rows).Error
	for i := range rows {
		rows[i].Version = appointmentVersion(rows[i])
	}
	return rows, e
}
func getAppointment(tx *gorm.DB, id string) (Appointment, error) {
	var a Appointment
	if !ValidID(id) {
		return a, ErrInvalid
	}
	e := tx.Where("id=?", id).Take(&a).Error
	if errors.Is(e, gorm.ErrRecordNotFound) {
		e = ErrNotFound
	}
	return a, e
}
func (s *Store) Get(ctx context.Context, id string) (Appointment, error) {
	a, e := getAppointment(s.DB.WithContext(ctx), id)
	a.Version = appointmentVersion(a)
	return a, e
}

func (s *Store) RescheduleAvailability(ctx context.Context, id, service, doctor, date string) ([]Slot, error) {
	if !ValidID(id) || !ValidID(service) || !ValidID(doctor) {
		return nil, ErrInvalid
	}
	var slots []Slot
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := tx.Exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY").Error; e != nil {
			return e
		}
		a, e := getAppointment(tx, id)
		if e != nil {
			return e
		}
		if a.Status != "pending" && a.Status != "confirmed" {
			return ErrTransition
		}
		slots, _, e = loadAvailability(tx, service, doctor, date, s.now(), id)
		return e
	})
	return slots, e
}
func appointmentVersion(a Appointment) string {
	a.Version = ""
	raw, _ := json.Marshal(a)
	return revision(raw)
}
func (s *Store) Transition(ctx context.Context, id, to, actor string) (Receipt, error) {
	return s.TransitionChecked(ctx, id, to, actor, "")
}
func (s *Store) TransitionChecked(ctx context.Context, id, to, actor, expected string) (Receipt, error) {
	if !ValidID(id) || !ValidID(actor) || !validStatus(to) {
		return Receipt{}, ErrInvalid
	}
	var receipt Receipt
	e := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if e := operationAdmin(tx, actor); e != nil {
			return e
		}
		a, e := getAppointment(tx, id)
		if e != nil {
			return e
		}
		if a.Status == to {
			receipt = a.receipt()
			return nil
		}
		if expected != "" && expected != appointmentVersion(a) {
			return ErrConflict
		}
		if !CanTransition(a.Status, to) {
			return ErrTransition
		}
		now := s.now()
		if (to == "completed" && a.EndsAt.After(now)) || (to == "no_show" && a.StartsAt.After(now)) {
			return ErrTransition
		}
		if e = tx.Model(&a).Updates(map[string]any{"status": to, "updated_at": now}).Error; e != nil {
			return databaseError(e)
		}
		kinds := []string{}
		switch to {
		case "confirmed":
			kinds = append(kinds, "booking_confirmed")
		case "cancelled", "rejected":
			kinds = append(kinds, "booking_cancelled")
		}
		if e = recordEvent(tx, a.ID, actor, to, map[string]any{"status": to}, now, kinds...); e != nil {
			return e
		}
		a.Status = to
		receipt = a.receipt()
		return nil
	})
	return receipt, databaseError(e)
}

type RescheduleRequest struct {
	ExpectedVersion string    `json:"expected_version,omitempty"`
	ServiceID       string    `json:"service_id,omitempty"`
	DoctorID        string    `json:"doctor_id"`
	StartsAt        time.Time `json:"starts_at"`
}

func (s *Store) Reschedule(ctx context.Context, id, actor string, r RescheduleRequest) (Receipt, error) {
	if !ValidID(id) || !ValidID(actor) || !ValidID(r.DoctorID) || (r.ServiceID != "" && !ValidID(r.ServiceID)) || r.StartsAt.IsZero() || r.StartsAt.Second() != 0 || r.StartsAt.Nanosecond() != 0 {
		return Receipt{}, ErrInvalid
	}
	var receipt Receipt
	e := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if e := operationAdmin(tx, actor); e != nil {
			return e
		}
		a, e := getAppointment(tx, id)
		if e != nil {
			return e
		}
		if a.Status != "pending" && a.Status != "confirmed" {
			return ErrTransition
		}
		serviceID := strings.ToLower(r.ServiceID)
		if serviceID == "" {
			serviceID = a.ServiceID
		}
		if r.ExpectedVersion != "" && r.ExpectedVersion != appointmentVersion(a) {
			if a.ServiceID == serviceID && a.DoctorID == r.DoctorID && a.StartsAt.Equal(r.StartsAt) {
				receipt = a.receipt()
				return nil
			}
			return ErrConflict
		}
		loc, _ := time.LoadLocation("Europe/Riga")
		slots, _, e := loadAvailability(tx, serviceID, r.DoctorID, r.StartsAt.In(loc).Format("2006-01-02"), s.now(), a.ID)
		if e != nil {
			return e
		}
		var chosen *Slot
		for _, slot := range slots {
			if slot.StartsAt.Equal(r.StartsAt) {
				v := slot
				chosen = &v
				break
			}
		}
		if chosen == nil {
			return ErrUnavailable
		}
		if a.ServiceID == serviceID && a.DoctorID == chosen.DoctorID && a.StartsAt.Equal(chosen.StartsAt) && a.EndsAt.Equal(chosen.EndsAt) {
			receipt = a.receipt()
			return nil
		}
		meta := map[string]any{"previous_service_id": a.ServiceID, "service_id": serviceID, "previous_doctor_id": a.DoctorID, "previous_starts_at": a.StartsAt, "previous_ends_at": a.EndsAt, "doctor_id": chosen.DoctorID, "starts_at": chosen.StartsAt, "ends_at": chosen.EndsAt}
		now := s.now()
		if e = tx.Model(&a).Updates(map[string]any{"service_id": serviceID, "doctor_id": chosen.DoctorID, "starts_at": chosen.StartsAt, "ends_at": chosen.EndsAt, "updated_at": now}).Error; e != nil {
			return databaseError(e)
		}
		if e = recordEvent(tx, a.ID, actor, "rescheduled", meta, now, "booking_rescheduled", "administrator_notification"); e != nil {
			return e
		}
		a.ServiceID = serviceID
		a.DoctorID = chosen.DoctorID
		a.StartsAt = chosen.StartsAt
		a.EndsAt = chosen.EndsAt
		receipt = a.receipt()
		return nil
	})
	return receipt, databaseError(e)
}
func (s *Store) UpdateSettings(ctx context.Context, cfg Settings, actor string) error {
	if !ValidID(actor) {
		return ErrInvalid
	}
	if (cfg.ConfirmationMode != "manual" && cfg.ConfirmationMode != "automatic") || cfg.BookingHorizonMonths < 0 || cfg.BookingHorizonMonths > 12 || cfg.BookingHorizonDays < 1 || cfg.BookingHorizonDays > 730 || cfg.MinimumAdvanceMinutes < 0 || cfg.MinimumAdvanceMinutes > 525600 || cfg.SlotIntervalMinutes < 1 || cfg.SlotIntervalMinutes > 120 || cfg.Timezone != "Europe/Riga" {
		return ErrInvalid
	}
	if cfg.PrivacyNoticeVersion != nil && !cleanText(*cfg.PrivacyNoticeVersion, 1, 100) {
		return ErrInvalid
	}
	var policy map[string]any
	if len(cfg.CancellationPolicy) == 0 {
		cfg.CancellationPolicy = json.RawMessage(`{}`)
	}
	if len(cfg.CancellationPolicy) > 4096 || json.Unmarshal(cfg.CancellationPolicy, &policy) != nil || policy == nil {
		return ErrInvalid
	}
	return s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if e := operationAdmin(tx, actor); e != nil {
			return e
		}
		previous, err := settings(tx)
		if err != nil {
			return err
		}
		before, err := settingsSnapshot(previous)
		if err != nil {
			return err
		}
		after, err := settingsSnapshot(cfg)
		if err != nil {
			return err
		}
		if bytes.Equal(before, after) {
			return nil
		}
		updates := map[string]any{"confirmation_mode": cfg.ConfirmationMode, "booking_horizon_days": cfg.BookingHorizonDays, "minimum_advance_minutes": cfg.MinimumAdvanceMinutes, "slot_interval_minutes": cfg.SlotIntervalMinutes, "timezone": cfg.Timezone, "privacy_notice_version": cfg.PrivacyNoticeVersion, "cancellation_policy": string(cfg.CancellationPolicy), "updated_at": s.now()}
		if tx.Migrator().HasColumn(&Settings{}, "booking_horizon_months") {
			updates["booking_horizon_months"] = cfg.BookingHorizonMonths
		} else if cfg.BookingHorizonMonths != 0 {
			return ErrNotConfigured
		}
		if err = tx.Model(&Settings{}).Where("id=1").Updates(updates).Error; err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO booking_settings_events(actor_user_id,source,previous_settings,new_settings) VALUES (?,'admin',?::jsonb,?::jsonb)`, actor, string(before), string(after)).Error
	})
}

// Snapshots contain only booking configuration, never client-supplied timestamps,
// patient details, passwords or credentials. JSON round-tripping canonicalizes
// policy object keys so harmless formatting changes do not create audit events.
func settingsSnapshot(cfg Settings) ([]byte, error) {
	var policy any
	decoder := json.NewDecoder(bytes.NewReader(cfg.CancellationPolicy))
	decoder.UseNumber()
	if err := decoder.Decode(&policy); err != nil {
		return nil, err
	}
	return json.Marshal(map[string]any{
		"booking_horizon_months": cfg.BookingHorizonMonths, "confirmation_mode": cfg.ConfirmationMode, "booking_horizon_days": cfg.BookingHorizonDays,
		"minimum_advance_minutes": cfg.MinimumAdvanceMinutes, "slot_interval_minutes": cfg.SlotIntervalMinutes,
		"timezone": cfg.Timezone, "privacy_notice_version": cfg.PrivacyNoticeVersion, "cancellation_policy": policy,
	})
}
