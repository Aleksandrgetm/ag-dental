# CMS validation and exact change report

9 October 2026. Branch `feature/admin-cms`; HEAD remains `3a07279970f3bf24745baa40998d41e7ac6656ae`. Changes are uncommitted. No push or merge. This report concerns code and disposable local tests; **production CMS migration/import/Storage deployment has not occurred**.

## Executed checks

| Check | Result |
| --- | --- |
| `npm run build` in frontend | PASS, TypeScript + production Vite build. Demo disabled; synthetic frontend-safe Auth configuration used for browser tests. |
| `node --test frontend/tests/*.test.mjs` | PASS: 74 tests, zero failures/skips. |
| `node frontend/scripts/export-cms-content.mjs --check` | PASS: reproducible baseline, 194 groups / 2,198 values / 26 route entries / 12 assets. |
| `node frontend/scripts/check-hero-lock.mjs` | PASS: all original 15 protected hashes. Manifest and check script unchanged. |
| `git diff --check` | PASS. |
| `go test ./... -count=1` with all four explicitly disposable test database configurations | PASS: migration runner, Auth, Booking, CMS and server packages; no database integration suite skipped. |
| Final `go test ./internal/cms -count=1` with the CMS test database | PASS after final label-validation refinement. |
| `go run ./cmd/cms` | PASS: 194 groups / 12 assets validated offline; no database connection. |
| `go run ./cmd/cms --dry-run` against disposable local CMS database | PASS: zero groups to add after import and edits; no writes. |
| `CMS_POST_IMPORT_VERIFY.sql` against disposable local CMS database | PASS in read-only transaction: 194 documents, no incomplete/invalid revision pointers; 12 media; five RLS-enabled tables with no anon/authenticated grants; zero booking links, services, doctors or appointments; automatic confirmation unchanged. |
| `cms-browser.cjs` | PASS: 60 checks, LV/RU/EN, 390/1440 widths; private drafts, save/publish/public updates, rollback preview, stale refresh preservation, conflict retention, role revocation, unchanged baseline text, SEO, canonical price/hours updates, homepage picker, locked Hero, native form validation and cancelled unsaved-change warning. |
| `admin-browser.cjs --all` | PASS: 299 navigation, layout, dashboard and access checks; no browser errors. |
| `booking-browser.cjs` | PASS: 172 layout checks and 31 flows, mocked real-API mode; no browser errors. |
| `auth-browser.cjs` | PASS: 96 layouts plus registration/login/persistence/logout/recovery/confirmation flows; no browser errors. |
| `contact-browser.cjs` | PASS: 24 responsive/locale layouts and 24 validation/no-delivery flows; no writes/external requests. |
| `public-routes-browser.cjs` | PASS: 20 marketing/article/service/legal routes × three languages × two widths = 120 checks. |
| `missing-api-browser.cjs` | PASS: separate production build without API URL, 132 public checks + six unavailable/Auth checks; zero unexpected requests or browser errors. |

Browser tests use local production previews, intercepted APIs and synthetic Auth. They do not make Supabase writes and do not establish live production readiness. The missing-API suite independently builds without local `.env` files. Existing browser suites were updated only to allow the new read-only published-content endpoint and recognize real CMS sections instead of former placeholders.

Desktop and mobile settings screenshots were inspected visually. The tested editor and media layouts retain the established typography, spacing, colors and navigation. The public component changes are data bindings; public layout/style blocks and the Hero/Welcome implementation are unchanged. Header changes are limited to reading phone/opening hours from CMS-backed content, with its approved design and behavior preserved. Service-detail price labels now reuse the existing translations; amounts/order remain unchanged.

The build emits a **non-fatal bundle-size warning**: main and lazy admin editor chunks exceed 500 kB before compression. No warning threshold was raised to hide it. Further chunk optimization is a separate performance improvement, not a failed build.

## Database test isolation and coverage

A dedicated local PostgreSQL 17 container exposed only loopback port 55439. Separate disposable `_test` databases were used for CMS, migration-runner and Booking/Auth tests. Test variables explicitly selected these databases; tests did not read the production `DATABASE_URL` or `.env`. CMS/migration tests refuse non-loopback targets. The existing Auth/Booking opt-in disposable guards remain intact. Temporary test schemas, Auth stubs and fixture rows existed only in this local container.

The CMS suite verifies exact semantic parity against every embedded source document (JSONB key order is irrelevant), repeat import without overwriting edited content, conflicting baseline detection, safe DTOs, protected content/shape/HTML/URL/contact validation, optimistic concurrency (one success + one conflict), draft non-disclosure, publish/rollback, cross-document revision rejection, retention of active pointers beyond the recent-history limit, explicit Booking mapping reads, RLS/grants, conditional ETags and refusal of destructive rollback once populated.

