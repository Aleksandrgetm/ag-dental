package cms

import (
	"encoding/json"
	"testing"
)

func TestPriceRowsRetainReferencesAndValidate(t *testing.T) {
	d, _ := DefinitionFor("prices.0")
	original, _ := decode(d.Data)
	clone := func() map[string]any { v, _ := decode(d.Data); return v.(map[string]any) }
	v := clone()
	rows := v["items"].([]any)
	rows[0].(map[string]any)["display_order"] = json.Number("10")
	rows[0].(map[string]any)["archived"] = true
	v["items"] = append(rows, map[string]any{"name": map[string]any{"lv": "Synthetic LV", "ru": "Synthetic RU", "en": "Synthetic EN"}, "price": "12.00"})
	if e := validatePrices(original, v); e != nil {
		t.Fatal(e)
	}
	for _, modify := range []func(map[string]any){
		func(v map[string]any) { v["items"] = v["items"].([]any)[:1] },
		func(v map[string]any) { v["concession"] = true },
		func(v map[string]any) { v["items"].([]any)[0].(map[string]any)["price"] = "<script>bad</script>" },
		func(v map[string]any) { v["items"].([]any)[0].(map[string]any)["name"].(map[string]any)["ru"] = "" },
		func(v map[string]any) { v["items"].([]any)[0].(map[string]any)["review"] = true },
		func(v map[string]any) { v["items"].([]any)[0].(map[string]any)["display_order"] = json.Number("1.5") },
	} {
		v := clone()
		modify(v)
		if validatePrices(original, v) == nil {
			t.Fatal("invalid price payload accepted")
		}
	}
}
