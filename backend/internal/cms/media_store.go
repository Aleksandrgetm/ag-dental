package cms

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"gorm.io/gorm"
	"sort"
	"strings"
	"time"
)

const mediaLock = 714092005

var ErrReferenced = errors.New("media_referenced")
var ErrProtected = errors.New("media_protected")

type MediaRow struct {
	ID          string          `json:"id"`
	URL         string          `json:"url"`
	SourceHash  string          `json:"-"`
	Metadata    json.RawMessage `json:"metadata"`
	Protected   bool            `json:"protected"`
	Origin      string          `json:"origin"`
	State       string          `json:"state"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"-"`
	PublishedAt *time.Time      `json:"published_at"`
	UploadKey   *string         `json:"-"`
	Usages      []MediaUsage    `json:"usages" gorm:"-"`
	References  int64           `json:"references" gorm:"-"`
}
type MediaUsage struct {
	Document  string `json:"document"`
	Path      string `json:"path"`
	Published bool   `json:"published"`
	Draft     bool   `json:"draft"`
}

const mediaColumns = "id,url,source_hash,metadata,protected,origin,state,created_at,updated_at,published_at,upload_key"

func (s *Store) MediaList(ctx context.Context) ([]MediaRow, error) {
	rows := []MediaRow{}
	e := s.DB.WithContext(ctx).Raw("SELECT " + mediaColumns + " FROM public.cms_media WHERE state<>'deleted' ORDER BY created_at DESC,id").Scan(&rows).Error
	if e != nil {
		return nil, e
	}
	var usages []struct {
		MediaID string
		MediaUsage
	}
	if e = s.DB.WithContext(ctx).Raw(`SELECT DISTINCT m.media_id,r.document_key document,m.field_path path,(d.published_revision=r.id) published,(d.draft_revision=r.id) draft FROM public.cms_media_references m JOIN public.cms_revisions r ON r.id=m.revision_id JOIN public.cms_documents d ON d.key=r.document_key ORDER BY m.media_id,document,path`).Scan(&usages).Error; e != nil {
		return nil, e
	}
	byID := map[string][]MediaUsage{}
	for _, u := range usages {
		byID[u.MediaID] = append(byID[u.MediaID], u.MediaUsage)
	}
	for i := range rows {
		rows[i].Usages = byID[rows[i].ID]
		if rows[i].Usages == nil {
			rows[i].Usages = []MediaUsage{}
		}
	}
	return rows, nil
}
func (s *Store) Media(ctx context.Context, id string) (MediaRow, error) {
	var row MediaRow
	q := s.DB.WithContext(ctx).Raw("SELECT "+mediaColumns+" FROM public.cms_media WHERE id=? AND state<>'deleted'", id).Scan(&row)
	if q.Error != nil {
		return row, q.Error
	}
	if q.RowsAffected == 0 {
		return row, ErrMissing
	}
	return row, nil
}

// Serialize publication, draft references, archive and deletion on the same DB lock.
// The revision reference graph includes ALL retained history, not merely the UI's latest 30.
func attachMedia(tx *gorm.DB, key, revision string, payload json.RawMessage, publish bool) error {
	d := definitions[key]
	value, e := decode(payload)
	if e != nil {
		return ErrInvalid
	}
	for _, f := range d.Fields {
		if f.Type != "media" && f.Type != "image-key" {
			continue
		}
		v, _ := at(value, f.Path).(string)
		id := media.ReferenceID(v)
		if id == "" {
			continue
		}
		if f.Locked || f.SystemManaged || d.SystemManaged {
			return ErrProtected
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", mediaLock).Error; e != nil {
			return e
		}
		var row MediaRow
		q := tx.Raw("SELECT "+mediaColumns+" FROM public.cms_media WHERE id=? FOR UPDATE", id).Scan(&row)
		if q.Error != nil {
			return q.Error
		}
		var md media.Metadata
		json.Unmarshal(row.Metadata, &md)
		if q.RowsAffected == 0 || row.Protected || row.State != "ready" || md.Kind != "image" || !media.ValidAlt(md.Alt) {
			return ErrInvalid
		}
		if e := tx.Exec(`INSERT INTO public.cms_media_references(revision_id,media_id,field_path) VALUES (?::uuid,?,?) ON CONFLICT DO NOTHING`, revision, id, strings.Join(f.Path, ".")).Error; e != nil {
			return e
		}
		if publish {
			if e := tx.Exec(`UPDATE public.cms_media SET published_at=COALESCE(published_at,now()) WHERE id=?`, id).Error; e != nil {
				return e
			}
		}
	}
	return nil
}
func mediaEvent(tx *gorm.DB, id, actor, event string) error {
	return tx.Exec(`INSERT INTO public.cms_media_events(media_id,actor_id,event_type) VALUES (?,?::uuid,?)`, id, actor, event).Error
}
func freshAdmin(tx *gorm.DB, actor string) error {
	var role string
	if e := tx.Raw(`SELECT role FROM public.user_roles WHERE user_id=?::uuid FOR SHARE`, actor).Scan(&role).Error; e != nil {
		return e
	}
	if role != "admin" {
		return ErrProtected
	}
	return nil
}

