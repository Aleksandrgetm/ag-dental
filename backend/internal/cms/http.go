package cms

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"regexp"
)

type changeRequest struct {
	Version  int64           `json:"expected_version"`
	Payload  json.RawMessage `json:"payload"`
	Revision string          `json:"revision_id"`
}

var uuid = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func failure(c *gin.Context, e error) {
	code, message := SafeError(e)
	c.JSON(code, gin.H{"error": message})
}
func Register(r *gin.Engine, s *Store, v auth.Verifier, roles auth.Roles) {
	r.GET("/api/cms/published", func(c *gin.Context) {
		rows, e := s.Published(c.Request.Context())
		if e != nil {
			c.Header("Cache-Control", "no-store")
			failure(c, e)
			return
		}
		body, _ := json.Marshal(gin.H{"schema_version": 1, "documents": rows})
		sum := sha256.Sum256(body)
		tag := `"` + hex.EncodeToString(sum[:]) + `"`
		c.Header("ETag", tag)
		c.Header("Cache-Control", "public, max-age=0, must-revalidate")
		if c.GetHeader("If-None-Match") == tag {
			c.Status(304)
			return
		}
		c.Data(200, "application/json; charset=utf-8", body)
	})
	admin := r.Group("/api/admin/cms", auth.RequireAuth(v, roles), auth.RequireRole("admin"))
	admin.GET("/documents", func(c *gin.Context) {
		rows, e := s.List(c.Request.Context())
		if e != nil {
			failure(c, e)
			return
		}
		c.JSON(200, gin.H{"documents": rows})
	})
	admin.GET("/documents/:key", func(c *gin.Context) {
		key := c.Param("key")
		if !AdminVisible(key) {
			failure(c, ErrMissing)
			return
		}
		d, h, e := s.Detail(c.Request.Context(), key)
		if e != nil {
			failure(c, e)
			return
		}
		links, e := s.BookingLinks(c.Request.Context(), key)
		if e != nil {
			failure(c, e)
			return
		}
		c.JSON(200, gin.H{"document": d, "revisions": h, "booking_links": links})
	})
	change := func(operation string) gin.HandlerFunc {
		return func(c *gin.Context) {
			var req changeRequest
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 600*1024)
			decoder := json.NewDecoder(c.Request.Body)
			decoder.DisallowUnknownFields()
			if decoder.Decode(&req) != nil || req.Version < 1 {
				failure(c, ErrInvalid)
				return
			}
			var extra any
			if decoder.Decode(&extra) != io.EOF {
				failure(c, ErrInvalid)
				return
			}
			if operation != "draft_saved" && !uuid.MatchString(req.Revision) {
				failure(c, ErrInvalid)
				return
			}
			who, _ := auth.Current(c)
			d, e := s.Change(c.Request.Context(), c.Param("key"), who.ID, operation, req.Revision, req.Version, req.Payload)
			if e != nil {
				failure(c, e)
				return
			}
			c.JSON(200, d)
		}
	}
	admin.PUT("/documents/:key/draft", change("draft_saved"))
	admin.POST("/documents/:key/publish", change("published"))
	admin.POST("/documents/:key/rollback", change("rolled_back"))
}
