# Final validation report

2026-10-10, feature/final-development; uncommitted cumulative work from baseline
6300bc1a6c040970d4393264f3612ce96b277537. No production DB/Auth/Storage or deployed
site tests were performed. Final browser regression is complete; all suites pass after the two test-contract updates documented below.

## Build, source and actual isolated database

| Check | Result | Scope |
|---|---|---|
| Frontend production build | PASS | Vite 8.3.1 / Node 26.5.0; two >500KB chunk warnings retained |
| Frontend Node unit/HTTP tests | PASS: 93, zero failures/skips | Includes local renderer/legacy routing contracts, no Vercel edge |
| Go test ./... | PASS | Go 1.27.2; opt-in integration tests skip without explicit disposable env |
| Full disposable integration script | PASS | Actual PostgreSQL 17.11, Docker tmpfs, loopback, separate test DBs |
| Go vet ./... | PASS | Backend static checks |
| govulncheck ./... | PASS reachable/imported | Zero reachable/imported advisories; one unused openpgp module advisory |
| npm audit | PASS | Zero advisories |
| Hero lock | PASS: 15/15 | Approved CSS/copy/fonts/video/poster hashes preserved |
| CMS manifest parity | PASS | 194 groups, 2,198 fields, 26 routes, 12 media records |
| Local container | PASS | Built; non-root UID10001, media tools, CA roots, no .env; network disabled for inspection |
| Whitespace / changed-file secret scan | PASS at checkpoint | Repeated at final closure; file names only, no credentials printed |

Disposable suite: backend/scripts/test-media-local.sh created a unique PostgreSQL
cluster and destroyed only that cluster. Auth, Booking, CMS, Media, migration runner
and operational integration packages passed. Proposed 006 applied only to the local
operations test database. Tested collisions/concurrency, idempotency, roles/revocation,
RLS/grants, schedules/DST, impact rollback, price linkage, profiles/media references,
CMS drafts/publish/unpublish/history and bounded catalog queries/revisions.
No integration success is inferred from the ordinary no-env Go invocation.

## Browser evidence

Chrome headless through Playwright; localhost Vite at 127.0.0.1:5185 with synthetic
Supabase identities and intercepted API contracts. External writes blocked. These
are UI/contract tests, not proof of real hosted Storage or production connectivity.
The missing-API suite builds a separate production artifact with envDir disabled,
VITE_BOOKING_DEMO=false and no VITE_API_URL, then starts its own localhost preview.

Earlier checkpoint passes: Auth96 layouts/flows, Booking172 layouts+31flows,
Contact24layouts+24flows, CMS214, Media45, navigation135, new editor suites24each,
public480, SEO120. Final rerun totals supersede these when recorded below.

Final rerun: **PASS**.

| Browser suite | Final result |
|---|---|
| Auth | 96 layouts plus register/login/persistence/logout/recovery/confirmation flows |
| Admin, --all | 299 checks, zero errors |
| CMS | 214 checks, zero real Supabase requests |
| Persistent CMS navigation | 135 checks, zero production requests |
| Media | 45 checks, zero production requests |
| Booking | 172 layouts, 31 flows, zero errors |
| Contact | 24 layouts, 24 validation/no-delivery flows |
| Public routes | 480 checks: 20 routes x 3 locales x 8 widths |
| Appointments | 24 locale/viewport scenarios |
| Created content | 24 create/preview/publish/unpublish/restore scenarios |
| Doctors | 24 profile/portrait scenarios |
| Schedules | 24 schedule/impact/availability scenarios |
| Operational services | 24 create/conflict/unavailable scenarios |
| Price rows | 24 edit/add/order/archive scenarios |
| SEO | 120 rendered route/locale/viewport checks |
| Production missing API | 132 public checks, 6 unavailable/Auth checks; no unexpected requests |

The first aggregate run returned nonzero for two stale assertions: the admin suite
expected the replaced placeholder heading in Russian; the contact suite required
an empty query even after intentional locale switching. Updated tests now assert
the real localized appointment heading and permit only an optional matching lang
parameter (no patient data). Individual complete reruns passed: admin299/contact24+24.
The initial aggregate failure is not hidden or represented as a passing invocation.
All other aggregate suites passed. Full logs are local under /tmp/ag-final-browser-results;
FINAL_TEST_RESULTS.json preserves the concise result and correction record.

