package cms

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

type MediaConfig struct {
	Storage   media.Storage
	Processor media.Processor
	Uploads   bool
}

func MediaEnvironment() MediaConfig {
	storage, e := media.NewStorage(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_STORAGE_SECRET_KEY"), "ag-dental-cms")
	if e != nil {
		return MediaConfig{}
	}
	ff, _ := exec.LookPath("ffmpeg")
	probe, _ := exec.LookPath("ffprobe")
	webp, _ := exec.LookPath("cwebp")
	return MediaConfig{Storage: storage, Processor: media.Tools{FFmpeg: ff, FFprobe: probe, CWebP: webp}, Uploads: os.Getenv("MEDIA_UPLOADS_ENABLED") == "true" && ff != "" && probe != "" && webp != ""}
}
func mediaFailure(c *gin.Context, e error) {
	c.Header("Cache-Control", "no-store")
	status, code := 503, "media_unavailable"
	switch {
	case errors.Is(e, media.ErrInvalid) || errors.Is(e, ErrInvalid):
		status, code = 422, "invalid_file"
	case errors.Is(e, media.ErrBusy):
		status, code = 429, "media_busy"
		c.Header("Retry-After", "10")
	case errors.Is(e, ErrProtected):
		status, code = 403, "media_protected"
	case errors.Is(e, ErrReferenced):
		status, code = 409, "media_referenced"
	case errors.Is(e, ErrConflict):
		status, code = 409, "media_conflict"
	case errors.Is(e, ErrMissing):
		status, code = 404, "media_missing"
	}
	c.JSON(status, gin.H{"error": code})
}

var byteRange = regexp.MustCompile(`^bytes=(\d+-\d*|-\d+)$`)

func RegisterMedia(r *gin.Engine, s *Store, v auth.Verifier, roles auth.Roles, config MediaConfig) {
	admin := r.Group("/api/admin/cms/media", auth.RequireAuth(v, roles), auth.RequireRole("admin"))
	admin.GET("", func(c *gin.Context) {
		rows, e := s.MediaList(c.Request.Context())
		if e != nil {
			mediaFailure(c, e)
			return
		}
		dims := media.RegisteredDimensions()
		for i := range rows {
			rows[i].References = int64(len(rows[i].Usages))
			if d, ok := dims[rows[i].ID]; ok {
				var md map[string]any
				json.Unmarshal(rows[i].Metadata, &md)
				md["width"], md["height"] = d.Width, d.Height
				rows[i].Metadata, _ = json.Marshal(md)
			}
		}
		enabled := config.Uploads && config.Storage != nil && config.Processor != nil
		if enabled {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
			enabled = config.Storage.Check(ctx) == nil
			cancel()
		}
		c.JSON(200, gin.H{"assets": rows, "upload_enabled": enabled, "image_limit": media.ImageLimit, "video_limit": media.VideoLimit, "video_slots": false})
	})
	processing := make(chan struct{}, 1)
	admin.POST("", func(c *gin.Context) {
		if !config.Uploads || config.Storage == nil || config.Processor == nil {
			mediaFailure(c, media.ErrUnavailable)
			return
		}
		select {
		case processing <- struct{}{}:
			defer func() { <-processing }()
		default:
			mediaFailure(c, media.ErrBusy)
			return
		}
		key := c.GetHeader("Idempotency-Key")
		if !uuid.MatchString(key) {
			mediaFailure(c, media.ErrInvalid)
			return
		}
		if e := config.Storage.Check(c.Request.Context()); e != nil {
			mediaFailure(c, e)
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, media.VideoLimit+65536)
		if e := c.Request.ParseMultipartForm(1 << 20); e != nil {
			mediaFailure(c, media.ErrInvalid)
			return
		}
		defer c.Request.MultipartForm.RemoveAll()
		if len(c.Request.MultipartForm.File) != 1 || len(c.Request.MultipartForm.File["file"]) != 1 {
			mediaFailure(c, media.ErrInvalid)
			return
		}
		var alt map[string]string
		if json.Unmarshal([]byte(c.Request.FormValue("alt")), &alt) != nil || !media.ValidAlt(alt) {
			mediaFailure(c, media.ErrInvalid)
			return
		}
		file, header, e := c.Request.FormFile("file")
		if e != nil {
			mediaFailure(c, media.ErrInvalid)
			return
		}
		defer file.Close()
		data, e := media.ReadBounded(file, media.VideoLimit)
		if e != nil {
			mediaFailure(c, e)
			return
		}
		result, e := config.Processor.Process(c.Request.Context(), header.Filename, data)
		if e != nil {
			mediaFailure(c, e)
			return
		}
		result.Metadata.Alt = alt
		actor, _ := auth.Current(c)
		row, replayed, e := s.ReserveMedia(c.Request.Context(), result, actor.ID, key)
		if e != nil {
			mediaFailure(c, e)
			return
		}
		if !replayed {
			success := false
			defer func() {
				if !success {
					ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
					defer cancel()
					_ = s.FinishMedia(ctx, row.ID, actor.ID, false)
				}
			}()
			for _, file := range result.Files {
				if e = config.Storage.Put(c.Request.Context(), storagePath(row.ID, file.Name), file.MIME, file.Data); e != nil {
					mediaFailure(c, e)
					return
				}
			}
			if e = s.FinishMedia(c.Request.Context(), row.ID, actor.ID, true); e != nil {
				mediaFailure(c, e)
				return
			}
			success = true
		}
		row, e = s.Media(c.Request.Context(), row.ID)
		if e != nil {
			mediaFailure(c, e)
			return
		}
		c.Header("Idempotency-Replayed", map[bool]string{true: "true", false: "false"}[replayed])
		c.JSON(200, gin.H{"asset": row, "duplicate": replayed})
	})
	admin.POST("/:id/archive", func(c *gin.Context) {
		actor, _ := auth.Current(c)
		if e := s.ArchiveMedia(c.Request.Context(), c.Param("id"), actor.ID); e != nil {
			mediaFailure(c, e)
			return
		}
		c.Status(204)
	})
	admin.DELETE("/:id", func(c *gin.Context) {
		// Separate explicit destructive operation. Only archived, never-referenced uploads.
		if !config.Uploads {
			mediaFailure(c, media.ErrUnavailable)
			return
		}
		actor, _ := auth.Current(c)
		if e := s.PurgeMedia(c.Request.Context(), c.Param("id"), actor.ID, config.Storage); e != nil {
			mediaFailure(c, e)
			return
		}
		c.Status(204)
	})
	serve := func(public bool) gin.HandlerFunc {
		return func(c *gin.Context) {
			if config.Storage == nil {
				mediaFailure(c, media.ErrUnavailable)
				return
			}
			id, name := c.Param("id"), c.Param("variant")
			if !media.IDPattern.MatchString(id) {
				mediaFailure(c, ErrMissing)
				return
			}
			row, e := s.Media(c.Request.Context(), id)
			if e != nil {
				mediaFailure(c, e)
				return
			}
			if row.Protected || row.State != "ready" || row.Origin != "upload" || (public && (row.PublishedAt == nil || strings.HasPrefix(name, "original."))) {
				mediaFailure(c, ErrMissing)
				return
			}
			var md media.Metadata
			json.Unmarshal(row.Metadata, &md)
			var variant *media.Variant
			for _, item := range md.Variants {
				if item.Name == name {
					copy := item
					variant = &copy
				}
			}
			if variant == nil {
				mediaFailure(c, ErrMissing)
				return
			}
			rng := c.GetHeader("Range")
			if rng != "" && !byteRange.MatchString(rng) {
				c.Status(416)
				return
			}
			etag := `"` + variant.SHA + `"`
			c.Header("X-Content-Type-Options", "nosniff")
			c.Header("Content-Security-Policy", "default-src 'none'; sandbox")
			c.Header("ETag", etag)
			if public {
				c.Header("Cache-Control", "public,max-age=31536000,immutable")
				if c.GetHeader("If-None-Match") == etag {
					c.Status(304)
					return
				}
			} else {
				c.Header("Cache-Control", "no-store")
			}
			response, e := config.Storage.Get(c.Request.Context(), storagePath(id, name), rng)
			if e != nil {
				mediaFailure(c, e)
				return
			}
			defer response.Body.Close()
			for _, header := range []string{"Content-Range", "Content-Length", "Accept-Ranges"} {
				if value := response.Header.Get(header); value != "" {
					c.Header(header, value)
				}
			}
			c.Header("Content-Type", variant.MIME)
			c.Header("Content-Disposition", "inline")
			c.Status(response.StatusCode)
			_, _ = io.Copy(c.Writer, io.LimitReader(response.Body, media.VideoLimit+1))
		}
	}
	admin.GET("/:id/:variant", serve(false))
	r.GET("/api/cms/media/:id/:variant", serve(true))
}