// Reserve before Storage writes. A retry reuses the immutable object prefix. Unknown
// COMMIT outcomes are recoverable using upload_key/hash; no anonymous objects are made.
func (s *Store) ReserveMedia(ctx context.Context, p media.Processed, actor, key string) (MediaRow, bool, error) {
	var row MediaRow
	replay := false
	e := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := freshAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", mediaLock).Error; e != nil {
			return e
		}
		q := tx.Raw("SELECT "+mediaColumns+" FROM public.cms_media WHERE upload_key=?::uuid OR (source_hash=? AND origin='upload' AND state<>'deleted') ORDER BY CASE WHEN upload_key=?::uuid THEN 0 ELSE 1 END LIMIT 1 FOR UPDATE", key, p.Hash, key).Scan(&row)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected > 0 {
			if row.SourceHash != p.Hash || row.State == "archived" || row.State == "deleted" {
				return ErrConflict
			}
			if row.State == "ready" {
				replay = true
				return nil
			}
			if row.State == "processing" && time.Since(row.UpdatedAt) < 5*time.Minute {
				return media.ErrBusy
			}
			// A new attempt may only recover the same file, never overwrite another upload.
			if e := tx.Exec(`UPDATE public.cms_media SET state='processing',updated_at=now() WHERE id=?`, row.ID).Error; e != nil {
				return e
			}
			return mediaEvent(tx, row.ID, actor, "upload_started")
		}
		var count int64
		if e := tx.Raw(`SELECT count(*) FROM public.cms_media WHERE source_hash=? AND protected`, p.Hash).Scan(&count).Error; e != nil {
			return e
		}
		if count > 0 {
			return ErrProtected
		}
		if e := tx.Raw(`SELECT count(*) FROM public.cms_media WHERE origin='upload' AND (state<>'deleted' OR created_at>now()-interval '1 day')`).Scan(&count).Error; e != nil {
			return e
		}
		if count >= 2000 {
			return media.ErrBusy
		}
		if e := tx.Raw(`SELECT count(*) FROM public.cms_media_events WHERE actor_id=?::uuid AND event_type='upload_started' AND created_at>now()-interval '1 hour'`, actor).Scan(&count).Error; e != nil {
			return e
		}
		if count >= 30 {
			return media.ErrBusy
		}
		var id [16]byte
		if _, e := rand.Read(id[:]); e != nil {
			return e
		}
		row.ID = "upload." + hex.EncodeToString(id[:])
		row.URL = "cms-media:" + row.ID
		raw, _ := json.Marshal(p.Metadata)
		row.Metadata = raw
		row.State = "processing"
		row.SourceHash = p.Hash
		row.Origin = "upload"
		if e := tx.Exec(`INSERT INTO public.cms_media(id,url,source_hash,metadata,origin,state,upload_key,actor_id) VALUES (?,?,?,?::jsonb,'upload','processing',?::uuid,?::uuid)`, row.ID, row.URL, p.Hash, string(raw), key, actor).Error; e != nil {
			return e
		}
		return mediaEvent(tx, row.ID, actor, "upload_started")
	})
	return row, replay, e
}
func (s *Store) FinishMedia(ctx context.Context, id, actor string, success bool) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if success {
			if e := freshAdmin(tx, actor); e != nil {
				return e
			}
		}
		state, event := "failed", "upload_failed"
		if success {
			state, event = "ready", "upload_ready"
		}
		q := tx.Exec(`UPDATE public.cms_media SET state=?,updated_at=now() WHERE id=? AND state='processing'`, state, id)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected != 1 {
			return ErrConflict
		}
		return mediaEvent(tx, id, actor, event)
	})
}
func (s *Store) ArchiveMedia(ctx context.Context, id, actor string) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := freshAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", mediaLock).Error; e != nil {
			return e
		}
		var row MediaRow
		q := tx.Raw("SELECT "+mediaColumns+" FROM public.cms_media WHERE id=? FOR UPDATE", id).Scan(&row)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected == 0 {
			return ErrMissing
		}
		if row.Protected || row.Origin != "upload" {
			return ErrProtected
		}
		if row.State == "processing" && time.Since(row.UpdatedAt) < 5*time.Minute {
			return media.ErrBusy
		}
		if row.State == "deleted" {
			return ErrMissing
		}
		var n int64
		if e := tx.Raw(`SELECT count(*) FROM public.cms_media_references WHERE media_id=?`, id).Scan(&n).Error; e != nil {
			return e
		}
		if n > 0 || row.PublishedAt != nil {
			return ErrReferenced
		}
		if row.State == "archived" {
			return nil
		}
		if e := tx.Exec(`UPDATE public.cms_media SET state='archived',updated_at=now() WHERE id=?`, id).Error; e != nil {
			return e
		}
		return mediaEvent(tx, id, actor, "archived")
	})
}
func (s *Store) PurgeMedia(ctx context.Context, id, actor string, storage media.Storage) error {
	if storage == nil {
		return media.ErrUnavailable
	}
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := freshAdmin(tx, actor); e != nil {
			return e
		}
		if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", mediaLock).Error; e != nil {
			return e
		}
		var row MediaRow
		q := tx.Raw("SELECT "+mediaColumns+" FROM public.cms_media WHERE id=? FOR UPDATE", id).Scan(&row)
		if q.Error != nil {
			return q.Error
		}
		if q.RowsAffected == 0 {
			return ErrMissing
		}
		if row.Protected || row.Origin != "upload" || row.State != "archived" {
			return ErrProtected
		}
		var n int64
		if e := tx.Raw(`SELECT count(*) FROM public.cms_media_references WHERE media_id=?`, id).Scan(&n).Error; e != nil {
			return e
		}
		if n > 0 || row.PublishedAt != nil {
			return ErrReferenced
		}
		var md media.Metadata
		if json.Unmarshal(row.Metadata, &md) != nil {
			return ErrInvalid
		}
		keys := []string{}
		for _, v := range md.Variants {
			keys = append(keys, storagePath(id, v.Name))
		}
		if e := storage.Delete(ctx, keys); e != nil {
			return e
		}
		if e := tx.Exec(`UPDATE public.cms_media SET state='deleted',updated_at=now() WHERE id=?`, id).Error; e != nil {
			return e
		}
		return mediaEvent(tx, id, actor, "deleted")
	})
}
func storagePath(id, name string) string {
	return "v1/" + strings.TrimPrefix(id, "upload.") + "/" + name
}

