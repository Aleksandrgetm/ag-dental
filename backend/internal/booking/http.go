package booking

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/gin-gonic/gin"
)

// Register does not expose reference-only lookup or guest booking detail access.
func Register(r *gin.Engine, s *Store, v auth.Verifier, roles auth.Roles) {
	public := r.Group("/api/booking")
	public.Use(noStore())
	public.GET("/services", func(c *gin.Context) {
		rows, e := s.Services(c.Request.Context())
		if e != nil {
			respondError(c, e)
			return
		}
		cfg, e := s.Settings(c.Request.Context())
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"services": rows, "privacy_notice_version": cfg.PrivacyNoticeVersion})
	})
	public.GET("/doctors", func(c *gin.Context) {
		rows, e := s.Doctors(c.Request.Context(), c.Query("service_id"))
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"doctors": rows})
	})
	public.GET("/availability", func(c *gin.Context) {
		slots, cfg, e := s.Availability(c.Request.Context(), c.Query("service_id"), c.Query("doctor_id"), c.Query("date"))
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"slots": slots, "timezone": cfg.Timezone, "privacy_notice_version": cfg.PrivacyNoticeVersion})
	})
	public.POST("/appointments", NewLimiter(5, time.Minute, 10000).Middleware(), auth.OptionalAuth(v, roles), func(c *gin.Context) {
		var req CreateRequest
		if !decode(c, &req) {
			return
		}
		user := ""
		if id, ok := auth.Current(c); ok {
			user = id.ID
		}
		receipt, replay, e := s.Create(c.Request.Context(), req, c.GetHeader("Idempotency-Key"), user, "", false)
		if e != nil {
			respondError(c, e)
			return
		}
		status := 201
		if replay {
			status = 200
			c.Header("Idempotency-Replayed", "true")
		}
		c.JSON(status, receipt)
	})
	admin := r.Group("/api/admin/booking", noStore(), auth.RequireAuth(v, roles), auth.RequireRole("admin"))
	admin.GET("/appointments", func(c *gin.Context) {
		limit, offset := 50, 0
		var e error
		if val := c.Query("limit"); val != "" {
			limit, e = strconv.Atoi(val)
			if e != nil {
				respondError(c, ErrInvalid)
				return
			}
		}
		if val := c.Query("offset"); val != "" {
			offset, e = strconv.Atoi(val)
			if e != nil {
				respondError(c, ErrInvalid)
				return
			}
		}
		rows, e := s.List(c.Request.Context(), Filter{c.Query("date"), c.Query("doctor_id"), c.Query("service_id"), c.Query("status"), limit, offset})
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, gin.H{"appointments": rows})
	})
	admin.GET("/appointments/:id", func(c *gin.Context) {
		a, e := s.Get(c.Request.Context(), c.Param("id"))
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, a)
	})
	admin.POST("/appointments", func(c *gin.Context) {
		var req CreateRequest
		if !decode(c, &req) {
			return
		}
		id, _ := auth.Current(c)
		a, replay, e := s.Create(c.Request.Context(), req, c.GetHeader("Idempotency-Key"), "", id.ID, true)
		if e != nil {
			respondError(c, e)
			return
		}
		status := 201
		if replay {
			status = 200
			c.Header("Idempotency-Replayed", "true")
		}
		c.JSON(status, a)
	})
	admin.PATCH("/appointments/:id/status", func(c *gin.Context) {
		var req struct {
			Status string `json:"status"`
		}
		if !decode(c, &req) {
			return
		}
		id, _ := auth.Current(c)
		a, e := s.Transition(c.Request.Context(), c.Param("id"), req.Status, id.ID)
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, a)
	})
	admin.POST("/appointments/:id/reschedule", func(c *gin.Context) {
		var req RescheduleRequest
		if !decode(c, &req) {
			return
		}
		id, _ := auth.Current(c)
		a, e := s.Reschedule(c.Request.Context(), c.Param("id"), id.ID, req)
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, a)
	})
	admin.GET("/settings", func(c *gin.Context) {
		cfg, e := s.Settings(c.Request.Context())
		if e != nil {
			respondError(c, e)
			return
		}
		c.JSON(200, cfg)
	})
	admin.PUT("/settings", func(c *gin.Context) {
		var cfg Settings
		if !decode(c, &cfg) {
			return
		}
		actor, _ := auth.Current(c)
		if e := s.UpdateSettings(c.Request.Context(), cfg, actor.ID); e != nil {
			respondError(c, e)
			return
		}
		c.Status(204)
	})
}
func noStore() gin.HandlerFunc {
	return func(c *gin.Context) { c.Header("Cache-Control", "no-store"); c.Next() }
}
func decode(c *gin.Context, v any) bool {
	if c.ContentType() != "application/json" {
		c.AbortWithStatusJSON(415, gin.H{"error": "json_required"})
		return false
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16*1024)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(v) != nil {
		respondError(c, ErrInvalid)
		return false
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		respondError(c, ErrInvalid)
		return false
	}
	return true
}
func respondError(c *gin.Context, e error) {
	status, code := 500, "booking_unavailable"
	switch {
	case errors.Is(e, ErrInvalid):
		status, code = 400, "invalid_request"
	case errors.Is(e, ErrNotFound):
		status, code = 404, "not_found"
	case errors.Is(e, ErrUnavailable):
		status, code = 409, "slot_unavailable"
	case errors.Is(e, ErrConflict):
		status, code = 409, "idempotency_conflict"
	case errors.Is(e, ErrTransition):
		status, code = 409, "invalid_status_transition"
	case errors.Is(e, ErrNotConfigured):
		status, code = 503, "booking_not_configured"
	}
	c.AbortWithStatusJSON(status, gin.H{"error": code})
}

type limitEntry struct {
	tokens  float64
	updated time.Time
}
type Limiter struct {
	mu       sync.Mutex
	entries  map[string]limitEntry
	burst    int
	period   time.Duration
	capacity int
	now      func() time.Time
}

func NewLimiter(burst int, period time.Duration, capacity int) *Limiter {
	return &Limiter{entries: map[string]limitEntry{}, burst: burst, period: period, capacity: capacity, now: time.Now}
}
func (l *Limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	entry, ok := l.entries[key]
	if !ok {
		if len(l.entries) >= l.capacity {
			for k, v := range l.entries {
				if now.Sub(v.updated) > 2*l.period {
					delete(l.entries, k)
				}
			}
		}
		if len(l.entries) >= l.capacity {
			return false
		}
		entry = limitEntry{float64(l.burst), now}
	}
	entry.tokens += now.Sub(entry.updated).Seconds() * float64(l.burst) / l.period.Seconds()
	if entry.tokens > float64(l.burst) {
		entry.tokens = float64(l.burst)
	}
	entry.updated = now
	allowed := entry.tokens >= 1
	if allowed {
		entry.tokens--
	}
	l.entries[key] = entry
	return allowed
}
func (l *Limiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !l.allow(c.ClientIP()) {
			c.Header("Retry-After", strconv.Itoa(int(l.period.Seconds())))
			c.AbortWithStatusJSON(429, gin.H{"error": "rate_limited"})
			return
		}
		c.Next()
	}
}
