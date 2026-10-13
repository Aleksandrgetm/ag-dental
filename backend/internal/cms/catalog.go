package cms

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"gorm.io/gorm"
	"io"
	"regexp"
	"strconv"
	"strings"
)

const CatalogKey = "catalog.services"

var catalogAmount = regexp.MustCompile(`^[0-9]{1,7}(\.[0-9]{1,2})?$`)

type CatalogPrice struct {
	ID       string    `json:"id"`
	Name     LocalText `json:"name"`
	Price    string    `json:"price"`
	Type     string    `json:"type"`
	Review   bool      `json:"review,omitempty"`
	Archived bool      `json:"archived"`
	Order    int       `json:"display_order"`
}
type CatalogCategory struct {
	ID         string         `json:"id"`
	Title      LocalText      `json:"title"`
	Concession bool           `json:"concession"`
	Items      []CatalogPrice `json:"items"`
}
type CatalogService struct {
	SEOTitle       *LocalText `json:"seo_title,omitempty"`
	SEODescription *LocalText `json:"seo_description,omitempty"`
	ID             string     `json:"id"`
	BookingID      string     `json:"booking_id"`
	Slug           string     `json:"slug"`
	Title          LocalText  `json:"title"`
	Short          LocalText  `json:"short"`
	Text           LocalText  `json:"text"`
	Image          string     `json:"image"`
	Category       string     `json:"category"`
	PriceID        string     `json:"price_id"`
	Published      bool       `json:"published"`
	Archived       bool       `json:"archived"`
}
type Catalog struct {
	Services   []CatalogService  `json:"services"`
	Categories []CatalogCategory `json:"categories"`
}

