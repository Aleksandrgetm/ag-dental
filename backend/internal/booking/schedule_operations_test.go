package booking_test

import (
	"github.com/Aleksandrgetm/Dental/internal/booking"
	"testing"
)

func TestRigaWallClockTransitions(t *testing.T) {
	for _, value := range []string{"2026-03-29T03:30", "2026-10-25T03:30", "2026-02-30T09:00", "2026-10-12T09:00Z", "invalid"} {
		if _, e := booking.RigaLocal(value); e == nil {
			t.Fatalf("accepted invalid/ambiguous clock %s", value)
		}
	}
	for value, want := range map[string]string{"2026-07-01T09:00": "2026-07-01T06:00:00Z", "2026-12-01T09:00": "2026-12-01T07:00:00Z", "2026-03-29T00:00": "2026-03-28T22:00:00Z", "2026-03-30T00:00": "2026-03-29T21:00:00Z"} {
		got, e := booking.RigaLocal(value)
		if e != nil || got.Format("2006-01-02T15:04:05Z") != want {
			t.Fatalf("%s: %v %v", value, got, e)
		}
	}
}
