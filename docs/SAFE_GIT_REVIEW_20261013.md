# Safe Git review — 2026-10-13

Repository: AG Dental. Branch: `feature/final-development`. PR: https://github.com/Aleksandrgetm/ag-dental/pull/7, Draft, targeting `dev`.

## Scope and baseline

Starting local HEAD and fetched remote head were both `e402516c78883af8400a77ca4d29d123e24a09a0`. All proposed changes belong to this repository. Existing work was retained: no reset, restore, rebase, amend or history rewrite. No production database connection, migration, configuration update, upload, deployment or application restart was performed by this Git review. All mutation tests used synthetic data and disposable local services.

Reviewed application changes cover News atomic publication, reversible archival and validation; admin authorization/session stability; shared editorial article rendering; inline image validation; unified Services & Prices and approved SEO precedence; calendar-month horizon and dated schedules; explicit migration-runner operations 007/008; localized feedback; tests and historical operation reports. No Hero or Welcome Intro source or asset changed. All 15 Hero locks pass.

The review found no blocking application defect. Eleven historical reports now have dated supersession notices, retaining their original evidence while pointing to subsequent activation/fix results. Current application source was otherwise preserved. Conventional commits group session stability, CMS/catalog/media integration, Booking/migrations, and regression evidence/documentation. Shared CMS and public-delivery changes are grouped together because News and catalog use the same store, router and content adapters.

## Recorded production state — not re-queried by this Git task

Use the dated activation evidence, not older preflight instructions:

- [Migration 007 applied](NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md), preserving News and reversible archive history.
- [Migration 008 applied](BOOKING_008_PRODUCTION_ACTIVATION.md); exact source checksum still matches its runner pin. The capability default is zero; this did not activate new Booking rules.
- [Catalog initialized](SERVICES_PRICES_PRODUCTION_ACTIVATION.md): 8 public services, 6 categories, 69 prices. All 24 existing service/language metadata records preserved. The six reviewed implementation/SEO hashes still match the approved preflight.
- [Storage smoke test passed](INLINE_MEDIA_SMOKE_TEST.md); one deleted test-media tombstone and audit records intentionally remain. [Uploads enabled only for the local backend](ADMIN_IMAGE_UPLOADS_LOCAL_ACTIVATION.md) under earlier authorization. No upload flag changed or production file uploaded in this review.
- [Latest Booking preparation](REAL_BOOKING_DATA_ACTIVATION.md): public Booking remains unactivated; no operational services or appointments at that last inspection. Anda's Monday 12:00–17:00 entry is owner-confirmed test data. Remove it from active availability only during separately approved activation after a fresh appointment-dependency check. Wednesday/Friday hours remain unconfirmed. DEMO configuration is unchanged.

These are historical verified snapshots, not a claim that a Git push revalidates live database contents. Migration files remain in their reviewed `proposed/` locations intentionally: their bytes are checksum-pinned and production application is recorded in the ledger. Do not replay migrations or catalog initialization.

## Security review

- Reviewed tracked/proposed source, tests, reports and changed screenshot evidence. Credential-pattern scan covered 473 files before this report was added, followed by an index scan before commits.
- No matches for Supabase backend secrets, long JWT values, private key headers, GitHub tokens, AWS access keys or password-bearing PostgreSQL URLs. Exact private local configuration values were also compared without printing them; no matches.
- No `.env`, TLS/private connection files, database dumps, backup archives or private keys proposed for Git. Existing `.env` and `backend/.tls` remain ignored. Encrypted backups remain outside the repository.
- Included screenshots and machine-readable E2E receipts contain synthetic test identities/records, not real patient data. Registered public clinic images are existing approved assets. Logs, private operational evidence and other ignored screenshot folders are excluded; historical report links into those folders remain local evidence references.
- News diagnostic logging is opt-in and development-only, logs only stage names and boolean/numeric flags, and blocks archive requests in read-only trace mode. No authorization bypass or production diagnostic activation.
- JWT/database-admin checks, version conflicts, historical media references, private Storage access, RLS denials and Booking collision protection passed isolated tests.

## Push/deployment boundary

The existing tracked `frontend/vercel.json` disables Git-triggered deployment for `feature/final-development`. It was already present at the starting HEAD and is unchanged. No GitHub Actions workflow files were found; GitHub reported no check runs for the starting HEAD and no deployments for this branch. Only this feature branch is authorized for push. PR remains Draft; no merge/deploy command is part of this task. Account-wide external automation is not claimed to have been audited beyond available repository/GitHub evidence.

## Fresh verification

