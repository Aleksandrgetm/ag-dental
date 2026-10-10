package cms

import (
	"context"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"time"
)

type Store struct{ DB *gorm.DB }
type Document struct {
	Key               string  `json:"key"`
	Version           int64   `json:"version"`
	DraftRevision     *string `json:"draft_revision"`
	PublishedRevision *string `json:"published_revision"`
	SourceHash        string  `json:"-"`
}
type Revision struct {
	ID          string          `json:"id"`
	Payload     json.RawMessage `json:"payload"`
	CreatedAt   time.Time       `json:"created_at"`
	PublishedAt *time.Time      `json:"published_at"`
}
type Published struct {
	Key      string          `json:"key"`
	Revision string          `json:"revision"`
	Payload  json.RawMessage `json:"payload"`
}

func (s *Store) Published(ctx context.Context) ([]Published, error) {
	rows := []Published{}
	e := s.DB.WithContext(ctx).Raw(`SELECT d.key,r.id revision,r.payload FROM public.cms_documents d JOIN public.cms_revisions r ON r.id=d.published_revision AND r.document_key=d.key ORDER BY d.key`).Scan(&rows).Error
	visible := rows[:0]
	for _, row := range rows {
		if AdminVisible(row.Key) {
			visible = append(visible, row)
		}
	}
	return visible, e
}
func (s *Store) List(ctx context.Context) ([]Document, error) {
	rows := []Document{}
	e := s.DB.WithContext(ctx).Raw(`SELECT key,version,draft_revision,published_revision,source_hash FROM public.cms_documents ORDER BY key`).Scan(&rows).Error
	visible := rows[:0]
	for _, row := range rows {
		if AdminVisible(row.Key) {
			visible = append(visible, row)
		}
	}
	return visible, e
}
func (s *Store) Detail(ctx context.Context, key string) (Document, []Revision, error) {
	var d Document
	if !AdminVisible(key) {
		return d, nil, ErrMissing
	}
	db := s.DB.WithContext(ctx)
	q := db.Raw(`SELECT key,version,draft_revision,published_revision,source_hash FROM public.cms_documents WHERE key=?`, key).Scan(&d)
	if q.Error != nil {
		return d, nil, q.Error
	}
	if q.RowsAffected == 0 {
		return d, nil, ErrMissing
	}
	history := []Revision{}
	e := db.Raw(`SELECT id,payload,created_at,published_at FROM public.cms_revisions WHERE document_key=? AND (id IN (SELECT id FROM public.cms_revisions WHERE document_key=? ORDER BY created_at DESC,id DESC LIMIT 30) OR id=?::uuid OR id=?::uuid) ORDER BY created_at DESC,id DESC`, key, key, d.DraftRevision, d.PublishedRevision).Scan(&history).Error
	return d, history, e
}
func (s *Store) Change(ctx context.Context, key, actor, operation, revision string, version int64, payload json.RawMessage) (Document, error) {
	var result Document
	d, ok := definitions[key]
	if !ok || d.Locked || d.SystemManaged {
		return result, ErrInvalid
	}
	if operation == "draft_saved" {
		if e := Validate(key, payload); e != nil {
			return result, e
		}
	}
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		q := tx.Raw(`SELECT key,version,draft_revision,published_revision,source_hash FROM public.cms_documents WHERE key=? FOR UPDATE`, key).Scan(&result)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected == 0 {
			return ErrMissing
		}
		if result.Version != version {
			return ErrConflict
		}
		if result.SourceHash != d.SourceHash {
			return ErrConflict
		}
		if operation == "draft_saved" {
			if e := tx.Raw(`INSERT INTO public.cms_revisions(document_key,payload,actor_id) VALUES (?,?::jsonb,?::uuid) RETURNING id`, key, string(payload), actor).Scan(&revision).Error; e != nil {
				return e
			}
			if e := attachMedia(tx, key, revision, payload, false); e != nil {
				return e
			}
			if e := tx.Exec(`UPDATE public.cms_documents SET draft_revision=?::uuid,version=version+1,updated_at=now() WHERE key=?`, revision, key).Error; e != nil {
				return e
			}
		} else {
			if operation != "published" && operation != "rolled_back" {
				return ErrInvalid
			}
			var r Revision
			q := tx.Raw(`SELECT id,payload,published_at FROM public.cms_revisions WHERE document_key=? AND id=?::uuid`, key, revision).Scan(&r)
			if q.Error != nil {
				return q.Error
			}
			if q.RowsAffected == 0 {
				return ErrInvalid
			}
			if operation == "published" && (result.DraftRevision == nil || *result.DraftRevision != revision) {
				return ErrConflict
			}
			if operation == "rolled_back" && r.PublishedAt == nil {
				return ErrInvalid
			}
			if e := Validate(key, r.Payload); e != nil {
				return e
			}
			if e := attachMedia(tx, key, revision, r.Payload, true); e != nil {
				return e
			}
			if e := tx.Exec(`UPDATE public.cms_revisions SET published_at=COALESCE(published_at,now()) WHERE id=?::uuid`, revision).Error; e != nil {
				return e
			}
			if e := tx.Exec(`UPDATE public.cms_documents SET published_revision=?::uuid,draft_revision=?::uuid,version=version+1,updated_at=now() WHERE key=?`, revision, revision, key).Error; e != nil {
				return e
			}
		}
		if e := tx.Exec(`INSERT INTO public.cms_events(document_key,revision_id,event_type,actor_id) VALUES (?,?::uuid,?,?::uuid)`, key, revision, operation, actor).Error; e != nil {
			return e
		}
		return tx.Raw(`SELECT key,version,draft_revision,published_revision FROM public.cms_documents WHERE key=?`, key).Scan(&result).Error
	})
	return result, e
}

