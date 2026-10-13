package booking

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"strings"
)

type DoctorProfile struct {
	Title          map[string]string `json:"title,omitempty"`
	Biography      map[string]string `json:"biography"`
	Qualifications map[string]string `json:"qualifications"`
}
type DoctorOperationInput struct {
	Setup                *DoctorSetup `json:"setup,omitempty"`
	ConfirmEditorialLink bool         `json:"confirm_editorial_link,omitempty"`
	DoctorInput
	Profile      DoctorProfile `json:"profile"`
	PortraitID   string        `json:"portrait_id"`
	EditorialKey string        `json:"editorial_key"`
}

func validProfileText(values map[string]string) bool {
	if len(values) != 3 {
		return false
	}
	for _, l := range []string{"lv", "ru", "en"} {
		v, ok := values[l]
		if !ok || !validDescription(v) || strings.ContainsAny(v, "<>") {
			return false
		}
	}
	return true
}
func (s *Store) saveDoctorOperation(ctx context.Context, id string, input DoctorOperationInput) (Doctor, error) {
	for _, field := range []struct {
		name     string
		values   map[string]string
		optional bool
	}{{"title", input.Profile.Title, true}, {"biography", input.Profile.Biography, false}, {"qualifications", input.Profile.Qualifications, false}} {
		if field.optional && field.values == nil {
			continue
		}
		for _, locale := range []string{"lv", "ru", "en"} {
			value, ok := field.values[locale]
			if !ok || !validDescription(value) || strings.ContainsAny(value, "<>") {
				return Doctor{}, &ValidationDetail{Code: "profileFieldInvalid", Day: -1, Field: field.name, Locale: locale}
			}
		}
		if len(field.values) != 3 {
			return Doctor{}, &ValidationDetail{Code: "profileFieldInvalid", Day: -1, Field: field.name}
		}
	}
	if len(input.PortraitID) > 200 {
		return Doctor{}, &ValidationDetail{Code: "portraitInvalid", Day: -1, Field: "portrait"}
	}
	if input.EditorialKey != "" && input.EditorialKey != "clinic.doctorBio" {
		return Doctor{}, &ValidationDetail{Code: "editorialInvalid", Day: -1, Field: "editorial_key"}
	}

	if input.EditorialKey != "" {
		var existing struct{ DoctorID string }
		if err := s.DB.Table("doctor_profiles").Select("doctor_id").Where("editorial_key=?", input.EditorialKey).Scan(&existing).Error; err != nil {
			return Doctor{}, err
		}
		if existing.DoctorID != "" && existing.DoctorID != id {
			return Doctor{}, ErrConflict
		}
		if (existing.DoctorID == "" || existing.DoctorID != id) && !input.ConfirmEditorialLink {
			return Doctor{}, &ValidationDetail{Code: "linkRequired", Day: -1, Field: "editorial_key"}
		}
	}
	if !cleanText(strings.TrimSpace(input.Name), 1, 200) {
		return Doctor{}, &ValidationDetail{Code: "nameRequired", Day: -1}
	}
	if err := cms.ValidateProfilePortrait(s.DB, input.PortraitID); err != nil {
		if errors.Is(err, cms.ErrInvalid) {
			return Doctor{}, &ValidationDetail{Code: "portraitInvalid", Day: -1, Field: "portrait"}
		}
		return Doctor{}, err
	}
	v, e := s.SaveDoctor(ctx, id, input.DoctorInput)
	if e != nil {
		return v, e
	}
	if input.Setup != nil {
		if e = s.saveDoctorSetup(ctx, v.ID, input.Setup); e != nil {
			return Doctor{}, e
		}
	}
	if input.Active && input.BookingEnabled {
		ready, err := s.doctorReady(v.ID)
		if err != nil {
			return Doctor{}, err
		}
		if !ready {
			return Doctor{}, ErrNotConfigured
		}
	}
	profile, _ := json.Marshal(input.Profile)
	e = s.DB.Exec(`INSERT INTO doctor_profiles(doctor_id,editorial_key,profile,portrait_id) VALUES (?,NULLIF(?,''),?::jsonb,NULLIF(?,'')) ON CONFLICT(doctor_id) DO UPDATE SET editorial_key=EXCLUDED.editorial_key,profile=EXCLUDED.profile,portrait_id=EXCLUDED.portrait_id`, v.ID, input.EditorialKey, string(profile), input.PortraitID).Error
	return v, e
}
