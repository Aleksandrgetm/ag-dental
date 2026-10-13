package cms

import (
	"context"
	"errors"
	"gorm.io/gorm"
)

var ErrArchiveUnavailable = errors.New("news_archive_unavailable")

func (s *Store) archiveReady(ctx context.Context) bool {
	var ready bool
	err := s.DB.WithContext(ctx).Raw("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cms_documents' AND column_name='archived_at')").Scan(&ready).Error
	return err == nil && ready
}
func (s *Store) ArchivedNews(ctx context.Context) ([]Document, error) {
	rows := []Document{}
	if !s.archiveReady(ctx) {
		return rows, ErrArchiveUnavailable
	}
	err := s.DB.WithContext(ctx).Raw(`SELECT d.key,d.version,d.draft_revision,d.published_revision,true archived,
 COALESCE(r.payload->'title',jsonb_build_object('lv',r.payload#>>'{lv,title}','ru',r.payload#>>'{ru,title}','en',r.payload#>>'{en,title}')) title,
 COALESCE(r.payload->>'image',r.payload#>>'{lv,image}') image,COALESCE(r.payload->>'date',r.payload#>>'{lv,date}') date
 FROM public.cms_documents d LEFT JOIN public.cms_revisions r ON r.id=d.draft_revision WHERE d.archived_at IS NOT NULL ORDER BY d.archived_at DESC`).Scan(&rows).Error
	visible := rows[:0]
	for _, row := range rows {
		if isNews(row.Key) {
			visible = append(visible, row)
		}
	}
	return visible, err
}
func isNews(key string) bool {
	d, ok := DefinitionFor(key)
	return ok && !d.SystemManaged && (d.Target == "articles" || d.Target == "created" && d.Group == "news")
}

// Archive preserves the draft, all revisions and audit history. Restoration
// deliberately returns an unpublished article, never republishes implicitly.
func (s *Store) ArchiveNews(ctx context.Context, key, actor string, version int64, restore bool) (Document, error) {
	var result Document
	if !isNews(key) || version < 1 {
		return result, ErrInvalid
	}
	if !s.archiveReady(ctx) {
		return result, ErrArchiveUnavailable
	}
	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := cmsAdmin(tx, actor); e != nil {
			return e
		}
		q := tx.Raw("SELECT key,version,draft_revision,published_revision,archived_at IS NOT NULL archived FROM public.cms_documents WHERE key=? FOR UPDATE", key).Scan(&result)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected == 0 {
			return ErrMissing
		}
		desired := !restore
		if result.Version == version+1 && result.Archived == desired {
			var action string
			if e := tx.Raw("SELECT event_type FROM public.cms_events WHERE document_key=? ORDER BY id DESC LIMIT 1", key).Scan(&action).Error; e != nil {
				return e
			}
			if action == map[bool]string{true: "archived", false: "restored"}[desired] {
				return nil
			}
		}
		if result.Version != version || result.Archived == desired || result.DraftRevision == nil {
			return ErrConflict
		}
		stamp := "now()"
		event := "archived"
		if restore {
			stamp = "NULL"
			event = "restored"
		}
		if e := tx.Exec("UPDATE public.cms_documents SET archived_at="+stamp+",published_revision=NULL,version=version+1,updated_at=now() WHERE key=?", key).Error; e != nil {
			return e
		}
		if e := tx.Exec("INSERT INTO public.cms_events(document_key,revision_id,event_type,actor_id) VALUES (?,?::uuid,?,?::uuid)", key, *result.DraftRevision, event, actor).Error; e != nil {
			return e
		}
		result.Version++
		result.Archived = desired
		result.PublishedRevision = nil
		return nil
	})
	return result, err
}