func catalogDefinition() Definition {
	h := sha256.Sum256([]byte("ag-unified-services-v1"))
	return Definition{Key: CatalogKey, Target: "catalog", Group: "services", SourceHash: hex.EncodeToString(h[:])}
}
func catalogDecode(raw json.RawMessage) (Catalog, error) {
	var v Catalog
	if len(raw) > 2*1024*1024 {
		return v, ErrInvalid
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if d.Decode(&v) != nil || d.Decode(new(any)) != io.EOF {
		return v, ErrInvalid
	}
	if len(v.Services) > 500 || len(v.Categories) > 100 {
		return v, ErrInvalid
	}
	ids, slugs, bookings, prices, categories := map[string]bool{}, map[string]bool{}, map[string]bool{}, map[string]string{}, map[string]bool{}
	check := func(value LocalText, max int, required bool) bool {
		for _, s := range []string{value.LV, value.RU, value.EN} {
			if len(s) > max || markup.MatchString(s) || (required && strings.TrimSpace(s) == "") {
				return false
			}
		}
		return true
	}
	for _, c := range v.Categories {
		if c.ID == "" || len(c.ID) > 160 || ids[c.ID] || !check(c.Title, 2000, true) || len(c.Items) > 300 {
			return v, invalidField("category")
		}
		ids[c.ID] = true
		categories[c.ID] = true
		for _, p := range c.Items {
			if p.ID == "" || len(p.ID) > 180 || ids[p.ID] || !check(p.Name, 2000, true) || len(p.Price) > 200 || markup.MatchString(p.Price) || strings.TrimSpace(p.Price) == "" || p.Order < -1000000 || p.Order > 1000000 || (p.Type != "fixed" && p.Type != "from" && p.Type != "consultation" && p.Type != "text") {
				return v, invalidField("price")
			}
			if (p.Type == "fixed" || p.Type == "from") && !catalogAmount.MatchString(p.Price) {
				return v, invalidField("price")
			}
			ids[p.ID] = true
			prices[p.ID] = c.ID
		}
	}
	for _, s := range v.Services {
		if (s.SEOTitle != nil && !check(*s.SEOTitle, 200, false)) || (s.SEODescription != nil && !check(*s.SEODescription, 1000, false)) {
			return v, invalidField("service")
		}
		if s.ID == "" || len(s.ID) > 160 || ids[s.ID] || !safeSlug.MatchString(s.Slug) || len(s.Slug) > 100 || slugs[s.Slug] || !check(s.Title, 200, true) || !check(s.Short, 2000, false) || !check(s.Text, 12000, true) {
			return v, invalidField("service")
		}
		ids[s.ID] = true
		slugs[s.Slug] = true
		if !categories[s.Category] || (s.PriceID != "" && prices[s.PriceID] != s.Category) {
			return v, invalidField("category")
		}
		if s.BookingID != "" {
			if !uuid.MatchString(s.BookingID) || bookings[s.BookingID] {
				return v, invalidField("booking")
			}
			bookings[s.BookingID] = true
		}
		if s.Image != "" {
			valid := media.ReferenceID(s.Image) != ""
			for _, a := range Baseline.Media {
				if !a.Protected && a.Kind == "image" && a.URL == s.Image {
					valid = true
				}
			}
			if !valid {
				return v, invalidField("image")
			}
		}
	}
	return v, nil
}
func (s *Store) Catalog(ctx context.Context) (Document, Catalog, error) {
	d, revisions, e := s.Detail(ctx, CatalogKey)
	if e != nil {
		return d, Catalog{}, e
	}
	for _, r := range revisions {
		if d.PublishedRevision != nil && r.ID == *d.PublishedRevision {
			v, e := catalogDecode(r.Payload)
			return d, v, e
		}
	}
	return d, Catalog{}, ErrUnavailable
}

// Activation is a separate operator action. The draft/publication check prevents
// silently replacing an editor's work. No original document is mutated.
func (s *Store) CatalogSeed(ctx context.Context) (Catalog, error) {
	v := Catalog{Services: []CatalogService{}, Categories: []CatalogCategory{}}
	var rows []struct {
		Key       string
		Payload   json.RawMessage
		Published bool
		Draft     string
		Live      string
	}
	e := s.DB.WithContext(ctx).Raw(`SELECT d.key,r.payload,d.published_revision IS NOT NULL published,COALESCE(d.draft_revision::text,'') draft,COALESCE(d.published_revision::text,'') live FROM cms_documents d JOIN cms_revisions r ON r.id=COALESCE(d.published_revision,d.draft_revision) WHERE d.key LIKE 'service.%' OR d.key LIKE 'prices.%' OR d.key='clinic.media' ORDER BY d.key`).Scan(&rows).Error
	if e != nil {
		return v, e
	}
	byKey := map[string]json.RawMessage{}
	published := map[string]bool{}
	for _, r := range rows {
		if r.Published && r.Draft != r.Live {
			return v, ErrConflict
		}
		byKey[r.Key] = r.Payload
		published[r.Key] = r.Published
	}
	for _, d := range Baseline.Documents {
		if !strings.HasPrefix(d.Key, "prices.") {
			continue
		}
		raw, ok := byKey[d.Key]
		if !ok || !published[d.Key] {
			return v, ErrConflict
		}
		var c struct {
			Title      LocalText
			Concession bool
			Items      []struct {
				Name     LocalText
				Price    string
				Review   bool
				Archived bool
				Order    *int `json:"display_order"`
			}
		}
		if json.Unmarshal(raw, &c) != nil {
			return v, ErrInvalid
		}
		cat := CatalogCategory{ID: d.Key, Title: c.Title, Concession: c.Concession, Items: []CatalogPrice{}}
		for i, p := range c.Items {
			order := i
			if p.Order != nil {
				order = *p.Order
			}
			cat.Items = append(cat.Items, CatalogPrice{ID: fmt.Sprintf("%s.%d", d.Key, i), Name: p.Name, Price: p.Price, Type: "text", Review: p.Review, Archived: p.Archived, Order: order})
		}
		v.Categories = append(v.Categories, cat)
	}
	var links []struct{ DocumentKey, ServiceID string }
	if e = s.DB.WithContext(ctx).Table("cms_booking_service_links").Scan(&links).Error; e != nil {
		return v, e
	}
	byService := map[string]string{}
	for _, l := range links {
		if byService[l.DocumentKey] != "" {
			return v, ErrConflict
		}
		byService[l.DocumentKey] = l.ServiceID
	}
	for _, d := range Baseline.Documents {
		if !strings.HasPrefix(d.Key, "service.") {
			continue
		}
		raw, ok := byKey[d.Key]
		if !ok {
			return v, ErrMissing
		}
		var p struct {
			Slug               string
			Title, Short, Text LocalText
			Image              string
			Category           int
		}
		if json.Unmarshal(raw, &p) != nil {
			return v, ErrInvalid
		}
		image := p.Image
		if media.ReferenceID(image) == "" && !strings.HasPrefix(image, "/") {
			var names map[string]string
			if json.Unmarshal(byKey["clinic.media"], &names) != nil || names[image] == "" {
				return v, ErrInvalid
			}
			image = names[image]
		}

		priceID := ""
		if len(d.PriceReference) == 2 {
			priceID = fmt.Sprintf("prices.%d.%d", d.PriceReference[0], d.PriceReference[1])
		}
		v.Services = append(v.Services, CatalogService{ID: d.Key, BookingID: byService[d.Key], Slug: p.Slug, Title: p.Title, Short: p.Short, Text: p.Text, Image: image, Category: fmt.Sprintf("prices.%d", p.Category), PriceID: priceID, Published: published[d.Key]})
	}
	raw, _ := json.Marshal(v)
	_, e = catalogDecode(raw)
	return v, e
}
func catalogMediaFields(raw json.RawMessage, publicOnly bool) []Field {
	var v Catalog
	json.Unmarshal(raw, &v)
	fields := []Field{}
	for i, s := range v.Services {
		if !publicOnly || s.Published && !s.Archived {
			fields = append(fields, Field{Path: []string{"services", strconv.Itoa(i), "image"}, Type: "media"})
		}
	}
	return fields
}
func catalogPrice(v Catalog, s CatalogService) string {
	for _, c := range v.Categories {
		for _, p := range c.Items {
			if p.ID == s.PriceID && !p.Archived {
				return p.Price
			}
		}
	}
	return ""
}

// SaveCatalog publishes an atomic catalog revision and synchronizes only linked
// operational display fields. Duration, eligibility, schedules and booking flags
// cannot be activated by an editorial request.
func (s *Store) SaveCatalog(ctx context.Context, actor string, version int64, raw json.RawMessage) (Document, error) {
	var result Document
	v, e := catalogDecode(raw)
	if e != nil {
		return result, e
	}
	e = s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := cmsAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(714092002)").Error; e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(714092007)").Error; e != nil {
			return e
		}
		nested := Store{tx}
		d, old, e := nested.Catalog(ctx)
		if e != nil {
			return e
		}
		if d.Version != version {
			return ErrConflict
		}
		oldServices := map[string]CatalogService{}
		for _, x := range old.Services {
			oldServices[x.ID] = x
		}
		newServices := map[string]bool{}
		for _, x := range v.Services {
			newServices[x.ID] = true
			if prev, ok := oldServices[x.ID]; ok {
				if prev.Slug != x.Slug || (prev.BookingID != "" && prev.BookingID != x.BookingID) {
					return invalidField("service")
				}
			} else if !strings.HasPrefix(x.ID, "service.") || !uuid.MatchString(strings.TrimPrefix(x.ID, "service.")) || x.BookingID != "" {
				return invalidField("service")
			}
		}
		for id := range oldServices {
			if !newServices[id] {
				return ErrInvalid
			}
		}
		oldPrices := map[string]bool{}
		concessions := map[string]bool{}
		for _, c := range v.Categories {
			concessions[c.ID] = c.Concession
		}
		for _, c := range v.Categories {
			oldPrices[c.ID] = true
			for _, p := range c.Items {
				oldPrices[p.ID] = true
			}
		}
		for _, c := range old.Categories {
			if concessions[c.ID] != c.Concession {
				return invalidField("category")
			}
			if !oldPrices[c.ID] {
				return ErrInvalid
			}
			for _, p := range c.Items {
				if !oldPrices[p.ID] {
					return ErrInvalid
				}
			}
		}
		for i := range v.Services {
			x := &v.Services[i]
			if _, exists := oldServices[x.ID]; !exists {
				id := strings.TrimPrefix(x.ID, "service.")
				if e := tx.Exec(`INSERT INTO services(id,slug,name_lv,name_ru,name_en,active,booking_enabled,provenance) VALUES (?::uuid,?,?,?,?,false,false,'clinic_verified')`, id, x.Slug, x.Title.LV, x.Title.RU, x.Title.EN).Error; e != nil {
					return ErrConflict
				}
				x.BookingID = id
			}
			if previous, exists := oldServices[x.ID]; exists && previous.BookingID == "" && x.BookingID != "" {
				var count int64
				if e := tx.Table("services").Where("id=?", x.BookingID).Count(&count).Error; e != nil {
					return e
				}
				if count == 0 {
					if e := tx.Exec(`INSERT INTO services(id,slug,name_lv,name_ru,name_en,active,booking_enabled,provenance) VALUES (?::uuid,?,?,?,?,false,false,'clinic_verified')`, x.BookingID, x.Slug, x.Title.LV, x.Title.RU, x.Title.EN).Error; e != nil {
						return ErrConflict
					}
				} else {
					var linked int64
					if e := tx.Table("cms_booking_service_links").Where("service_id=? AND document_key<>?", x.BookingID, x.ID).Count(&linked).Error; e != nil {
						return e
					}
					if linked > 0 {
						return ErrConflict
					}
				}
			}
			if x.BookingID != "" {
				p := catalogPrice(v, *x)
				if e := tx.Exec(`UPDATE services SET name_lv=?,name_ru=?,name_en=?,description_lv=?,description_ru=?,description_en=?,price_display_lv=NULLIF(?,''),price_display_ru=NULLIF(?,''),price_display_en=NULLIF(?,''),active=CASE WHEN ? THEN false ELSE active END,booking_enabled=CASE WHEN ? THEN false ELSE booking_enabled END,updated_at=now() WHERE id=?::uuid`, x.Title.LV, x.Title.RU, x.Title.EN, x.Text.LV, x.Text.RU, x.Text.EN, p, p, p, x.Archived, x.Archived, x.BookingID).Error; e != nil {
					return e
				}
			}
		}
		payload, _ := json.Marshal(v)
		var revision string
		if e := tx.Raw(`INSERT INTO cms_revisions(document_key,payload,actor_id,published_at) VALUES (?,?::jsonb,?::uuid,now()) RETURNING id`, CatalogKey, string(payload), actor).Scan(&revision).Error; e != nil {
			return e
		}
		if e := attachMedia(tx, CatalogKey, revision, payload, false); e != nil {
			return e
		}
		if e := attachMedia(tx, CatalogKey, revision, payload, true); e != nil {
			return e
		}
		if e := tx.Exec(`UPDATE cms_documents SET draft_revision=?::uuid,published_revision=?::uuid,version=version+1,updated_at=now() WHERE key=?`, revision, revision, CatalogKey).Error; e != nil {
			return e
		}
		if e := tx.Exec(`INSERT INTO cms_events(document_key,revision_id,event_type,actor_id) VALUES (?,?::uuid,'published',?::uuid)`, CatalogKey, revision, actor).Error; e != nil {
			return e
		}
		return tx.Raw(`SELECT key,version,draft_revision,published_revision FROM cms_documents WHERE key=?`, CatalogKey).Scan(&result).Error
	})
	return result, e
}

