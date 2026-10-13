# Unified editorial article template

Date: 2026-10-12. Branch: `feature/final-development`.

## Root cause

This was not a CSS-only discrepancy. `ArticleRouteView.vue` chose `ArticleView.vue` for imported slugs and `CreatedContentView.vue` for newly created CMS documents. The latter is a generic informational-page renderer with a small page heading, full-width cropped image and simple body. The two schemas also differed: imported articles use localized `paragraphs` with the first paragraph as the lead, while created documents have independent localized `summary` and `body` fields. The simplified News editor was overwriting `summary` with the first 1,000 characters of the body whenever it published.

## Implementation

All `/jaunumi/:slug` routes now render the existing `ArticleView.vue`. A small data adapter normalizes both schemas; there is one Vue article template. The generic renderer remains for informational pages and FAQs.

The approved serif headline, split introduction, masthead, centered photograph, margin metadata, narrow body, progress indicator and spacing remain. Optional introductions collapse the headline grid when absent; absent categories/authors have no empty visible labels. New articles do not receive an invented doctor attribution. The existing legacy portrait caption and the existing hygiene article's closing quote are preserved.

Images use natural width/height proportions, responsive Storage variants, descriptive alternative text, asynchronous decoding and eager high-priority loading for the main image. Uploaded image dimensions reserve its natural aspect ratio when supplied by the API. There is no fixed-height crop or stretch. No original image files were modified.

The compact News editor exposes title, optional short introduction, main text, inline image selection, date, optional category and optional author, with LV/RU/EN controls. Publication remains one action, using the existing atomic save-and-publish lifecycle. It does not expose IDs, revisions, SEO fields or a mandatory draft-save action.

For legacy records, editing the lead/body materializes an explicit optional `introduction`, without duplicating or losing the original first paragraph. Unedited payloads remain compatible. JSON validation accepts the additive optional fields while retaining plain-text, length, language-shape, immutable identity, media reference, role and revision safeguards. No SQL migration or content rewrite is required.

## SEO and lifecycle

- No route, legacy slug, redirect or sitemap configuration was changed.
- Existing canonical/hreflang/structured-data machinery is retained.
- New articles retain generated URLs and automatic SEO title/description; an absent introduction uses body text for the description rather than fabricating content.
- Withdrawn imported articles now also lose client-side indexability/canonical metadata, matching the existing server's 404 handling.
- The server renderer and public API still exclude unpublished/archived content. Revision history and reversible restoration remain intact.
- The server's pre-JavaScript text fallback is unchanged; the unified visual template is the Vue-rendered page, not a new full SSR implementation.

## Test results

- Production build: PASS (`npm run build`). Existing large-chunk warning remains.
- Full frontend tests: **114 passed**, no failures, including CMS, News model, Auth, Media, Booking, public statuses, canonical/hreflang, sitemap and eight legacy HTTP 301 redirects.
- Shared article browser checks: **48 passed** — imported article plus complete, minimal and landscape synthetic articles; LV/RU/EN; widths 375, 390, 844 and 1440; natural image ratio, direct URL, refresh, no horizontal overflow, metadata and withdrawn-route exclusion. API transport is intercepted in this layout suite.
- Existing News editor browser suite: **24 passed** across three locales and eight widths; publication/error retention/edit/unpublish/republish.
- Public-route browser suite: **480 passed** (20 routes × three locales × eight viewport widths), no browser errors.
- Auth browser suite: **96 layout checks passed**, plus registration/login/persistence/logout/recovery/confirmation flows with mocked Auth.
- Media picker suite: **6 passed** — disabled gate, Hero exclusion, invalid/video rejection, preview, retry and selection, using mocked transport.
- All Go packages passed via `backend/scripts/test-media-local.sh`, including real disposable PostgreSQL integration for CMS, Auth, Booking, Media, migration runner and server. No production credentials or database were used.
- Real browser → Go → disposable PostgreSQL/Auth/Storage workflow passed: imported editorial field round-trip, new article publication with independent localized lead/category/author, direct public delivery/refresh, inline image upload and replacement, unpublish, revision restoration, published/draft archiving, archive restoration, idempotency, concurrent edit protection and server-side role revocation. File and private-Storage security tests passed. Expected database permission-denied probes are intentional assertions.
- All **15 Hero locks passed**.

Initial all-tests invocation from the repository root caused the existing redirect test to look for `dist` in the wrong directory; rerunning from `frontend` passed all 114 tests. An initial sandbox-only invocation also denied loopback test listeners; the successful run had the required local-server permission. Neither was an application failure.

## Screenshots

All captures use isolated synthetic CMS responses and existing local registered images. No production content was edited. Before images were captured before replacing the renderer. The legacy desktop reference screenshots match before/after SHA-256 exactly in EN and RU.

| Case | Before | After |
|---|---|---|
| New portrait, desktop | [Before](screenshots/unified-article/before-synthetic-portrait-en-1440.png) | [After](screenshots/unified-article/after-synthetic-portrait-en-1440.png) |
| New portrait, mobile | [Before](screenshots/unified-article/before-synthetic-portrait-en-390.png) | [After](screenshots/unified-article/after-synthetic-portrait-en-390.png) |
| Landscape, desktop | [Before](screenshots/unified-article/before-synthetic-landscape-en-1440.png) | [After](screenshots/unified-article/after-synthetic-landscape-en-1440.png) |
| Optional fields absent | [Old required-intro layout](screenshots/unified-article/before-synthetic-minimal-en-1440.png) | [No optional fields](screenshots/unified-article/after-synthetic-minimal-en-1440.png) |
| Approved Russian legacy reference | [Before](screenshots/unified-article/before-zobu-protezes-un-protezesana-ru-1440.png) | [After](screenshots/unified-article/after-zobu-protezes-un-protezesana-ru-1440.png) |