type PublicMedia struct {
	ID       string            `json:"id"`
	Alt      map[string]string `json:"alt"`
	Variants []media.Variant   `json:"variants"`
}

func (s *Store) PublishedMedia(ctx context.Context, documents []Published) ([]PublicMedia, error) {
	ids := map[string]bool{}
	for _, d := range documents {
		value, e := decode(d.Payload)
		if e != nil {
			return nil, e
		}
		for _, f := range definitions[d.Key].Fields {
			if f.Type == "media" || f.Type == "image-key" {
				text, _ := at(value, f.Path).(string)
				if id := media.ReferenceID(text); id != "" {
					ids[id] = true
				}
			}
		}
	}
	result := []PublicMedia{}
	for id := range ids {
		row, e := s.Media(ctx, id)
		if e != nil {
			return nil, e
		}
		if row.Protected || row.State != "ready" || row.PublishedAt == nil {
			return nil, ErrInvalid
		}
		var md media.Metadata
		if json.Unmarshal(row.Metadata, &md) != nil {
			return nil, ErrInvalid
		}
		item := PublicMedia{ID: id, Alt: md.Alt}
		for _, v := range md.Variants {
			if !strings.HasPrefix(v.Name, "original.") {
				item.Variants = append(item.Variants, v)
			}
		}
		result = append(result, item)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result, nil
}
