package booking

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// An opaque snapshot revision protects against stale tabs without altering
// historical catalog IDs. The shared configuration lock serializes all writers.
type OperationRow struct {
	ID      string          `json:"id"`
	Version string          `json:"version"`
	Data    json.RawMessage `json:"data"`
}
type OperationRequest struct {
	OperationID     string          `json:"operation_id"`
	ExpectedVersion string          `json:"expected_version"`
	Data            json.RawMessage `json:"data"`
}

func revision(raw []byte) string {
	var v any
	if json.Unmarshal(raw, &v) != nil {
		return ""
	}
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
func operationTable(kind string) string {
	if kind == "services" || kind == "doctors" {
		return kind
	}
	if kind == "schedules" {
		return "doctor_schedules"
	}
	if kind == "time-off" {
		return "doctor_time_off"
	}
	return ""
}

// The same projection is used for lists and mutations so optimistic revisions
// match. Indexed correlated reads avoid one network round trip per catalog row.
func operationData(kind string) string {
	switch kind {
	case "services":
		return `to_jsonb(t) || jsonb_build_object(
    'editorial_key', COALESCE((SELECT document_key FROM cms_booking_service_links WHERE service_id=t.id), ''),
    'assignments', COALESCE((SELECT jsonb_agg(jsonb_build_object('doctor_id',doctor_id,'booking_enabled',booking_enabled,'duration_override_minutes',duration_override_minutes) ORDER BY doctor_id) FROM doctor_services WHERE service_id=t.id), '[]'::jsonb))`
	case "doctors":
		return `to_jsonb(t) || jsonb_build_object('service_ids',COALESCE((SELECT jsonb_agg(service_id ORDER BY service_id) FROM doctor_services WHERE doctor_id=t.id AND booking_enabled),'[]'::jsonb),'hours',COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY weekday,start_time,id) FROM doctor_schedules h WHERE doctor_id=t.id AND active),'[]'::jsonb)) || COALESCE((SELECT jsonb_build_object('profile',profile,'portrait_id',portrait_id,'editorial_key',editorial_key) FROM doctor_profiles WHERE doctor_id=t.id),
    '{"profile":{"biography":{"lv":"","ru":"","en":""},"qualifications":{"lv":"","ru":"","en":""}},"portrait_id":null,"editorial_key":null}'::jsonb)`
	default:
		return "to_jsonb(t)"
	}
}
func operationRow(tx *gorm.DB, kind, id string) (OperationRow, error) {
	var row OperationRow
	table := operationTable(kind)
	if table == "" || !ValidID(id) {
		return row, ErrInvalid
	}
	if e := tx.Raw("SELECT id::text,"+operationData(kind)+" AS data FROM "+table+" t WHERE id=?", id).Scan(&row).Error; e != nil {
		return row, e
	}
	if row.ID == "" {
		return row, ErrNotFound
	}
	row.Version = revision(row.Data)
	return row, nil
}
func operationAdmin(tx *gorm.DB, actor string) error {
	var role string
	if !ValidID(actor) {
		return ErrInvalid
	}
	if e := tx.Raw("SELECT role FROM user_roles WHERE user_id=? FOR SHARE", actor).Scan(&role).Error; e != nil {
		return e
	}
	if role != "admin" {
		return ErrNotFound
	}
	return nil
}
func (s *Store) Operations(ctx context.Context, kind string) ([]OperationRow, error) {
	table := operationTable(kind)
	if table == "" {
		return nil, ErrInvalid
	}
	// Missing proposed schema is an explicit unavailable state, not an empty catalog.
	var ready bool
	if e := s.DB.WithContext(ctx).Raw("SELECT to_regclass('public.admin_operation_events') IS NOT NULL").Scan(&ready).Error; e != nil {
		return nil, e
	}
	if !ready {
		return nil, ErrNotConfigured
	}
	rows := []OperationRow{}
	order := "sort_order,id"
	if kind == "schedules" {
		order = "doctor_id,weekday,start_time,id"
	}
	if kind == "time-off" {
		order = "starts_at DESC,id"
	}
	e := s.DB.WithContext(ctx).Raw("SELECT id::text," + operationData(kind) + " AS data FROM " + table + " t ORDER BY " + order + " LIMIT 1001").Scan(&rows).Error
	if len(rows) > 1000 {
		return nil, ErrNotConfigured
	}
	if e != nil {
		return nil, e
	}
	for i := range rows {
		rows[i].Version = revision(rows[i].Data)
	}
	return rows, e
}
func strictOperation(raw json.RawMessage, v any) error {
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if d.Decode(v) != nil {
		return ErrInvalid
	}
	if d.Decode(new(any)) != io.EOF {
		return ErrInvalid
	}
	return nil
}
func (s *Store) SaveOperation(ctx context.Context, kind, id, actor string, r OperationRequest) (OperationRow, error) {
	var result OperationRow
	if operationTable(kind) == "" || !ValidID(r.OperationID) || (id != "" && !ValidID(id)) || len(r.Data) > 60*1024 {
		return result, ErrInvalid
	}
	b, _ := json.Marshal([]any{kind, id, r.ExpectedVersion, r.Data})
	hash := revision(b)
	e := s.WithConfigurationLock(ctx, func(tx *gorm.DB) error {
		if e := operationAdmin(tx, actor); e != nil {
			return e
		}
		var prior struct{ ActorID, RequestHash, EntityID string }
		if e := tx.Table("admin_operation_events").Where("operation_id=?", r.OperationID).Scan(&prior).Error; e != nil {
			return e
		}
		if prior.EntityID != "" {
			if prior.ActorID != actor || prior.RequestHash != hash {
				return ErrConflict
			}
			var e error
			result, e = operationRow(tx, kind, prior.EntityID)
			return e
		}
		var before json.RawMessage
		if id != "" {
			old, e := operationRow(tx, kind, id)
			if e != nil {
				return e
			}
			if old.Version != r.ExpectedVersion {
				return ErrConflict
			}
			before = old.Data
		} else if r.ExpectedVersion != "" {
			return ErrInvalid
		}
		scoped := &Store{DB: tx, Now: s.Now}
		portraitID := ""
		switch kind {
		case "services":
			var input ServiceOperationInput
			if strictOperation(r.Data, &input) != nil {
				return ErrInvalid
			}
			v, e := scoped.saveServiceOperation(ctx, id, input)
			if e != nil {
				return e
			}
			id = v.ID
		case "schedules":
			var input ScheduleOperationInput
			if strictOperation(r.Data, &input) != nil {
				return ErrInvalid
			}
			var e error
			id, e = scoped.saveScheduleOperation(ctx, id, input)
			if e != nil {
				return e
			}
		case "time-off":
			var input TimeOffOperationInput
			if strictOperation(r.Data, &input) != nil {
				return ErrInvalid
			}
			var e error
			id, e = scoped.saveTimeOffOperation(ctx, id, input)
			if e != nil {
				return e
			}
		case "doctors":
			var input DoctorOperationInput
			if strictOperation(r.Data, &input) != nil {
				return &ValidationDetail{Code: "profileRequestInvalid", Day: -1}
			}
			v, e := scoped.saveDoctorOperation(ctx, id, input)
			if e != nil {
				return e
			}
			id = v.ID
			portraitID = input.PortraitID
		default:
			return ErrInvalid
		}
		var e error
		result, e = operationRow(tx, kind, id)
		if e != nil {
			return e
		}
		var previous any
		if len(before) > 0 {
			previous = string(before)
		}
		if e := tx.Exec("INSERT INTO admin_operation_events(operation_id,actor_id,kind,entity_id,request_hash,before_value,after_value) VALUES (?::uuid,?::uuid,?,?,?,?::jsonb,?::jsonb)", r.OperationID, actor, kind, id, hash, previous, string(result.Data)).Error; e != nil {
			return e
		}
		if kind == "doctors" {
			if e := cms.AttachProfilePortrait(tx, r.OperationID, id, portraitID); e != nil {
				if errors.Is(e, cms.ErrInvalid) {
					return &ValidationDetail{Code: "portraitInvalid", Day: -1, Field: "portrait"}
				}
				return e
			}
		}
		return nil
	})
	return result, configurationError(e)
}
func RegisterOperations(r *gin.Engine, s *Store, v auth.Verifier, roles auth.Roles) {
	a := r.Group("/api/admin/operations", noStore(), auth.RequireAuth(v, roles), auth.RequireRole("admin"))
	a.GET("/:kind/options", func(c *gin.Context) {
		if c.Param("kind") == "schedules" || c.Param("kind") == "time-off" || c.Param("kind") == "appointments" {
			doctors := []Doctor{}
			services := []Service{}
			if e := s.DB.WithContext(c.Request.Context()).Order("sort_order,id").Find(&doctors).Error; e != nil {
				respondError(c, e)
				return
			}
			query := s.DB.WithContext(c.Request.Context())
			if c.Param("kind") != "appointments" {
				query = query.Where("active AND booking_enabled")
			}
			if e := query.Order("sort_order,id").Find(&services).Error; e != nil {
				respondError(c, e)
				return
			}
			c.JSON(200, gin.H{"doctors": doctors, "services": services})
			return
		}
		if c.Param("kind") == "doctors" {
			services := []Service{}
			if e := s.DB.WithContext(c.Request.Context()).Order("sort_order,id").Find(&services).Error; e != nil {
				respondError(c, e)
				return
			}
			cfg, e := s.Settings(c.Request.Context())
			if e != nil {
				respondError(c, e)
				return
			}
			// Public Service intentionally omits eligibility flags. The verified
			// admin editor needs them to distinguish approved choices.
			type adminService struct {
				Service
				Active         bool `json:"active"`
				BookingEnabled bool `json:"booking_enabled"`
			}
			choices := make([]adminService, 0, len(services))
			for _, v := range services {
				choices = append(choices, adminService{Service: v, Active: v.Active, BookingEnabled: v.BookingEnabled})
			}
			c.JSON(200, gin.H{"doctors": []any{}, "sources": []any{}, "services": choices, "privacy_ready": cfg.PrivacyNoticeVersion != nil && *cfg.PrivacyNoticeVersion != ""})
			return
		}
		if c.Param("kind") != "services" {
			respondError(c, ErrInvalid)
			return
		}
		doctors := []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}{}
		sources := []struct {
			Key   string          `json:"key"`
			Title json.RawMessage `json:"title"`
			Price *string         `json:"price"`
		}{}
		db := s.DB.WithContext(c.Request.Context())
		if e := db.Raw("SELECT id,name FROM doctors ORDER BY sort_order,id LIMIT 1000").Scan(&doctors).Error; e != nil {
			respondError(c, e)
			return
		}
		if e := db.Raw(`SELECT d.key,r.payload->'title' AS title,r.payload->>'price' AS price FROM cms_documents d JOIN cms_revisions r ON r.id=d.published_revision AND r.document_key=d.key WHERE d.key LIKE 'service.%' ORDER BY d.key`).Scan(&sources).Error; e != nil {
			respondError(c, e)
			return
		}
		for i := range sources {
			p, e := editorialPrice(db, sources[i].Key)
			if e != nil {
				respondError(c, e)
				return
			}
			sources[i].Price = p
		}
		c.JSON(200, gin.H{"doctors": doctors, "sources": sources})
	})
	a.GET("/:kind/preview", func(c *gin.Context) {
		if c.Param("kind") != "schedules" {
			respondError(c, ErrInvalid)
			return
		}
		slots, cfg, e := s.Availability(c.Request.Context(), c.Query("service_id"), c.Query("doctor_id"), c.Query("date"))
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"slots": slots, "timezone": cfg.Timezone})
	})
	a.GET("/:kind", func(c *gin.Context) {
		rows, e := s.Operations(c.Request.Context(), c.Param("kind"))
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"items": rows})
	})
	save := func(c *gin.Context) {
		var body OperationRequest
		if !decodeLimited(c, &body, 64*1024) {
			return
		}
		who, _ := auth.Current(c)
		row, e := s.SaveOperation(c.Request.Context(), c.Param("kind"), c.Param("id"), who.ID, body)
		var validation *ValidationDetail
		if errors.As(e, &validation) {
			c.JSON(400, gin.H{"error": "invalid_request", "validation_code": validation.Code, "weekday": validation.Day, "field": validation.Field, "locale": validation.Locale})
			return
		}
		var impact *ScheduleImpactError
		if errors.As(e, &impact) {
			c.JSON(409, gin.H{"error": "schedule_impact", "affected_appointments": impact.Count})
			return
		}
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, row)
	}
	a.POST("/:kind", save)
	a.PUT("/:kind/:id", save)
	a.GET("/:kind/:id/history", func(c *gin.Context) {
		if operationTable(c.Param("kind")) == "" || !ValidID(c.Param("id")) {
			respondError(c, ErrInvalid)
			return
		}
		var rows []struct {
			OperationID string          `json:"operation_id"`
			CreatedAt   string          `json:"created_at"`
			BeforeValue json.RawMessage `json:"before"`
			AfterValue  json.RawMessage `json:"after"`
		}
		e := s.DB.WithContext(c.Request.Context()).Raw("SELECT operation_id,created_at::text,before_value,after_value FROM admin_operation_events WHERE kind=? AND entity_id=? ORDER BY created_at DESC LIMIT 100", c.Param("kind"), c.Param("id")).Scan(&rows).Error
		if e != nil {
			respondError(c, e)
			return
		}
		if rows == nil {
			rows = make([]struct {
				OperationID string          `json:"operation_id"`
				CreatedAt   string          `json:"created_at"`
				BeforeValue json.RawMessage `json:"before"`
				AfterValue  json.RawMessage `json:"after"`
			}, 0)
		}
		c.JSON(200, gin.H{"events": rows})
	})
}
