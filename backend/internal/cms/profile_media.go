package cms

import (
	"encoding/json"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"gorm.io/gorm"
)

// Uses the same media lock as archive/purge. History references survive a
// portrait replacement and prevent deletion of previously selected assets.
func ValidateProfilePortrait(tx *gorm.DB, id string) error {
	if id == "" {
		return nil
	}
	if e := tx.Exec("SELECT pg_advisory_xact_lock(?)", mediaLock).Error; e != nil {
		return e
	}
	var row MediaRow
	q := tx.Raw("SELECT "+mediaColumns+" FROM cms_media WHERE id=? FOR UPDATE", id).Scan(&row)
	if q.Error != nil {
		return q.Error
	}
	var metadata media.Metadata
	if q.RowsAffected == 0 || row.Protected || row.State != "ready" || json.Unmarshal(row.Metadata, &metadata) != nil || metadata.Kind != "image" {
		return ErrInvalid
	}
	return nil
}

func AttachProfilePortrait(tx *gorm.DB, operation, doctor, id string) error {
	if id == "" {
		return nil
	}
	if err := ValidateProfilePortrait(tx, id); err != nil {
		return err
	}
	return tx.Exec("INSERT INTO admin_profile_media_references(operation_id,doctor_id,media_id) VALUES (?,?,?)", operation, doctor, id).Error
}

func profileReferenceCount(tx *gorm.DB, id string) (int64, error) {
	var present bool
	if e := tx.Raw("SELECT to_regclass('public.admin_profile_media_references') IS NOT NULL").Scan(&present).Error; e != nil {
		return 0, e
	}
	if !present {
		return 0, nil
	}
	var count int64
	e := tx.Table("admin_profile_media_references").Where("media_id=?", id).Count(&count).Error
	return count, e
}

func profileReferenceAssets(tx *gorm.DB) (map[string]bool, error) {
	result := map[string]bool{}
	var present bool
	if e := tx.Raw("SELECT to_regclass('public.admin_profile_media_references') IS NOT NULL").Scan(&present).Error; e != nil {
		return nil, e
	}
	if !present {
		return result, nil
	}
	var ids []string
	if e := tx.Table("admin_profile_media_references").Distinct("media_id").Pluck("media_id", &ids).Error; e != nil {
		return nil, e
	}
	for _, id := range ids {
		result[id] = true
	}
	return result, nil
}
