package booking

import (
	"testing"
	"time"
)

func TestCalendarMonthAndIndividualDate(t *testing.T) {
	for _, c := range []struct{ now, last, beyond string }{{"2027-01-31 08:00:00", "2027-02-28", "2027-03-01"}, {"2028-01-31 08:00:00", "2028-02-29", "2028-03-01"}, {"2026-03-13 08:00:00", "2026-04-13", "2026-04-14"}, {"2026-12-31 08:00:00", "2027-01-31", "2027-02-01"}} {
		cfg := availabilityTestSettings()
		cfg.BookingHorizonMonths = 1
		cfg.MinimumAdvanceMinutes = 1440
		d := availabilityTestDoctor()
		date := availabilityLocal(t, c.last+" 00:00:00")
		d.Schedules = []WorkingInterval{{Weekday: date.Weekday(), StartMinute: 540, EndMinute: 660, EffectiveFrom: c.last, EffectiveUntil: c.last}}
		slots, e := GenerateSlots(availabilityLocal(t, c.now), c.last, cfg, []DoctorAvailability{d})
		if e != nil || len(slots) == 0 {
			t.Fatalf("month boundary %s: %v", c.last, e)
		}
		d.Schedules = []WorkingInterval{{Weekday: availabilityLocal(t, c.beyond+" 00:00:00").Weekday(), StartMinute: 540, EndMinute: 660}}
		slots, e = GenerateSlots(availabilityLocal(t, c.now), c.beyond, cfg, []DoctorAvailability{d})
		if e != nil || len(slots) != 0 {
			t.Fatal("outside month allowed")
		}
	}
	cfg := availabilityTestSettings()
	cfg.BookingHorizonMonths = 1
	cfg.MinimumAdvanceMinutes = 1440
	d := availabilityTestDoctor()
	d.Schedules = []WorkingInterval{{Weekday: time.Wednesday, StartMinute: 540, EndMinute: 720, EffectiveFrom: "2026-10-14", EffectiveUntil: "2026-10-14"}}
	now := availabilityLocal(t, "2026-10-13 10:00:00")
	slots, e := GenerateSlots(now, "2026-10-14", cfg, []DoctorAvailability{d})
	if e != nil || len(slots) == 0 || slots[0].StartsAt.Before(now.Add(24*time.Hour)) {
		t.Fatal("advance boundary")
	}
	slots, e = GenerateSlots(now, "2026-10-21", cfg, []DoctorAvailability{d})
	if e != nil || len(slots) != 0 {
		t.Fatal("single working date recurred")
	}
}

func TestAdvanceReferenceCandidates(t *testing.T) {
	cfg := availabilityTestSettings()
	cfg.BookingHorizonMonths = 1
	cfg.MinimumAdvanceMinutes = 1440
	d := availabilityTestDoctor()
	d.Schedules = []WorkingInterval{{Weekday: time.Wednesday, StartMinute: 540, EndMinute: 720}, {Weekday: time.Wednesday, StartMinute: 780, EndMinute: 1020}}
	for _, c := range []struct {
		now      string
		daySlots bool
	}{{"2026-10-13 08:59:00", true}, {"2026-10-13 09:00:00", true}, {"2026-10-13 09:01:00", false}, {"2026-10-13 12:00:00", false}} {
		now := availabilityLocal(t, c.now)
		cfg.MinimumAdvanceReference = "appointment"
		slots, e := GenerateSlots(now, "2026-10-14", cfg, []DoctorAvailability{d})
		if e != nil || len(slots) == 0 {
			t.Fatal("appointment candidate", e)
		}
		for _, slot := range slots {
			if slot.StartsAt.Before(now.Add(24 * time.Hour)) {
				t.Fatal("early slot")
			}
		}
		cfg.MinimumAdvanceReference = "working_day_start_preview"
		slots, e = GenerateSlots(now, "2026-10-14", cfg, []DoctorAvailability{d})
		if e != nil || (len(slots) > 0) != c.daySlots {
			t.Fatal("working-day candidate", c, e)
		}
	}
	// Elapsed 24 hours remains consistent over both DST transitions.
	for _, date := range []string{"2026-03-29", "2026-10-25"} {
		start := availabilityLocal(t, date+" 09:00:00")
		d.Schedules = []WorkingInterval{{Weekday: time.Sunday, StartMinute: 540, EndMinute: 720, EffectiveFrom: date, EffectiveUntil: date}}
		for _, delta := range []time.Duration{0, time.Second} {
			slots, e := GenerateSlots(start.Add(-24*time.Hour).Add(delta), date, cfg, []DoctorAvailability{d})
			if e != nil || (len(slots) > 0) != (delta == 0) {
				t.Fatal("DST cutoff", date, delta, e)
			}
		}
	}
	cfg.MinimumAdvanceReference = "unknown"
	if _, e := GenerateSlots(time.Now(), "2026-10-14", cfg, []DoctorAvailability{d}); e == nil {
		t.Fatal("unknown policy accepted")
	}
}
