# Decorative section numbering removal

Branch: `feature/remove-section-numbering`, based on reviewed `f3e4d2b`. The branch was already checked out when inspection began. Existing untracked cleanup proposal was preserved.

## Changes

Removed separate decorative section-prefix bindings on Home and the patient-journey heading; service-preview counter and service/list ordinals; homepage benefit and price-preview ordinals; News list/article ordinals; price-category ordinals; mobile navigation prefixes. Existing translated titles are still rendered from the same LV/RU/EN keys. CMS literal inventory and production content were not changed.

Removed corresponding numbering columns in service rows (base, tablet and mobile), editorial service entries, price previews and price-category navigation. Removed unused number-only styles and imports. Retained typography, navigation links, animation indices, currency labels, prices, dates, addresses, experience years, price-category item counts, semantic patient-journey step numbers, Booking/calendar/form/Admin numbering and 404 status.

The only protected source changed is `frontend/src/style.css`: `.mobile-menu nav small`, `.service-number`, and the three `.service-row` grid definitions, exactly within the explicit approval. Only its lock hash was updated. Hero component, working iOS initialization, Welcome Intro and all other protected baselines are unchanged.

## Verification

- Production build PASS; existing large JavaScript chunk advisory remains.
- Frontend unit suite: 156 PASS, no failures or skips.
- Public browser regression: 84 route/language/width combinations PASS (Home, Services, Prices, News, existing article, About, Contacts × LV/RU/EN × 320/390/768/1440).
- Service heading left edges match row left edges; no number columns/markup remain. No horizontal overflow in the matrix.
- Mobile/tablet navigation: six labels, no number markup/prefixes, links remain usable and close the menu.
- Meaningful category counts, EUR, 15+ years and all four patient-journey steps remain present.
- All 15 Hero locks PASS; only approved stylesheet hash changed. Whitespace check PASS.
- Source/binding audit finds old decorative literals only in unchanged CMS inventory, with no public component consumers. They cannot reappear through those removed bindings. Arbitrary future editorial text is not globally stripped of numbers.

Screenshots are local ignored evidence under `docs/screenshots/section-numbering/`. Browser coverage is desktop Chromium emulation, not physical iPhone testing. Screenshot capture waits for existing page and menu transitions; no production animation changes were made.

## Exact changed files

- `frontend/src/components/home/PatientJourney.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/components/layout/SiteHeader.vue`
- `frontend/src/style.css`
- `frontend/src/styles/editorial.css`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/PricesView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/tests/section-numbering-browser.cjs`
- `docs/HERO_LOCK.json`
- `docs/SECTION_NUMBERING_REMOVAL.md`

No Booking logic, CMS/Admin implementation, Supabase data, service/price content or specialist content changed. No commit, merge, push or deployment.