// Import never overwrites edited content. A mismatched existing source is a conflict.
func (s *Store) Import(ctx context.Context, apply bool) (int, error) {
	count := 0
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if !apply {
			if e := tx.Exec(`SET TRANSACTION READ ONLY`).Error; e != nil {
				return e
			}
		} else {
			if e := tx.Exec(`SELECT pg_advisory_xact_lock(714092004)`).Error; e != nil {
				return e
			}
		}
		for _, d := range Baseline.Documents {
			if e := Validate(d.Key, d.Data); e != nil {
				return e
			}
			var existing Document
			q := tx.Raw(`SELECT key,source_hash,draft_revision,published_revision FROM public.cms_documents WHERE key=?`, d.Key).Scan(&existing)
			if q.Error != nil {
				return q.Error
			}
			if q.RowsAffected > 0 {
				if existing.SourceHash != d.SourceHash || existing.DraftRevision == nil || existing.PublishedRevision == nil {
					return ErrConflict
				}
				continue
			}
			count++
			if !apply {
				continue
			}
			if e := tx.Exec(`INSERT INTO public.cms_documents(key,source_hash) VALUES (?,?)`, d.Key, d.SourceHash).Error; e != nil {
				return e
			}
			var id string
			if e := tx.Raw(`INSERT INTO public.cms_revisions(document_key,payload,published_at) VALUES (?,?::jsonb,now()) RETURNING id`, d.Key, string(d.Data)).Scan(&id).Error; e != nil {
				return e
			}
			if e := tx.Exec(`UPDATE public.cms_documents SET draft_revision=?::uuid,published_revision=?::uuid WHERE key=?`, id, id, d.Key).Error; e != nil {
				return e
			}
			if e := tx.Exec(`INSERT INTO public.cms_events(document_key,revision_id,event_type) VALUES (?,?::uuid,'imported')`, d.Key, id).Error; e != nil {
				return e
			}
		}
		for _, a := range Baseline.Media {
			var row struct{ ID, URL, SourceHash string }
			q := tx.Raw(`SELECT id,url,source_hash FROM public.cms_media WHERE id=? OR url=?`, a.ID, a.URL).Scan(&row)
			if q.Error != nil {
				return q.Error
			}
			if q.RowsAffected > 0 {
				if row.ID != a.ID || row.URL != a.URL || row.SourceHash != a.SHA {
					return ErrConflict
				}
				continue
			}
			if apply {
				raw, _ := json.Marshal(a)
				if e := tx.Exec(`INSERT INTO public.cms_media(id,url,source_hash,metadata,protected) VALUES (?,?,?,?::jsonb,?)`, a.ID, a.URL, a.SHA, string(raw), a.Protected).Error; e != nil {
					return e
				}
			}
		}
		return nil
	})
	return count, e
}
func SafeError(e error) (int, string) {
	switch {
	case errors.Is(e, ErrInvalid):
		return 422, "invalid_content"
	case errors.Is(e, ErrConflict):
		return 409, "content_conflict"
	case errors.Is(e, ErrMissing):
		return 404, "content_not_imported"
	default:
		return 503, "content_unavailable"
	}
}

// Booking data stays authoritative in the operational tables. CMS import creates
// no mappings; only a later reviewed configuration can connect real procedures.
func (s *Store) BookingLinks(ctx context.Context, key string) (json.RawMessage, error) {
	var result json.RawMessage
	e := s.DB.WithContext(ctx).Raw(`SELECT COALESCE(jsonb_agg(jsonb_build_object(
 'name',jsonb_build_object('lv',s.name_lv,'ru',s.name_ru,'en',s.name_en),
 'duration_minutes',s.duration_minutes,'enabled',s.active AND s.booking_enabled,
 'doctors',(SELECT COALESCE(jsonb_agg(jsonb_build_object('name',d.name,'duration_minutes',COALESCE(ds.duration_override_minutes,s.duration_minutes)) ORDER BY d.sort_order,d.name),'[]'::jsonb) FROM public.doctor_services ds JOIN public.doctors d ON d.id=ds.doctor_id WHERE ds.service_id=s.id AND d.active AND d.booking_enabled)
 ) ORDER BY s.sort_order,s.slug),'[]'::jsonb) FROM public.cms_booking_service_links l JOIN public.services s ON s.id=l.service_id WHERE l.document_key=?`, key).Row().Scan(&result)
	return result, e
}
