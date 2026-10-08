package booking

import (
	"errors"
	"reflect"
	"testing"
	"time"
)

func availabilityTestSettings() AvailabilitySettings {
	return AvailabilitySettings{
		Timezone: "Europe/Riga", BookingHorizonDays: 30,
		MinimumAdvanceMinutes: 60, SlotIntervalMinutes: 30,
	}
}

func availabilityTestDoctor() DoctorAvailability {
	return DoctorAvailability{
		ID: "development-doctor", DurationMinutes: 60,
		Schedules: []WorkingInterval{{Weekday: time.Monday, StartMinute: 9 * 60, EndMinute: 12 * 60}},
	}
}

func availabilityLocal(t *testing.T, value string) time.Time {
	t.Helper()
	location, err := time.LoadLocation("Europe/Riga")
	if err != nil {
		t.Fatal(err)
	}
	instant, err := time.ParseInLocation("2006-01-02 15:04:05", value, location)
	if err != nil {
		t.Fatal(err)
	}
	return instant
}

func availabilityClockValues(t *testing.T, slots []Slot) []string {
	t.Helper()
	location, err := time.LoadLocation("Europe/Riga")
	if err != nil {
		t.Fatal(err)
	}
	values := make([]string, 0, len(slots))
	for _, slot := range slots {
		values = append(values, slot.StartsAt.In(location).Format("15:04"))
		if slot.StartsAt.Location() != time.UTC || slot.EndsAt.Location() != time.UTC {
			t.Error("API instants must use UTC")
		}
	}
	return values
}

func TestAvailabilityWorkingHoursAndOccupiedRanges(t *testing.T) {
	day := "2026-10-12"
	now := availabilityLocal(t, "2026-10-11 12:00:00")
	ten := availabilityLocal(t, day+" 10:00:00")
	eleven := availabilityLocal(t, day+" 11:00:00")
	tests := []struct {
		name   string
		change func(*DoctorAvailability)
		want   []string
	}{
		{"normal", func(*DoctorAvailability) {}, []string{"09:00", "09:30", "10:00", "10:30", "11:00"}},
		{"unavailable weekday", func(d *DoctorAvailability) { d.Schedules[0].Weekday = time.Tuesday }, []string{}},
		{"no invented schedules", func(d *DoctorAvailability) { d.Schedules = nil }, []string{}},
		{"partial day absence", func(d *DoctorAvailability) {
			d.TimeOff = []BusyRange{{StartsAt: ten, EndsAt: eleven}}
		}, []string{"09:00", "11:00"}},
		{"full day absence", func(d *DoctorAvailability) {
			d.TimeOff = []BusyRange{{StartsAt: availabilityLocal(t, day+" 00:00:00"), EndsAt: availabilityLocal(t, "2026-10-13 00:00:00")}}
		}, []string{}},
		{"absence spanning days", func(d *DoctorAvailability) {
			d.TimeOff = []BusyRange{{StartsAt: now, EndsAt: availabilityLocal(t, "2026-10-14 00:00:00")}}
		}, []string{}},
		{"occupied appointment and adjacent slots", func(d *DoctorAvailability) {
			d.Appointments = []BusyRange{{StartsAt: ten, EndsAt: eleven}}
		}, []string{"09:00", "11:00"}},
		{"treatment exceeds gap", func(d *DoctorAvailability) {
			d.Appointments = []BusyRange{
				{StartsAt: ten, EndsAt: availabilityLocal(t, day+" 10:30:00")},
				{StartsAt: eleven, EndsAt: availabilityLocal(t, day+" 12:00:00")},
			}
		}, []string{"09:00"}},
		{"treatment exceeds day", func(d *DoctorAvailability) { d.DurationMinutes = 181 }, []string{}},
		{"effective start not reached", func(d *DoctorAvailability) { d.Schedules[0].EffectiveFrom = "2026-10-13" }, []string{}},
		{"effective end passed", func(d *DoctorAvailability) { d.Schedules[0].EffectiveUntil = "2026-10-11" }, []string{}},
		{"effective boundary inclusive", func(d *DoctorAvailability) {
			d.Schedules[0].EffectiveFrom = day
			d.Schedules[0].EffectiveUntil = day
		}, []string{"09:00", "09:30", "10:00", "10:30", "11:00"}},
		{"grid anchored to schedule", func(d *DoctorAvailability) {
			d.Schedules[0].StartMinute = 9*60 + 10
		}, []string{"09:10", "09:40", "10:10", "10:40"}},
		{"split working day", func(d *DoctorAvailability) {
			d.Schedules = []WorkingInterval{
				{Weekday: time.Monday, StartMinute: 9 * 60, EndMinute: 10 * 60},
				{Weekday: time.Monday, StartMinute: 11 * 60, EndMinute: 12 * 60},
			}
		}, []string{"09:00", "11:00"}},
		{"adjacent intervals do not imply continuous permission", func(d *DoctorAvailability) {
			d.Schedules = []WorkingInterval{
				{Weekday: time.Monday, StartMinute: 9 * 60, EndMinute: 9*60 + 30},
				{Weekday: time.Monday, StartMinute: 9*60 + 30, EndMinute: 10 * 60},
			}
		}, []string{}},
		{"overlapping schedules deduplicated", func(d *DoctorAvailability) {
			d.Schedules = append(d.Schedules, d.Schedules[0])
		}, []string{"09:00", "09:30", "10:00", "10:30", "11:00"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			doctor := availabilityTestDoctor()
			test.change(&doctor)
			slots, err := GenerateSlots(now, day, availabilityTestSettings(), []DoctorAvailability{doctor})
			if err != nil {
				t.Fatal(err)
			}
			if slots == nil {
				t.Fatal("empty availability must encode as [] rather than null")
			}
			if got := availabilityClockValues(t, slots); !reflect.DeepEqual(got, test.want) {
				t.Errorf("got %v, want %v", got, test.want)
			}
		})
	}
}

