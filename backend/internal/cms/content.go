package cms

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"github.com/Aleksandrgetm/Dental/internal/media"
	"net/mail"
	"net/url"
	"reflect"
	"regexp"
	"strings"
	"time"
)

//go:embed content.json
var content []byte

type Field struct {
	SystemManaged bool     `json:"system_managed"`
	Path          []string `json:"path"`
	Locale        string   `json:"locale"`
	Type          string   `json:"type"`
	Locked        bool     `json:"locked"`
}
type Definition struct {
	SystemManaged bool              `json:"system_managed"`
	Key           string            `json:"key"`
	Group         string            `json:"group"`
	Title         map[string]string `json:"title"`
	Routes        []string          `json:"routes"`
	Target        string            `json:"target"`
	Path          []string          `json:"path"`
	SourceHash    string            `json:"source_hash"`
	Locked        bool              `json:"locked"`
	Fields        []Field           `json:"fields"`
	Data          json.RawMessage   `json:"data"`
}
type Asset struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	SHA       string `json:"sha256"`
	Protected bool   `json:"protected"`
	Filename  string `json:"filename"`
	Kind      string `json:"kind"`
	Bytes     int64  `json:"bytes"
 "github.com/Aleksandrgetm/Dental/internal/media"`
	Usages      []string `json:"usages"`
	UsageGroups []string `json:"usage_groups"`
	Legacy      bool     `json:"legacy"`
}
type Manifest struct {
	Version   int          `json:"version"`
	Documents []Definition `json:"documents"`
	Media     []Asset      `json:"media"`
}

var Baseline Manifest
var definitions map[string]Definition
var ErrInvalid = errors.New("invalid_content")
var ErrConflict = errors.New("content_conflict")
var ErrMissing = errors.New("content_not_imported")
var ErrUnavailable = errors.New("content_unavailable")

func init() {
	if e := json.Unmarshal(content, &Baseline); e != nil {
		panic("Invalid embedded CMS manifest")
	}
	definitions = map[string]Definition{}
	for _, d := range Baseline.Documents {
		if _, ok := definitions[d.Key]; ok {
			panic("Duplicate CMS definition")
		}
		definitions[d.Key] = d
	}
}
func ManifestBytes() []byte                       { return append([]byte(nil), content...) }
func DefinitionFor(key string) (Definition, bool) { d, ok := definitions[key]; return d, ok }
func decode(raw []byte) (any, error) {
	var v any
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	e := d.Decode(&v)
	return v, e
}
func same(a, b any) bool { return reflect.DeepEqual(a, b) }
func at(v any, path []string) any {
	for _, p := range path {
		switch x := v.(type) {
		case map[string]any:
			v = x[p]
		case []any:
			var n int
			for _, c := range p {
				if c < '0' || c > '9' {
					return nil
				}
				n = n*10 + int(c-'0')
			}
			if n >= len(x) {
				return nil
			}
			v = x[n]
		default:
			return nil
		}
	}
	return v
}
func shape(a, b any) bool {
	switch x := a.(type) {
	case map[string]any:
		y, ok := b.(map[string]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for k, v := range x {
			w, ok := y[k]
			if !ok || !shape(v, w) {
				return false
			}
		}
		return true
	case []any:
		y, ok := b.([]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for i, v := range x {
			if !shape(v, y[i]) {
				return false
			}
		}
		return true
	default:
		return reflect.TypeOf(a) == reflect.TypeOf(b)
	}
}

var markup = regexp.MustCompile(`(?i)<\s*/?\s*[a-z][^>]*>|[\x00-\x08\x0b\x0c\x0e-\x1f]`)
var price = regexp.MustCompile(`^[0-9]{1,7}(\.[0-9]{1,2})?(/[0-9]{1,7}(\.[0-9]{1,2})?)*$`)
var phone = regexp.MustCompile(`^(tel:)?\+?[0-9 ()-]{5,30}$`)
var placeholders = regexp.MustCompile(`\{[^{}]*\}`)

func Validate(key string, raw json.RawMessage) error {
	d, ok := definitions[key]
	if !ok || len(raw) > 512*1024 {
		return ErrInvalid
	}
	original, e := decode(d.Data)
	if e != nil {
		return ErrInvalid
	}
	value, e := decode(raw)
	if e != nil || !shape(original, value) {
		return ErrInvalid
	}
	for _, f := range d.Fields {
		a, b := at(original, f.Path), at(value, f.Path)
		if f.Locked || d.Locked || f.SystemManaged || d.SystemManaged {
			if !same(a, b) {
				return ErrInvalid
			}
			continue
		}
		if same(a, b) {
			continue
		}
		s, ok := b.(string)
		if !ok || len(s) > 12000 || strings.TrimSpace(s) == "" || markup.MatchString(s) {
			return ErrInvalid
		}
		if d.Target == "messages" {
			old, _ := a.(string)
			if !reflect.DeepEqual(placeholders.FindAllString(old, -1), placeholders.FindAllString(s, -1)) {
				return ErrInvalid
			}
		}
		switch f.Type {
		case "price":
			if !price.MatchString(s) {
				return ErrInvalid
			}
		case "email":
			m, e := mail.ParseAddress(s)
			if e != nil || m.Address != s {
				return ErrInvalid
			}
		case "phone":
			if !phone.MatchString(s) {
				return ErrInvalid
			}
		case "date":
			if _, e := time.Parse("2006-01-02", s); e != nil {
				return ErrInvalid
			}
		case "url":
			u, e := url.Parse(s)
			if e != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
				return ErrInvalid
			}
		case "media":
			found := media.ReferenceID(s) != ""
			for _, a := range Baseline.Media {
				if a.URL == s && strings.HasPrefix(s, "/media/") && !a.Protected {
					found = true
				}
			}
			if !found {
				return ErrInvalid
			}
		case "image-key":
			legacy := false
			for _, a := range Baseline.Media {
				if a.URL == s && !a.Protected && strings.HasPrefix(s, "/media/") {
					legacy = true
				}
			}
			if !legacy && media.ReferenceID(s) == "" && !strings.Contains("|room|detail|doctor|original|location|", "|"+s+"|") {
				return ErrInvalid
			}
		}
	}
	if key == "clinic.clinic" {
		phoneValue, _ := at(value, []string{"phone"}).(string)
		tel, _ := at(value, []string{"tel"}).(string)
		if tel != "tel:"+strings.NewReplacer(" ", "", "(", "", ")", "", "-", "").Replace(phoneValue) {
			return ErrInvalid
		}
	}
	return nil
}

// System-managed references stay in the technical inventory, outside CMS editing/publication.
func AdminVisible(key string) bool {
	d, ok := definitions[key]
	return ok && !d.SystemManaged
}
