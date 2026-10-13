package cms

import (
	"context"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"testing"
)

func testUnifiedCatalog(t *testing.T, db *gorm.DB, actor string) {
	rollback := errors.New("isolated catalog rollback")
	if e := (&Store{db}).ActivateCatalog(context.Background(), false); e != nil {
		t.Fatal(e)
	}
	e := db.Transaction(func(tx *gorm.DB) error {
		s := Store{tx}
		ctx := context.Background()

		fixture := `INSERT INTO services(id,slug,name_lv,name_ru,name_en,duration_minutes,active,booking_enabled,provenance) VALUES ('77777777-7777-4777-8777-777777777777','catalog-existing','LV','RU','EN',30,true,true,'development_fixture');
 INSERT INTO doctors(id,name,active,booking_enabled,provenance) VALUES ('66666666-6666-4666-8666-666666666666','Synthetic Catalog Doctor',true,true,'development_fixture');
 INSERT INTO doctor_services(doctor_id,service_id) VALUES ('66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777');
 INSERT INTO cms_booking_service_links(document_key,service_id) VALUES ('service.konsultacija','77777777-7777-4777-8777-777777777777');
 INSERT INTO appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint) VALUES ('SYNTHETIC-CATALOG','77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666','Synthetic','Patient','123456789','synthetic@example.invalid',now()+interval '2 days',now()+interval '2 days 30 minutes','confirmed','synthetic',now(),gen_random_uuid(),repeat('a',64));`
		if e := tx.Exec(fixture).Error; e != nil {
			t.Fatal(e)
		}
		var before string
		tx.Raw("SELECT to_jsonb(a)::text FROM appointments a WHERE booking_reference='SYNTHETIC-CATALOG'").Scan(&before)
		if e := s.ActivateCatalog(ctx, true); e != nil {
			t.Fatal("catalog activation", e)
		}
		if e := s.ActivateCatalog(ctx, true); e != nil {
			t.Fatal("catalog repeat", e)
		}
		d, v, e := s.Catalog(ctx)
		if e != nil {
			t.Fatal(e)
		}
		if len(v.Services) != 8 || len(v.Categories) != 6 {
			t.Fatal("inventory mismatch")
		}
		count := 0
		for _, c := range v.Categories {
			count += len(c.Items)
		}
		if count != 69 {
			t.Fatal("price count", count)
		}
		// Explicit preparation preserves the imported identity and creates no availability.
		v.Services[1].BookingID = "99999999-9999-4999-8999-999999999999"
		v.Categories[0].Items[0].Price = "61.50"
		v.Services = append(v.Services, CatalogService{ID: "service.88888888-8888-4888-8888-888888888888", Slug: "synthetic-catalog-service", Title: LocalText{"LV", "RU", "EN"}, Text: LocalText{"LV body", "RU body", "EN body"}, Category: v.Categories[0].ID, PriceID: v.Categories[0].Items[0].ID, Published: true})
		raw, _ := json.Marshal(v)
		saved, e := s.SaveCatalog(ctx, actor, d.Version, raw)
		if e != nil {
			t.Fatal("save", e)
		}
		if _, e = s.SaveCatalog(ctx, actor, d.Version, raw); !errors.Is(e, ErrConflict) {
			t.Fatal("stale update accepted", e)
		}
		var ready bool
		tx.Raw("SELECT active OR booking_enabled OR duration_minutes IS NOT NULL FROM services WHERE id='88888888-8888-4888-8888-888888888888'").Scan(&ready)
		if ready {
			t.Fatal("auto activated booking")
		}
		var prepared int64
		tx.Raw("SELECT count(*) FROM services WHERE id='99999999-9999-4999-8999-999999999999' AND NOT active AND NOT booking_enabled AND duration_minutes IS NULL").Scan(&prepared)
		if prepared != 1 {
			t.Fatal("explicit preparation did not create disabled identity")
		}

		_, v, e = s.Catalog(ctx)
		if e != nil {
			t.Fatal(e)
		}
		v.Services[len(v.Services)-1].Archived = true
		raw, _ = json.Marshal(v)
		saved, e = s.SaveCatalog(ctx, actor, saved.Version, raw)
		if e != nil {
			t.Fatal(e)
		}
		live, e := s.Published(ctx)
		if e != nil {
			t.Fatal(e)
		}
		for _, r := range live {
			if r.Key == CatalogKey {
				var p Catalog
				json.Unmarshal(r.Payload, &p)
				if len(p.Services) != 8 {
					t.Fatal("archived public")
				}
			}
		}
		v.Services[len(v.Services)-1].Archived = false
		raw, _ = json.Marshal(v)
		if _, e = s.SaveCatalog(ctx, actor, saved.Version, raw); e != nil {
			t.Fatal("restore", e)
		}
		if _, e = s.Change(ctx, "prices.0", actor, "draft_saved", "", 1, json.RawMessage(`{}`)); !errors.Is(e, ErrProtected) {
			t.Fatal("competing price writer allowed")
		}
		d, v, e = s.Catalog(ctx)
		if e != nil {
			t.Fatal(e)
		}
		for i := range v.Services {
			if v.Services[i].ID == "service.konsultacija" {
				v.Services[i].Archived = true
			}
		}
		raw, _ = json.Marshal(v)
		if _, e = s.SaveCatalog(ctx, actor, d.Version, raw); e != nil {
			t.Fatal(e)
		}
		var after string
		tx.Raw("SELECT to_jsonb(a)::text FROM appointments a WHERE booking_reference='SYNTHETIC-CATALOG'").Scan(&after)
		if before != after {
			t.Fatal("historical appointment changed")
		}
		var relation int64
		tx.Raw("SELECT count(*) FROM doctor_services WHERE service_id='77777777-7777-4777-8777-777777777777'").Scan(&relation)
		if relation != 1 {
			t.Fatal("eligibility history removed")
		}
		var enabled bool
		tx.Raw("SELECT active OR booking_enabled FROM services WHERE id='77777777-7777-4777-8777-777777777777'").Scan(&enabled)
		if enabled {
			t.Fatal("archived service selectable")
		}
		return rollback
	})
	if !errors.Is(e, rollback) {
		t.Fatal(e)
	}
}