Final production build and all 93 unit/HTTP tests passed again after these changes.
Hero15, manifest194/2198/26/12 and whitespace checks were repeated successfully.

Reproduce individually from repository root (install Playwright/Chrome in a local
test environment; this project used the bundled Playwright module):

```sh
TEST_BASE_URL=http://127.0.0.1:5185 node frontend/tests/booking-browser.cjs
TEST_BASE_URL=http://127.0.0.1:5185 node frontend/tests/admin-browser.cjs --all
node frontend/tests/missing-api-browser.cjs
```

Set PLAYWRIGHT_MODULE to an installed Playwright module path if not locally installed.
Never target a production origin with synthetic-write suites. The local Vite process
uses VITE_API_URL=/api and synthetic Auth settings; requests are intercepted, not
forwarded to Supabase. See each suite for fixtures and coverage.

## Not verified / excluded

Production schema/data, migration006 activation, actual API hosting/TLS/CORS,
Vercel packaged function/edge HTTP behavior, real uploads, Google Search Console,
field CWV, live clinic usability and owner clinical/privacy sign-off remain gated.
Legacy discovery: 12 accessible endpoints observed, eight exact redirects prepared;
no claim of complete historical coverage without Search Console exports.
Email/Resend delivery: DEFERRED — NOT IMPLEMENTED, not counted as passed.

## Final acceptance rerun — 2026-10-11 (supersedes older counts above)

See [FINAL_E2E_ACCEPTANCE.md](FINAL_E2E_ACCEPTANCE.md) and
[FINAL_E2E_TEST_RESULTS.json](FINAL_E2E_TEST_RESULTS.json).

- Production build PASS; 108 unit/HTTP tests PASS after the thumbnail mapping fix.
- `bash backend/scripts/test-media-local.sh`: all Go packages PASS against fresh
  disposable PostgreSQL 17.11; includes migrations, Auth, Booking, CMS, Media,
  operational schedules and authorization. `go vet ./...` PASS.
- Real official local Supabase Auth and Storage + Go/Vue + PostgreSQL acceptance
  PASS. Guest booking persisted; manual appointment, lifecycle, concurrency,
  specialist setup/edit/absence/activation and news upload/replacement/publication
  all persisted. No API mocking in this suite. Local Storage archive/purge verified.
- Mocked browser: Booking172 layouts/31 flows; Auth96; appointments24;
  specialist editor24; existing linking6; absences6; portrait media3;
  simple workflows24; authorization12; created content24; public routes480;
  SEO120; contact24 layouts/24 validation flows. All PASS.
- Real-service public review48 route/locale/viewport cases PASS.
- Hero15, manifest194/2198/26/12, whitespace and frontend privileged-key pattern
  scan PASS. Existing unchanged font license whitespace exemptions retained.
- Fresh legacy read-only crawl12 endpoints; eight real local HTTP301 mappings PASS.

The browser portrait fix uses the existing validated `cms-media:` parser to resolve
saved uploads in AdminMediaPreview; real E2E asserts the loaded thumbnail before
replacement. No public design or protected Hero/Welcome changes were made.

Hosted staging/production, field CWV, actual Vercel edge packaging, clinical/legal
and nontechnical staff acceptance are NOT TESTED in this task. Earlier production
006 activation evidence is historical, not a fresh audit. Email remains excluded.

No-API production-build regression also PASS:132 public checks,6 unavailable/Auth
checks; zero unexpected requests or JavaScript errors. All task-owned services and
private temporary acceptance credentials were removed after testing.

## Final Git review rerun — 2026-10-11

See FINAL_GIT_REVIEW.md for the fresh pre-commit regression record and exact scope.
The added deployment-guard test brings the unit/HTTP total to109. The News browser
regression now explicitly requires the chosen registered image to be present and
loaded on the public article. No rendering fix was needed: the shared loader already
maps approved registered images. Production remains untouched.
