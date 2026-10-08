package booking

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrInvalid       = errors.New("invalid_request")
	ErrUnavailable   = errors.New("slot_unavailable")
	ErrNotFound      = errors.New("not_found")
	ErrConflict      = errors.New("idempotency_conflict")
	ErrTransition    = errors.New("invalid_status_transition")
	ErrNotConfigured = errors.New("booking_not_configured")
)

type Service struct {
	ID              string  `json:"id"`
	Slug            string  `json:"slug"`
	NameLV          string  `json:"name_lv"`
	NameRU          string  `json:"name_ru"`
	NameEN          string  `json:"name_en"`
	DescriptionLV   *string `json:"description_lv,omitempty"`
	DescriptionRU   *string `json:"description_ru,omitempty"`
	DescriptionEN   *string `json:"description_en,omitempty"`
	DurationMinutes *int    `json:"duration_minutes"`
	PriceDisplayLV  *string `json:"price_display_lv,omitempty"`
	PriceDisplayRU  *string `json:"price_display_ru,omitempty"`
	PriceDisplayEN  *string `json:"price_display_en,omitempty"`
	Active          bool    `json:"-"`
	BookingEnabled  bool    `json:"-"`
	SortOrder       int     `json:"-"`
	Provenance      string  `json:"provenance"`
}
type Doctor struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Active         bool   `json:"-"`
	BookingEnabled bool   `json:"-"`
	SortOrder      int    `json:"-"`
	Provenance     string `json:"provenance"`
}
type Settings struct {
	ID                    int             `json:"-"`
	ConfirmationMode      string          `json:"confirmation_mode"`
	BookingHorizonDays    int             `json:"booking_horizon_days"`
	MinimumAdvanceMinutes int             `json:"minimum_advance_minutes"`
	SlotIntervalMinutes   int             `json:"slot_interval_minutes"`
	CancellationPolicy    json.RawMessage `json:"cancellation_policy" gorm:"type:jsonb"`
	Timezone              string          `json:"timezone"`
	PrivacyNoticeVersion  *string         `json:"privacy_notice_version"`
	UpdatedAt             time.Time       `json:"updated_at"`
}

func (Settings) TableName() string { return "booking_settings" }
func (s Settings) availability() AvailabilitySettings {
	return AvailabilitySettings{s.Timezone, s.BookingHorizonDays, s.MinimumAdvanceMinutes, s.SlotIntervalMinutes}
}

type CreateRequest struct {
	ServiceID            string    `json:"service_id"`
	DoctorID             string    `json:"doctor_id,omitempty"`
	FirstName            string    `json:"first_name"`
	LastName             string    `json:"last_name"`
	Phone                string    `json:"phone"`
	Email                string    `json:"email"`
	StartsAt             time.Time `json:"starts_at"`
	PrivacyAcknowledged  bool      `json:"privacy_acknowledged"`
	PrivacyNoticeVersion string    `json:"privacy_notice_version"`
}

// Receipt deliberately omits patient contact details and user IDs, including on idempotent replay.
type Receipt struct {
	ID               string    `json:"id"`
	BookingReference string    `json:"booking_reference"`
	ServiceID        string    `json:"service_id"`
	DoctorID         string    `json:"doctor_id"`
	StartsAt         time.Time `json:"starts_at"`
	EndsAt           time.Time `json:"ends_at"`
	Status           string    `json:"status"`
}
type Appointment struct {
	ID                    string    `json:"id"`
	BookingReference      string    `json:"booking_reference"`
	AuthUserID            *string   `json:"auth_user_id,omitempty"`
	ServiceID             string    `json:"service_id"`
	DoctorID              string    `json:"doctor_id"`
	FirstName             string    `json:"first_name"`
	LastName              string    `json:"last_name"`
	Phone                 string    `json:"phone"`
	Email                 string    `json:"email"`
	StartsAt              time.Time `json:"starts_at"`
	EndsAt                time.Time `json:"ends_at"`
	Status                string    `json:"status"`
	PrivacyNoticeVersion  string    `json:"privacy_notice_version"`
	PrivacyAcknowledgedAt time.Time `json:"privacy_acknowledged_at"`
	IdempotencyKey        string    `json:"-"`
	RequestFingerprint    string    `json:"-"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

func (a Appointment) receipt() Receipt {
	return Receipt{a.ID, a.BookingReference, a.ServiceID, a.DoctorID, a.StartsAt, a.EndsAt, a.Status}
}
func CanTransition(from, to string) bool {
	switch from {
	case "pending":
		return to == "confirmed" || to == "cancelled" || to == "rejected"
	case "confirmed":
		return to == "completed" || to == "cancelled" || to == "no_show"
	}
	return false
}