func TestAvailabilityCancellationReleasesBusyRange(t *testing.T) {
	doctor := availabilityTestDoctor()
	now := availabilityLocal(t, "2026-10-11 12:00:00")
	doctor.Appointments = []BusyRange{{StartsAt: availabilityLocal(t, "2026-10-12 09:00:00"), EndsAt: availabilityLocal(t, "2026-10-12 12:00:00")}}
	before, err := GenerateSlots(now, "2026-10-12", availabilityTestSettings(), []DoctorAvailability{doctor})
	if err != nil || len(before) != 0 {
		t.Fatalf("occupied schedule: slots=%v, error=%v", before, err)
	}
	// Repository status filtering removes cancelled and rejected bookings; the
	// pure engine deliberately has no status model or database responsibility.
	doctor.Appointments = nil
	after, err := GenerateSlots(now, "2026-10-12", availabilityTestSettings(), []DoctorAvailability{doctor})
	if err != nil || len(after) != 5 {
		t.Fatalf("released schedule: slots=%v, error=%v", after, err)
	}
}

func TestAvailabilityHorizonAndAdvance(t *testing.T) {
	tests := []struct {
		name, now, date  string
		horizon, advance int
		want             []string
	}{
		{"past day", "2026-10-13 08:00:00", "2026-10-12", 7, 0, []string{}},
		{"beyond horizon", "2026-10-11 08:00:00", "2026-10-19", 7, 0, []string{}},
		{"horizon boundary", "2026-10-05 08:00:00", "2026-10-12", 7, 0, []string{"09:00", "09:30", "10:00", "10:30", "11:00"}},
		{"same day only", "2026-10-12 08:00:00", "2026-10-12", 0, 60, []string{"09:00", "09:30", "10:00", "10:30", "11:00"}},
		{"advance precise seconds", "2026-10-12 09:10:30", "2026-10-12", 7, 20, []string{"10:00", "10:30", "11:00"}},
		{"advance inclusive", "2026-10-12 09:10:00", "2026-10-12", 7, 20, []string{"09:30", "10:00", "10:30", "11:00"}},
		{"advance extends beyond day", "2026-10-12 09:00:00", "2026-10-12", 7, 1440, []string{}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			settings := availabilityTestSettings()
			settings.BookingHorizonDays, settings.MinimumAdvanceMinutes = test.horizon, test.advance
			slots, err := GenerateSlots(availabilityLocal(t, test.now).UTC(), test.date, settings, []DoctorAvailability{availabilityTestDoctor()})
			if err != nil {
				t.Fatal(err)
			}
			if got := availabilityClockValues(t, slots); !reflect.DeepEqual(got, test.want) {
				t.Errorf("got %v, want %v", got, test.want)
			}
		})
	}
	settings := availabilityTestSettings()
	settings.BookingHorizonDays = 0
	// UTC Sunday is already Monday in Riga; local calendar rules must win.
	now := time.Date(2026, 10, 11, 22, 30, 0, 0, time.UTC)
	slots, err := GenerateSlots(now, "2026-10-12", settings, []DoctorAvailability{availabilityTestDoctor()})
	if err != nil || len(slots) != 5 {
		t.Fatalf("local calendar date not respected: %v, %v", slots, err)
	}
}

