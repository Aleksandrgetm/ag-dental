# News deletion for published and unpublished articles

> Status clarification — 2026-10-13: Migration 007 was subsequently applied. See [activation evidence](NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md) and [the later session-stability fix](ADMIN_AUTO_REFRESH_FIX.md). The unapplied-migration statements below describe the original implementation stage.

Branch: `feature/final-development`. This extends the existing uncommitted News simplification work; no previous work was discarded.

## Root cause

The card disabled its only removal button when `published_revision` was null. That button called unpublish, which retains an ordinary unpublished document. The schema had no archive marker, so clearing publication could neither hide an accidental draft from the administrator list nor distinguish deletion from unpublication.

## Implemented behavior

- Every normal News card has **Delete / Dzēst / Удалить**, enabled regardless of publication state (disabled only during an active request).
- Published cards additionally offer **Unpublish / Noņemt no publikācijas / Снять с публикации**.
- Delete asks for confirmation, atomically unpublishes and marks the document archived, then refreshes public delivery and the normal list.
- Archived articles disappear from the normal list, public News, public detail delivery and dynamic sitemap. Existing legacy redirects are retained; withdrawn detail destinations return 404/noindex rather than a homepage redirect.
- A secondary **Deleted news / Dzēstie jaunumi / Удалённые новости** link inside News opens the archived-items view. It is not a new navigation section.
- Restore asks for confirmation and returns the document to the normal list **unpublished**. Publication requires an explicit later action.
- All revisions, actor audit records, document identities/slugs and historical image references are retained. No permanent database DELETE is used.
- Server-side normal/public lists exclude archives. Archived documents reject generic draft/publish/rollback and direct-publication mutations until restored. CMS admin responses use `Cache-Control: no-store`; the client clears previous list rows during a view reload and refreshes public content after confirmed mutations.

## API and schema

New verified-JWT/admin-only endpoints:

- `GET /api/admin/cms/documents/archived-news`
- `POST /api/admin/cms/documents/:key/archive`
- `POST /api/admin/cms/documents/:key/restore-archive`

Mutation body: `{ "expected_version": <current document version> }`. Unknown request fields are rejected. Each transaction rechecks the current database role and locks the document. Stale versions conflict; an exact immediate retry of the same archive/restore is a no-op success without a duplicate audit event. A stale delete cannot delete a subsequently restored/edited article. Only known imported News and valid `created.news.*` identities are eligible; Hero and unrelated CMS documents are excluded.

Prepared additive migration:

- `backend/migrations/proposed/007_news_archive.sql`: nullable `cms_documents.archived_at`; a constraint forbidding publication while archived; a partial archive index; additional `archived` and `restored` CMS audit event types.
- `backend/migrations/proposed/007_news_archive.down.sql`: refuses rollback if archive data or archive/restore audit history exists. Never deletes history to permit rollback.

**Migration 007 is NOT applied to production and is NOT automatically included in the production migration runner.** Only disposable test runners apply it. Existing migrations 001–006 are unchanged. No RLS/grants change. Existing normal CMS reads/publication remain compatible with the old schema; archive-specific operations fail safely when the column is absent.

## Validation

Synthetic and disposable testing only. The real production example article was not touched.

- Go integration covers deleting published and unpublished articles, default-list/public exclusion, archive listing, idempotent retry, unpublished restoration, stale delete rejection, blocked archived publication/rollback, unrelated-document rejection and revoked-role denial.
- API authorization regression includes anonymous/ordinary-user access to archive, restore and archived-list endpoints.
- Browser matrix covers LV/RU/EN at 390 and 1440px for both publication states (12 cases): enabled Delete, cancelled confirmation/no mutation, confirmed deletion, disappearance after reload, public-list/detail exclusion, secondary archived view, restoration and mobile overflow checks.
- Existing imported News regression tests retain **Unpublish** semantics separately from Delete.
- Real isolated Auth/Storage/PostgreSQL/Go/Vue acceptance is extended to delete a published article and a never-published draft through the actual browser, retry deletion without duplicate audit, restore unpublished, and race an edit against deletion.
- SEO unit/HTTP regressions verify dynamic sitemap withdrawal and 404 detail behavior. Public routes and Hero remain protected.

### Executed results — 2026-10-11