- Frontend production build: PASS; existing large-chunk advisory remains.
- Full frontend unit/HTTP suite: 146 passed, zero failures/skips. Includes 24 exact legacy metadata comparisons, CMS overrides/new-service SEO, redirects, sitemap and unavailable routes.
- Go tests with fresh disposable PostgreSQL: all packages passed, integration enabled (`sh scripts/test-media-local.sh`). Go vet passed.
- Migration 007/008 runner tests: explicit operation, pinned checksum, exact baseline, conflict/gap rejection, repeat/no-op, rollback after injected ledger failure and RLS rejection passed. Migrations 001–006 remain unchanged.
- Standalone populated 008 migration preservation/rollback test passed.
- Full real local Auth/PostgreSQL/Storage/Go/Vue acceptance passed: Booking lifecycle/collision, specialist setup/portrait replacement, News publication/archive/restore, private Storage safeguards and 48 public route/locale/viewport cases.
- Dedicated real News and catalog workflows passed; catalog covered six LV/RU/EN desktop/mobile workflows.
- Real Booking staging passed twice: appointment-start rule and isolated working-day-start review overlay. Both covered the English mutation lifecycle and six localized responsive selection/review/monthly schedule workflows. No delivery notifications; no production policy selector added.

Additional browser regressions passed: admin session stability (desktop/mobile and accelerated 30-minute session), 48 editorial article cases, six publication-validation cases, 12 deletion cases, read-only deletion tracing, 24 News admin cases, six archive cases, six specialist-media cases, 12 authorization denials, nine simplified-admin locale/viewport cases, 96 Auth checks, 172 Booking layout checks plus 31 flows, 480 public-route checks and 120 SEO checks. All 15 Hero locks passed. No assertion was weakened. These fixture-based browser checks complement the real isolated browser/API/database/Storage runs above.

## Limitations

Chromium desktop/mobile emulation is not Safari/Firefox or a hosted deployment test. Existing obsolete browser suites targeting retired CMS/admin pages were not represented as current acceptance; current route-specific and real-service workflows were used. The first fixture-browser launch used a synthetic key without the required publishable prefix and correctly failed closed; only the test launch environment was corrected, with no application/test assertion weakened.

The main bundle warning remains. Hosted Go/API/HTTPS/CORS/Storage operations, Search Console coverage and real hosted SEO behavior still require separately approved verification/deployment. Real Booking needs approved exact hours, service RU/EN labels, advance-rule interpretation, privacy/retention and manual communication process, fresh recovery evidence and explicit guarded activation. Resend/WhatsApp/email delivery is not implemented. Database backups do not include external Storage object bytes. This review does not authorize a production article deletion, publication, upload or Booking activation.

## Reviewed file inventory

### Admin session stability

- `frontend/src/services/admin/access.ts`
- `frontend/src/services/admin/newsTrace.ts`
- `frontend/src/stores/auth.ts`
- `frontend/src/views/admin/AdminGate.vue`
- `frontend/tests/admin-access.test.mjs`
- `frontend/tests/admin-refresh-browser.cjs`
- `frontend/vite.config.ts`

### News, Media and Services & Prices

- `backend/cmd/cms/main.go`
- `backend/internal/booking/editorial.go`
- `backend/internal/cms/catalog.go`
- `backend/internal/cms/catalog_test.go`
- `backend/internal/cms/content.go`
- `backend/internal/cms/content_test.go`
- `backend/internal/cms/created.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/integration_test.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/news.go`
- `backend/internal/cms/news_archive.go`
- `backend/internal/cms/news_test.go`
- `backend/internal/cms/store.go`
- `backend/internal/cms/validation.go`
- `frontend/api/render.ts`
- `frontend/src/components/PriceList.vue`
- `frontend/src/components/admin/MediaLibrary.vue`
- `frontend/src/components/common/CmsMetadata.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/i18n/catalog.ts`
- `frontend/src/i18n/newsAdmin.ts`
- `frontend/src/main.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/services/admin/navigation.ts`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/services/cms/article.ts`
- `frontend/src/services/cms/content.ts`
- `frontend/src/services/cms/created.ts`
- `frontend/src/services/cms/mediaModel.ts`
- `frontend/src/services/cms/newsValidation.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/services/cms/serviceCatalog.ts`
- `frontend/src/services/seo.ts`
- `frontend/src/views/ArticleRouteView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/src/views/admin/AdminCatalogView.vue`
- `frontend/src/views/admin/AdminNewsView.vue`

### Booking rules and migration runner

- `backend/cmd/migrate/booking_horizon.go`
- `backend/cmd/migrate/booking_horizon_test.go`
- `backend/cmd/migrate/main.go`
- `backend/cmd/migrate/news_archive.go`
- `backend/cmd/migrate/news_archive_test.go`
- `backend/cmd/migrate/operations.go`
- `backend/internal/booking/admin.go`
- `backend/internal/booking/availability.go`
- `backend/internal/booking/doctor_setup.go`
- `backend/internal/booking/models.go`
- `backend/internal/booking/real_rules_test.go`
- `backend/migrations/proposed/007_news_archive.down.sql`
- `backend/migrations/proposed/007_news_archive.sql`
- `backend/migrations/proposed/008_calendar_month_horizon.down.sql`
- `backend/migrations/proposed/008_calendar_month_horizon.sql`
- `backend/scripts/test-booking008-local.py`
- `backend/testdata/real_booking_staging.sql`
- `frontend/src/i18n/booking.ts`
- `frontend/src/i18n/specialistEditor.ts`
- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/tests/real-booking-staging.cjs`

