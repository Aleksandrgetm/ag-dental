package booking_test

import (
	"context"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/gin-gonic/gin"
)

type adminVerifier struct{}

func (adminVerifier) Verify(_ context.Context, token string) (auth.Identity, error) {
	if token == "outage" {
		return auth.Identity{}, errors.New("private provider details")
	}
	if token != "valid" {
		return auth.Identity{}, auth.ErrInvalid
	}
	// Even a verifier identity carrying admin is overwritten by the trusted role lookup.
	return auth.Identity{ID: "11111111-1111-4111-8111-111111111111", Role: "admin"}, nil
}

type currentRoles struct {
	role  string
	calls int
}

func (r *currentRoles) Lookup(context.Context, string) (string, error) { r.calls++; return r.role, nil }

func TestAllBookingAdminRoutesRejectUntrustedAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	endpoints := [][2]string{
		{"GET", "/api/admin/booking/appointments"},
		{"GET", "/api/admin/booking/appointments/11111111-1111-4111-8111-111111111111"},
		{"POST", "/api/admin/booking/appointments"},
		{"PATCH", "/api/admin/booking/appointments/11111111-1111-4111-8111-111111111111/status"},
		{"POST", "/api/admin/booking/appointments/11111111-1111-4111-8111-111111111111/reschedule"},
		{"GET", "/api/admin/booking/settings"}, {"PUT", "/api/admin/booking/settings"},
	}
	for _, endpoint := range endpoints {
		for _, tc := range []struct {
			token  string
			status int
		}{{"", 401}, {"forged", 401}, {"expired", 401}, {"valid", 403}, {"outage", 503}} {
			t.Run(endpoint[0]+" "+endpoint[1]+" "+tc.token, func(t *testing.T) {
				r := gin.New()
				roles := &currentRoles{role: "user"}
				// Nil Store intentionally fails if any unauthorized handler gets through to data access.
				booking.Register(r, nil, adminVerifier{}, roles)
				req := httptest.NewRequest(endpoint[0], endpoint[1]+"?role=admin", strings.NewReader(`{"role":"admin"}`))
				req.Header.Set("Content-Type", "application/json")
				if tc.token != "" {
					req.Header.Set("Authorization", "Bearer "+tc.token)
				}
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				if w.Code != tc.status {
					t.Fatalf("status=%d want=%d", w.Code, tc.status)
				}
				if w.Header().Get("Cache-Control") != "no-store" {
					t.Fatal("private response cacheable")
				}
				if strings.Contains(w.Body.String(), "private") || strings.Contains(w.Body.String(), "Bearer") {
					t.Fatal("sensitive error exposed")
				}
			})
		}
	}
}
func TestAdminRevocationIsCheckedOnEveryRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	roles := &currentRoles{role: "admin"}
	r := gin.New()
	r.GET("/protected", auth.RequireAuth(adminVerifier{}, roles), auth.RequireRole("admin"), func(c *gin.Context) { c.Status(204) })
	for _, expected := range []int{204, 403, 204} {
		roles.role = "admin"
		if expected == 403 {
			roles.role = "user"
		}
		req := httptest.NewRequest("GET", "/protected?role=admin", nil)
		req.Header.Set("Authorization", "Bearer valid")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != expected {
			t.Fatalf("status=%d want=%d", w.Code, expected)
		}
	}
	if roles.calls != 3 {
		t.Fatal("role was cached across requests")
	}
}
