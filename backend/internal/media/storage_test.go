package media

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStorage(t *testing.T) {
	data := map[string]string{}
	public := false
	missingPrivacy := false
	writes := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("apikey") != "test-secret" || r.Header.Get("Authorization") != "Bearer test-secret" {
			t.Error("authorization")
		}
		path := strings.TrimPrefix(r.URL.Path, "/storage/v1/")
		if path == "bucket/ag-dental-cms" {
			if missingPrivacy {
				io.WriteString(w, `{"id":"ag-dental-cms"}`)
			} else if public {
				io.WriteString(w, `{"id":"ag-dental-cms","public":true}`)
			} else {
				io.WriteString(w, `{"id":"ag-dental-cms","public":false}`)
			}
			return
		}
		key := strings.TrimPrefix(strings.TrimPrefix(path, "object/authenticated/ag-dental-cms/"), "object/ag-dental-cms/")
		if r.Method == "POST" {
			writes++
			if r.Header.Get("x-upsert") != "false" {
				t.Error("upsert")
			}
			if _, ok := data[key]; ok {
				w.WriteHeader(409)
				return
			}
			b, _ := io.ReadAll(r.Body)
			data[key] = string(b)
			w.WriteHeader(200)
			return
		}
		if r.Method == "GET" {
			io.WriteString(w, data[key])
			return
		}
		w.WriteHeader(200)
	}))
	defer server.Close()
	s := Supabase{server.URL, "test-secret", "ag-dental-cms", server.Client()}
	ctx := context.Background()
	key := "v1/0123456789abcdef0123456789abcdef/display.webp"
	if e := s.Check(ctx); e != nil {
		t.Fatal(e)
	}
	missingPrivacy = true
	if e := s.Check(ctx); e == nil {
		t.Fatal("missing privacy state accepted")
	}
	missingPrivacy = false
	public = true
	if e := s.Check(ctx); e == nil {
		t.Fatal("public bucket accepted")
	}
	if e := s.Put(ctx, key, "image/webp", []byte("immutable")); e != nil {
		t.Fatal(e)
	}
	if e := s.Put(ctx, key, "image/webp", []byte("immutable")); e != nil {
		t.Fatal("uncertain retry", e)
	}
	if e := s.Put(ctx, key, "image/webp", []byte("changed")); e == nil {
		t.Fatal("immutable overwrite")
	}
	if e := s.Put(ctx, "../../x", "image/png", nil); e == nil {
		t.Fatal("traversal")
	}
	if writes != 3 {
		t.Fatal("unsafe path contacted Storage")
	}
	if _, e := NewStorage("http://remote.invalid", "secret", "ag-dental-cms"); e == nil {
		t.Fatal("insecure transport")
	}
}
