package booking

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Configuration methods are internal admin capabilities, not public endpoints.
// Callers must verify the JWT and authoritative admin role before invoking them.
// Edits change future offerings without rewriting existing appointment snapshots.
// Deactivate services/doctors instead of deleting their historical records.
type DoctorInput struct {
	Name           string `json:"name"`
	Active         bool   `json:"active"`
	BookingEnabled bool   `json:"booking_enabled"`
	SortOrder      int    `json:"sort_order"`
	Provenance     string `json:"provenance"`
}

type ServiceInput struct {
	Slug            string  `json:"slug"`
	NameLV          string  `json:"name_lv"`
	NameRU          string  `json:"name_ru"`
	NameEN          string  `json:"name_en"`
	DescriptionLV   *string `json:"description_lv"`
	DescriptionRU   *string `json:"description_ru"`
	DescriptionEN   *string `json:"description_en"`
	DurationMinutes *int    `json:"duration_minutes"`
	PriceDisplayLV  *string `json:"price_display_lv"`
	PriceDisplayRU  *string `json:"price_display_ru"`
	PriceDisplayEN  *string `json:"price_display_en"`
	Active          bool    `json:"active"`
	BookingEnabled  bool    `json:"booking_enabled"`
	SortOrder       int     `json:"sort_order"`
	Provenance      string  `json:"provenance"`
}

type ScheduleInput struct {
	DoctorID       string       `json:"doctor_id"`
	Weekday        time.Weekday `json:"weekday"`
	StartMinute    int          `json:"start_minute"`
	EndMinute      int          `json:"end_minute"`
	EffectiveFrom  string       `json:"effective_from,omitempty"`
	EffectiveUntil string       `json:"effective_until,omitempty"`
}

