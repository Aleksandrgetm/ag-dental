package main

import (
	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/database"
	"github.com/Aleksandrgetm/Dental/internal/server"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	_ = godotenv.Load()
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Database connection failed")
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Database connection failed")
	}
	defer sqlDB.Close()
	if err = sqlDB.Ping(); err != nil {
		log.Fatal("Database ping failed")
	}
	var verifier auth.Verifier
	configuredVerifier, authErr := auth.NewVerifier(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_PUBLISHABLE_KEY"))
	if authErr != nil {
		log.Println("Authentication unavailable; guest booking remains available")
	} else {
		verifier = configuredVerifier
	}
	origins := []string{"http://localhost:5173"}
	if val := os.Getenv("CORS_ALLOWED_ORIGINS"); val != "" {
		origins = nil
		for _, v := range strings.Split(val, ",") {
			v = strings.TrimSpace(v)
			if v == "*" || v == "" {
				log.Fatal("CORS requires explicit origins")
			}
			origins = append(origins, v)
		}
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	api := &http.Server{Addr: ":" + port, Handler: server.New(db, verifier, origins), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 125 * time.Second, WriteTimeout: 150 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 32 * 1024}
	log.Println("API listening on configured port")
	if err = api.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("API server stopped")
	}
}
