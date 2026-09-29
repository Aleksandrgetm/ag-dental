package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load local environment variables.
	// In production they will come from the hosting environment.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to PostgreSQL.
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Database connection failed: ", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get database instance: ", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Database ping failed: ", err)
	}

	log.Println("Database connected successfully")

	router := gin.Default()
	// No trusted reverse proxy is configured for local development.
	_ = router.SetTrustedProxies(nil)

	origins := []string{"http://localhost:5173"}
	if configured := os.Getenv("CORS_ALLOWED_ORIGINS"); configured != "" {
		origins = strings.Split(configured, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
			if origins[i] == "*" || origins[i] == "" {
				log.Fatal("CORS origins must be explicit")
			}
		}
	}
	router.Use(cors.New(cors.Config{
		AllowOrigins: origins,
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
		},
		AllowCredentials: true,
	}))

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"service":  "ag-dental-api",
			"database": "connected",
		})
	})

	var verifier auth.Verifier
	if os.Getenv("SUPABASE_URL") != "" || os.Getenv("SUPABASE_PUBLISHABLE_KEY") != "" {
		configured, err := auth.NewVerifier(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_PUBLISHABLE_KEY"))
		if err != nil {
			log.Fatal(err)
		}
		verifier = configured
	} else {
		log.Println("Supabase Auth is not configured; authenticated endpoints are unavailable")
	}
	router.GET("/api/auth/me", auth.RequireAuth(verifier, auth.DatabaseRoles{DB: db}), auth.Me)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