// ActivateCatalog is deliberately separate from the HTTP editor and standard
// importer. Existing activation is never overwritten; no Booking rows are seeded.
func (s *Store) ActivateCatalog(ctx context.Context, apply bool) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if !apply {
			if e := tx.Exec("SET TRANSACTION READ ONLY").Error; e != nil {
				return e
			}
		} else {
			if e := tx.Exec("SELECT pg_advisory_xact_lock(714092002),pg_advisory_xact_lock(714092007)").Error; e != nil {
				return e
			}
		}
		var count int64
		if e := tx.Table("cms_documents").Where("key=?", CatalogKey).Count(&count).Error; e != nil {
			return e
		}
		if count > 0 {
			return nil
		}
		v, e := (&Store{tx}).CatalogSeed(ctx)
		if e != nil {
			return e
		}
		if !apply {
			return nil
		}
		raw, _ := json.Marshal(v)
		d := catalogDefinition()
		if e := tx.Exec("INSERT INTO cms_documents(key,source_hash) VALUES (?,?)", CatalogKey, d.SourceHash).Error; e != nil {
			return e
		}
		var id string
		if e := tx.Raw("INSERT INTO cms_revisions(document_key,payload,published_at) VALUES (?,?::jsonb,now()) RETURNING id", CatalogKey, string(raw)).Scan(&id).Error; e != nil {
			return e
		}
		if e := attachMedia(tx, CatalogKey, id, raw, false); e != nil {
			return e
		}
		if e := attachMedia(tx, CatalogKey, id, raw, true); e != nil {
			return e
		}
		if e := tx.Exec("UPDATE cms_documents SET draft_revision=?::uuid,published_revision=?::uuid WHERE key=?", id, id, CatalogKey).Error; e != nil {
			return e
		}
		return tx.Exec("INSERT INTO cms_events(document_key,revision_id,event_type) VALUES (?,?::uuid,'imported')", CatalogKey, id).Error
	})
}