func TestAvailabilityAnyDoctorAndMidnight(t *testing.T) {
	a, b := availabilityTestDoctor(), availabilityTestDoctor()
	a.ID, b.ID = "a", "b"
	b.DurationMinutes = 180
	slots, err := GenerateSlots(availabilityLocal(t, "2026-10-11 12:00:00"), "2026-10-12", availabilityTestSettings(), []DoctorAvailability{b, a})
	if err != nil || len(slots) != 6 {
		t.Fatalf("slots=%v, error=%v", slots, err)
	}
	if slots[0].DoctorID != "a" || slots[1].DoctorID != "b" || !slots[0].StartsAt.Equal(slots[1].StartsAt) {
		t.Fatalf("any-doctor ordering is not deterministic: %v", slots)
	}
	a.Schedules = []WorkingInterval{{Weekday: time.Monday, StartMinute: 23 * 60, EndMinute: 1440}}
	slots, err = GenerateSlots(availabilityLocal(t, "2026-10-11 12:00:00"), "2026-10-12", availabilityTestSettings(), []DoctorAvailability{a})
	if err != nil || len(slots) != 1 || !slots[0].EndsAt.Equal(availabilityLocal(t, "2026-10-13 00:00:00")) {
		t.Fatalf("midnight endpoint: slots=%v, error=%v", slots, err)
	}
	slots, err = GenerateSlots(availabilityLocal(t, "2026-10-11 12:00:00"), "2026-10-12", availabilityTestSettings(), nil)
	if err != nil || slots == nil || len(slots) != 0 {
		t.Fatalf("no doctors must mean no availability: slots=%v, error=%v", slots, err)
	}
}

func TestAvailabilityDaylightSaving(t *testing.T) {
	location, err := time.LoadLocation("Europe/Riga")
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		name, day, previousDay string
		want                   []string
	}{
		{"spring", "2026-03-29", "2026-03-28", []string{"02:00 +02:00", "04:00 +03:00", "04:30 +03:00"}},
		{"fall", "2026-10-25", "2026-10-24", []string{"02:00 +03:00", "02:30 +03:00", "03:00 +03:00", "03:00 +02:00", "03:30 +02:00", "04:00 +02:00", "04:30 +02:00"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			doctor := availabilityTestDoctor()
			doctor.DurationMinutes = 30
			doctor.Schedules = []WorkingInterval{{Weekday: time.Sunday, StartMinute: 2 * 60, EndMinute: 5 * 60}}
			slots, err := GenerateSlots(availabilityLocal(t, test.previousDay+" 12:00:00"), test.day, availabilityTestSettings(), []DoctorAvailability{doctor})
			if err != nil {
				t.Fatal(err)
			}
			got := make([]string, 0, len(slots))
			for i, slot := range slots {
				got = append(got, slot.StartsAt.In(location).Format("15:04 -07:00"))
				_, startOffset := slot.StartsAt.In(location).Zone()
				_, endOffset := slot.EndsAt.In(location).Zone()
				if startOffset != endOffset || slot.EndsAt.Sub(slot.StartsAt) != 30*time.Minute {
					t.Errorf("slot crosses offset transition or changes elapsed treatment duration: %v", slot)
				}
				if i > 0 && !slots[i-1].StartsAt.Before(slot.StartsAt) {
					t.Error("DST options must be unique real instants in chronological order")
				}
			}
			if !reflect.DeepEqual(got, test.want) {
				t.Errorf("got %v, want %v", got, test.want)
			}
		})
	}
}

