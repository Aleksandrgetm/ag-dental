package booking

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
var keyPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
var phonePattern = regexp.MustCompile(`^\+?[0-9 ()-]{7,30}$`)

func ValidID(s string) bool { return uuidPattern.MatchString(s) }
func cleanText(s string, min, max int) bool {
	n := utf8.RuneCountInString(s)
	if !utf8.ValidString(s) || n < min || n > max {
		return false
	}
	for _, r := range s {
		if unicode.IsControl(r) {
			return false
		}
	}
	return true
}
func normalize(r *CreateRequest) {
	r.ServiceID = strings.ToLower(r.ServiceID)
	r.DoctorID = strings.ToLower(r.DoctorID)
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	r.Phone = strings.TrimSpace(r.Phone)
	r.Email = strings.TrimSpace(r.Email)
	r.StartsAt = r.StartsAt.UTC()
}
func validate(r CreateRequest, key, user string) error {
	if !keyPattern.MatchString(key) || !ValidID(r.ServiceID) || (r.DoctorID != "" && !ValidID(r.DoctorID)) || (user != "" && !ValidID(user)) {
		return ErrInvalid
	}
	if !cleanText(r.FirstName, 1, 100) || !cleanText(r.LastName, 1, 100) || !phonePattern.MatchString(r.Phone) || !cleanText(r.Email, 3, 254) {
		return ErrInvalid
	}
	digits := 0
	for _, v := range r.Phone {
		if v >= '0' && v <= '9' {
			digits++
		}
	}
	if digits < 7 || digits > 15 {
		return ErrInvalid
	}
	email, err := mail.ParseAddress(r.Email)
	if err != nil || email.Address != r.Email || !strings.Contains(r.Email, "@") {
		return ErrInvalid
	}
	if r.StartsAt.IsZero() || r.StartsAt.Second() != 0 || r.StartsAt.Nanosecond() != 0 || !r.PrivacyAcknowledged || !cleanText(r.PrivacyNoticeVersion, 1, 100) {
		return ErrInvalid
	}
	return nil
}
func fingerprint(r CreateRequest, user, actor string) string {
	b, _ := json.Marshal(struct {
		Request     CreateRequest
		User, Actor string
	}{r, user, actor})
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
func newID() (string, error) {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		return "", e
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:]), nil
}
func newReference() (string, error) {
	var b [10]byte
	_, e := rand.Read(b[:])
	return "AG-" + strings.ToUpper(hex.EncodeToString(b[:])), e
}
