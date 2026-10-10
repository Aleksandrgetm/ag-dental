package media

import (
	_ "embed"
	"encoding/json"
)

//go:embed registered_dimensions.json
var dimensions []byte

func RegisteredDimensions() map[string]struct {
	Width  int `json:"width"`
	Height int `json:"height"`
} {
	var v map[string]struct {
		Width  int `json:"width"`
		Height int `json:"height"`
	}
	json.Unmarshal(dimensions, &v)
	return v
}
