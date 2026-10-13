package database

import "testing"

func TestRemoteDatabaseRequiresVerifiedTLS(t *testing.T) {
	for _, mode := range []string{"disable", "allow", "prefer", "require", "verify-ca"} {
		if validateTLS("host=database.example.invalid user=synthetic dbname=synthetic sslmode="+mode) == nil {
			t.Fatal("accepted", mode)
		}
	}
	if e := validateTLS("host=database.example.invalid user=synthetic dbname=synthetic sslmode=verify-full"); e != nil {
		t.Fatal(e)
	}
	if e := validateTLS("host=127.0.0.1 user=synthetic dbname=synthetic sslmode=disable"); e != nil {
		t.Fatal(e)
	}
}
