package booking

import (
	"errors"
	"fmt"
	"sort"
	"time"
	_ "time/tzdata" // Keep clinic scheduling reliable in minimal deployment images.
)

// ErrInvalidAvailabilityInput means the date or scheduling configuration is invalid.
var ErrInvalidAvailabilityInput = errors.New("invalid availability input")

// AvailabilitySettings contains only the rules needed to calculate slots.
// BookingHorizonDays includes today through today + BookingHorizonDays, in Riga.
type AvailabilitySettings struct {
	Timezone              string
	BookingHorizonDays    int
	MinimumAdvanceMinutes int
	SlotIntervalMinutes   int
}

// WorkingInterval is a same-day local wall-clock interval. EndMinute may be
// 1440 (the next midnight). Effective dates are inclusive YYYY-MM-DD values.
// Split working days and overnight schedules into separate intervals.
type WorkingInterval struct {
	Weekday        time.Weekday
	StartMinute    int
	EndMinute      int
	EffectiveFrom  string
	EffectiveUntil string
}

// BusyRange is a half-open range [StartsAt, EndsAt) of absolute instants.
// The repository must include only appointments whose statuses occupy time.
type BusyRange struct {
	StartsAt time.Time
	EndsAt   time.Time
}

// DoctorAvailability contains a verified, resolved service duration for an
// eligible doctor. Catalog visibility and eligibility are checked by callers.
type DoctorAvailability struct {
	ID              string
	DurationMinutes int
	Schedules       []WorkingInterval
	TimeOff         []BusyRange
	Appointments    []BusyRange
}

