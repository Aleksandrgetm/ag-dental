// Offline validation by default. Import requires explicit, separate operator approval.
package main

import (
	"context"
	"flag"
	"fmt"
	"github.com/Aleksandrgetm/Dental/internal/cms"
	"github.com/Aleksandrgetm/Dental/internal/database"
	"os"
	"time"
)

func main() {
	dry := flag.Bool("dry-run", false, "read-only comparison against the explicitly supplied DATABASE_URL")
	apply := flag.Bool("apply", false, "import after approved migration; never overwrites existing content")
	confirm := flag.Bool("confirm-import", false, "confirm that this database import was explicitly approved")
	flag.Parse()
	for _, d := range cms.Baseline.Documents {
		if cms.Validate(d.Key, d.Data) != nil {
			fmt.Fprintln(os.Stderr, "Embedded content validation failed")
			os.Exit(1)
		}
	}
	if !*dry && !*apply {
		fmt.Printf("Validated %d content groups and %d media assets offline; no database connection\n", len(cms.Baseline.Documents), len(cms.Baseline.Media))
		return
	}
	if *dry && *apply || *apply && !*confirm {
		fmt.Fprintln(os.Stderr, "Choose --dry-run or approved --apply --confirm-import")
		os.Exit(1)
	}
	db, e := database.Connect()
	if e != nil {
		fmt.Fprintln(os.Stderr, "Database unavailable; connection details withheld")
		os.Exit(1)
	}
	raw, _ := db.DB()
	defer raw.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	n, e := (&cms.Store{DB: db}).Import(ctx, *apply)
	if e != nil {
		_, code := cms.SafeError(e)
		fmt.Fprintln(os.Stderr, code)
		os.Exit(1)
	}
	if *apply {
		fmt.Printf("Imported %d missing groups; existing content unchanged\n", n)
	} else {
		fmt.Printf("Dry run: %d groups would be imported; no writes\n", n)
	}
}