// CatalogBookingPrice returns only approved explicit identities. An absent
// catalog leaves the pre-activation code path intact.
func CatalogBookingPrice(tx *gorm.DB, id string) (*string, bool, error) {
	var row struct{ Payload json.RawMessage }
	q := tx.Raw("SELECT r.payload FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision WHERE d.key=?", CatalogKey).Scan(&row)
	if q.Error != nil {
		return nil, false, q.Error
	}
	if q.RowsAffected == 0 {
		return nil, false, nil
	}
	var v Catalog
	if json.Unmarshal(row.Payload, &v) != nil {
		return nil, false, ErrInvalid
	}
	for _, s := range v.Services {
		if s.BookingID == id {
			value := catalogPrice(v, s)
			if s.Archived || value == "" {
				return nil, true, nil
			}
			return &value, true, nil
		}
	}
	return nil, false, nil
}

func CatalogServiceByBooking(tx *gorm.DB, id string) (CatalogService, bool, error) {
	var row struct{ Payload json.RawMessage }
	q := tx.Raw("SELECT r.payload FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision WHERE d.key=?", CatalogKey).Scan(&row)
	if q.Error != nil {
		return CatalogService{}, false, q.Error
	}
	if q.RowsAffected == 0 {
		return CatalogService{}, false, nil
	}
	var v Catalog
	if json.Unmarshal(row.Payload, &v) != nil {
		return CatalogService{}, false, ErrInvalid
	}
	for _, s := range v.Services {
		if s.BookingID == id {
			return s, true, nil
		}
	}
	return CatalogService{}, false, nil
}

func CatalogBookingLabels(tx *gorm.DB, id string) (LocalText, bool, error) {
	var row struct{ Payload json.RawMessage }
	q := tx.Raw("SELECT r.payload FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision WHERE d.key=?", CatalogKey).Scan(&row)
	if q.Error != nil {
		return LocalText{}, false, q.Error
	}
	if q.RowsAffected == 0 {
		return LocalText{}, false, nil
	}
	var v Catalog
	if json.Unmarshal(row.Payload, &v) != nil {
		return LocalText{}, false, ErrInvalid
	}
	for _, s := range v.Services {
		if s.BookingID == id {
			for _, c := range v.Categories {
				for _, p := range c.Items {
					if p.ID == s.PriceID && !p.Archived {
						if p.Type == "consultation" {
							return LocalText{"Pēc konsultācijas", "После консультации", "On consultation"}, true, nil
						}
						if p.Type == "from" {
							return LocalText{"no " + p.Price, "от " + p.Price, "from " + p.Price}, true, nil
						}
						return LocalText{p.Price, p.Price, p.Price}, true, nil
					}
				}
			}
			return LocalText{}, true, nil
		}
	}
	return LocalText{}, false, nil
}