type TimeOffInput struct {
	DoctorID string    `json:"doctor_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Reason   string    `json:"reason"`
	FullDay  bool      `json:"full_day"`
}

var serviceSlugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// SaveDoctor creates when id is empty, otherwise updates an existing record.
// An unknown nonempty ID is never silently inserted.
func (s *Store) SaveDoctor(ctx context.Context, id string, input DoctorInput) (Doctor, error) {
	id = strings.ToLower(id)
	v := Doctor{ID: id, Name: strings.TrimSpace(input.Name), Active: input.Active,
		BookingEnabled: input.BookingEnabled, SortOrder: input.SortOrder, Provenance: input.Provenance}
	if (id != "" && !ValidID(id)) || !cleanText(v.Name, 1, 200) || !validCatalogMetadata(v.SortOrder, v.Provenance) {
		return Doctor{}, ErrInvalid
	}
	create := id == ""
	if create {
		var err error
		v.ID, err = newID()
		if err != nil {
			return Doctor{}, err
		}
	}
	err := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if create {
			return tx.Create(&v).Error
		}
		result := tx.Model(&Doctor{}).Where("id = ?", v.ID).
			Select("name", "active", "booking_enabled", "sort_order", "provenance").Updates(&v)
		return configurationUpdateError(result)
	})
	return v, configurationError(err)
}

func (s *Store) SaveService(ctx context.Context, id string, input ServiceInput) (Service, error) {
	id = strings.ToLower(id)
	v, err := prepareService(input)
	if err != nil || (id != "" && !ValidID(id)) {
		return Service{}, ErrInvalid
	}
	create := id == ""
	v.ID = id
	if create {
		v.ID, err = newID()
		if err != nil {
			return Service{}, err
		}
	}
	err = s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if create {
			return tx.Create(&v).Error
		}
		result := tx.Model(&Service{}).Where("id = ?", v.ID).
			Select("slug", "name_lv", "name_ru", "name_en", "description_lv", "description_ru", "description_en",
				"duration_minutes", "price_display_lv", "price_display_ru", "price_display_en", "active", "booking_enabled", "sort_order", "provenance").Updates(&v)
		return configurationUpdateError(result)
	})
	return v, configurationError(err)
}

// SetDoctorService preserves the relationship referenced by historical bookings.
// A nil override uses the service duration. It never invents a missing duration.
func (s *Store) SetDoctorService(ctx context.Context, doctorID, serviceID string, durationOverride *int) error {
	if !ValidID(doctorID) || !ValidID(serviceID) || !validOptionalDuration(durationOverride) {
		return ErrInvalid
	}
	return configurationError(s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		relation := struct {
			DoctorID                string
			ServiceID               string
			DurationOverrideMinutes *int
		}{doctorID, serviceID, durationOverride}
		return tx.Table("doctor_services").Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "doctor_id"}, {Name: "service_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"duration_override_minutes"}),
		}).Create(&relation).Error
	}))
}

func (s *Store) AddSchedule(ctx context.Context, input ScheduleInput) (string, error) {
	if err := validateScheduleInput(input); err != nil {
		return "", err
	}
	id, err := newID()
	if err != nil {
		return "", err
	}
	err = s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		return tx.Exec(`INSERT INTO doctor_schedules
			(id,doctor_id,weekday,start_time,end_time,effective_from,effective_until)
			VALUES (?,?,?,?::time,?::time,NULLIF(?,'')::date,NULLIF(?,'')::date)`,
			id, input.DoctorID, int(input.Weekday), localClock(input.StartMinute), localClock(input.EndMinute), input.EffectiveFrom, input.EffectiveUntil).Error
	})
	return id, configurationError(err)
}

// RemoveSchedule affects future availability only. Existing appointments remain
// reserved at their original instants and must be rescheduled explicitly.
func (s *Store) RemoveSchedule(ctx context.Context, id string) error {
	if !ValidID(id) {
		return ErrInvalid
	}
	return configurationError(s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		return configurationUpdateError(tx.Exec("DELETE FROM doctor_schedules WHERE id = ?", id))
	}))
}

func (s *Store) AddTimeOff(ctx context.Context, input TimeOffInput) (string, error) {
	if err := validateTimeOffInput(input); err != nil {
		return "", err
	}
	id, err := newID()
	if err != nil {
		return "", err
	}
	err = s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		// The exclusive configuration lock serializes this check/insert against
		// creation and rescheduling, which use the same locking protocol.
		var occupied bool
		if err := tx.Raw(`SELECT EXISTS(SELECT 1 FROM appointments
			WHERE doctor_id=? AND status IN ('pending','confirmed')
			AND starts_at < ? AND ends_at > ?)`, input.DoctorID, input.EndsAt, input.StartsAt).Scan(&occupied).Error; err != nil {
			return err
		}
		if occupied {
			return ErrUnavailable
		}
		return tx.Exec(`INSERT INTO doctor_time_off (id,doctor_id,starts_at,ends_at,reason,full_day)
			VALUES (?,?,?,?,?,?)`, id, input.DoctorID, input.StartsAt.UTC(), input.EndsAt.UTC(), input.Reason, input.FullDay).Error
	})
	return id, configurationError(err)
}

func (s *Store) RemoveTimeOff(ctx context.Context, id string) error {
	if !ValidID(id) {
		return ErrInvalid
	}
	return configurationError(s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		return configurationUpdateError(tx.Exec("DELETE FROM doctor_time_off WHERE id = ?", id))
	}))
}

func prepareService(input ServiceInput) (Service, error) {
	v := Service{
		Slug: strings.TrimSpace(input.Slug), NameLV: strings.TrimSpace(input.NameLV), NameRU: strings.TrimSpace(input.NameRU), NameEN: strings.TrimSpace(input.NameEN),
		DescriptionLV: trimCatalogOptional(input.DescriptionLV), DescriptionRU: trimCatalogOptional(input.DescriptionRU), DescriptionEN: trimCatalogOptional(input.DescriptionEN),
		DurationMinutes: input.DurationMinutes,
		PriceDisplayLV:  trimCatalogOptional(input.PriceDisplayLV), PriceDisplayRU: trimCatalogOptional(input.PriceDisplayRU), PriceDisplayEN: trimCatalogOptional(input.PriceDisplayEN),
		Active: input.Active, BookingEnabled: input.BookingEnabled, SortOrder: input.SortOrder, Provenance: input.Provenance,
	}
	if len(v.Slug) > 120 || !serviceSlugPattern.MatchString(v.Slug) || !validCatalogMetadata(v.SortOrder, v.Provenance) || !validOptionalDuration(v.DurationMinutes) {
		return Service{}, ErrInvalid
	}
	for _, name := range []string{v.NameLV, v.NameRU, v.NameEN} {
		if !cleanText(name, 1, 200) {
			return Service{}, ErrInvalid
		}
	}
	for _, price := range []*string{v.PriceDisplayLV, v.PriceDisplayRU, v.PriceDisplayEN} {
		if price != nil && !cleanText(*price, 1, 200) {
			return Service{}, ErrInvalid
		}
	}
	for _, description := range []*string{v.DescriptionLV, v.DescriptionRU, v.DescriptionEN} {
		if description != nil && !validDescription(*description) {
			return Service{}, ErrInvalid
		}
	}
	if v.DurationMinutes == nil {
		v.BookingEnabled = false
	}
	return v, nil
}

func validCatalogMetadata(order int, provenance string) bool {
	return order >= -1000000 && order <= 1000000 && (provenance == "clinic_verified" || provenance == "development_fixture")
}

func validOptionalDuration(duration *int) bool {
	return duration == nil || (*duration >= 1 && *duration <= 1440)
}

func trimCatalogOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(strings.ReplaceAll(*value, "\r\n", "\n"))
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func validDescription(value string) bool {
	if !utf8.ValidString(value) || utf8.RuneCountInString(value) > 10000 {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) && r != '\n' && r != '\t' {
			return false
		}
	}
	return true
}

func validateScheduleInput(input ScheduleInput) error {
	if !ValidID(input.DoctorID) {
		return ErrInvalid
	}
	location, err := time.LoadLocation("Europe/Riga")
	if err != nil {
		return err
	}
	doctor := DoctorAvailability{ID: input.DoctorID, DurationMinutes: 1, Schedules: []WorkingInterval{{
		Weekday: input.Weekday, StartMinute: input.StartMinute, EndMinute: input.EndMinute,
		EffectiveFrom: input.EffectiveFrom, EffectiveUntil: input.EffectiveUntil,
	}}}
	if validateAvailabilityDoctors([]DoctorAvailability{doctor}, location) != nil {
		return ErrInvalid
	}
	return nil
}

func validateTimeOffInput(input TimeOffInput) error {
	if !ValidID(input.DoctorID) || input.StartsAt.IsZero() || input.EndsAt.IsZero() || !input.StartsAt.Before(input.EndsAt) ||
		input.StartsAt.Year() < 1 || input.EndsAt.Year() > 9999 ||
		(input.Reason != "holiday" && input.Reason != "vacation" && input.Reason != "other") {
		return ErrInvalid
	}
	if input.FullDay {
		location, err := time.LoadLocation("Europe/Riga")
		if err != nil {
			return err
		}
		for _, instant := range []time.Time{input.StartsAt, input.EndsAt} {
			local := instant.In(location)
			if local.Hour() != 0 || local.Minute() != 0 || local.Second() != 0 || local.Nanosecond() != 0 {
				return ErrInvalid
			}
		}
	}
	return nil
}

func localClock(minute int) string { return fmt.Sprintf("%02d:%02d", minute/60, minute%60) }

func configurationUpdateError(result *gorm.DB) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func configurationError(err error) error {
	var postgresError *pgconn.PgError
	if errors.As(err, &postgresError) {
		switch postgresError.Code {
		case "23503":
			return ErrNotFound
		case "23505", "23514":
			return ErrInvalid
		}
	}
	return databaseError(err)
}
