package server

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCMSConditionalReadCORS(t *testing.T) {
	r := New(nil, nil, []string{"https://preview.example.invalid"})
	req := httptest.NewRequest("OPTIONS", "/api/cms/published", nil)
	req.Header.Set("Origin", "https://preview.example.invalid")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "If-None-Match")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 204 || !strings.Contains(strings.ToLower(w.Header().Get("Access-Control-Allow-Headers")), "if-none-match") {
		t.Fatal("cross-origin revalidation blocked")
	}
	req = httptest.NewRequest("OPTIONS", "/api/admin/cms/documents/clinic.about/draft", nil)
	req.Header.Set("Origin", "https://unapproved.example.invalid")
	req.Header.Set("Access-Control-Request-Method", "PUT")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 403 {
		t.Fatal("unapproved origin allowed")
	}
}
