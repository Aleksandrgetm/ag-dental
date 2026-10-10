package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type Supabase struct {
	Base, Key, Bucket string
	Client            *http.Client
}

func NewStorage(base, key, bucket string) (*Supabase, error) {
	u, e := url.Parse(base)
	if e != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || key == "" || strings.HasPrefix(key, "sb_publishable_") || bucket != "ag-dental-cms" {
		return nil, ErrUnavailable
	}
	return &Supabase{strings.TrimRight(base, "/"), key, bucket, &http.Client{Timeout: 90 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}

var objectKey = regexp.MustCompile(`^v1/[a-f0-9]{32}/(original\.(jpg|png|webp|avif|mp4|webm)|display\.webp|medium\.webp|thumb\.webp|video\.(mp4|webm))$`)

func (s *Supabase) request(ctx context.Context, method, path, mime string, b []byte, rangeValue string) (*http.Response, error) {
	req, e := http.NewRequestWithContext(ctx, method, s.Base+"/storage/v1/"+path, bytes.NewReader(b))
	if e != nil {
		return nil, ErrUnavailable
	}
	req.Header.Set("apikey", s.Key)
	// New sb_secret keys authenticate via apikey; legacy service-role JWTs also use Bearer.
	if !strings.HasPrefix(s.Key, "sb_secret_") {
		req.Header.Set("Authorization", "Bearer "+s.Key)
	}
	if mime != "" {
		req.Header.Set("Content-Type", mime)
	}
	req.Header.Set("x-upsert", "false")
	req.Header.Set("Cache-Control", "no-store")
	if rangeValue != "" {
		req.Header.Set("Range", rangeValue)
	}
	r, e := s.Client.Do(req)
	if e != nil {
		return nil, ErrUnavailable
	}
	return r, nil
}
func (s *Supabase) Check(ctx context.Context) error {
	r, e := s.request(ctx, "GET", "bucket/"+s.Bucket, "", nil, "")
	if e != nil {
		return e
	}
	defer r.Body.Close()
	var b struct {
		ID     string `json:"id"`
		Public *bool  `json:"public"`
	}
	if r.StatusCode != 200 || json.NewDecoder(io.LimitReader(r.Body, 32768)).Decode(&b) != nil || b.ID != s.Bucket || b.Public == nil || *b.Public {
		return ErrUnavailable
	}
	return nil
}
func (s *Supabase) Put(ctx context.Context, key, mime string, b []byte) error {
	if !objectKey.MatchString(key) {
		return ErrInvalid
	}
	r, e := s.request(ctx, "POST", "object/"+s.Bucket+"/"+key, mime, b, "")
	if e != nil {
		return e
	}
	defer r.Body.Close()
	if r.StatusCode >= 200 && r.StatusCode < 300 {
		return nil
	}
	if r.StatusCode == 400 || r.StatusCode == 409 { // Uncertain previous write: verify immutable bytes, never upsert.
		old, e := s.Get(ctx, key, "")
		if e != nil {
			return e
		}
		defer old.Body.Close()
		data, e := ReadBounded(old.Body, VideoLimit)
		if old.StatusCode == 200 && e == nil && sha256.Sum256(data) == sha256.Sum256(b) {
			return nil
		}
	}
	return ErrUnavailable
}
func (s *Supabase) Get(ctx context.Context, key, rng string) (*http.Response, error) {
	if !objectKey.MatchString(key) {
		return nil, ErrInvalid
	}
	r, e := s.request(ctx, "GET", "object/authenticated/"+s.Bucket+"/"+key, "", nil, rng)
	if e != nil {
		return nil, e
	}
	if r.StatusCode != 200 && r.StatusCode != 206 {
		r.Body.Close()
		return nil, ErrUnavailable
	}
	return r, nil
}
func (s *Supabase) Delete(ctx context.Context, keys []string) error {
	for _, k := range keys {
		if !objectKey.MatchString(k) {
			return ErrInvalid
		}
	}
	b, _ := json.Marshal(map[string]any{"prefixes": keys})
	r, e := s.request(ctx, "DELETE", "object/"+s.Bucket, "application/json", b, "")
	if e != nil {
		return e
	}
	defer r.Body.Close()
	if r.StatusCode < 200 || r.StatusCode >= 300 {
		return ErrUnavailable
	}
	return nil
}
