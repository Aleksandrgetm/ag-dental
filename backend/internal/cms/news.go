package cms

import (
	"context"
	"encoding/json"
	"gorm.io/gorm"
)

// PublishNews coordinates the existing validated revision operations in one
// transaction. No new schema, permissions or destructive removal is introduced.
func (s *Store) PublishNews(ctx context.Context, key, actor string, version int64, payload json.RawMessage) (Document, error) {
	var result Document
	d, ok := DefinitionFor(key)
	if !ok || d.SystemManaged || (d.Target != "articles" && !(d.Target == "created" && d.Group == "news")) {
		return result, ErrInvalid
	}
	if e := Validate(key, payload); e != nil {
		return result, e
	}
	if d.Target == "created" {
		var p CreatedContent
		json.Unmarshal(payload, &p)
		if p.Image == "" {
			return result, invalidField("image")
		}
	}
	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := cmsAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(714092007)").Error; e != nil {
			return e
		}
		nested := Store{DB: tx}
		var current Document
		q := tx.Raw("SELECT key,version,draft_revision,published_revision,source_hash,(to_jsonb(cms_documents)->>'archived_at' IS NOT NULL) archived FROM public.cms_documents WHERE key=? FOR UPDATE", key).Scan(&current)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected > 0 {
			if current.Archived {
				return ErrConflict
			}
			if current.SourceHash != d.SourceHash {
				return ErrConflict
			}
			// An identical retry of the immediately preceding publication is safe;
			// later edits/unpublication must still conflict with a stale request.
			if current.PublishedRevision != nil && (current.Version == version+2 || version == 0 && current.Version == 2) {
				var same bool
				if e := tx.Raw("SELECT payload=?::jsonb FROM public.cms_revisions WHERE id=?::uuid", string(payload), *current.PublishedRevision).Scan(&same).Error; e != nil {
					return e
				}
				if same {
					result = current
					return nil
				}
			}
			if version < 1 || current.Version != version {
				return ErrConflict
			}
			var e error
			result, e = nested.Change(ctx, key, actor, "draft_saved", "", version, payload)
			if e != nil {
				return e
			}
		} else {
			if version != 0 || d.Target != "created" {
				return ErrConflict
			}
			var e error
			result, e = nested.CreateContent(ctx, key, actor, payload)
			if e != nil {
				return e
			}
		}
		var e error
		result, e = nested.Change(ctx, key, actor, "published", *result.DraftRevision, result.Version, nil)
		return e
	})
	return result, err
}
