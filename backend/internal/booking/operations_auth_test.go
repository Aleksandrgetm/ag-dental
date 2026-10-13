package booking_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/Aleksandrgetm/Dental/internal/booking"
	"github.com/gin-gonic/gin"
)

type operationRole string

func (r operationRole) Lookup(context.Context, string) (string, error) { return string(r), nil }

func TestOperationsRejectUnauthorizedBeforeDatabase(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, endpoint := range []struct{ method, path string }{
		{"GET", "/api/admin/operations/schedules"},
		{"POST", "/api/admin/operations/schedules"},
		{"PUT", "/api/admin/operations/time-off/" + serviceID},
		{"GET", "/api/admin/operations/schedules/preview"},
		{"POST", "/api/admin/operations/doctors"},
		{"GET", "/api/admin/operations/doctors/options"},
		{"PUT", "/api/admin/operations/doctors/" + serviceID},
		{"GET", "/api/admin/operations/services"},
		{"GET", "/api/admin/operations/services/options"},
		{"POST", "/api/admin/operations/services"},
		{"PUT", "/api/admin/operations/services/" + serviceID},
		{"GET", "/api/admin/operations/services/" + serviceID + "/history"},
	} {
		for _, tc := range []struct {
			token, role string
			status      int
		}{{"", "admin", 401}, {"forged", "admin", 401}, {"valid", "user", 403}} {
			r := gin.New()
			// A nil store makes any accidental handler access fail the test.
			booking.RegisterOperations(r, nil, testVerifier{}, operationRole(tc.role))
			req := httptest.NewRequest(endpoint.method, endpoint.path, nil)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.status {
				t.Fatalf("%s %s: %d", endpoint.method, endpoint.path, w.Code)
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("private response can be cached")
			}
		}
	}
}
