# News featured-image save fix

Verified locally on 2026-10-16, branch `feature/remove-section-numbering`.

## Root cause and evidence

The JPEG processor was not the failing stage. A real browser connected to disposable PostgreSQL, Auth and Storage reproduced the imported article workflow: upload returned HTTP 200 and a persisted `upload.…` media identifier; save/publication returned HTTP 422 with `{"error":"invalid_content","field":"image"}`.

`attachMedia` still required all three localized media descriptions at publication, despite upload correctly allowing empty metadata. This rejected an otherwise valid, ready image selected for News. The frontend converted that failure into the misleading invalid-image message.

A second defect became visible after publication succeeded: the News editor resolved a stored `cms-media:…` reference into a public URL before giving it to the private media preview. Reload therefore lost the expected preview representation. The editor now retains the persisted reference.

These are isolated reproductions of the matching workflow, not a write test against the user's production article. No production article was saved or replaced during diagnosis.

## Fix

- News publication accepts an existing localized article title as the contextual alternative-text fallback when media descriptions are absent. This is limited to imported articles and created News; other content types retain their metadata requirements. No descriptions are generated or written into media metadata.
- Public article rendering uses the same existing localized title for uploaded featured images without descriptions. Explicit descriptions and decorative-image behavior retain precedence. Existing editorial text and captions are unchanged.
- The editor preserves `cms-media:…` identifiers through selection, save and reload.
- Missing, protected, unready or non-image references receive a specific `image_association_failed` error.
- Storage and media-record failures receive separate safe error codes. Article-save/network failures no longer blame the image field. LV/RU/EN messages distinguish these stages without exposing SQL, credentials or Storage internals.
- MIME/signature validation, size limits, authentication, administrator authorization, reference protection and private Storage remain enforced.

## End-to-end verification

The disposable real-browser test verified selection, upload, variant processing and Storage persistence, registry creation, returned media identifier, article association, save/publication, editor reload/full refresh and public image delivery in LV/RU/EN. Upload and publication both returned HTTP 200 after the fix. It also compared every imported article payload field and confirmed that only the image changed.

Additional real Storage tests passed for PNG, JPG, JPEG, WebP and AVIF without required metadata, optional metadata editing, stale-edit rejection and anonymous/ordinary-user denial. A fresh metadata-free image also passed new-News publication, replacement, archive and restoration workflows. All disposable services and temporary credentials were removed.

## Test results

- Frontend unit suite: 157 passed, zero failures.
- Production build: passed; existing large-chunk warning remains.
- Disposable PostgreSQL Go suite (`sh backend/scripts/test-media-local.sh`): passed, including Auth, Booking, CMS, Media, migration and server packages.
- `go vet ./...`: passed.
- Real isolated Auth/PostgreSQL/Storage browser suite (`QA_MEDIA_ONLY=1 python3 scripts/acceptance-local.py`, with Playwright configured): passed.
- News validation browser suite: six LV/RU/EN desktop/mobile cases passed, including association failure, unrelated save failure, focus and entered-data preservation.
- Inline News media UI: six cases passed; specialist media picker UI: six cases passed (mock transports, no profile writes).
- Hero locks: all 15 passed; no protected files or hashes changed for this fix.
- `git diff --check`: passed.

## Files changed for this task

Some listed files already contained earlier uncommitted media work, which was preserved.

- `backend/internal/cms/http.go`
- `backend/internal/cms/media_http.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/media_test.go`
- `backend/internal/cms/validation.go`
- `frontend/src/i18n/media.ts`
- `frontend/src/i18n/newsAdmin.ts`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/services/cms/media.ts`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/tests/helpers/news-image-association.cjs` (new)
- `frontend/tests/helpers/news-real-workflow.cjs`
- `frontend/tests/media-upload-real-browser.cjs`
- `frontend/tests/news-validation-browser.cjs`
- `docs/NEWS_FEATURED_IMAGE_SAVE_FIX.md` (new)

## Local runtime and limitations

Port 8080 had one identified AG Dental backend, built for the preceding JPEG task. It was not assumed to be the root cause: the current-source isolated test reproduced the publication defect. After tests, only that process was stopped and replaced with the latest verified executable at `/tmp/ag-news-image-current-api/api`. Its `/api/health` returned HTTP 200. The task-only frontend server on port 5196 was stopped; the user's frontend was preserved.

The local backend retains its existing ignored configuration. No production upload, CMS write, migration, Booking change, specialist edit or Storage modification was performed. The user's real article remains untouched; confirmation in that authenticated editing session is still pending. No deployment, commit, merge or push was made.