### Regression evidence and documentation

- `backend/scripts/acceptance-local.py`
- `backend/scripts/test-media-local.sh`
- `docs/ADMIN_AUTO_REFRESH_FIX.md`
- `docs/ADMIN_IMAGE_UPLOADS_LOCAL_ACTIVATION.md`
- `docs/BOOKING_008_PRODUCTION_ACTIVATION.md`
- `docs/BOOKING_008_PRODUCTION_PREFLIGHT.md`
- `docs/FINAL_E2E_EVIDENCE.json`
- `docs/INLINE_MEDIA_PRODUCTION_READINESS.md`
- `docs/INLINE_MEDIA_SMOKE_TEST.md`
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json`
- `docs/NEWS_ADMIN_SIMPLIFICATION_FIX.md`
- `docs/NEWS_ARCHIVE_007_BACKUP_VERIFICATION.md`
- `docs/NEWS_ARCHIVE_007_PREFLIGHT.md`
- `docs/NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md`
- `docs/NEWS_DELETE_BACKEND_FAILURE.md`
- `docs/NEWS_DELETE_REAL_DIAGNOSIS.md`
- `docs/NEWS_DELETE_SESSION_FIX.md`
- `docs/NEWS_DELETION_FIX.md`
- `docs/NEWS_PUBLICATION_VALIDATION_FIX.md`
- `docs/REAL_BOOKING_ACTIVATION_PLAN.md`
- `docs/REAL_BOOKING_DATA_ACTIVATION.md`
- `docs/SERVICES_PRICES_ACTIVATION_PREFLIGHT.md`
- `docs/SERVICES_PRICES_PRODUCTION_ACTIVATION.md`
- `docs/SERVICES_PRICES_SEO_COMPARISON.md`
- `docs/UNIFIED_ARTICLE_TEMPLATE.md`
- `docs/UNIFIED_SERVICES_PRICES_ADMIN.md`
- `docs/screenshots/final-e2e/appointment-details.png`
- `docs/screenshots/final-e2e/calendar-populated.png`
- `docs/screenshots/final-e2e/public-home-390.png`
- `docs/screenshots/final-e2e/specialist-schedule.png`
- `frontend/tests/acceptance-workflows.cjs`
- `frontend/tests/admin-simple.test.mjs`
- `frontend/tests/article-editorial-browser.cjs`
- `frontend/tests/article-editorial.test.mjs`
- `frontend/tests/catalog-real-browser.cjs`
- `frontend/tests/catalog-seo-preservation.test.mjs`
- `frontend/tests/cms-navigation.test.mjs`
- `frontend/tests/created-content-browser.cjs`
- `frontend/tests/helpers/news-real-workflow.cjs`
- `frontend/tests/media.test.mjs`
- `frontend/tests/news-admin-browser.cjs`
- `frontend/tests/news-archive-browser.cjs`
- `frontend/tests/news-delete-browser.cjs`
- `frontend/tests/news-real-browser.cjs`
- `frontend/tests/news-trace-browser.cjs`
- `frontend/tests/news-validation-browser.cjs`
- `frontend/tests/news-validation.test.mjs`
- `frontend/tests/seo-server.test.mjs`
- `frontend/tests/service-catalog.test.mjs`
- `frontend/tests/simple-admin-access-browser.cjs`
- `frontend/tests/simple-admin-browser.cjs`
- `frontend/tests/specialist-media-browser.cjs`

- `docs/SAFE_GIT_REVIEW_20261013.md` — this consolidated review and final test record.
