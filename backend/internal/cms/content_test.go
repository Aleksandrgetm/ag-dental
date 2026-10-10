package cms

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Aleksandrgetm/Dental/internal/auth"
	"github.com/gin-gonic/gin"
)

func changed(t *testing.T, key string, path []string, value any) json.RawMessage {
	t.Helper()
	d, ok := DefinitionFor(key)
	if !ok {
		t.Fatal(key)
	}
	var data any
	if e := json.Unmarshal(d.Data, &data); e != nil {
		t.Fatal(e)
	}
	parent := at(data, path[:len(path)-1])
	switch p := parent.(type) {
	case map[string]any:
		p[path[len(path)-1]] = value
	default:
		t.Fatal("expected object")
	}
	out, _ := json.Marshal(data)
	return out
}
func TestApprovedContent(t *testing.T) {
	seen := map[string]bool{}
	for _, d := range Baseline.Documents {
		if seen[d.Key] {
			t.Fatal("duplicate")
		}
		seen[d.Key] = true
		if e := Validate(d.Key, d.Data); e != nil {
			t.Fatalf("%s: %v", d.Key, e)
		}
	}
	if len(Baseline.Documents) < 180 || len(Baseline.Media) != 12 {
		t.Fatal("incomplete export")
	}
}
func TestContentValidation(t *testing.T) {
	for _, tc := range []struct {
		name, key string
		path      []string
		value     any
		valid     bool
	}{
		{"price format", "prices.0", []string{"items", "0", "price"}, "-1", false},
		{"price edit", "prices.0", []string{"items", "0", "price"}, "61.00", true},
		{"derived price protected", "service.konsultacija", []string{"price"}, "61", false},
		{"unknown image", "service.konsultacija", []string{"image"}, "arbitrary", false},
		{"email field label", "messages.request", []string{"en", "email"}, "Email address", true},
		{"phone field label", "messages.ui", []string{"en", "phone"}, "Telephone", true},
		{"translation", "clinic.about", []string{"en"}, "Considerate care for each patient.", true},
		{"markup", "clinic.about", []string{"en"}, "<img src=x onerror=alert(1)>", false},
		{"empty", "clinic.about", []string{"lv"}, " ", false},
		{"type", "clinic.about", []string{"lv"}, true, false},
		{"locked hero", "messages.hero", []string{"en", "title"}, "Replacement", false},
		{"unsafe URL", "clinic.clinic", []string{"map"}, "javascript:alert(1)", false},
		{"invalid email", "clinic.clinic", []string{"email"}, "not email", false},
		{"phone mismatch", "clinic.clinic", []string{"phone"}, "+371 21234567", false},
		{"template token", "messages.common", []string{"en", "bookAppointment"}, "{x}", false},
		{"layout shape", "clinic.about", []string{"unexpected"}, "added", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := Validate(tc.key, changed(t, tc.key, tc.path, tc.value))
			if (e == nil) != tc.valid {
				t.Fatalf("validation %v", e)
			}
		})
	}
}

type verifier struct{}

func (verifier) Verify(_ context.Context, token string) (auth.Identity, error) {
	if token != "verified" {
		return auth.Identity{}, auth.ErrInvalid
	}
	return auth.Identity{ID: "11111111-1111-4111-8111-111111111111"}, nil
}

type roles struct {
	role string
	err  error
}

func (r roles) Lookup(context.Context, string) (string, error) { return r.role, r.err }
func TestCMSAuthorization(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, endpoint := range []struct{ method, path string }{{"GET", "/api/admin/cms/documents"}, {"GET", "/api/admin/cms/documents/clinic.about"}, {"PUT", "/api/admin/cms/documents/clinic.about/draft"}, {"POST", "/api/admin/cms/documents/clinic.about/publish"}, {"POST", "/api/admin/cms/documents/clinic.about/rollback"}} {
		for _, tc := range []struct {
			name, token, role string
			err               error
			want              int
		}{{"guest", "", "admin", nil, 401}, {"forged", "forged", "admin", nil, 401}, {"user", "verified", "user", nil, 403}, {"role unavailable", "verified", "", errors.New("role DB failed"), 503}} {
			t.Run(endpoint.method+endpoint.path+tc.name, func(t *testing.T) {
				r := gin.New()
				Register(r, &Store{}, verifier{}, roles{tc.role, tc.err})
				req := httptest.NewRequest(endpoint.method, endpoint.path, strings.NewReader(`{"role":"admin"}`))
				if tc.token != "" {
					req.Header.Set("Authorization", "Bearer "+tc.token)
				}
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				if w.Code != tc.want {
					t.Fatalf("%d, want %d", w.Code, tc.want)
				}
				if w.Header().Get("Cache-Control") != "no-store" {
					t.Fatal("private response cached")
				}
			})
		}
	}
}
func TestSafeErrors(t *testing.T) {
	code, message := SafeError(errors.New("database password and SQL"))
	if code != 503 || message != "content_unavailable" {
		t.Fatal("raw error leaked")
	}
}

func TestSystemManagedHeroExcluded(t *testing.T) {
	// A nil DB proves these checks reject direct access before touching storage.
	store := &Store{}
	for _, d := range Baseline.Documents {
		if !d.SystemManaged {
			continue
		}
		if AdminVisible(d.Key) {
			t.Fatal("system reference visible", d.Key)
		}
		if _, _, err := store.Detail(context.Background(), d.Key); !errors.Is(err, ErrMissing) {
			t.Fatal(err)
		}
		for _, operation := range []string{"draft_saved", "published", "rolled_back"} {
			if _, err := store.Change(context.Background(), d.Key, "", operation, "", 1, d.Data); !errors.Is(err, ErrInvalid) {
				t.Fatal(operation, err)
			}
		}
		r := gin.New()
		Register(r, store, verifier{}, roles{role: "admin"})
		req := httptest.NewRequest("GET", "/api/admin/cms/documents/"+d.Key, nil)
		req.Header.Set("Authorization", "Bearer verified")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != 404 {
			t.Fatal("system reference accessible", w.Code)
		}
	}
	for _, field := range []string{"video", "poster"} {
		if err := Validate("clinic.media", changed(t, "clinic.media", []string{field}, "/media/clinic/tour-room.jpg")); !errors.Is(err, ErrInvalid) {
			t.Fatal("protected media accepted", field)
		}
	}
	if !AdminVisible("clinic.about") {
		t.Fatal("post-Hero content excluded")
	}
}
