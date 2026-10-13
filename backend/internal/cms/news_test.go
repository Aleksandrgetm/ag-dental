package cms

import (
	"context"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"testing"
)

func testNewsPublication(t *testing.T, db *gorm.DB, actor string) {
	t.Helper()
	rollback := errors.New("rollback synthetic news")
	err := db.Transaction(func(tx *gorm.DB) error {
		s := Store{tx}
		ctx := context.Background()
		key := "created.news.22222222-2222-4222-8222-222222222222"
		for _, d := range Baseline.Documents {
			if d.Target == "articles" {
				var p map[string]map[string]any
				json.Unmarshal(d.Data, &p)
				for _, lang := range []string{"lv", "ru", "en"} {
					p[lang]["paragraphs"] = []string{"Synthetic one", "Synthetic two", "Synthetic three"}
					p[lang]["introduction"] = "Synthetic lead"
					p[lang]["author"] = "Synthetic author"
					p[lang]["category"] = ""
				}
				b, _ := json.Marshal(p)
				current, _, e := s.Detail(ctx, d.Key)
				if e != nil {
					t.Fatal(e)
				}
				if _, e = s.PublishNews(ctx, d.Key, actor, current.Version, b); e != nil {
					t.Fatal("imported paragraph editing", e)
				}
				p["lv"]["slug"] = "changed-identity"
				b, _ = json.Marshal(p)
				if _, e = s.PublishNews(ctx, d.Key, actor, current.Version, b); !errors.Is(e, ErrInvalid) {
					t.Fatal("legacy identity changed")
				}
				break
			}
		}
		text := LocalText{"Synthetic LV", "Synthetic RU", "Synthetic EN"}
		p := CreatedContent{Slug: "synthetic-news-atomic", Date: "2026-10-11", Title: text, Summary: LocalText{}, Category: &text, Author: &text, Body: text, SEOTitle: text, SEODescription: text}
		for _, a := range Baseline.Media {
			if !a.Protected && a.Kind == "image" {
				p.Image = a.URL
				break
			}
		}
		raw, _ := json.Marshal(p)
		live, e := s.PublishNews(ctx, key, actor, 0, raw)
		if e != nil || live.PublishedRevision == nil {
			t.Fatalf("direct publication: %v", e)
		}
		retry, e := s.PublishNews(ctx, key, actor, 0, raw)
		if e != nil || retry.Version != live.Version {
			t.Fatalf("retry: %v", e)
		}
		var count int64
		tx.Raw("SELECT count(*) FROM cms_revisions WHERE document_key=?", key).Scan(&count)
		if count != 1 {
			t.Fatal("retry duplicated revision")
		}
		p.Body.EN = "Updated synthetic EN"
		raw, _ = json.Marshal(p)
		if _, e = s.PublishNews(ctx, key, actor, 0, raw); !errors.Is(e, ErrConflict) {
			t.Fatal("changed retry accepted")
		}
		updated, e := s.PublishNews(ctx, key, actor, live.Version, raw)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = s.PublishNews(ctx, key, actor, live.Version, raw); e != nil {
			t.Fatal("edit retry", e)
		}
		off, e := s.Change(ctx, key, actor, "unpublished", *updated.DraftRevision, updated.Version, nil)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = s.PublishNews(ctx, key, actor, live.Version, raw); !errors.Is(e, ErrConflict) {
			t.Fatal("stale request resurrected article")
		}
		if _, e = s.Change(ctx, key, actor, "rolled_back", *live.PublishedRevision, off.Version, nil); e != nil {
			t.Fatal("restore", e)
		}
		p.Slug = "failed-image"
		p.Image = "cms-media:upload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
		bad, _ := json.Marshal(p)
		badKey := "created.news.33333333-3333-4333-8333-333333333333"
		if _, e = s.PublishNews(ctx, badKey, actor, 0, bad); e == nil {
			t.Fatal("missing media accepted")
		}
		tx.Raw("SELECT count(*) FROM cms_documents WHERE key=?", badKey).Scan(&count)
		if count != 0 {
			t.Fatal("partial draft leaked")
		}
		if _, e = s.PublishNews(ctx, "clinic.about", actor, 1, raw); !errors.Is(e, ErrInvalid) {
			t.Fatal("unrelated document accepted")
		}
		current, _, e := s.Detail(ctx, key)
		if e != nil {
			t.Fatal(e)
		}
		for _, published := range []bool{true, false} {
			if !published {
				current, e = s.Change(ctx, key, actor, "unpublished", *current.DraftRevision, current.Version, nil)
				if e != nil {
					t.Fatal(e)
				}
			}
			before := current
			gone, e := s.ArchiveNews(ctx, key, actor, current.Version, false)
			if e != nil || !gone.Archived || gone.PublishedRevision != nil {
				t.Fatal("archive", e)
			}
			if again, e := s.ArchiveNews(ctx, key, actor, before.Version, false); e != nil || again.Version != gone.Version {
				t.Fatal("archive retry", e)
			}
			normal, e := s.List(ctx)
			if e != nil {
				t.Fatal(e)
			}
			for _, d := range normal {
				if d.Key == key {
					t.Fatal("archived in normal list")
				}
			}
			live, e := s.Published(ctx)
			if e != nil {
				t.Fatal(e)
			}
			for _, d := range live {
				if d.Key == key {
					t.Fatal("archived public")
				}
			}
			deleted, e := s.ArchivedNews(ctx)
			if e != nil || len(deleted) != 1 {
				t.Fatal("archive list", e)
			}
			if _, e = s.Change(ctx, key, actor, "rolled_back", *before.DraftRevision, gone.Version, nil); !errors.Is(e, ErrConflict) {
				t.Fatal("archived rollback allowed")
			}
			if _, e = s.PublishNews(ctx, key, actor, gone.Version, raw); !errors.Is(e, ErrConflict) {
				t.Fatal("archived republished")
			}
			current, e = s.ArchiveNews(ctx, key, actor, gone.Version, true)
			if e != nil || current.Archived || current.PublishedRevision != nil {
				t.Fatal("restore must remain unpublished", e)
			}
			if _, e = s.ArchiveNews(ctx, key, actor, before.Version, false); !errors.Is(e, ErrConflict) {
				t.Fatal("stale delete after restore accepted")
			}
		}
		if _, e = s.ArchiveNews(ctx, "clinic.about", actor, 1, false); !errors.Is(e, ErrInvalid) {
			t.Fatal("unrelated archive accepted")
		}
		if e = tx.Exec("UPDATE user_roles SET role='user' WHERE user_id=?::uuid", actor).Error; e != nil {
			return e
		}
		if _, e = s.PublishNews(ctx, key, actor, updated.Version, raw); e == nil {
			t.Fatal("revoked role accepted")
		}
		if _, e = s.ArchiveNews(ctx, key, actor, current.Version, false); e == nil {
			t.Fatal("revoked archive accepted")
		}
		return rollback
	})
	if !errors.Is(err, rollback) {
		t.Fatal(err)
	}
}

