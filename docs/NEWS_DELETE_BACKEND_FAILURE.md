# News Delete backend failure investigation

> Status clarification — 2026-10-13: The backend/schema state below is historical. Migration 007 was subsequently applied; see [activation evidence](NEWS_ARCHIVE_007_PRODUCTION_ACTIVATION.md) and [the later session-stability fix](ADMIN_AUTO_REFRESH_FIX.md).

2026-10-11 · `feature/final-development`

## Actual local environment

The existing Chrome tab at `http://localhost:5173/admin/news` displayed the Russian access-verification error, not a loaded article list. Frontend `.env` points to `http://localhost:8080/api`. No process was listening on port 8080; read-only `/api/health` failed with connection refused (HTTP 000). Consequently there was no running backend build to identify or historical Delete response to inspect. No Delete was attempted against the actual article, and no production-connected backend was started. The precise historical HTTP response cannot be claimed from this observation.

## Confirmed schema dependency and reproduction

Source registers authenticated/admin-only POST `/api/admin/cms/documents/:key/archive` and `/restore-archive`. The frontend correctly sends `{expected_version: <document version>}`. No revision ID is required for this lifecycle; the transaction locks the document and preserves its draft and revision history.

Migration 006 does not define `archived_at` or archive/restore audit event types. The previous implementation explicitly requires proposed migration 007, which remains unapplied and outside the automatic production runner. Restarting an API alone cannot supply that schema. Neither publication status nor missing portrait/content causes this archive failure.

A real browser-to-Go request was reproduced in disposable PostgreSQL by temporarily hiding the archive column, restoring it in a finally block. It returned HTTP 503 with sanitized `{ "error": "news_archive_unavailable" }`. Request version matched the retained database version. The browser showed the localized explanation and retained the card. This is a controlled missing-column reproduction, not a new production schema inspection. The earlier generic response was `content_unavailable`.

## Smallest safe changes

- Distinct safe archive-unavailable error instead of a generic retry message.
- Translate that exact allowlisted response in LV/RU/EN: deletion/restoration is not activated; the article is unchanged; contact the website maintainer. No database details or raw backend errors are displayed.
- Immediately remove the card after a successful archive response, before public refresh/list revalidation. Never hide it on failed requests.
- Preserve authorization, version conflicts, transaction/row locks, retry idempotency, reversible restoration and public filtering. No schema workaround or permanent deletion.

## Exact files changed in this follow-up

- `backend/internal/cms/news_archive.go`
- `backend/internal/cms/store.go`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/src/i18n/newsAdmin.ts`
- `frontend/tests/helpers/news-real-workflow.cjs`
- `frontend/tests/news-delete-browser.cjs`
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json`
- `docs/NEWS_DELETE_BACKEND_FAILURE.md`

All pre-existing uncommitted work was preserved. No migrations were changed in this follow-up.

## Verification

- Production frontend build: PASS (bundle-size advisory only).
- Frontend unit/HTTP suite: 111 passed. Initial sandbox listener restriction required rerunning with authorized local-listener access; the complete rerun passed.
- `backend/scripts/test-media-local.sh`: all Go packages passed against disposable PostgreSQL, including migration, CMS, Auth, Booking, Media and Admin authorization tests.
- `go vet ./...`: PASS.
- Real isolated browser/Auth/Go/PostgreSQL/Storage workflow: PASS missing-schema 503 and translated error, then published/unpublished archive, list persistence, public withdrawal, restore, retries, concurrent edits, JWT/role/RLS safeguards. No production credentials; disposable environment removed afterward.
- Hero locks: 15/15 PASS. `git diff --check`: PASS.
- Localized desktop/mobile deletion matrix: 12/12 PASS (LV/RU/EN × 390/1440px × published/unpublished), including unavailable error, retained card on failure, cancellation, successful deletion and restoration.

## Remaining activation requirements

The actual production-connected environment is not fixed by changing the error message: it needs an available backend built from current source AND separately approved migration 007 activation with the established backup/preflight process. No production database was queried or modified during this investigation. Do not silently substitute unpublish for archive or mark deletion successful without the schema.

No real article, Auth record, Booking record or media object was changed. No production migration, restart, commit, merge, push or deployment was performed. Existing fallback behavior during API outages remains a deployment limitation documented in NEWS_DELETION_FIX.md.
