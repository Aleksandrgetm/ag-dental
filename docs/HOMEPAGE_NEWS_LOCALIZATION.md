# Homepage News localization — 2026-10-16

## Root cause

HomeView rendered raw Latvian `articles` directly and hardcoded `lang="lv"`. NewsView already resolved imported articles through the existing reactive CMS `localizeArticle` helper and combined published created News documents. The homepage also retained the now-unnecessary original-language notice.

## Fix

Extracted NewsView's existing computed list into `usePublicNews`. Both pages now share the same imported/CMS localization, published-created-document filtering, category fallback and date ordering. No translation data, CMS acceptance logic, publication state, dates, slugs or image mapping changed. The homepage's featured image and editorial composition remain unchanged. Existing featured-card design has no excerpt; compact cards render localized excerpts. Locale changes immediately recompute the shared list and update language attributes.

Removed only the homepage source-note paragraph. Its shared stylesheet rule is still used by ServiceView and is therefore preserved. No protected source or hash changed in this task.

## Verification

- Production build PASS (existing large-chunk advisory).
- 156 frontend tests PASS after correcting the historical lock-invariant test described below.
- Browser: 12 cases PASS: fallback and synthetic published CMS content × LV/RU/EN × 390/1440.
- Each case checks all four homepage titles against the News list, displayed excerpts and dates, featured title against its detail page, and language switching on the same document without reload.
- Synthetic CMS response includes edited imported translations and a newly created published article; requests are intercepted locally. No production data touched.
- No homepage notice; no horizontal overflow. Local screenshots: `docs/screenshots/home-news-localization/` (ignored). Browser emulation only, not physical-device testing.
- All 15 Hero locks PASS; whitespace PASS.

Full unit rerun initially exposed a historical test asserting all 14 non-component lock hashes equal the pre-mobile snapshot. The preceding authorized section-numbering change altered style.css. Updated that test to assert the exact approved stylesheet hash, retaining the other 13 comparisons. No source or baseline change was made to resolve this test. The preceding numbering report's unit run preceded its hash update; this final rerun validates the combined working tree.

## Exact files changed by this task

- `frontend/src/composables/usePublicNews.ts` (new)
- `frontend/src/views/HomeView.vue` (preserves earlier numbering changes)
- `frontend/src/views/NewsView.vue` (preserves earlier numbering changes)
- `frontend/tests/home-news-localization-browser.cjs` (new)
- `frontend/tests/hero-modes.test.mjs` (exact previously approved stylesheet assertion)
- `docs/HOMEPAGE_NEWS_LOCALIZATION.md` (new)

All earlier uncommitted work remains. No Booking/Admin/Supabase, specialist portraits, language-button, Hero or Welcome Intro changes. No deployment, commit, merge or push.
