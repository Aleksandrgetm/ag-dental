# Public-site refinement — 28 September 2026

## Boundary and baseline

Work stays on `feature/homepage`. No merge, push or deployment was requested or performed. The latest explicit Hero lock overrides the attached brief's older suggestions to refactor it.

The approved Hero component, its entire shared stylesheet, font stylesheet/files, translation module, content/media registry, localization helper, MP4 and poster were hashed before implementation. `HERO_LOCK.json` records the baseline. Run:

```sh
node frontend/scripts/check-hero-lock.mjs
```

All new visual rules live in `frontend/src/styles/editorial.css`. Selectors are restricted to `.content-design` (a sibling after the Hero, internal-page wrappers, or the footer) and `.mobile-menu.refined-menu` (the open menu). The closed header, global tokens, Hero source and its dependencies remain unchanged. The existing `#intro` target remains available to the Hero's skip control. New motion attaches no scroll listeners and does not alter document scrolling.

Baseline inspection covered 20 public URLs on desktop and mobile: home, service index, all eight services, prices, about, specialists, news index, all four articles, contacts and appointment. Every homepage section was also inspected separately. Supporting text was too small, sections repeated the same two-column rhythm, the gallery was passive, and service/price exploration offered little interaction.

## Reference research and decisions

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): studied sequencing and scroll-triggered orchestration. No post-Hero section needs pinning or a scrubbed timeline, so adding GSAP would not serve this scope.
- [Anime.js staggering](https://animejs.com/documentation/utilities/stagger/): used the idea of short, bounded stagger delays for the open menu and paired editorial elements. Implemented directly with CSS/Web Animations; no Anime.js dependency.
- [Motion inView](https://motion.dev/docs/inview): supports one-time viewport entry through IntersectionObserver. This is the appropriate model for these reveals. A small Vue directive uses the native observer and Web Animations API, with cleanup and reduced-motion handling.
- [Sketchfab Viewer API](https://sketchfab.com/developers/viewer): reviewed the integration and embedding requirements after the homepage returned 403. No clinic-approved anatomical model or educational need was established, so no 3D, remote viewer, cookie dependency or WebGL was introduced.
- [Supahero](https://supahero.io/): visually reviewed its curated compositions for typography/image balance and section rhythm. Hero examples were inspiration for editorial composition only; the approved AG Hero was not changed.
- [21st.dev](https://21st.dev/): reviewed navigation, button and card categories. Adopted only the general principle of clear hover/focus feedback, reimplemented in Vue/CSS without copied React components, shimmer effects or framework replacement. A deeper navigation-category URL was unavailable.
- [Refero](https://refero.design/) and [Refero Styles](https://styles.refero.design/): reviewed interface hierarchy and warm editorial references. The existing AG serif/sans pairing and palette remain intact. Numbered annotations, fine rules, better body sizing and consistent spacing give the content a coherent reading rhythm. No external design skill or DESIGN.md was imported.
- [SmoothUI](https://smoothui.dev/): visually reviewed its calm/energetic distinction, controls and interaction examples. Chose restrained arrow movement, explicit gallery controls and short menu entrances; excluded springs, ornamental effects and React dependencies.
- [OriginKit](https://www.originkit.dev/): attempted both web extraction and browser inspection. The page returned no readable body to extraction and browser navigation timed out. No component-specific claims or code were attributed to it.
- Strix: no installed skill path or callable tool was found. A limited manual review and npm advisory checks were performed instead; see `SECURITY_REVIEW.md`.

No new dependencies were added. Research informed a single AG-specific interaction vocabulary, not a mixture of component-library styles.

## Final design and interaction changes

- Intro: stronger typography, a compact arrival line and a carefully spaced transition entirely below the approved tour.
- Services: complete eight-link index, responsive image preview on hover/focus, sticky imagery on desktop and direct links on touch devices.
- About and doctor: an architectural image spread followed by a larger real portrait, editorial name treatment and the verified experience statement.
- Why AG: numbered, readable benefit statements with source-grounded supporting descriptions.
- Patient journey: four keyboard-operated disclosures with `aria-expanded`, unique targets and inert collapsed content. No forced timing.
- Prices: printed-estimate-style preview and diacritic-insensitive full-list search with result count, clear action and empty state. All 69 entries and the malformed-price review flag are retained.
- Gallery: three manual frames, previous/next actions, thumbnail buttons and an announced position. No autoplay.
- Journal: a lead image/story and three complementary article links. Article source language and publication dates are retained.
- Contact/appointment: clearer hierarchy and native, accessible disclosures for booking, parking and anxiety-related questions, grounded in existing content.
- Footer: larger, readable contact details and a typographic clinic signature.
- Internal pages: scoped title entrances, more readable copy, consistent separators, responsive price rows and refined link feedback.
- Open mobile menu: bounded stagger, larger language targets, phone/address/hours, booking action and existing Escape/focus return behavior.

## Motion contract

`editorialMotion.ts` observes selected editorial groups only. Entrances use 22px translation/opacity over 650ms or an 850ms image inset reveal. Delays are capped at 180ms. Content is never permanently hidden in CSS. The observer is disconnected on unmount; active animations are cancelled on reduced-motion changes and when they contain keyboard focus. CSS hover/disclosure/gallery/menu movement is disabled under reduced motion. No animation library, global smooth scrolling, cursor effects, new video, generated artwork or perpetual motion was added.

## Validation results

- `npm run build`: Vue TypeScript check and Vite production build pass.
- Hero lock: all 15 baseline file hashes match, including the entire pre-existing shared stylesheet and MP4.
- Hero rendered comparison: element geometry and settled computed styles match at 1440×900 and 390×900. The desktop baseline sampled the existing video-loading opacity at 0.999691, versus 1 after settling; this is a capture-timing difference in an unchanged transition.
- 90 responsive cases (10 page types × LV/RU/EN × 320/768/1440px) passed without horizontal overflow after correcting gallery/wordmark intrinsic widths.
- Desktop/mobile captures inspected for every new home section and the service, pricing, about, specialist, news, article, contact and appointment layouts.
- Search: `higiena` finds the hygiene category; nonsense input shows the empty state; clearing restores all 69 price rows. The review-required price remains flagged.
- Patient journey toggles its expanded state; gallery advances from 01/03 to 02/03; menu Escape closes the overlay and restores focus.
- Reduced-motion mode has no active post-Hero animations.
- No JavaScript page errors were reported in the interaction/route run.
- Browser API health request succeeds on localhost with the database connected.
- Full and production-only npm advisory checks report zero known vulnerabilities at review time. No dependency changes.
- New main bundle: approximately 89.4 kB gzip JavaScript; global CSS approximately 94.1 kB gzip including the unchanged Vuetify/MDI styles. The existing film and font infrastructure were deliberately preserved.

Browser checks used installed headless Chrome with Playwright and simulated mobile viewports. Real iOS/Android hardware was not available for this pass.
