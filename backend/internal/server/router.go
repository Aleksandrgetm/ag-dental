package server

import (
	"context"
	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"io"
	"net/http"
	"time"
)

func New(db *gorm.DB, v auth.Verifier, origins []string) *gin.Engine {
	// Recovery only: access logs can contain query values. No patient bodies or
	// credentials are logged. Add structured, redacted operational logging later.
	r := gin.New()
	r.Use(gin.RecoveryWithWriter(io.Discard))
	r.Use(func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 12*time.Second)
		defer cancel()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	})
	_ = r.SetTrustedProxies(nil)
	r.Use(cors.New(cors.Config{AllowOrigins: origins, AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "Idempotency-Key", "If-None-Match"}, ExposeHeaders: []string{"Idempotency-Replayed", "Retry-After", "ETag"}, AllowCredentials: true}))
	r.GET("/api/health", func(c *gin.Context) {
		raw, e := db.DB()
		if e == nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			defer cancel()
			e = raw.PingContext(ctx)
		}
		if e != nil {
			c.JSON(503, gin.H{"status": "unavailable", "service": "ag-dental-api", "database": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "ag-dental-api", "database": "connected"})
	})
	roles := auth.DatabaseRoles{DB: db}
	r.GET("/api/auth/me", auth.RequireAuth(v, roles), auth.Me)
	r.GET("/api/admin/health", auth.RequireAuth(v, roles), auth.RequireRole("admin"), func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	booking.Register(r, booking.NewStore(db), v, roles)
	cms.Register(r, &cms.Store{DB: db}, v, roles)
	return r
}
