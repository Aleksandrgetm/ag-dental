package cms

import (
	"encoding/json"
	"strings"
)

// Imported row offsets remain permanent references. Display order and archive
// state are presentation metadata; rows are never physically moved or deleted.
func validatePrices(original, value any) error {
	old, ok := original.(map[string]any)
	if !ok {
		return ErrInvalid
	}
	next, ok := value.(map[string]any)
	if !ok {
		return ErrInvalid
	}
	for k := range next {
		if k != "title" && k != "concession" && k != "items" {
			return ErrInvalid
		}
	}
	if len(next) != 3 || !same(old["concession"], next["concession"]) || !priceText(next["title"]) {
		return ErrInvalid
	}
	baseline := old["items"].([]any)
	rows, ok := next["items"].([]any)
	if !ok || len(rows) < len(baseline) || len(rows) > 300 {
		return ErrInvalid
	}
	for i, item := range rows {
		row, ok := item.(map[string]any)
		if !ok || !priceText(row["name"]) {
			return ErrInvalid
		}
		amount, ok := row["price"].(string)
		if !ok || !price.MatchString(amount) {
			return ErrInvalid
		}
		for k := range row {
			if k != "name" && k != "price" && k != "review" && k != "display_order" && k != "archived" {
				return ErrInvalid
			}
		}
		if v, ok := row["archived"]; ok {
			if _, ok = v.(bool); !ok {
				return ErrInvalid
			}
		}
		if v, ok := row["display_order"]; ok {
			n, ok := v.(json.Number)
			if !ok {
				return ErrInvalid
			}
			i, e := n.Int64()
			if e != nil || i < -1000000 || i > 1000000 {
				return ErrInvalid
			}
		}
		if i < len(baseline) {
			if !same(baseline[i].(map[string]any)["review"], row["review"]) {
				return ErrInvalid
			}
		} else if _, ok := row["review"]; ok {
			return ErrInvalid
		}
	}
	return nil
}
func priceText(v any) bool {
	values, ok := v.(map[string]any)
	if !ok || len(values) != 3 {
		return false
	}
	for _, lang := range []string{"lv", "ru", "en"} {
		s, ok := values[lang].(string)
		if !ok || strings.TrimSpace(s) == "" || len(s) > 2000 || markup.MatchString(s) {
			return false
		}
	}
	return true
}
