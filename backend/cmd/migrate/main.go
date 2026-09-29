// Apply reviewed SQL migrations with: go run ./cmd/migrate
package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"os"
	"time"
)

func main() {
	_ = godotenv.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintln(os.Stderr, "Database connection failed")
		os.Exit(1)
	}
	defer conn.Close(ctx)
	// Serialize migration runners without changing existing connection infrastructure.
	if _, err = conn.Exec(ctx, "SELECT pg_advisory_lock(714092001)"); err != nil {
		fail()
	}
	defer conn.Exec(context.Background(), "SELECT pg_advisory_unlock(714092001)")
	var exists bool
	if err = conn.QueryRow(ctx, "SELECT to_regclass('public.schema_migrations') IS NOT NULL").Scan(&exists); err != nil {
		fail()
	}
	if exists {
		var applied bool
		if err = conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='001_user_roles')").Scan(&applied); err != nil {
			fail()
		}
		if applied {
			fmt.Println("001_user_roles already applied")
			return
		}
	}
	sql, err := os.ReadFile("migrations/001_user_roles.sql")
	if err != nil {
		fail()
	}
	if _, err = conn.Exec(ctx, string(sql)); err != nil {
		fail()
	}
	fmt.Println("Applied 001_user_roles")
}
func fail() {
	fmt.Fprintln(os.Stderr, "Migration failed; inspect database permissions/schema with an administrator. No credentials were logged.")
	os.Exit(1)
}
