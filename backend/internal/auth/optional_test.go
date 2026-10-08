package auth

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestOptionalAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name     string
		headers  []string
		verifier Verifier
		roles    Roles
		want     int
		signedIn bool
	}{
		{name: "guest requires no configured auth", want: 200},
		{name: "empty supplied header rejected", headers: []string{""}, want: 401},
		{name: "whitespace rejected", headers: []string{" "}, want: 401},
		{name: "malformed rejected", headers: []string{"Basic abc"}, want: 401},
		{name: "duplicate headers rejected", headers: []string{"Bearer valid", "Bearer forged"}, want: 401},
		{name: "oversized token rejected", headers: []string{"Bearer " + strings.Repeat("a", 16385)}, want: 401},
		{name: "invalid supplied token rejected", headers: []string{"Bearer forged"}, verifier: verifierStub{true}, roles: roleStub{"user", nil}, want: 401},
		{name: "unconfigured auth fails closed", headers: []string{"Bearer valid"}, want: 503},
		{name: "verified identity uses database role", headers: []string{"Bearer valid"}, verifier: verifierStub{true}, roles: roleStub{"user", nil}, want: 200, signedIn: true},
		{name: "role failure does not downgrade to guest", headers: []string{"Bearer valid"}, verifier: verifierStub{true}, roles: roleStub{"", errors.New("unavailable")}, want: 503},
	} {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			called := false
			router.POST("/", OptionalAuth(tc.verifier, tc.roles), func(c *gin.Context) {
				called = true
				identity, signedIn := Current(c)
				if signedIn != tc.signedIn {
					t.Errorf("signed in = %v, want %v", signedIn, tc.signedIn)
				}
				if signedIn && (identity.ID != "11111111-1111-4111-8111-111111111111" || identity.Role != "user") {
					t.Error("verified identity and database role were not preserved")
				}
				c.Status(200)
			})
			req := httptest.NewRequest("POST", "/", nil)
			for _, header := range tc.headers {
				req.Header.Add("Authorization", header)
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != tc.want || called != (tc.want == 200) {
				t.Fatalf("status=%d handler=%v, want status=%d", rec.Code, called, tc.want)
			}
			if rec.Header().Get("Cache-Control") != "no-store" {
				t.Error("missing no-store")
			}
		})
	}
}
