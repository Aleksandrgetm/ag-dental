// Package media owns validation and private Storage transport, not authentication.
// Every caller must authorize through the current Go JWT + database-role boundary.
package media

import (
	"context"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
)

const ImageLimit int64 = 12 << 20
const VideoLimit int64 = 32 << 20

var ErrInvalid = errors.New("invalid_file")
var ErrUnavailable = errors.New("media_unavailable")
var ErrBusy = errors.New("media_busy")
var IDPattern = regexp.MustCompile(`^upload\.[a-f0-9]{32}$`)

func Reference(id string) string { return "cms-media:" + id }
func ReferenceID(value string) string {
	id := strings.TrimPrefix(value, "cms-media:")
	if id != value && IDPattern.MatchString(id) {
		return id
	}
	return ""
}

type Variant struct {
	Name   string `json:"name"`
	MIME   string `json:"mime"`
	Bytes  int64  `json:"bytes"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	SHA    string `json:"sha256"`
}
type Metadata struct {
	Filename string            `json:"filename"`
	Kind     string            `json:"kind"`
	MIME     string            `json:"mime"`
	Bytes    int64             `json:"bytes"`
	Width    int               `json:"width"`
	Height   int               `json:"height"`
	Duration float64           `json:"duration,omitempty"`
	Alt      map[string]string `json:"alt"`
	Variants []Variant         `json:"variants"`
	Prefix   string            `json:"-"`
}
type File struct {
	Variant
	Data []byte
}
type Processed struct {
	Metadata Metadata
	Files    []File
	Hash     string
}
type Processor interface {
	Process(context.Context, string, []byte) (Processed, error)
}
type Storage interface {
	Check(context.Context) error
	Put(context.Context, string, string, []byte) error
	Get(context.Context, string, string) (*http.Response, error)
	Delete(context.Context, []string) error
}

func ReadBounded(r io.Reader, limit int64) ([]byte, error) {
	b, e := io.ReadAll(io.LimitReader(r, limit+1))
	if e != nil || int64(len(b)) > limit {
		return nil, ErrInvalid
	}
	return b, nil
}
