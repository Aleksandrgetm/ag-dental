package cms

// FieldError exposes only a stable field path, never submitted content or SQL.
// It remains ErrInvalid for existing authorization and transaction callers.
type FieldError struct {
	Field string
	Code  string
}

func (e *FieldError) Error() string   { return "invalid content field" }
func (e *FieldError) Unwrap() error   { return ErrInvalid }
func invalidField(field string) error { return &FieldError{Field: field} }