- Production frontend build: PASS (existing bundle-size advisory only).
- Frontend unit/HTTP tests: **111 passed, 0 failed**.
- `backend/scripts/test-media-local.sh`: PASS; `go test ./...` against disposable PostgreSQL 17.11, including Booking, CMS, Auth, Admin, Media and migration packages.
- `go vet ./...`: PASS.
- `news-delete-browser.cjs`: **12 passed** (published/unpublished × LV/RU/EN × mobile/desktop).
- Imported News/unpublish browser regression: **6 passed**.
- Auth browser regression: **96 layout checks**, registration/login/session/logout/recovery/confirmation flows passed.
- Admin authorization browser regression: **12 passed**, no privileged requests from unauthorized routes.
- Public-route browser regression: **480 checks passed**, 20 routes.
- SEO browser regression: **120 checks passed**; sitemap/detail withdrawal also covered by unit/HTTP tests.
- `QA_NEWS_ONLY=1 python3 backend/scripts/acceptance-local.py`: PASS with real isolated PostgreSQL, JWT Auth, private Storage, Go API and Vue browser. Includes published/draft deletion, restoration, duplicate requests, concurrent edit/delete (one succeeds, the other returns 409), role revocation, tampered tokens and RLS denials. Expected permission-denied assertions are security successes, not test failures. Containers and temporary credentials were removed by the runner.
- `node frontend/scripts/check-hero-lock.mjs`: **15/15 passed**.
- `git diff --check`: PASS. Existing migrations 001–006 unchanged; no staged changes, commits or branch changes.

During test development, the disposable runner initially omitted the proposed migration and correctly rejected archive operations. The runner was corrected. The real browser test also needed an explicit `?lang=en` after a full navigation because rejected optional cookies intentionally prevent locale persistence. Fresh runs passed after these test-harness fixes; application language/privacy behavior was preserved.

Machine-readable real-run evidence: `docs/NEWS_ADMIN_REAL_EVIDENCE.json`.

## Files changed specifically for this follow-up

- `backend/internal/cms/news_archive.go` — archive/restore service and archive listing.
- `backend/internal/cms/store.go` — archive metadata, normal/public filtering, generic mutation guard.
- `backend/internal/cms/news.go` — reject direct publication while archived.
- `backend/internal/cms/http.go` — archive endpoints and no-store admin responses.
- `backend/internal/cms/content_test.go` — authorization coverage.
- `backend/internal/cms/news_test.go` — lifecycle/concurrency-version/role regressions.
- `backend/migrations/proposed/007_news_archive.sql`
- `backend/migrations/proposed/007_news_archive.down.sql`
- `backend/scripts/test-media-local.sh` — disposable migration setup only.
- `backend/scripts/acceptance-local.py` — disposable migration setup only.
- `frontend/src/services/cms/admin.ts` — explicit allowed mutation paths.
- `frontend/src/views/admin/AdminNewsView.vue` — distinct Delete/Unpublish, secondary archive view, restore and stale-row clearing.
- `frontend/src/i18n/newsAdmin.ts` — LV/RU/EN actions and confirmations.
- `frontend/tests/news-delete-browser.cjs` — new deletion matrix.
- `frontend/tests/news-admin-browser.cjs` — preserve explicit unpublish tests.
- `frontend/tests/news-archive-browser.cjs` — preserve explicit unpublish tests.
- `frontend/tests/helpers/news-real-workflow.cjs` — actual deletion/restoration/concurrent editing.
- `frontend/tests/news-real-browser.cjs` — safe failure stack diagnostics.
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json` — refreshed isolated-run evidence.
- `docs/NEWS_DELETION_FIX.md` — this report.

Other dirty files predate this request and remain intact.

## Activation boundary and limitations

Production activation still requires separate approval: review and integrate migration 007 into the controlled migration runner, perform the required backup/preflight, apply only that migration, and restart/deploy the matching backend/frontend. Nothing here applies production SQL or changes the running production-connected backend. Until that approved schema activation, archive operations report unavailable; no fake deletion or local-only hiding is used.

The existing CMS public fallback policy remains when the API is unreachable. Hosted connectivity and cache revalidation must be verified before activation; disconnected fallback cannot guarantee immediate withdrawal. No production uploads, Booking activation, email delivery, commit, push, merge or deployment is performed.