func TestNewsMalformedPayload(t *testing.T) {
	for _, d := range Baseline.Documents {
		if d.Target == "articles" {
			for _, raw := range []string{"null", "true", "[]", "42", "{}", `{"lv":null}`} {
				if e := Validate(d.Key, json.RawMessage(raw)); !errors.Is(e, ErrInvalid) {
					t.Fatalf("accepted invalid root %s", raw)
				}
			}
			return
		}
	}
	t.Fatal("missing imported news baseline")
}

func TestEditorialMetadataValidation(t *testing.T) {
	text := LocalText{"LV", "RU", "EN"}
	p := CreatedContent{Slug: "synthetic-editorial", Date: "2026-10-12", Title: text, Body: text, SEOTitle: text, SEODescription: text}
	raw, _ := json.Marshal(p)
	if validateCreated(raw) != nil {
		t.Fatal("optional introduction rejected")
	}
	p.Author = &text
	p.Category = &text
	raw, _ = json.Marshal(p)
	if validateCreated(raw) != nil {
		t.Fatal("optional metadata rejected")
	}
	p.Author = &LocalText{EN: "<script>bad</script>"}
	raw, _ = json.Marshal(p)
	if validateCreated(raw) == nil {
		t.Fatal("unsafe metadata accepted")
	}
	for _, d := range Baseline.Documents {
		if d.Target != "articles" {
			continue
		}
		var data map[string]map[string]any
		json.Unmarshal(d.Data, &data)
		for _, l := range []string{"lv", "ru", "en"} {
			data[l]["introduction"] = "Synthetic introduction"
			data[l]["author"] = ""
			data[l]["category"] = ""
		}
		raw, _ = json.Marshal(data)
		if Validate(d.Key, raw) != nil {
			t.Fatal("legacy optional metadata rejected")
		}
		data["en"]["author"] = "<script>bad</script>"
		raw, _ = json.Marshal(data)
		if Validate(d.Key, raw) == nil {
			t.Fatal("unsafe legacy author accepted")
		}
		break
	}
}

func TestNewsFieldErrors(t *testing.T) {
	text := LocalText{"LV", "RU", "EN"}
	valid := CreatedContent{Slug: "synthetic-validation", Date: "2026-10-12", Title: text, Body: text, SEOTitle: text, SEODescription: text}
	for _, tc := range []struct {
		field  string
		mutate func(*CreatedContent)
	}{
		{"title.lv", func(p *CreatedContent) { p.Title.LV = "" }},
		{"body.ru", func(p *CreatedContent) { p.Body.RU = "" }},
		{"date", func(p *CreatedContent) { p.Date = "2026-02-30" }},
		{"image", func(p *CreatedContent) { p.Image = "../private" }},
		{"author.en", func(p *CreatedContent) { p.Author = &LocalText{EN: "<script>x</script>"} }},
	} {
		t.Run(tc.field, func(t *testing.T) {
			p := valid
			tc.mutate(&p)
			raw, _ := json.Marshal(p)
			e := validateCreated(raw)
			var field *FieldError
			if !errors.As(e, &field) || field.Field != tc.field || !errors.Is(e, ErrInvalid) {
				t.Fatalf("unexpected field error %v", e)
			}
		})
	}
}
