package booking

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

func TestDoctorHoursActionableValidation(t *testing.T) {
	s := &Store{} // Invalid input must fail before any database mutation.
	for _, tc := range []struct {
		hours []DoctorHours
		code  string
	}{{[]DoctorHours{{Weekday: 1, StartMinute: 600, EndMinute: 500}}, "timeOrder"}, {[]DoctorHours{{Weekday: 1, StartMinute: 540, EndMinute: 720}, {Weekday: 1, StartMinute: 660, EndMinute: 780}}, "timeOverlap"}} {
		err := s.saveDoctorSetup(context.Background(), "30000000-0000-4000-8000-000000000001", &DoctorSetup{Hours: tc.hours})
		var detail *ValidationDetail
		if !errors.As(err, &detail) || detail.Code != tc.code || detail.Day != 1 || !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected actionable validation: %v", err)
		}
	}
}

func TestProfileFieldValidation(t *testing.T) {
	text := func() map[string]string { return map[string]string{"lv": "", "ru": "", "en": ""} }
	for _, field := range []string{"title", "biography", "qualifications"} {
		input := DoctorOperationInput{Profile: DoctorProfile{Title: text(), Biography: text(), Qualifications: text()}}
		switch field {
		case "title":
			input.Profile.Title["ru"] = "<invalid>"
		case "biography":
			delete(input.Profile.Biography, "ru")
		case "qualifications":
			input.Profile.Qualifications["en"] = "\x00"
		}
		_, err := (&Store{}).saveDoctorOperation(context.Background(), "", input)
		var detail *ValidationDetail
		if !errors.As(err, &detail) || detail.Code != "profileFieldInvalid" || detail.Field != field {
			t.Fatalf("missing specific field: %v", err)
		}
	}
}

func TestDoctorRequestContract(t *testing.T) {
	raw := json.RawMessage(`{"name":"Synthetic","profile":{"title":{"lv":"","ru":"","en":""},"biography":{"lv":"","ru":"","en":""},"qualifications":{"lv":"","ru":"","en":""}},"confirm_editorial_link":true}`)
	var current DoctorOperationInput
	if err := strictOperation(raw, &current); err != nil {
		t.Fatal("current contract rejects UI payload", err)
	}
	// Reproduce the pre-link API contract: strict decoding rejects the newly added
	// confirmation field even when every visible profile field is valid.
	var stale struct {
		DoctorInput
		Profile DoctorProfile `json:"profile"`
	}
	if err := strictOperation(raw, &stale); !errors.Is(err, ErrInvalid) {
		t.Fatal("expected old contract incompatibility")
	}
	var unknown DoctorOperationInput
	if err := strictOperation(json.RawMessage(`{"role":"admin"}`), &unknown); !errors.Is(err, ErrInvalid) {
		t.Fatal("unknown fields must stay rejected")
	}
}
