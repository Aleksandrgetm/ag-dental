package cms

import (
	"encoding/json"
	"testing"
)

func TestCreatedTemplatesRejectUnsafeOrIncompleteContent(t *testing.T) {
	text := LocalText{LV: "Synthetic LV", RU: "Synthetic RU", EN: "Synthetic EN"}
	v := CreatedContent{Slug: "synthetic", Date: "2026-10-10", Title: text, Summary: text, Body: text, SEOTitle: text, SEODescription: text}
	raw, _ := json.Marshal(v)
	if validateCreated(raw) != nil {
		t.Fatal("valid structured text rejected")
	}
	for _, key := range []string{"created.news.11111111-1111-4111-8111-111111111111", "created.page.11111111-1111-4111-8111-111111111111", "created.faq.11111111-1111-4111-8111-111111111111"} {
		if !AdminVisible(key) || Validate(key, raw) != nil {
			t.Fatal(key)
		}
	}
	for _, key := range []string{"created.hero.11111111-1111-4111-8111-111111111111", "created.page.../admin", "created.news.invalid"} {
		if AdminVisible(key) {
			t.Fatal("unsafe key")
		}
	}
	for _, slug := range []string{"../admin", "admin/secret", "<script>", "has space", ""} {
		next := v
		next.Slug = slug
		b, _ := json.Marshal(next)
		if validateCreated(b) == nil {
			t.Fatal("unsafe slug", slug)
		}
	}
	v.Body.EN = "<script>alert(1)</script>"
	raw, _ = json.Marshal(v)
	if validateCreated(raw) == nil {
		t.Fatal("markup accepted")
	}
	v.Body = text
	v.Title.RU = ""
	raw, _ = json.Marshal(v)
	if validateCreated(raw) == nil {
		t.Fatal("missing translation accepted")
	}
}
