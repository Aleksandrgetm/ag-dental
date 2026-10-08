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
	if (f.DoctorID != "" && !ValidID(f.DoctorID)) || (f.ServiceID != "" && !ValidID(f.ServiceID)) || (f.Status != "" && !validStatus(f.Status)) || f.Offset < 0 {
		return nil, ErrInvalid
	}
	if f.Limit == 0 {
		f.Limit = 50
	}
	if f.Limit < 1 || f.Limit > 200 {
		return nil, ErrInvalid
	}
	q := s.DB.WithContext(ctx).Model(&Appointment{})
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
	return getAppointment(s.DB.WithContext(ctx), id)
}
func (s *Store) Transition(ctx context.Context, id, to, actor string) (Receipt, error) {
	if !ValidID(id) || !ValidID(actor) || !validStatus(to) {
		return Receipt{}, ErrInvalid
	}
	var receipt Receipt
	e := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		a, e := getAppointment(tx, id)
		if e != nil {
			return e
		}
		if a.Status == to {
			receipt = a.receipt()
			return nil
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
	ServiceID string    `json:"service_id,omitempty"`
	DoctorID  string    `json:"doctor_id"`
	StartsAt  time.Time `json:"starts_at"`
}

func (s *Store) Reschedule(ctx context.Context, id, actor string, r RescheduleRequest) (Receipt, error) {
	if !ValidID(id) || !ValidID(actor) || !ValidID(r.DoctorID) || (r.ServiceID != "" && !ValidID(r.ServiceID)) || r.StartsAt.IsZero() || r.StartsAt.Second() != 0 || r.StartsAt.Nanosecond() != 0 {
		return Receipt{}, ErrInvalid
	}
	var receipt Receipt
	e := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
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
	if (cfg.ConfirmationMode != "manual" && cfg.ConfirmationMode != "automatic") || cfg.BookingHorizonDays < 1 || cfg.BookingHorizonDays > 730 || cfg.MinimumAdvanceMinutes < 0 || cfg.MinimumAdvanceMinutes > 525600 || cfg.SlotIntervalMinutes < 1 || cfg.SlotIntervalMinutes > 120 || cfg.Timezone != "Europe/Riga" {
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
		if err = tx.Model(&Settings{}).Where("id=1").Updates(map[string]any{"confirmation_mode": cfg.ConfirmationMode, "booking_horizon_days": cfg.BookingHorizonDays, "minimum_advance_minutes": cfg.MinimumAdvanceMinutes, "slot_interval_minutes": cfg.SlotIntervalMinutes, "timezone": cfg.Timezone, "privacy_notice_version": cfg.PrivacyNoticeVersion, "cancellation_policy": string(cfg.CancellationPolicy), "updated_at": s.now()}).Error; err != nil {
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
		"confirmation_mode": cfg.ConfirmationMode, "booking_horizon_days": cfg.BookingHorizonDays,
		"minimum_advance_minutes": cfg.MinimumAdvanceMinutes, "slot_interval_minutes": cfg.SlotIntervalMinutes,
		"timezone": cfg.Timezone, "privacy_notice_version": cfg.PrivacyNoticeVersion, "cancellation_policy": policy,
	})
}
