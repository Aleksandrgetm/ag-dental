# AG Zobārstniecība

Existing LV/RU/EN clinic website, Supabase Auth, Go Booking API, structured CMS and
private Media Library. Vue 3 / TypeScript / Vite / Vuetify / Pinia / vue-i18n;
Go / Gin / GORM / PostgreSQL. Approved public design and 15 Hero locks are preserved.

## Start locally

Use Node compatible with the lockfile/Vite version and Go 1.27.2. Copy secret-free
.env.example templates only to ignored local files; provide your own authorized
local configuration. Never copy production credentials into tests.

```sh
cd frontend
npm ci
npm run dev
```

Blank VITE_API_URL is supported: public pages render; API features are unavailable.
A real local backend requires a disposable database, explicit Auth configuration
and applied local schema. From backend: `go run ./cmd/api`. Do not point local write
tests at production. Environment/build details: [deployment guide](docs/DEPLOYMENT_GUIDE.md).

## Verify

```sh
cd frontend
npm run build
cd ..
(cd frontend && node --test tests/*.test.mjs)
node frontend/scripts/check-hero-lock.mjs
node frontend/scripts/export-cms-content.mjs --check
cd backend
go test ./...
cd ..
bash backend/scripts/test-media-local.sh
```

The final command creates and removes only its own disposable Docker PostgreSQL
cluster, including operational schema and ledger-aware migration tests. Ordinary Go tests skip opt-in DB tests
without explicit disposable configuration. Browser suite setup and actual totals
are documented in [test report](docs/TEST_REPORT.md).

## Operational boundaries

- Backend checks verified Supabase identity and authoritative admin role; browser
  role state is not authority. Private mutations never use public Supabase tables.
- Editorial prices and operational eligibility are separate, explicitly linked.
  No invented clinic catalogs or schedules are seeded.
- Hero is system-managed, immutable and excluded from CMS editing/media picking.
- Migrations 001–008 were activated in earlier approved tasks; see the activation
  reports. This acceptance run made no production connections or changes. Do not
  replay migrations based on this README; inspect the authorized target ledger.
- Local administrator image uploads were explicitly enabled in a prior task; hosted uploads require separate environment verification and approval.
- Contact questions honestly report unavailable until privacy/inbox work is approved.
- Email/Resend: **DEFERRED — OWNER DECISION / NOT IMPLEMENTED**.

## Handover

[Status](docs/FINAL_IMPLEMENTATION_STATUS.md) · [Handover](docs/HANDOVER.md) ·
[Admin guide](docs/ADMIN_USER_GUIDE.md) · [Maintenance](docs/MAINTENANCE_GUIDE.md) ·
[Known limitations](docs/KNOWN_LIMITATIONS.md) · [SEO migration](docs/SEO_MIGRATION_PLAN.md)

No automatic deployment, migration, publication, commit, merge, push or DNS change.

## Real isolated acceptance

[Final E2E report](docs/FINAL_E2E_ACCEPTANCE.md) distinguishes real local Auth,
PostgreSQL, Go/Vue and Storage from mocked regressions and unverified hosted gates.
`python3 backend/scripts/acceptance-local.py` creates only disposable local services
and synthetic records (Docker, Chrome/Playwright, ffmpeg and Go required). It does
not read project `.env` files. Local upload enablement never enables production.

## Final technical review — 14 October 2026

The current audit is on `feature/final-audit`, based on `bcefafd`. See [FINAL_TECHNICAL_AUDIT.md](docs/FINAL_TECHNICAL_AUDIT.md) for current results and gates; older reports are dated evidence, not current production assertions. The clinic admin has four sections: Appointments, Specialists, Services & Prices, News. Public Booking and legal/media approvals remain gated. The employer owns hosting, domain configuration and deployment.