func TestAvailabilityRejectsInvalidInput(t *testing.T) {
	validNow := availabilityLocal(t, "2026-10-11 12:00:00")
	for _, date := range []string{"", "2026-2-1", "2026-02-30", "2026-10-12T09:00:00Z", "2026-10-12 "} {
		if _, err := GenerateSlots(validNow, date, availabilityTestSettings(), nil); !errors.Is(err, ErrInvalidAvailabilityInput) {
			t.Errorf("date %q should fail: %v", date, err)
		}
	}
	settingsChanges := []func(*AvailabilitySettings){
		func(s *AvailabilitySettings) { s.Timezone = "UTC" },
		func(s *AvailabilitySettings) { s.BookingHorizonDays = -1 },
		func(s *AvailabilitySettings) { s.BookingHorizonDays = 731 },
		func(s *AvailabilitySettings) { s.MinimumAdvanceMinutes = -1 },
		func(s *AvailabilitySettings) { s.MinimumAdvanceMinutes = 525601 },
		func(s *AvailabilitySettings) { s.SlotIntervalMinutes = 0 },
		func(s *AvailabilitySettings) { s.SlotIntervalMinutes = 121 },
	}
	for i, change := range settingsChanges {
		settings := availabilityTestSettings()
		change(&settings)
		if _, err := GenerateSlots(validNow, "2026-10-12", settings, nil); !errors.Is(err, ErrInvalidAvailabilityInput) {
			t.Errorf("invalid settings case %d accepted: %v", i, err)
		}
	}
	doctorChanges := []func(*DoctorAvailability){
		func(d *DoctorAvailability) { d.ID = "" },
		func(d *DoctorAvailability) { d.DurationMinutes = 0 },
		func(d *DoctorAvailability) { d.DurationMinutes = 1441 },
		func(d *DoctorAvailability) { d.Schedules[0].Weekday = 7 },
		func(d *DoctorAvailability) { d.Schedules[0].StartMinute = -1 },
		func(d *DoctorAvailability) { d.Schedules[0].EndMinute = 1441 },
		func(d *DoctorAvailability) { d.Schedules[0].EndMinute = d.Schedules[0].StartMinute },
		func(d *DoctorAvailability) { d.Schedules[0].EffectiveFrom = "2026-02-30" },
		func(d *DoctorAvailability) {
			d.Schedules[0].EffectiveFrom, d.Schedules[0].EffectiveUntil = "2026-10-20", "2026-10-12"
		},
		func(d *DoctorAvailability) { d.TimeOff = []BusyRange{{StartsAt: validNow, EndsAt: validNow}} },
		func(d *DoctorAvailability) {
			d.Appointments = []BusyRange{{StartsAt: validNow, EndsAt: validNow.Add(-time.Minute)}}
		},
	}
	for i, change := range doctorChanges {
		doctor := availabilityTestDoctor()
		change(&doctor)
		if _, err := GenerateSlots(validNow, "2026-10-12", availabilityTestSettings(), []DoctorAvailability{doctor}); !errors.Is(err, ErrInvalidAvailabilityInput) {
			t.Errorf("invalid doctor case %d accepted: %v", i, err)
		}
	}
	if _, err := GenerateSlots(time.Time{}, "2026-10-12", availabilityTestSettings(), nil); !errors.Is(err, ErrInvalidAvailabilityInput) {
		t.Errorf("zero clock accepted: %v", err)
	}
	if _, err := GenerateSlots(validNow, "2026-10-12", availabilityTestSettings(), []DoctorAvailability{availabilityTestDoctor(), availabilityTestDoctor()}); !errors.Is(err, ErrInvalidAvailabilityInput) {
		t.Errorf("duplicate doctor configuration accepted: %v", err)
	}
}