type Slot struct {
	DoctorID string    `json:"doctor_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
}

// GenerateSlots calculates actual doctor-specific options, with no database
// access or invented schedules. It enumerates real instants rather than using
// time.Date to construct ambiguous local hours: spring's missing times do not
// exist, and fall's repeated times remain separate UTC slots.
//
// As a conservative clinic policy, a treatment may not cross a UTC-offset
// transition, including an end exactly at the transition. Both copies of a
// repeated hour can otherwise be booked. A treatment must fit entirely in one
// working interval; adjacent intervals are not implicitly combined.
func GenerateSlots(now time.Time, date string, settings AvailabilitySettings, doctors []DoctorAvailability) ([]Slot, error) {
	slots := make([]Slot, 0)
	if now.IsZero() || settings.Timezone != "Europe/Riga" ||
		settings.BookingHorizonDays < 0 || settings.BookingHorizonDays > 730 ||
		settings.MinimumAdvanceMinutes < 0 || settings.MinimumAdvanceMinutes > 525600 ||
		settings.SlotIntervalMinutes < 1 || settings.SlotIntervalMinutes > 120 {
		return nil, fmt.Errorf("%w: scheduling settings", ErrInvalidAvailabilityInput)
	}
	location, err := time.LoadLocation(settings.Timezone)
	if err != nil {
		return nil, fmt.Errorf("%w: timezone unavailable", ErrInvalidAvailabilityInput)
	}
	day, err := parseAvailabilityDate(date, location)
	if err != nil {
		return nil, err
	}
	if err := validateAvailabilityDoctors(doctors, location); err != nil {
		return nil, err
	}
	localNow := now.In(location)
	today := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, location)
	if day.Before(today) || day.After(today.AddDate(0, 0, settings.BookingHorizonDays)) {
		return slots, nil
	}
	nextDay := day.AddDate(0, 0, 1)
	earliest := now.Add(time.Duration(settings.MinimumAdvanceMinutes) * time.Minute)
	type slotKey struct {
		doctorID string
		start    int64
	}
	seen := make(map[slotKey]bool)
	for _, doctor := range doctors {
		duration := time.Duration(doctor.DurationMinutes) * time.Minute
		for _, schedule := range doctor.Schedules {
			if schedule.Weekday != day.Weekday() ||
				(schedule.EffectiveFrom != "" && date < schedule.EffectiveFrom) ||
				(schedule.EffectiveUntil != "" && date > schedule.EffectiveUntil) {
				continue
			}
			for start := day.UTC(); start.Before(nextDay); start = start.Add(time.Minute) {
				if start.Before(earliest) {
					continue
				}
				localStart := start.In(location)
				minute := localStart.Hour()*60 + localStart.Minute()
				if minute < schedule.StartMinute || minute+doctor.DurationMinutes > schedule.EndMinute ||
					(minute-schedule.StartMinute)%settings.SlotIntervalMinutes != 0 {
					continue
				}
				end := start.Add(duration)
				_, startOffset := localStart.Zone()
				_, endOffset := end.In(location).Zone()
				if startOffset != endOffset || end.After(nextDay) {
					continue
				}
				if overlapsAny(start, end, doctor.TimeOff) || overlapsAny(start, end, doctor.Appointments) {
					continue
				}
				key := slotKey{doctorID: doctor.ID, start: start.Unix()}
				if seen[key] {
					continue
				}
				seen[key] = true
				slots = append(slots, Slot{DoctorID: doctor.ID, StartsAt: start, EndsAt: end})
			}
		}
	}
	sort.Slice(slots, func(i, j int) bool {
		if slots[i].StartsAt.Equal(slots[j].StartsAt) {
			return slots[i].DoctorID < slots[j].DoctorID
		}
		return slots[i].StartsAt.Before(slots[j].StartsAt)
	})
	return slots, nil
}

func parseAvailabilityDate(value string, location *time.Location) (time.Time, error) {
	day, err := time.ParseInLocation("2006-01-02", value, location)
	if err != nil || len(value) != 10 || day.Format("2006-01-02") != value {
		return time.Time{}, fmt.Errorf("%w: expected YYYY-MM-DD date", ErrInvalidAvailabilityInput)
	}
	return day, nil
}

func validateAvailabilityDoctors(doctors []DoctorAvailability, location *time.Location) error {
	ids := make(map[string]bool, len(doctors))
	for _, doctor := range doctors {
		if doctor.ID == "" || ids[doctor.ID] || doctor.DurationMinutes < 1 || doctor.DurationMinutes > 1440 {
			return fmt.Errorf("%w: doctor configuration", ErrInvalidAvailabilityInput)
		}
		ids[doctor.ID] = true
		for _, schedule := range doctor.Schedules {
			if schedule.Weekday < time.Sunday || schedule.Weekday > time.Saturday ||
				schedule.StartMinute < 0 || schedule.EndMinute > 1440 || schedule.StartMinute >= schedule.EndMinute {
				return fmt.Errorf("%w: working interval", ErrInvalidAvailabilityInput)
			}
			for _, value := range []string{schedule.EffectiveFrom, schedule.EffectiveUntil} {
				if value != "" {
					if _, err := parseAvailabilityDate(value, location); err != nil {
						return err
					}
				}
			}
			if schedule.EffectiveFrom != "" && schedule.EffectiveUntil != "" && schedule.EffectiveFrom > schedule.EffectiveUntil {
				return fmt.Errorf("%w: effective date range", ErrInvalidAvailabilityInput)
			}
		}
		for _, ranges := range [][]BusyRange{doctor.TimeOff, doctor.Appointments} {
			for _, busy := range ranges {
				if busy.StartsAt.IsZero() || busy.EndsAt.IsZero() || !busy.StartsAt.Before(busy.EndsAt) {
					return fmt.Errorf("%w: occupied interval", ErrInvalidAvailabilityInput)
				}
			}
		}
	}
	return nil
}

func overlapsAny(start, end time.Time, ranges []BusyRange) bool {
	for _, busy := range ranges {
		if start.Before(busy.EndsAt) && busy.StartsAt.Before(end) {
			return true
		}
	}
	return false
}