The existing Booking database suite also passed with 004 installed: real PostgreSQL exclusion conflicts, concurrent requests, idempotency, status transitions, schedules/time off, outbox atomicity, authorization and `GET /api/health`. Its test-only truncate list now includes the new CMS FK table when present, without broad CASCADE or weaker test-target checks. The existing Auth test confirms client metadata cannot grant admin and browser roles have no role-table privileges.

After lifecycle tests, the local CMS database had 228 revisions and 230 events, reflecting deliberate test edits; this is expected, not duplicate import. There were no invalid pointers or unexpected operational records. The importer’s second comparison reported zero groups to add.

## Review hashes

```text
004_website_cms.sql       69fde95d6673851a70f073a13eea8173b14e18e94c3139a2ec613fb939e04b51
004_website_cms.down.sql  9087c67dacb57dd3934318a9426e2c652868b2f92082b11e3f7c04fddab045a8
cms/content.json         dab50aad36f18caa62583d2309a8b441f0c999af01ed9eb97bfb2ed726b228fd
```

Recompute immediately before any approved deployment. Source SQL migrations 001–003, production `.env`/TLS files, Supabase data, public styles, Hero/Welcome, Booking wizard and Auth flow implementations were not changed. The CMS-aware admin gate change preserves authorization while retaining hidden unsaved editor state during same-session verification.

## Exact files added or modified

54 files. Generated artifacts are included; ignored build output and temporary local logs/screenshots/databases are not repository changes.

- `backend/cmd/cms/main.go`
- `backend/cmd/migrate/main.go`
- `backend/cmd/migrate/main_test.go`
- `backend/internal/booking/integration_test.go`
- `backend/internal/cms/content.go`
- `backend/internal/cms/content.json`
- `backend/internal/cms/content_test.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/integration_test.go`
- `backend/internal/cms/store.go`
- `backend/internal/server/cms_test.go`
- `backend/internal/server/router.go`
- `backend/migrations/004_website_cms.down.sql`
- `backend/migrations/004_website_cms.sql`
- `docs/ADMIN_CMS_MEDIA_ARCHITECTURE.md`
- `docs/CMS_CONTENT_INVENTORY.json`
- `docs/CMS_INTEGRATION.md`
- `docs/CMS_POST_IMPORT_VERIFY.sql`
- `docs/CMS_VALIDATION.md`
- `frontend/scripts/export-cms-content.mjs`
- `frontend/src/App.vue`
- `frontend/src/components/ContactBand.vue`
- `frontend/src/components/ContactQuestionForm.vue`
- `frontend/src/components/VisitQuestions.vue`
- `frontend/src/components/common/CmsMetadata.vue`
- `frontend/src/components/home/ClinicGallery.vue`
- `frontend/src/components/home/PatientJourney.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/components/layout/SiteFooter.vue`
- `frontend/src/components/layout/SiteHeader.vue`
- `frontend/src/i18n/cms.ts`
- `frontend/src/main.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/services/cms/bindings.json`
- `frontend/src/services/cms/content.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/ContactView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/NotFoundView.vue`
- `frontend/src/views/PricesView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/src/views/admin/AdminCmsView.vue`
- `frontend/src/views/admin/AdminGate.vue`
- `frontend/tests/admin-browser.cjs`
- `frontend/tests/auth-browser.cjs`
- `frontend/tests/booking-browser.cjs`
- `frontend/tests/cms-browser.cjs`
- `frontend/tests/cms.test.mjs`
- `frontend/tests/contact-browser.cjs`
- `frontend/tests/public-routes-browser.cjs`

## Handoff and remaining scope

See `CMS_INTEGRATION.md` for the data model, admin mapping, endpoint contracts, fallback behavior, import commands and rollback restrictions. `CMS_CONTENT_INVENTORY.json` contains the full values and provenance; `CMS_POST_IMPORT_VERIFY.sql` is the reviewed read-only verification script.

Production activation requires separate approval for **migration 004 and the 194-group / 12-asset-registry import** after a fresh target/ledger/schema/TLS/recovery review. Existing earlier approval for booking migrations is not reused. The Go API must be hosted and reachable for the live admin to verify roles and save changes.

This foundation edits existing approved structures. Hero/Welcome and transaction-sensitive configuration remain protected; missing translations and unconfirmed legal details remain visible for review. New routes/record structures, uploaded media processing, Storage rollout and operational Booking configuration need their separately reviewed extensions. No fake upload or fake publish success is shown. No production upload, seed, migration or import was performed.
