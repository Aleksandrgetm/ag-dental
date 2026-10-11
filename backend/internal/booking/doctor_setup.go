package booking

import (
	"context"
	"time"
)

// DoctorSetup is saved with the doctor/profile in the existing configuration
// transaction. Omission preserves legacy clients and their related records.
type DoctorSetup struct {
	ServiceIDs []string      `json:"service_ids"`
	Hours      []DoctorHours `json:"hours"`
}
type DoctorHours struct {
	ID             string       `json:"id"`
	Weekday        time.Weekday `json:"weekday"`
	StartMinute    int          `json:"start_minute"`
	EndMinute      int          `json:"end_minute"`
	EffectiveFrom  string       `json:"effective_from"`
	EffectiveUntil string       `json:"effective_until"`
}

func (s *Store) saveDoctorSetup(ctx context.Context, doctor string, setup *DoctorSetup) error {
	if len(setup.ServiceIDs) > 100 || len(setup.Hours) > 56 {
		return ErrInvalid
	}
	for _, h := range setup.Hours {
		if validateScheduleInput(ScheduleInput{DoctorID: doctor, Weekday: h.Weekday, StartMinute: h.StartMinute, EndMinute: h.EndMinute, EffectiveFrom: h.EffectiveFrom, EffectiveUntil: h.EffectiveUntil}) != nil {
			return &ValidationDetail{Code: "timeOrder", Day: int(h.Weekday)}
		}
	}
	for i, a := range setup.Hours {
		for _, b := range setup.Hours[i+1:] {
			fromA, untilA, fromB, untilB := a.EffectiveFrom, a.EffectiveUntil, b.EffectiveFrom, b.EffectiveUntil
			if untilA == "" {
				untilA = "9999-12-31"
			}
			if untilB == "" {
				untilB = "9999-12-31"
			}
			if a.Weekday == b.Weekday && a.StartMinute < b.EndMinute && b.StartMinute < a.EndMinute && fromA <= untilB && fromB <= untilA {
				return &ValidationDetail{Code: "timeOverlap", Day: int(a.Weekday)}
			}
		}
	}
	seen := map[string]bool{}
	for _, id := range setup.ServiceIDs {
		if !ValidID(id) || seen[id] {
			return ErrInvalid
		}
		seen[id] = true
		var count int64
		if e := s.DB.Table("services").Where("id=?", id).Count(&count).Error; e != nil {
			return e
		}
		if count != 1 {
			return ErrInvalid
		}
	}
	// Disabling an eligibility relationship never deletes historical references.
	var impacted int64
	q := s.DB.Table("appointments").Where("doctor_id=? AND ends_at>? AND status IN ('pending','confirmed')", doctor, s.now())
	if len(setup.ServiceIDs) > 0 {
		q = q.Where("service_id NOT IN ?", setup.ServiceIDs)
	}
	if e := q.Count(&impacted).Error; e != nil {
		return e
	}
	if impacted > 0 {
		return &ScheduleImpactError{int(impacted)}
	}
	if e := s.DB.Exec("UPDATE doctor_services SET booking_enabled=false WHERE doctor_id=?", doctor).Error; e != nil {
		return e
	}
	for _, id := range setup.ServiceIDs {
		if e := s.DB.Exec(`INSERT INTO doctor_services(doctor_id,service_id,booking_enabled) VALUES (?,?,true) ON CONFLICT(doctor_id,service_id) DO UPDATE SET booking_enabled=true`, doctor, id).Error; e != nil {
			return e
		}
	}
	ids := map[string]bool{}
	for _, h := range setup.Hours {
		if h.ID != "" {
			if !ValidID(h.ID) || ids[h.ID] {
				return ErrInvalid
			}
			ids[h.ID] = true
		}
	}
	// Validate ownership before replacing the active set. Check appointment
	// coverage against the final set, not transient intermediate intervals.
	for _, h := range setup.Hours {
		if e := sameScheduleDoctor(s.DB, "doctor_schedules", h.ID, doctor); e != nil {
			return e
		}
	}
	before, e := uncoveredAppointments(s.DB, doctor, s.now())
	if e != nil {
		return e
	}
	if e = s.DB.Exec("UPDATE doctor_schedules SET active=false WHERE doctor_id=? AND active", doctor).Error; e != nil {
		return e
	}
	for _, h := range setup.Hours {
		_, e := s.saveScheduleOperation(ctx, h.ID, ScheduleOperationInput{ScheduleInput: ScheduleInput{DoctorID: doctor, Weekday: h.Weekday, StartMinute: h.StartMinute, EndMinute: h.EndMinute, EffectiveFrom: h.EffectiveFrom, EffectiveUntil: h.EffectiveUntil}, Active: true})
		if e != nil {
			return e
		}
	}
	after, e := uncoveredAppointments(s.DB, doctor, s.now())
	if e != nil {
		return e
	}
	for id := range after {
		if !before[id] {
			return &ScheduleImpactError{1}
		}
	}
	return nil
}
func (s *Store) doctorReady(id string) (bool, error) {
	var ready bool
	e := s.DB.Raw(`SELECT EXISTS(SELECT 1 FROM doctor_services ds JOIN services v ON v.id=ds.service_id WHERE ds.doctor_id=? AND ds.booking_enabled AND v.active AND v.booking_enabled AND COALESCE(ds.duration_override_minutes,v.duration_minutes)>0) AND EXISTS(SELECT 1 FROM doctor_schedules WHERE doctor_id=? AND active AND EXISTS(SELECT 1 FROM doctor_services ds JOIN services v ON v.id=ds.service_id WHERE ds.doctor_id=doctor_schedules.doctor_id AND ds.booking_enabled AND v.active AND v.booking_enabled AND COALESCE(ds.duration_override_minutes,v.duration_minutes)>0 AND extract(epoch FROM(end_time-start_time))/60>=COALESCE(ds.duration_override_minutes,v.duration_minutes)) AND (effective_until IS NULL OR effective_until >= (? AT TIME ZONE 'Europe/Riga')::date)) AND EXISTS(SELECT 1 FROM booking_settings WHERE id=1 AND privacy_notice_version IS NOT NULL AND privacy_notice_version<>'')`, id, id, s.now()).Scan(&ready).Error
	return ready, e
}
