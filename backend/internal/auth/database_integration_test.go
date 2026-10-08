package auth

import (
	"context"
	"github.com/jackc/pgx/v5"
	"os"
	"strings"
	"testing"
	"time"
)

// Opt-in disposable-test-database check. Never fall back to DATABASE_URL or .env.
// The synthetic Auth row and its triggered role are rolled back.
func TestLiveRoleSecurity(t *testing.T) {
	dsn := os.Getenv("AUTH_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set AUTH_TEST_DATABASE_URL and AUTH_TEST_DATABASE_CONFIRM=disposable for an isolated test database")
	}
	config, err := pgx.ParseConfig(dsn)
	if err != nil || !strings.HasSuffix(config.Database, "_test") || os.Getenv("AUTH_TEST_DATABASE_CONFIRM") != "disposable" {
		t.Fatal("auth integration requires an explicitly confirmed disposable database ending in _test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		t.Fatal("database unavailable")
	}
	defer conn.Close(ctx)
	tx, err := conn.Begin(ctx)
	if err != nil {
		t.Fatal("transaction unavailable")
	}
	defer tx.Rollback(context.Background())
	var id, role string
	if err = tx.QueryRow(ctx, `INSERT INTO auth.users(id,raw_user_meta_data) VALUES(gen_random_uuid(),'{"role":"admin"}') RETURNING id::text`).Scan(&id); err != nil {
		t.Fatal("test insert failed")
	}
	if err = tx.QueryRow(ctx, `SELECT role FROM public.user_roles WHERE user_id=$1`, id).Scan(&role); err != nil || role != "user" {
		t.Fatal("trigger did not force user role")
	}
	for _, dbRole := range []string{"anon", "authenticated"} {
		for _, privilege := range []string{"SELECT", "INSERT", "UPDATE", "DELETE"} {
			var allowed bool
			if err = tx.QueryRow(ctx, `SELECT has_table_privilege($1,'public.user_roles',$2)`, dbRole, privilege).Scan(&allowed); err != nil || allowed {
				t.Fatalf("unexpected %s permission for %s", privilege, dbRole)
			}
		}
	}
	var rls bool
	if err = tx.QueryRow(ctx, `SELECT relrowsecurity FROM pg_class WHERE oid='public.user_roles'::regclass`).Scan(&rls); err != nil || !rls {
		t.Fatal("RLS not enabled")
	}
}
