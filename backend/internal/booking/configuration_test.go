package booking

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestServiceConfigurationRequiresExplicitDurationAndProvenance(t *testing.T) {
	input := ServiceInput{
		Slug: "development-procedure", NameLV: "Izstrādes piemērs", NameRU: "Тестовая процедура", NameEN: "Development procedure",
		Provenance: "development_fixture", Active: true, BookingEnabled: true,
	}
	service, err := prepareService(input)
	if err != nil || service.BookingEnabled || service.DurationMinutes != nil {
		t.Fatalf("missing duration must disable booking without inventing one: %+v, %v", service, err)
	}
	duration := 60
	input.DurationMinutes = &duration
	service, err = prepareService(input)
	if err != nil || !service.BookingEnabled || *service.DurationMinutes != 60 {
		t.Fatalf("explicit development duration rejected: %+v, %v", service, err)
	}
	input.Provenance = ""
	if _, err := prepareService(input); !errors.Is(err, ErrInvalid) {
		t.Fatalf("provenance must be explicit: %v", err)
	}
}

func TestServiceConfigurationValidatesAllLocalizedContent(t *testing.T) {
	valid := ServiceInput{
		Slug: "development-procedure", NameLV: " Piemērs ", NameRU: " Пример ", NameEN: " Example ", Provenance: "development_fixture",
	}
	text := "  First paragraph.\r\nSecond paragraph.  "
	valid.DescriptionEN = &text
	service, err := prepareService(valid)
	if err != nil || service.NameEN != "Example" || *service.DescriptionEN != "First paragraph.\nSecond paragraph." {
		t.Fatalf("normalization failed: %+v, %v", service, err)
	}
	tests := []struct {
		name   string
		change func(*ServiceInput)
	}{
		{"missing Russian name", func(s *ServiceInput) { s.NameRU = " " }},
		{"long Latvian name", func(s *ServiceInput) { s.NameLV = strings.Repeat("ā", 201) }},
		{"invalid slug", func(s *ServiceInput) { s.Slug = "not/a/slug" }},
		{"unsupported provenance", func(s *ServiceInput) { s.Provenance = "guessed" }},
		{"zero duration", func(s *ServiceInput) { v := 0; s.DurationMinutes = &v }},
		{"excessive duration", func(s *ServiceInput) { v := 1441; s.DurationMinutes = &v }},
		{"control character price", func(s *ServiceInput) { v := "10\x00 EUR"; s.PriceDisplayLV = &v }},
		{"oversized description", func(s *ServiceInput) { v := strings.Repeat("x", 10001); s.DescriptionRU = &v }},
		{"unsafe description control", func(s *ServiceInput) { v := "text\x1b"; s.DescriptionEN = &v }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := valid
			test.change(&input)
			if _, err := prepareService(input); !errors.Is(err, ErrInvalid) {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}

func TestTimeOffUsesClinicCalendarForFullDays(t *testing.T) {
	doctorID := "10000000-0000-4000-8000-000000000001"
	for _, test := range []struct {
		name, start, end string
		elapsed          time.Duration
	}{
		{"spring 23-hour day", "2026-03-29 00:00:00", "2026-03-30 00:00:00", 23 * time.Hour},
		{"fall 25-hour day", "2026-10-25 00:00:00", "2026-10-26 00:00:00", 25 * time.Hour},
	} {
		t.Run(test.name, func(t *testing.T) {
			input := TimeOffInput{DoctorID: doctorID, StartsAt: availabilityLocal(t, test.start).UTC(), EndsAt: availabilityLocal(t, test.end).UTC(), Reason: "holiday", FullDay: true}
			if input.EndsAt.Sub(input.StartsAt) != test.elapsed {
				t.Fatal("test must exercise the actual DST transition")
			}
			if err := validateTimeOffInput(input); err != nil {
				t.Fatalf("valid local full day rejected: %v", err)
			}
			input.StartsAt = input.StartsAt.Add(time.Minute)
			if err := validateTimeOffInput(input); !errors.Is(err, ErrInvalid) {
				t.Fatalf("non-midnight full day accepted: %v", err)
			}
			input.FullDay = false
			if err := validateTimeOffInput(input); err != nil {
				t.Fatalf("partial day range rejected: %v", err)
			}
		})
	}
}

func TestConfigurationRejectsInvalidWritesBeforeDatabaseAccess(t *testing.T) {
	// A nil database makes accidental database access fail immediately. Invalid
	// configuration must be rejected before a transaction or advisory lock.
	store := &Store{}
	ctx := context.Background()
	doctorID := "10000000-0000-4000-8000-000000000001"
	if _, err := store.SaveDoctor(ctx, "", DoctorInput{Name: " ", Provenance: "development_fixture"}); !errors.Is(err, ErrInvalid) {
		t.Errorf("invalid doctor: %v", err)
	}
	if _, err := store.SaveService(ctx, "", ServiceInput{}); !errors.Is(err, ErrInvalid) {
		t.Errorf("invalid service: %v", err)
	}
	if err := store.SetDoctorService(ctx, doctorID, "invalid", nil); !errors.Is(err, ErrInvalid) {
		t.Errorf("invalid association: %v", err)
	}
	if _, err := store.AddSchedule(ctx, ScheduleInput{DoctorID: doctorID, Weekday: time.Monday, StartMinute: 540, EndMinute: 530}); !errors.Is(err, ErrInvalid) {
		t.Errorf("reversed schedule: %v", err)
	}
	if err := store.RemoveSchedule(ctx, "invalid"); !errors.Is(err, ErrInvalid) {
		t.Errorf("invalid schedule ID: %v", err)
	}
	if _, err := store.AddTimeOff(ctx, TimeOffInput{DoctorID: doctorID, Reason: "vacation"}); !errors.Is(err, ErrInvalid) {
		t.Errorf("missing time-off instants: %v", err)
	}
	if err := store.RemoveTimeOff(ctx, "invalid"); !errors.Is(err, ErrInvalid) {
		t.Errorf("invalid time-off ID: %v", err)
	}
	if err := validateScheduleInput(ScheduleInput{DoctorID: doctorID, Weekday: time.Monday, StartMinute: 1380, EndMinute: 1440, EffectiveFrom: "2026-10-12", EffectiveUntil: "2026-10-12"}); err != nil {
		t.Errorf("valid end-of-day schedule rejected: %v", err)
	}
}
