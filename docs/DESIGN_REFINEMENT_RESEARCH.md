# Public frontend refinement — 29 September 2026

## Audit before research / implementation

20 public routes inspected at 1440px and 390px; no horizontal overflow or page errors. Screenshots captured for homepage, eight service details, services, prices, about, news, four articles, contacts, two legal documents, cookie settings and mobile navigation.

| Area | Preserve | Opportunity / restraint |
| --- | --- | --- |
| Hero/header | Approved cinematic composition, booking CTA, scrubbing, typography | Completely locked; includes shared style.css, fonts, content/i18n dependencies, media and HERO_LOCK.json hashes. |
| Homepage | Architectural spreads, service preview, human doctor feature, generous rhythm | Avoid more section animation; calibrate existing reveals for touch. Journey already has accessible disclosure motion. |
| Services | Editorial numbered rows and real clinic photography | Empty grid tracks remain after arrow removal; improve image crop and keyboard feedback. No cursor tracking. |
| Service details | Clear explanation, transparent price lists, related navigation | Introduce only the existing photographic reveal; keep reading and prices still. |
| About/doctor | Strong portrait and warm editorial hierarchy | Reuse restrained mask on photography, without parallax or moving copy. |
| Prices | Search, native anchors, continuous readable tables, static category navigation | Active category currently changes only on click; reflect manual reading position. Remove table entrance motion. |
| News/articles | Clear metadata and good reading width | Give linked headlines a subtle underline; match image feedback for keyboard. Article paragraphs stay still. |
| Contact/form | Compact desktop hierarchy, native select, clear consent/errors | Refine focus without shifting borders/padding; preserve validation and backend availability behavior. |
| FAQ | Native details/summary, concise answers | Smooth reversible disclosure and a true plus/minus indicator. |
| Mobile navigation | Existing link staging, focus trap, Escape, touch-sized controls | No replacement or extra transition. |
| Footer | Restrained wordmark and useful contact/legal links | Existing feedback is sufficient. |
| Privacy/cookies | Complete localized documents, native consent dialog, keyboard access | No animation on legal text or consent controls. |
| Route changes | Immediate navigation and existing heading entrance | No exit curtain, delayed navigation or whole-page fade. |

## Research / comparison

