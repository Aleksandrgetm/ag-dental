package cms

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"regexp"
	"strings"
	"time"

	"github.com/Aleksandrgetm/Dental/internal/media"
	"gorm.io/gorm"
)

// Created documents share the existing revision, publication and media registry.
// Namespaces cannot collide with imported pages or system-managed Hero references.
var createdKey = regexp.MustCompile(`^created\.(news|page|faq)\.[a-f0-9-]{36}$`)
var safeSlug = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type LocalText struct {
	LV string `json:"lv"`
	RU string `json:"ru"`
	EN string `json:"en"`
}
type CreatedContent struct {
	Slug           string    `json:"slug"`
	Date           string    `json:"date"`
	Title          LocalText `json:"title"`
	Summary        LocalText `json:"summary"`
	Body           LocalText `json:"body"`
	SEOTitle       LocalText `json:"seo_title"`
	SEODescription LocalText `json:"seo_description"`
	Image          string    `json:"image"`
	Order          int       `json:"order"`
}

func createdDefinition(key string) (Definition, bool) {
	parts := createdKey.FindStringSubmatch(key)
	if len(parts) != 2 || !uuid.MatchString(strings.TrimPrefix(key, "created."+parts[1]+".")) {
		return Definition{}, false
	}
	sum := sha256.Sum256([]byte("ag-created-structured-v1:" + parts[1]))
	return Definition{Key: key, Target: "created", Group: parts[1], SourceHash: hex.EncodeToString(sum[:]), Fields: []Field{{Path: []string{"image"}, Type: "media"}}}, true
}
func validateCreated(raw json.RawMessage) error {
	if len(raw) > 128*1024 {
		return ErrInvalid
	}
	var v CreatedContent
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if d.Decode(&v) != nil {
		return ErrInvalid
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return ErrInvalid
	}
	if len(v.Slug) > 100 || !safeSlug.MatchString(v.Slug) || v.Order < -1000000 || v.Order > 1000000 {
		return ErrInvalid
	}
	if _, e := time.Parse("2006-01-02", v.Date); e != nil {
		return ErrInvalid
	}
	for _, field := range []struct {
		v   LocalText
		max int
	}{{v.Title, 200}, {v.Summary, 1000}, {v.Body, 20000}, {v.SEOTitle, 200}, {v.SEODescription, 500}} {
		for _, s := range []string{field.v.LV, field.v.RU, field.v.EN} {
			if strings.TrimSpace(s) == "" || len(s) > field.max || markup.MatchString(s) {
				return ErrInvalid
			}
		}
	}
	if v.Image != "" {
		valid := media.ReferenceID(v.Image) != ""
		for _, a := range Baseline.Media {
			if a.URL == v.Image && !a.Protected && a.Kind == "image" {
				valid = true
			}
		}
		if !valid {
			return ErrInvalid
		}
	}
	return nil
}
func cmsAdmin(tx *gorm.DB, actor string) error {
	var role string
	if e := tx.Raw("SELECT role FROM public.user_roles WHERE user_id=?::uuid FOR SHARE", actor).Scan(&role).Error; e != nil {
		return e
	}
	if role != "admin" {
		return ErrUnavailable
	}
	return nil
}
func (s *Store) CreateContent(ctx context.Context, key, actor string, payload json.RawMessage) (Document, error) {
	var result Document
	definition, ok := createdDefinition(key)
	if !ok || validateCreated(payload) != nil {
		return result, ErrInvalid
	}
	var ready bool
	if e := s.DB.WithContext(ctx).Raw("SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='006_admin_operations')").Scan(&ready).Error; e != nil || !ready {
		return result, ErrUnavailable
	}
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := cmsAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(714092007)").Error; e != nil {
			return e
		}
		q := tx.Raw("SELECT key,version,draft_revision,published_revision,source_hash FROM public.cms_documents WHERE key=?", key).Scan(&result)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected > 0 {
			var same bool
			if e := tx.Raw("SELECT payload=?::jsonb FROM public.cms_revisions WHERE document_key=? ORDER BY created_at,id LIMIT 1", string(payload), key).Scan(&same).Error; e != nil {
				return e
			}
			if !same {
				return ErrConflict
			}
			return nil
		}
		var v CreatedContent
		json.Unmarshal(payload, &v)
		var count int64
		if e := tx.Raw("SELECT count(*) FROM public.cms_revisions WHERE document_key LIKE ? AND payload->>'slug'=?", "created."+definition.Group+".%", v.Slug).Scan(&count).Error; e != nil {
			return e
		}
		if count > 0 {
			return ErrConflict
		}
		// Preserve every imported article slug, including currently unpublished references.
		if definition.Group == "news" {
			for _, d := range Baseline.Documents {
				if d.Target == "articles" {
					var a map[string]any
					json.Unmarshal(d.Data, &a)
					if a["slug"] == v.Slug || d.Key == "news."+v.Slug {
						return ErrConflict
					}
				}
			}
		}
		if e := tx.Exec("INSERT INTO public.cms_documents(key,source_hash) VALUES (?,?)", key, definition.SourceHash).Error; e != nil {
			return e
		}
		var revision string
		if e := tx.Raw("INSERT INTO public.cms_revisions(document_key,payload,actor_id) VALUES (?,?::jsonb,?::uuid) RETURNING id", key, string(payload), actor).Scan(&revision).Error; e != nil {
			return e
		}
		if e := attachMedia(tx, key, revision, payload, false); e != nil {
			return e
		}
		if e := tx.Exec("UPDATE public.cms_documents SET draft_revision=?::uuid WHERE key=?", revision, key).Error; e != nil {
			return e
		}
		if e := tx.Exec("INSERT INTO public.cms_events(document_key,revision_id,event_type,actor_id) VALUES (?,?::uuid,'draft_saved',?::uuid)", key, revision, actor).Error; e != nil {
			return e
		}
		return tx.Raw("SELECT key,version,draft_revision,published_revision FROM public.cms_documents WHERE key=?", key).Scan(&result).Error
	})
	return result, e
}
