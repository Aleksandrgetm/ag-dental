package database

import (
	"fmt"
	"github.com/jackc/pgx/v5"
	"net"
	"os"
	"strings"
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
	if err := validateTLS(dsn); err != nil {
		return nil, err
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

// Remote databases must authenticate both the server certificate chain and hostname.
// Only loopback/Unix-socket disposable development databases may omit TLS.
func validateTLS(dsn string) error {
	cfg, e := pgx.ParseConfig(dsn)
	if e != nil {
		return fmt.Errorf("invalid database configuration")
	}
	local := func(host string) bool {
		return host == "localhost" || strings.HasPrefix(host, "/") || (net.ParseIP(host) != nil && net.ParseIP(host).IsLoopback())
	}
	if !local(cfg.Host) && (cfg.TLSConfig == nil || cfg.TLSConfig.InsecureSkipVerify || cfg.TLSConfig.ServerName != cfg.Host) {
		return fmt.Errorf("remote database requires verified TLS and hostname")
	}
	for _, fallback := range cfg.Fallbacks {
		if !local(fallback.Host) && (fallback.TLSConfig == nil || fallback.TLSConfig.InsecureSkipVerify || fallback.TLSConfig.ServerName != fallback.Host) {
			return fmt.Errorf("unverified database fallback is forbidden")
		}
	}
	return nil
}