Screenshots are local evidence under the repository's existing ignored screenshot paths; they are not committed. Additional small-screen captures are included there.

## Exact files changed for this task

Application:

- `backend/internal/cms/content.go`
- `backend/internal/cms/created.go`
- `frontend/src/views/ArticleRouteView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/NewsView.vue` (display the optional published category)
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/src/components/common/CmsMetadata.vue`
- `frontend/src/services/cms/article.ts` (new data adapter)
- `frontend/src/services/cms/content.ts`
- `frontend/src/services/cms/created.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/i18n/newsAdmin.ts`

Tests and evidence:

- `backend/internal/cms/news_test.go`
- `frontend/tests/article-editorial.test.mjs` (new)
- `frontend/tests/article-editorial-browser.cjs` (new)
- `frontend/tests/helpers/news-real-workflow.cjs`
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json` (regenerated isolated test evidence)
- `docs/UNIFIED_ARTICLE_TEMPLATE.md`
- `docs/screenshots/unified-article/*.png` (32 captures; inventory below)
- Existing `docs/screenshots/news-simplification/{list,editor}-{lv,ru,en}-{390,1440}.png` (12 regenerated by the existing editor regression suite).

Other pre-existing uncommitted work was preserved and is not attributed to this task.

## Remaining limitations / handover

- Updated Frontend and Backend source must be used together to save the new optional JSON fields. The production-connected local Backend process was not restarted; isolated tests used freshly built source. No production migration is required.
- No production API/Storage write, content publication, upload-enablement change, deployment, commit, merge or push occurred.
- Existing created articles whose old editor already copied body text into `summary` retain that stored content. This task deliberately does not rewrite published articles; an authorized editor may later revise their introduction.
- No author/category translation is synthesized. Empty optional translations stay absent in that language.
- Layout checks use Chromium; Safari/Firefox and a real hosted deployment were not tested. Existing chunk-size warning is outside this focused change.
- Hero, Welcome Intro, Booking, Auth flows and public design outside News were not redesigned.

## Screenshot file inventory

- `docs/screenshots/unified-article/after-synthetic-landscape-en-1440.png`
- `docs/screenshots/unified-article/after-synthetic-landscape-en-375.png`
- `docs/screenshots/unified-article/after-synthetic-landscape-en-390.png`
- `docs/screenshots/unified-article/after-synthetic-landscape-en-844.png`
- `docs/screenshots/unified-article/after-synthetic-landscape-ru-1440.png`
- `docs/screenshots/unified-article/after-synthetic-minimal-en-1440.png`
- `docs/screenshots/unified-article/after-synthetic-minimal-en-375.png`
- `docs/screenshots/unified-article/after-synthetic-minimal-en-390.png`
- `docs/screenshots/unified-article/after-synthetic-minimal-en-844.png`
- `docs/screenshots/unified-article/after-synthetic-minimal-ru-1440.png`
- `docs/screenshots/unified-article/after-synthetic-portrait-en-1440.png`
- `docs/screenshots/unified-article/after-synthetic-portrait-en-375.png`
- `docs/screenshots/unified-article/after-synthetic-portrait-en-390.png`
- `docs/screenshots/unified-article/after-synthetic-portrait-en-844.png`
- `docs/screenshots/unified-article/after-synthetic-portrait-ru-1440.png`
- `docs/screenshots/unified-article/after-zobu-protezes-un-protezesana-en-1440.png`
- `docs/screenshots/unified-article/after-zobu-protezes-un-protezesana-en-375.png`
- `docs/screenshots/unified-article/after-zobu-protezes-un-protezesana-en-390.png`
- `docs/screenshots/unified-article/after-zobu-protezes-un-protezesana-en-844.png`
- `docs/screenshots/unified-article/after-zobu-protezes-un-protezesana-ru-1440.png`
- `docs/screenshots/unified-article/before-synthetic-landscape-en-1440.png`
- `docs/screenshots/unified-article/before-synthetic-landscape-en-390.png`
- `docs/screenshots/unified-article/before-synthetic-landscape-ru-1440.png`
- `docs/screenshots/unified-article/before-synthetic-minimal-en-1440.png`
- `docs/screenshots/unified-article/before-synthetic-minimal-en-390.png`
- `docs/screenshots/unified-article/before-synthetic-minimal-ru-1440.png`
- `docs/screenshots/unified-article/before-synthetic-portrait-en-1440.png`
- `docs/screenshots/unified-article/before-synthetic-portrait-en-390.png`
- `docs/screenshots/unified-article/before-synthetic-portrait-ru-1440.png`
- `docs/screenshots/unified-article/before-zobu-protezes-un-protezesana-en-1440.png`
- `docs/screenshots/unified-article/before-zobu-protezes-un-protezesana-en-390.png`
- `docs/screenshots/unified-article/before-zobu-protezes-un-protezesana-ru-1440.png`
