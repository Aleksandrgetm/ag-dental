# Final public-site polish — 29 September 2026

## Implementation

| Area | Result |
| --- | --- |
| Public route transitions | Vue Transition: incoming opacity/8px translation over 300ms; outgoing opacity/−6px over 120ms, concurrently. No navigation guards, timers or artificial navigation delay. Departing content is inert and hidden from accessibility APIs. Existing router scroll-to-top/hash/history behavior is retained. Homepage entry/exit remains immediate to preserve the locked Hero and Welcome Intro. |
| Service photography | Service listing images scale to 1.035 over 650ms. Homepage service previews use the same gentle scale with their existing crossfade. Service titles no longer translate. Touch selection does not trigger hover previews. |
| Header | IntersectionObserver tracks the existing tour boundary; the header stays in its cinematic state through the tour and becomes light at the content boundary. Background, color, border and CTA treatment transition over 360ms. No navigation structure changes. |
| Buttons and links | Calm background/color feedback and visible keyboard focus. Removed the diagonal child-span movement and pressed inset shadow from ordinary content buttons. Editorial links have a fine left-to-right underline over 260ms. No arrows added; Hero CTA untouched. |
| Article progress | A supplementary, aria-hidden, 2px green line appears only on real article routes. Measures the lead/image/body region, excluding the booking CTA and footer. Direct requestAnimationFrame updates without trailing easing. Teleported to body so page transforms do not affect fixed positioning. Listeners, frame requests and observer are cleaned up. |
| Article layout | Existing category/date/title, moderate serif lead, large existing article photograph, and body limited to 680px. All original paragraphs retained exactly once. Original-source link and booking CTA follow the reading region. No new medical copy, fabricated quotes or stock imagery. |
| Photography parallax | Exactly two homepage images: the large clinic interior in the About spread and Dr. Anda Gutovska’s portrait. Total translation is 3% of image height, with small overscan to prevent exposed edges. Caption stays still. Opt-in directive uses visible-region observation and scroll-triggered frames, with no perpetual animation loop. |
| Contact form | Subtle valid-filled label/underline state, existing focus feedback, reserved error space with a short opacity/translation reveal, live validation summary, stable-width loading labels, and calm status states. Success replaces fields and receives focus only for an actual `received` adapter response. The existing disabled adapter remains unchanged and still reports that nothing was sent. |
| 404 | Existing catch-all retained; branded page refined with spacing, home CTA and useful service/price/contact links. Reuses complete existing LV/RU/EN vue-i18n messages. |

## Accessibility and mobile

- Page translation is removed for reduced motion; ordinary content transitions/reveals also respect the preference.
- Parallax is disabled below 900px, for coarse pointers/non-hover devices, and for reduced motion, including changes during the session.
- Touch service imagery remains static; keyboard focus retains visible feedback.
- Outgoing pages cannot receive focus. Form errors focus the first invalid field; submission results receive focus.
- No navigation, typography or video changes were made to the locked Hero. Welcome Intro implementation and visual styling are unchanged.

## Validation

- Production build: `npm run build --prefix frontend` — passed.
- Existing tests: `node --test frontend/tests/*.test.mjs` — all 10 tests passed.
- Hero integrity: `node frontend/scripts/check-hero-lock.mjs` — all 15 protected files unchanged.
- Responsive route matrix: **168 checks passed** (20 public routes plus the catch-all at 320, 375, 390, 430, 768, 1024, 1440 and 1920px). Checks headings, horizontal overflow, failed images, progress-indicator scope, and completed route transitions.
- No Vue warnings, runtime exceptions or missing-translation warnings in the route matrix or focused interaction checks.
- Direct URLs, browser back restoration, scroll-to-top navigation, rapid consecutive navigation, header boundary, article start/end progress, and reduced-motion/touch behavior checked in Chrome.
- 404 language switching checked in LV/RU/EN.
- Actual disabled form adapter checked: valid input retains the form and reports not sent.
- Loading, success replacement, focus and generic failure checked through isolated browser-only response fixtures. No frontend adapter, backend endpoint or patient-data storage was enabled for this test.
- Fresh mobile Welcome Intro, mobile-menu navigation and live reduced-motion switching checked.
- Development environment limitation: existing `http://localhost:8080/api/health` request fails because the local Go backend is not running. No backend changes made.

## Exact files changed

1. `frontend/src/App.vue` — route transitions and outgoing accessibility state.
2. `frontend/src/components/layout/SiteHeader.vue` — boundary observer and state transitions.
3. `frontend/src/components/home/ServiceIndex.vue` — pointer-aware preview selection.
4. `frontend/src/styles/editorial.css` — service images and button/link feedback.
5. `frontend/src/directives/editorialMotion.ts` — suppress competing reveals during page entry/Welcome.
6. `frontend/src/directives/photoParallax.ts` — new opt-in photo motion directive.
7. `frontend/src/views/HomeView.vue` — opt in exactly two post-Hero photos.
8. `frontend/src/components/common/ArticleProgress.vue` — new article progress component.
9. `frontend/src/views/ArticleView.vue` — editorial reading structure and progress integration.
10. `frontend/src/components/AppointmentRequestForm.vue` — field, validation, loading and result polish.
11. `frontend/src/views/NotFoundView.vue` — branded 404 and recovery links.
12. `docs/FINAL_PUBLIC_POLISH.md` — this implementation and validation report.

Dependencies added: **none**. No backend, database, API architecture, pricing, contact facts, legal content, Hero assets or Welcome Intro files changed.