References are ideas, not copied source or assets. No generic design skill was used.

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): evaluated scrub, pin, timeline sequencing and reveal triggers. Powerful for coordinated scenes, unnecessary for these one-shot masks; the approved Hero remains independent.
- [Anime.js text](https://animejs.com/documentation/text/), [timeline](https://animejs.com/documentation/timeline/) and [SVG](https://animejs.com/documentation/svg/): word/letter splitting, sequential effects and drawing/morphing are useful capabilities, but none addresses a current clinic usability gap. Native CSS/WAAPI covers the selected micro-interactions; neither Anime nor GSAP is added.
- [Motion for Vue](https://motion.dev/docs/vue): reviewed in-view, hover/press, enter/exit and shared layout patterns. Vue support exists, but layout/spring/exit choreography is unnecessary here. CSS for states, native WAAPI for measured disclosure and IntersectionObserver for entry is the coherent existing architecture.
- [Sketchfab dentition](https://sketchfab.com/3d-models/dentistry-skull-permanent-dentition-d207f3b038ba49e89ccab7bfa5775467), [human teeth](https://sketchfab.com/3d-models/human-teeth-c4c569f0e08948e2a572007a7a5726f2), [licenses](https://sketchfab.com/licenses): catalog/model metadata inspected; homepage fetch blocked (403). A detailed dentition model lists 1.2M triangles. Commercial rights, clinical accuracy and mobile asset cost need model-specific verification. No sufficiently justified educational use or approved explanation exists in current content; do not embed or download a model.
- [Supahero Casa Lunara](https://supahero.io/hero/casa-lunara): inspected editorial reference entry and browser presentation. Its fashion emphasis reinforces retaining the clinic's useful information hierarchy, not importing a portfolio composition. No Hero changes or reference media copied.
- [21st Origin UI accordion](https://21st.dev/@originui/components/accordion), [plus/minus](https://21st.dev/@originui/components/accordion/w-plus-minus), [input](https://21st.dev/@originui/components/input), [navigation](https://21st.dev/@originui/components/navigation-menu), [dialog](https://21st.dev/@originui/components/dialog), [FAQ guidance](https://docs.21st.dev/blog/react-faq-accordion-components): reviewed disclosure variants, visible labels, validation, focus semantics and navigation/dialog patterns. Adapt only plus/minus and disclosure continuity to native Vue/HTML; no React, Radix or Tailwind imports. Keep native select and dialog.
- [Refero Steep](https://styles.refero.design/style/75fdb89f-ca64-41b3-af36-7a78bd09448e) and [Intercom](https://styles.refero.design/style/12255b63-e506-4bc1-a4cd-d05487de32f3): studied serif/sans hierarchy, warm surfaces, hairline structure and restrained emphasis. Retain AG typography, spacing and colors; reject pill/card styling and copied brand tokens.
- [SmoothUI accordion](https://smoothui.dev/docs/components/accordion), [animated input](https://smoothui.dev/docs/components/animated-input), [image reveal](https://smoothui.dev/docs/components/scroll-image-reveal): evaluated disclosure continuity, focus feedback and masks. Adapt the calm principles; reject animated placeholders, spring flourishes, shader transitions and cursor-following previews.
- [OriginKit](https://www.originkit.dev/): inspected live catalog and input search; catalog emphasizes shaders, cursors and image effects, and input search returned no matching component. No suitable form component adopted. Also followed Origin UI's current redirect to [coss field](https://coss.com/ui/docs/components/field) and [select](https://coss.com/ui/docs/components/select), reviewing label/help/error grouping and keyboard-friendly selection. Existing native controls are the best fit.

## Candidate list recorded before code changes

| Source | Pattern / target | Fit | Implementation | Dependency | Risk / decision |
| --- | --- | --- | --- | --- | --- |
| 21st / SmoothUI | FAQ smooth height and plus/minus | Makes disclosure state legible | Reusable Vue directive + native details + CSS | None | Medium: interruption/resize/reduced-motion tests; select |
| Refero / SmoothUI | Service row image frame, link emphasis | Architectural cropping and keyboard parity | Existing grid corrected + CSS | None | Low; select |
| GSAP / SmoothUI | About, doctor, service and article photo entry | Extends existing mask vocabulary | Existing IO/WAAPI directive | None | Low; select; reduce touch distance/duration |
| Motion shared indicator concept | Price category location | Indicates reading position accurately | IntersectionObserver + CSS rule | None | Medium: anchors/search lifecycle; select |
| Refero / 21st | Editorial headline underline + image focus | Makes article navigation clearer | Inline text spans + CSS | None | Low; select |
| Origin UI / SmoothUI | Contact focus line, label emphasis | Clear active field without layout shift | Scoped CSS | None | Low; select |
| GSAP / Anime | Split headline / SVG drawing / complex timeline | Would compete with existing typography | New library and DOM splitting | GSAP or Anime | Reject: no clear reading benefit |
| Motion / 21st | Route exit and new menu/dialog system | Existing native behavior is sufficient | Vue transitions or Motion | Optional Motion | Reject: delay/duplication |
| Sketchfab | Educational tooth/crown anatomy | Potential future treatment education | Opt-in model + static accessible alternative | External embed/WebGL | Reject now: rights, clinical review and performance unverified |
| OriginKit / SmoothUI | Cursor-following / magnetic / shaders | Conflicts with calm healthcare identity | Pointer loops/WebGL | Additional runtime | Reject |

## Scope

No dependency, content, price, legal, API, database, navigation or Hero changes. Controls remain native and keyboard accessible. New hover-only image transforms apply only to fine pointers; reduced motion disables the new transitions and reveals.

## Implemented

1. Native FAQ disclosure now opens/closes in 280ms, reverses cleanly on repeated input, shows plus/minus, and settles when summary wrapping or reduced-motion preference changes. Focus remains visible during clipping.
2. Service directory images have a bounded 2.5% crop interaction and matching keyboard feedback. Removed obsolete empty arrow columns from homepage service links and directory layouts, including mobile.
3. Existing one-shot image masks now also serve About/doctor, service details and article photography. Touch/narrow entry uses 450ms, a 3% mask or 10px movement, and no stagger. Price tables no longer enter with movement. Focused content never fades away during entry.
4. Price-category rules mark the current reading section through IntersectionObserver. Native anchors, search and continuous tables remain intact; tracking respects existing document scroll padding plus section scroll margin.
5. Service/article headlines get a fine underline on pointer hover or keyboard focus; homepage news photography has keyboard parity. No arrows added.
6. Contact inputs/select/textarea have a 240ms focus line and label emphasis without shifting border/padding. Error focus stays red, native selection and validation remain unchanged.

## Verification

- Production build: `npm run build --prefix frontend` passed (Vue TypeScript + Vite).
- Existing tests: `node --test frontend/tests/*.test.mjs` — 10 passed.
- Hero integrity: `node frontend/scripts/check-hero-lock.mjs` — all 15 protected files unchanged, including video, shared CSS, fonts, copy and the Hero component. Baseline manifest unchanged.
- Post-change Chrome inspection: 8 affected page types at 1440, 768 and 390px (24 route/viewport combinations), no horizontal overflow; representative service and article details checked alongside index pages.
- Keyboard: FAQ Enter/Space, rapid reversal, focus feedback, cookie dialog Escape/focus and mobile-menu Escape/focus restoration passed.
- Prices: all six categories track manual scrolling; anchor navigation, returning to top, empty/filter/clear search and retained input focus passed. The initial test exposed combined scroll-padding/scroll-margin offsets; observer now follows that actual anchor position.
- Reduced motion: FAQ is immediate, live preference changes cancel active reveals, and added CSS pseudo-element transitions/image transforms are disabled.
- Touch emulation: 390×844 coarse-pointer viewport, FAQ tap, native service selection and reduced-motion toggle passed. Touch does not depend on hover.
- No JavaScript page exceptions or Vue warnings observed. Console network errors were traced to the pre-existing unavailable `http://localhost:8080/api/health`; backend intentionally not changed or mocked into a fake success state. The broad interaction run completed its assertions but its blanket zero-console-error assertion failed on those health requests; a focused final run confirmed their URL and passed the revised price/touch checks.
- Screenshots reviewed for service rows, homepage service/doctor spreads, About, news/articles, prices, contacts and focused FAQ/form states. All content and pricing values preserved.

## Exact changed files

| File | Purpose |
| --- | --- |
| `frontend/src/directives/accordionMotion.ts` | New reusable native disclosure animation |
| `frontend/src/directives/editorialMotion.ts` | Calmer mobile entry, focused-content protection, static price tables |
| `frontend/src/components/VisitQuestions.vue` | Use disclosure directive and plus/minus decoration |
| `frontend/src/components/AppointmentRequestForm.vue` | Focus-line/label styling only |
| `frontend/src/styles/editorial.css` | Service grids/crops, headline links, FAQ icon/focus and reduced motion |
| `frontend/src/views/ServicesView.vue` | Image frame and inline headline emphasis |
| `frontend/src/views/AboutView.vue` | Two photography reveal annotations |
| `frontend/src/views/ServiceView.vue` | Detail photography reveal annotation |
| `frontend/src/views/ArticleView.vue` | Article photography reveal annotation |
| `frontend/src/views/HomeView.vue` | News headline spans after the Hero |
| `frontend/src/views/NewsView.vue` | News headline spans |
| `frontend/src/views/PricesView.vue` | Category tracking and active rule |
| `docs/DESIGN_REFINEMENT_RESEARCH.md` | Audit, sources, pre-implementation candidates, decisions and QA |

## Future improvements

Prioritize a separate payload review of the existing icon font/CSS and real-device Safari/Firefox checks before adding further effects. If the clinic later requests treatment education, start with a clinician-approved static diagram and explanation; consider 3D only after verifying a specific model's commercial rights, accessibility alternative and measured mobile cost. No further menu, cookie-dialog or route animation is recommended now.
