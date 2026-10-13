package server

// Optional reproduction using the already-running local binary, launched again
// with a clean environment, synthetic Auth and the guarded disposable database.
import (
	"bytes"
	"encoding/json"
	"encoding/pem"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func reproduceLegacyProfile(t *testing.T, dsn string) {
	t.Helper()
	binary := os.Getenv("PROFILE_LEGACY_BINARY")
	if binary == "" {
		return
	}
	identity := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" || r.Header.Get("Authorization") != "Bearer isolated-calendar-admin" {
			w.WriteHeader(401)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"id":"11111111-1111-4111-8111-111111111111","email":"cms@example.invalid","aud":"authenticated"}`)
	}))
	defer identity.Close()
	dir := t.TempDir()
	cert := filepath.Join(dir, "synthetic-ca.pem")
	if err := os.WriteFile(cert, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: identity.Certificate().Raw}), 0600); err != nil {
		t.Fatal(err)
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	_, port, _ := net.SplitHostPort(address)
	listener.Close()
	endpoint := "http://" + address
	cmd := exec.Command(binary)
	cmd.Dir = dir
	cmd.Env = []string{"PATH=" + os.Getenv("PATH"), "DATABASE_URL=" + dsn, "SUPABASE_URL=" + identity.URL, "SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic", "SSL_CERT_FILE=" + cert, "PORT=" + port, "GIN_MODE=release", "MEDIA_UPLOADS_ENABLED=false"}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { cmd.Process.Kill(); cmd.Wait() }()
	ready := false
	for i := 0; i < 60; i++ {
		res, err := http.Get(endpoint + "/api/health")
		if err == nil {
			res.Body.Close()
			if res.StatusCode == 200 {
				ready = true
				break
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	if !ready {
		t.Fatal("isolated legacy binary did not start")
	}
	profile := map[string]any{"title": map[string]string{"lv": "", "ru": "", "en": ""}, "biography": map[string]string{"lv": "Synthetic LV", "ru": "Synthetic RU", "en": "Synthetic EN"}, "qualifications": map[string]string{"lv": "", "ru": "", "en": ""}}
	data := map[string]any{"name": "Synthetic legacy reproduction", "profile": profile, "portrait_id": "media.a5efea0fa7154c32", "editorial_key": "", "active": false, "booking_enabled": false, "sort_order": 0, "provenance": "development_fixture", "setup": map[string]any{"service_ids": []string{}, "hours": []any{}}, "confirm_editorial_link": true}
	send := func() int {
		raw, _ := json.Marshal(map[string]any{"operation_id": "89999999-9999-4999-8999-999999999999", "expected_version": "", "data": data})
		req, _ := http.NewRequest("POST", endpoint+"/api/admin/operations/doctors", bytes.NewReader(raw))
		req.Header.Set("Authorization", "Bearer isolated-calendar-admin")
		req.Header.Set("Content-Type", "application/json")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Logf("Isolated old binary rejection: HTTP %d %s", res.StatusCode, b)
		}
		return res.StatusCode
	}
	if status := send(); status != 400 {
		t.Fatalf("expected old contract rejection, got %d", status)
	}
	delete(data, "confirm_editorial_link")
	status := send()
	if status == 400 {
		delete(profile, "title")
		status = send()
		t.Log("Old binary also rejects profile.title")
	}
	if status != 200 {
		t.Fatalf("legacy-compatible synthetic request failed: %d", status)
	}
	t.Log("Old binary reproduced: new request fields rejected; legacy-compatible request accepted against isolated database")
}
