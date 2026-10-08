package auth

import (
	"context"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"testing"
)

type verifierStub struct{ valid bool }

func (v verifierStub) Verify(_ context.Context, token string) (Identity, error) {
	if !v.valid || token != "valid" {
		return Identity{}, ErrInvalid
	}
	return Identity{ID: "11111111-1111-4111-8111-111111111111", Email: "test@example.invalid"}, nil
}

type roleStub struct {
	role string
	err  error
}

func (r roleStub) Lookup(context.Context, string) (string, error) { return r.role, r.err }
func TestMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, header, role string
		roleErr            error
		admin              bool
		want               int
	}{
		{"missing", "", "user", nil, false, 401}, {"invalid", "Bearer forged", "admin", nil, false, 401}, {"valid", "Bearer valid", "user", nil, false, 200}, {"user denied admin", "Bearer valid", "user", nil, true, 403}, {"admin allowed", "Bearer valid", "admin", nil, true, 200}, {"missing role fails closed", "Bearer valid", "", errors.New("missing"), false, 503},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := gin.New()
			r.Use(RequireAuth(verifierStub{true}, roleStub{tc.role, tc.roleErr}))
			if tc.admin {
				r.Use(RequireRole("admin"))
			}
			r.GET("/", Me)
			req := httptest.NewRequest("GET", "/", nil)
			req.Header.Set("Authorization", tc.header)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatalf("status %d, want %d", w.Code, tc.want)
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("missing no-store")
			}
		})
	}
}
func TestSupabaseVerification(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		body   string
		valid  bool
	}{
		{"verified", 200, `{"id":"11111111-1111-4111-8111-111111111111","email":"test@example.invalid","aud":"authenticated","user_metadata":{"role":"admin"}}`, true},
		{"forged", 401, `{}`, false}, {"expired", 403, `{}`, false}, {"anonymous", 200, `{"id":"11111111-1111-4111-8111-111111111111","aud":"authenticated","is_anonymous":true}`, false}, {"wrong audience", 200, `{"id":"11111111-1111-4111-8111-111111111111","aud":"service_role"}`, false}, {"malformed", 200, `not json`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("Authorization") != "Bearer test-token" || r.Header.Get("apikey") != "public-key" {
					t.Error("missing auth request headers")
				}
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer srv.Close()
			v := SupabaseVerifier{srv.URL, "public-key", srv.Client()}
			u, err := v.Verify(context.Background(), "test-token")
			if (err == nil) != tc.valid {
				t.Fatalf("unexpected verification %v", err)
			}
			if u.Role != "" {
				t.Fatal("trusted client metadata")
			}
		})
	}
}
func TestVerifierConfiguration(t *testing.T) {
	for _, base := range []string{"http://example.com", "https://user:pass@example.com", "https://example.com?redirect=evil", "https://example.com/other"} {
		if _, err := NewVerifier(base, "sb_publishable_test"); err == nil {
			t.Fatal("accepted unsafe configuration")
		}
	}
}
