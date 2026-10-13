package booking

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"strings"

	"gorm.io/gorm"
)

type ServiceAssignment struct {
	DoctorID         string `json:"doctor_id"`
	BookingEnabled   bool   `json:"booking_enabled"`
	DurationOverride *int   `json:"duration_override_minutes"`
}
type ServiceOperationInput struct {
	ServiceInput
	DurationApproved bool                `json:"duration_approved"`
	EditorialKey     string              `json:"editorial_key"`
	Assignments      []ServiceAssignment `json:"assignments"`
}

// Prices have one owner: the published editorial service. Drafts never change
// booking prices. An unlinked operational service does not advertise a price.
func editorialPrice(tx *gorm.DB, key string) (*string, error) {
	if key == "" {
		return nil, nil
	}
	if !strings.HasPrefix(key, "service.") || len(key) > 160 {
		return nil, ErrInvalid
	}
	var result struct{ Payload json.RawMessage }
	r := tx.Raw(`SELECT r.payload FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision AND r.document_key=d.key WHERE d.key=?`, key).Scan(&result)
	if r.Error != nil {
		return nil, r.Error
	}
	if len(result.Payload) == 0 {
		return nil, ErrNotFound
	}
	definition, ok := cms.DefinitionFor(key)
	if !ok || definition.SystemManaged {
		return nil, ErrInvalid
	}
	if len(definition.PriceReference) != 2 {
		return nil, nil
	}
	var value struct{ Amount *string }
	r = tx.Raw(`SELECT CASE WHEN COALESCE((r.payload->'items'->(?::integer)->>'archived')::boolean,false) THEN NULL ELSE r.payload->'items'->(?::integer)->>'price' END AS amount FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision AND r.document_key=d.key WHERE d.key=?`, definition.PriceReference[1], definition.PriceReference[1], fmt.Sprintf("prices.%d", definition.PriceReference[0])).Scan(&value)
	if r.Error != nil {
		return nil, r.Error
	}

	return value.Amount, nil
}

func (s *Store) saveServiceOperation(ctx context.Context, id string, input ServiceOperationInput) (Service, error) {
	owned, managed, e := cms.CatalogServiceByBooking(s.DB, id)
	if e != nil {
		return Service{}, e
	}
	price, e := editorialPrice(s.DB, input.EditorialKey)
	if managed {
		var source struct{ DocumentKey string }
		if e := s.DB.Table("cms_booking_service_links").Select("document_key").Where("service_id=?", id).Scan(&source).Error; e != nil {
			return Service{}, e
		}
		input.EditorialKey = source.DocumentKey
		price, _, e = cms.CatalogBookingPrice(s.DB, id)
		if owned.Archived || !owned.Published {
			return Service{}, ErrInvalid
		}
		input.NameLV = owned.Title.LV
		input.NameRU = owned.Title.RU
		input.NameEN = owned.Title.EN
		input.DescriptionLV = &owned.Text.LV
		input.DescriptionRU = &owned.Text.RU
		input.DescriptionEN = &owned.Text.EN

		var previous Service
		if e := s.DB.Where("id=?", id).Take(&previous).Error; e != nil {
			return Service{}, e
		}
		changed := input.DurationMinutes != nil && (previous.DurationMinutes == nil || *input.DurationMinutes != *previous.DurationMinutes)
		if (changed || input.BookingEnabled && !previous.BookingEnabled) && !input.DurationApproved {
			return Service{}, ErrInvalid
		}
		if input.BookingEnabled {
			if input.DurationMinutes == nil {
				return Service{}, ErrInvalid
			}
			ready := false
			for _, a := range input.Assignments {
				if !a.BookingEnabled {
					continue
				}
				var schedule bool
				if e := s.DB.Raw(`SELECT EXISTS(SELECT 1 FROM doctor_schedules h JOIN doctors d ON d.id=h.doctor_id WHERE d.id=? AND d.active AND h.active AND (h.effective_until IS NULL OR h.effective_until>=CURRENT_DATE) AND extract(epoch FROM(h.end_time-h.start_time))/60>=?) AND EXISTS(SELECT 1 FROM booking_settings WHERE id=1 AND privacy_notice_version IS NOT NULL AND privacy_notice_version<>'')`, a.DoctorID, *input.DurationMinutes).Scan(&schedule).Error; e != nil {
					return Service{}, e
				}
				ready = ready || schedule
			}
			if !ready {
				return Service{}, ErrNotConfigured
			}
		}
	}
	if e != nil {
		return Service{}, e
	}
	// Reject divergent client prices; never silently accept a second source.
	for _, v := range []*string{input.PriceDisplayLV, input.PriceDisplayRU, input.PriceDisplayEN} {
		if v != nil && strings.TrimSpace(*v) != "" && (price == nil || *v != *price) {
			return Service{}, ErrInvalid
		}
	}
	input.PriceDisplayLV = price
	input.PriceDisplayRU = price
	input.PriceDisplayEN = price
	if len(input.Assignments) > 100 {
		return Service{}, ErrInvalid
	}
	seen := map[string]bool{}
	for _, a := range input.Assignments {
		if !ValidID(a.DoctorID) || seen[a.DoctorID] || !validOptionalDuration(a.DurationOverride) {
			return Service{}, ErrInvalid
		}
		seen[a.DoctorID] = true
	}
	v, e := s.SaveService(ctx, id, input.ServiceInput)
	if e != nil {
		return v, e
	}
	if e = s.DB.Exec("DELETE FROM cms_booking_service_links WHERE service_id=?", v.ID).Error; e != nil {
		return v, e
	}
	if input.EditorialKey != "" {
		if e = s.DB.Exec("INSERT INTO cms_booking_service_links(document_key,service_id) VALUES (?,?)", input.EditorialKey, v.ID).Error; e != nil {
			return v, e
		}
	}
	// Disable rather than delete eligibility: historical appointment FKs survive.
	if e = s.DB.Exec("UPDATE doctor_services SET booking_enabled=false WHERE service_id=?", v.ID).Error; e != nil {
		return v, e
	}
	for _, a := range input.Assignments {
		if e = s.SetDoctorService(ctx, a.DoctorID, v.ID, a.DurationOverride); e != nil {
			return v, e
		}
		if e = s.DB.Exec("UPDATE doctor_services SET booking_enabled=? WHERE doctor_id=? AND service_id=?", a.BookingEnabled, a.DoctorID, v.ID).Error; e != nil {
			return v, e
		}
	}
	return v, nil
}

