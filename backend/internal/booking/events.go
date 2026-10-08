package booking

import (
	"encoding/json"
	"gorm.io/gorm"
	"time"
)

func recordEvent(tx *gorm.DB, appointmentID, actor, eventType string, metadata map[string]any, now time.Time, kinds ...string) error {
	id, e := newID()
	if e != nil {
		return e
	}
	data, e := json.Marshal(metadata)
	if e != nil {
		return e
	}
	var actorID *string
	if actor != "" {
		actorID = &actor
	}
	e = tx.Exec(`INSERT INTO appointment_events(id,appointment_id,actor_user_id,event_type,metadata,created_at) VALUES (?,?,?,?,?::jsonb,?)`, id, appointmentID, actorID, eventType, string(data), now).Error
	if e != nil {
		return e
	}
	for _, kind := range kinds {
		outID, e := newID()
		if e != nil {
			return e
		}
		if e = tx.Exec(`INSERT INTO notification_outbox(id,appointment_event_id,appointment_id,kind,status,available_at) VALUES (?,?,?,?,'pending',?)`, outID, id, appointmentID, kind, now).Error; e != nil {
			return e
		}
	}
	return nil
}
