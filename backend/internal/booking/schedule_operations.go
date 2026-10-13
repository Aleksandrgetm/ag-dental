package booking

import (
	"context"
	"gorm.io/gorm"
	"time"
)

type ScheduleOperationInput struct {
	ScheduleInput
	Active bool `json:"active"`
}
type TimeOffOperationInput struct {
	DoctorID   string `json:"doctor_id"`
	StartLocal string `json:"start_local"`
	EndLocal   string `json:"end_local"`
	Reason     string `json:"reason"`
	FullDay    bool   `json:"full_day"`
	Active     bool   `json:"active"`
}
type ScheduleImpactError struct{ Count int }

func (e *ScheduleImpactError) Error() string { return "schedule_impact" }

// Resolve a wall clock using the clinic zone, refusing both nonexistent and
// repeated local times instead of silently choosing a DST offset.
func RigaLocal(value string) (time.Time, error) {
	const layout = "2006-01-02T15:04"
	wall, e := time.Parse(layout, value)
	if e != nil || wall.Format(layout) != value {
		return time.Time{}, ErrInvalid
	}
	zone, e := time.LoadLocation("Europe/Riga")
	if e != nil {
		return time.Time{}, e
	}
	offsets := map[int]bool{}
	for h := -36; h <= 36; h++ {
		_, offset := wall.Add(time.Duration(h) * time.Hour).In(zone).Zone()
		offsets[offset] = true
	}
	var result time.Time
	matches := 0
	for offset := range offsets {
		candidate := wall.Add(-time.Duration(offset) * time.Second)
		if candidate.In(zone).Format(layout) == value {
			result = candidate
			matches++
		}
	}
	if matches != 1 {
		return time.Time{}, ErrInvalid
	}
	return result.UTC(), nil
}

func uncoveredAppointments(tx *gorm.DB, doctor string, now time.Time) (map[string]bool, error) {
	var ids []string
	e := tx.Raw(`SELECT a.id FROM appointments a WHERE a.doctor_id=? AND a.ends_at>? AND a.status IN ('pending','confirmed') AND NOT EXISTS (
 SELECT 1 FROM doctor_schedules s WHERE s.doctor_id=a.doctor_id AND s.active
 AND s.weekday=extract(dow FROM a.starts_at AT TIME ZONE 'Europe/Riga')
 AND (s.effective_from IS NULL OR s.effective_from <= (a.starts_at AT TIME ZONE 'Europe/Riga')::date)
 AND (s.effective_until IS NULL OR s.effective_until >= (a.starts_at AT TIME ZONE 'Europe/Riga')::date)
 AND a.starts_at AT TIME ZONE 'Europe/Riga' >= (a.starts_at AT TIME ZONE 'Europe/Riga')::date+s.start_time
 AND a.ends_at AT TIME ZONE 'Europe/Riga' <= (a.starts_at AT TIME ZONE 'Europe/Riga')::date+s.end_time)`, doctor, now).Scan(&ids).Error
	result := map[string]bool{}
	for _, id := range ids {
		result[id] = true
	}
	return result, e
}
func sameScheduleDoctor(tx *gorm.DB, table, id, doctor string) error {
	if id == "" {
		return nil
	}
	var old string
	if e := tx.Table(table).Select("doctor_id").Where("id=?", id).Scan(&old).Error; e != nil {
		return e
	}
	if old != doctor {
		return ErrInvalid
	}
	return nil
}
func (s *Store) saveScheduleOperation(ctx context.Context, id string, input ScheduleOperationInput) (string, error) {
	if e := validateScheduleInput(input.ScheduleInput); e != nil {
		return "", e
	}
	if e := sameScheduleDoctor(s.DB, "doctor_schedules", id, input.DoctorID); e != nil {
		return "", e
	}
	before, e := uncoveredAppointments(s.DB, input.DoctorID, s.now())
	if e != nil {
		return "", e
	}
	if id == "" {
		id, e = newID()
		if e != nil {
			return "", e
		}
	}
	e = s.DB.WithContext(ctx).Exec(`INSERT INTO doctor_schedules(id,doctor_id,weekday,start_time,end_time,effective_from,effective_until,active)
 VALUES (?,?,?,?::time,?::time,NULLIF(?,'')::date,NULLIF(?,'')::date,?) ON CONFLICT(id) DO UPDATE SET weekday=EXCLUDED.weekday,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,effective_from=EXCLUDED.effective_from,effective_until=EXCLUDED.effective_until,active=EXCLUDED.active`, id, input.DoctorID, input.Weekday, localClock(input.StartMinute), localClock(input.EndMinute), input.EffectiveFrom, input.EffectiveUntil, input.Active).Error
	if e != nil {
		return "", e
	}
	after, e := uncoveredAppointments(s.DB, input.DoctorID, s.now())
	if e != nil {
		return "", e
	}
	count := 0
	for id := range after {
		if !before[id] {
			count++
		}
	}
	if count > 0 {
		return "", &ScheduleImpactError{count}
	}
	return id, nil
}
func (s *Store) saveTimeOffOperation(ctx context.Context, id string, input TimeOffOperationInput) (string, error) {
	start, e := RigaLocal(input.StartLocal)
	if e != nil {
		return "", e
	}
	end, e := RigaLocal(input.EndLocal)
	if e != nil {
		return "", e
	}
	value := TimeOffInput{DoctorID: input.DoctorID, StartsAt: start, EndsAt: end, Reason: input.Reason, FullDay: input.FullDay}
	if e = validateTimeOffInput(value); e != nil {
		return "", e
	}
	if e = sameScheduleDoctor(s.DB, "doctor_time_off", id, input.DoctorID); e != nil {
		return "", e
	}
	if input.Active {
		var count int
		if e = s.DB.Raw("SELECT count(*) FROM appointments WHERE doctor_id=? AND status IN ('pending','confirmed') AND starts_at < ? AND ends_at > ?", input.DoctorID, end, start).Scan(&count).Error; e != nil {
			return "", e
		}
		if count > 0 {
			return "", &ScheduleImpactError{count}
		}
		var overlap bool
		if e = s.DB.Raw("SELECT EXISTS(SELECT 1 FROM doctor_time_off WHERE doctor_id=? AND active AND id::text<>? AND starts_at < ? AND ends_at > ?)", input.DoctorID, id, end, start).Scan(&overlap).Error; e != nil {
			return "", e
		}
		if overlap {
			return "", ErrConflict
		}
	}
	if id == "" {
		id, e = newID()
		if e != nil {
			return "", e
		}
	}
	e = s.DB.WithContext(ctx).Exec(`INSERT INTO doctor_time_off(id,doctor_id,starts_at,ends_at,reason,full_day,active) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,reason=EXCLUDED.reason,full_day=EXCLUDED.full_day,active=EXCLUDED.active`, id, input.DoctorID, start, end, input.Reason, input.FullDay, input.Active).Error
	return id, e
}
