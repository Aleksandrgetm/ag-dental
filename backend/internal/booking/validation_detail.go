package booking

// ValidationDetail contains only stable codes/field locations, never submitted
// text, patient information or database errors.
type ValidationDetail struct {
	Code   string
	Day    int
	Field  string
	Locale string
}

func (e *ValidationDetail) Error() string { return e.Code }
func (e *ValidationDetail) Unwrap() error { return ErrInvalid }