func servicePrices(tx *gorm.DB, rows []Service) error {
	// Retain compatibility with a schema containing only booking migrations.
	var hasCMS bool
	if e := tx.Raw("SELECT to_regclass('public.cms_booking_service_links') IS NOT NULL").Scan(&hasCMS).Error; e != nil {
		return e
	}
	if !hasCMS {
		return nil
	}
	type linked struct{ ServiceID, DocumentKey string }
	var links []linked
	if e := tx.Table("cms_booking_service_links").Select("service_id,document_key").Scan(&links).Error; e != nil {
		return e
	}
	byID := map[string]*string{}
	for _, link := range links {
		p, e := editorialPrice(tx, link.DocumentKey)
		if e != nil {
			return e
		}
		byID[link.ServiceID] = p
	}
	for i := range rows {
		if price, owned, e := cms.CatalogBookingPrice(tx, rows[i].ID); e != nil {
			return e
		} else if owned {
			if owned, ok, e := cms.CatalogServiceByBooking(tx, rows[i].ID); e != nil {
				return e
			} else if ok {
				rows[i].NameLV = owned.Title.LV
				rows[i].NameRU = owned.Title.RU
				rows[i].NameEN = owned.Title.EN
				rows[i].DescriptionLV = &owned.Text.LV
				rows[i].DescriptionRU = &owned.Text.RU
				rows[i].DescriptionEN = &owned.Text.EN
			}
			rows[i].PriceDisplayLV = price
			rows[i].PriceDisplayRU = price
			rows[i].PriceDisplayEN = price
			if labels, _, e := cms.CatalogBookingLabels(tx, rows[i].ID); e != nil {
				return e
			} else if labels.LV != "" {
				rows[i].PriceDisplayLV = &labels.LV
				rows[i].PriceDisplayRU = &labels.RU
				rows[i].PriceDisplayEN = &labels.EN
			}
			continue
		}
		if p, ok := byID[rows[i].ID]; ok {
			rows[i].PriceDisplayLV = p
			rows[i].PriceDisplayRU = p
			rows[i].PriceDisplayEN = p
		}
	}
	return nil
}
