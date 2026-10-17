# CMS News image consistency

Branch: `feature/remove-section-numbering`. Local verification: 2026-10-16.

## Current state after the follow-up listing request

The dedicated News listing is now text-only at the client’s request. Its temporary thumbnails were removed; the existing category, title, excerpt, date, arrow and links remain. Homepage and detail images still use the shared News resolver. The current browser regression asserts no listing images, while verifying selected image persistence on homepage/detail. Earlier thumbnail verification below is historical.

## Root cause

This was a frontend presentation mismatch, not image processing or a failed database save.

1. `ArticleView.vue` read images through the Hero/public-photography proxy. That proxy intentionally maps `/media/clinic/clinic-original.jpg` to the newer reception/about photograph. Applying it to editorial News incorrectly replaced the saved registered image.
2. The homepage featured News image was hardcoded to `media.original`, ignoring the selected article's image.
3. The shared News list adapter omitted the image field for newly created articles. The dedicated listing was text-only and therefore did not provide a visual cross-check.

A read-only request to the existing local backend's published API confirmed that `news.zobu-higiena-kas-pieejama-ikvienam` still publishes `original`, resolving to `/media/clinic/clinic-original.jpg`, in all three languages. The prosthesis article publishes an uploaded `cms-media:upload.…` reference consistently in all three languages. No production records were changed to obtain this evidence. No cache reset or duplicate media record is needed to fix the overridden legacy image.

## Changes

A shared News-only resolver now reads CMS media references and registered local aliases directly. It resolves uploaded IDs through the existing public variant endpoint, bypasses photography substitutions, and returns no image for missing/unknown references rather than substituting reception photography. Existing CMS variant srcsets and localized alt metadata are preserved.

- Article detail uses the News resolver.
- Homepage featured News uses that article's image, including newly created articles.
- News listing shows a compact thumbnail for each available image inside its existing row. Missing images have no thumbnail; no unrelated fallback is inserted.
- The compact, text-only homepage secondary links retain their existing composition.
- No per-article image paths or slug-specific presentation rules were added.

Unrelated clinic photography mappings, Hero, portraits, Booking, dates, article text, localization, API authorization and publication lifecycle remain unchanged.

## Changed files for this task

- `frontend/src/services/cms/newsImage.ts` (new)
- `frontend/src/composables/usePublicNews.ts`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/tests/helpers/news-image-association.cjs`
- `frontend/tests/media-upload-real-browser.cjs`
- `docs/CMS_NEWS_IMAGE_MISMATCH_FIX.md` (new)

Earlier uncommitted work, including the prior image-save fix, was preserved. No backend implementation or protected baseline was changed for this task.

## Verification

- Frontend production build passed (existing large-chunk warning).
- Frontend unit tests: 157 passed. Run from `frontend` using `node --experimental-strip-types --test tests/*.test.mjs`. Initial runs from repository root failed a prerender fixture check; using the expected working directory passed without weakening assertions.
- Disposable PostgreSQL integration (`sh backend/scripts/test-media-local.sh`): all Go packages passed, including CMS, Media, Auth, Booking, server and migrations.
- Real Auth/PostgreSQL/Storage browser regression: passed, including registered images, A→B replacement, imported-article preservation, PNG/JPG/JPEG/WebP/AVIF uploads and News publication/replacement/archive/restore. Disposable services and credentials removed.
- Hero locks: all 15 passed; no hashes updated for this task.
- `git diff --check`: passed.

The real-browser regression uses a new disposable Auth/PostgreSQL/Storage stack and synthetic images. It checks the original registered image across homepage/list/detail, then publishes image A and replaces it with image B using the actual admin UI and Go API. It verifies the returned persisted IDs, public image loading, editor reload, listing reload, homepage and detail in LV/RU/EN and desktop/mobile widths. Article payload comparisons confirm every field except image is unchanged. Fixture images have distinct dimensions to avoid accidental deduplication with the separate upload-format test assets.

No production article, Storage object or image was modified; no deployment, commit, merge or push was performed. Physical-device acceptance is not claimed.
