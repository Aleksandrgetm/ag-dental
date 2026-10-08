package database

import (
	"fmt"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	raw, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database pool unavailable")
	}
	raw.SetMaxOpenConns(20)
	raw.SetMaxIdleConns(5)
	raw.SetConnMaxLifetime(time.Hour)
	return db, nil
}
