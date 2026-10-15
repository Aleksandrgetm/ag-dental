# Mobile arrow consistency — investigation and approval gate

14 October 2026 · feature/final-audit

## Status

The three explicitly authorized fixes are implemented locally and visually reviewed. The initial investigation below is retained as history; the implementation and verification section supersedes its approval-gate status. Existing unrelated audit work is preserved. No production data or media changed.

## Evidence and root causes

Git commit `1ce8187` introduced ArrowIcon.vue and replaced text arrows. Its parent shows the Hero CTA using a literal `↗`; the current Hero embeds `M5 19 19 5M5 5h14v14`. Therefore the replacement changed the desktop source as well as mobile. There is no original SVG path in that Hero implementation to reuse. The original desktop glyph must be identified from its actual resolved font and captured before deriving a faithful vector; selecting another library arrow would not satisfy the request.

Current shared ArrowIcon has viewBox `0 0 24 24`, no fill, currentColor stroke, width 1.5, default butt caps/miter joins, 1em square dimensions, inline-block, vertical-align -.12em, no rotation. It uses:

- External: `M5 19 19 5M5 5h14v14`
- Left: `M20 12H4m7-7-7 7 7 7`
- Right: `M4 12h16m-7-7 7 7-7 7`

The Hero separately embeds the external path, with 1em square display:block styling. Changing the shared component alone would leave that separate Hero implementation unchanged.

News `.row-arrow` inherits 28px desktop font size from protected style.css; mobile rules set 23px there and 24px in editorial.css. Editorial container dimensions change from 46×46 to 27×35. Because the SVG uses em dimensions, mobile changes its rendered size. Hover/focus on journal rows changes background to olive, foreground to paper and translates 2px horizontally. These are source-confirmed differences, not completed visual measurements.

BookingCalendar retains `‹` and `›` in 44×44 navigation buttons with 30px serif typography. These are platform/font-dependent text chevrons, not confirmed emoji. No literal Unicode arrows were found in the current public Vue templates searched; this does not prove that a production CMS response or stale deployed bundle contains none.

## Public source inventory

| Location | Desktop/mobile source | Current behavior / investigation needed |
|---|---|---|
| Hero primary CTA | Separate inline external SVG | Same path at both widths; original desktop glyph replaced; protected file |
| Home News read-more | Shared right ArrowIcon | 1em inherits context; compare original desktop glyph and responsive computed styles |
| News list rows | Shared right ArrowIcon | Confirmed mobile dimension changes described above |
| Article breadcrumb | Shared left ArrowIcon | Same component; inherited text size/alignment needs visual comparison |
| Service detail breadcrumb | Shared left ArrowIcon | Same component; inherited text size/alignment needs visual comparison |
| Contact external Maps link | Shared external ArrowIcon | Same component; compare original desktop external glyph |
| Cookie settings Google privacy link | Shared external ArrowIcon | Same component; compare original desktop external glyph |
| Booking month previous/next | Text ‹ / › | Still font-dependent; preserve original desktop chevron shape when vectorizing |
| Header/mobile navigation | No arrow component/literal found in source search | Do not introduce arrows |
| Footer | No arrow component/literal found in source search | Runtime CMS content not inspected |
| Services cards/index | No current ArrowIcon found | Previous changes removed some arrows; do not reintroduce without evidence |
| Clinic gallery/carousel | No current arrow control found | No carousel to recreate |
| Booking step actions | No current ArrowIcon found | Preserve existing text actions; calendar chevrons listed separately |

This is a static-source inventory, not a complete runtime inventory. Search covered literal directional arrows, chevrons, SVG/icon usages and CSS arrow selectors in frontend/src. Admin instructional arrows and keyboard ArrowLeft/Right handlers are not public visual icons. Native select disclosure indicators are browser controls, not evidence of an intentional custom desktop arrow.

## Required protected change and approval

To restore the original approved desktop Hero arrow as a platform-independent vector, permission is required to change **only the decorative arrow SVG geometry/source in frontend/src/components/home/ScrollClinicHero.vue**, and then its entry in docs/HERO_LOCK.json after visual verification. Preserve button destination, typography, padding, dimensions, composition, animation, video logic and Welcome Intro. No new glyph/path has been chosen or approved yet.

If correcting responsive arrow dimensions requires editing protected frontend/src/style.css rather than an existing non-protected component rule, obtain separate approval for the exact rule before editing. No global override was introduced to bypass the lock.

## Verification and next steps

- Hero-lock check: 15/15 PASS on unchanged application sources.
- Build, frontend units, public responsive suite and Booking navigation were NOT rerun for this investigation; no application fix exists yet.
- No screenshots or desktop/mobile pixel comparisons captured yet. No iOS Safari or Android Chrome device verification claimed.
- After approval: render the pre-replacement desktop reference in isolation, resolve the actual glyph font, preserve its outline as SVG, compare each corresponding control at 1440/390/375/320, test hover/focus and localized wrapping, then run requested regressions.
- Actual deployed URL/build and any runtime-only emoji source remain unverified. Do not infer that current local source matches the mobile deployment.

## Exact files changed by this task

- docs/MOBILE_ARROW_CONSISTENCY_FIX.md (this report only).

No commit, push, merge or deployment performed.


## Authorized implementation and verification

The user subsequently approved only the Hero decorative geometry/hash change plus the unprotected News size and Booking chevron corrections.

### Verified sources, not library substitutions

- Chrome CDP `CSS.getPlatformFontsForNode` on the restored original Hero glyph identifies **HiraginoSans-W4**, system Hiragino Sans, one glyph. Computed CSS is 500 19px/19px Manrope, Arial, sans-serif: the declared fonts do not supply this arrow on the inspected Mac. CoreText extracted its actual outline at 1000 units. The new filled SVG uses that outline, currentColor, a 1000-unit square viewBox and the unchanged existing 1em/19px dimensions. No stroke-style library arrow remains in this CTA. Original appearance was reconstructed from the pre-replacement template in commit `1ce8187^`, without loading rejected video footage.
- Booking chevrons resolve to the bundled **CormorantGaramond-Regular** font, confirmed through CDP. CoreText extracted its actual left/right outlines. Filled 9×30px SVGs replace text within the unchanged 44px buttons. A 2px baseline adjustment preserves the glyph alignment. Accessible month labels, disabled states and emitted navigation events remain intact.
- News keeps its existing right-arrow SVG path, 24-unit viewBox, 1.5 stroke and hover/focus behavior. A component-scoped 28×28px size prevents mobile inherited font sizes from shrinking the icon. Responsive grid/container sizes are unchanged; they intentionally differ, while the actual arrow dimensions do not.

Only the SVG element on one Hero template line changed. No Hero script, CSS, layout, CTA destination (`/pieraksts` in this branch), media, controls, timing or Welcome Intro changed. Only that component's hash was updated; the other fourteen lock entries remain identical. Protected shared style.css and fonts.css remain unchanged.

### Visual evidence

Captured actual rendered controls in local Chrome at deviceScaleFactor 2, widths 1440, 390, 375 and 320, height 1000, reduced motion, synthetic cookie rejection and blocked API/external requests. The calendar is the actual BookingCalendar component mounted with synthetic props in the local browser; the full Booking wizard was separately regression-tested with mocked API data.

Reviewed side-by-side:

- [Hero desktop/mobile](screenshots/mobile-arrows/hero-comparison.png)
- [News desktop/mobile](screenshots/mobile-arrows/news-comparison.png)
- [Booking desktop/mobile](screenshots/mobile-arrows/calendar-comparison.png)
- [Original Hero glyph versus extracted outline](screenshots/mobile-arrows/hero-original-vs-vector.png)
- [Original Booking glyphs versus extracted outlines](screenshots/mobile-arrows/calendar-original-vs-vector.png)
- [Measured SVG properties](screenshots/mobile-arrows/metrics.json)

Corresponding arrows have identical paths, viewBoxes, dimensions, fill and stroke across all four widths. Visual review confirms matching shapes and proportions; surrounding responsive layout remains as approved. Font hinting/antialiasing can differ from SVG rasterization, so this is not a claim of pixel-identical font rendering across operating systems. The original desktop reference is the actual macOS Chrome rendering, not an assumed universal Unicode shape.

Initial captures were rejected: a cookie banner covered the mobile CTA. Investigation initially suspected screenshot scrolling; a full viewport capture identified the real obstruction. Final screenshots use the same synthetic consent state as existing public tests. No application cookie behavior was changed.

### Test results

- Frontend production build: PASS (existing large-chunk warning remains).
- Frontend unit suite: 153 PASS, zero failures. Initial restricted execution could not bind local fixture servers (EPERM); authorized rerun passed.
- New arrow browser regression: four widths, exact cross-width SVG-property comparisons PASS; eight previous/next event checks PASS.
- Public responsive regression: 480 checks across 20 routes, three locales and eight widths; zero errors.
- Booking browser regression: 172 layout checks, 31 flows including consent and navigation; zero errors. Uses synthetic intercepted API responses, not production records.
- Hero locks: 15/15 PASS after the single authorized hash update; fourteen other entries unchanged.

### Exact files changed by this arrow task

- frontend/src/components/home/ScrollClinicHero.vue
- frontend/src/components/booking/BookingCalendar.vue
- frontend/src/views/NewsView.vue
- frontend/tests/arrow-consistency-browser.cjs
- docs/HERO_LOCK.json
- docs/MOBILE_ARROW_CONSISTENCY_FIX.md
- docs/screenshots/mobile-arrows/hero-comparison.png
- docs/screenshots/mobile-arrows/news-comparison.png
- docs/screenshots/mobile-arrows/calendar-comparison.png
- docs/screenshots/mobile-arrows/hero-original-desktop.png
- docs/screenshots/mobile-arrows/calendar-original-desktop.png
- docs/screenshots/mobile-arrows/hero-original-vs-vector.png
- docs/screenshots/mobile-arrows/calendar-original-vs-vector.png
- docs/screenshots/mobile-arrows/metrics.json

### Remaining limitations

No physical iOS Safari or Android Chrome device was available; Chrome viewport emulation is not real-device verification. No production deployment or live CMS content inspection occurred. Other shared external/breadcrumb arrows were not redesigned under this narrower authorization. No claim is made that a previously deployed stale bundle has been updated. Unrelated audit cleanup, including protected shared contrast styles, remains outside this arrow change.

No production Supabase, Booking records, CMS, Admin, clinic images or configuration changed. No commit, merge, push or deployment.

## Real-iPhone follow-up: footer runtime literals

The user's subsequent iPhone screenshots exposed a gap in the original template-only inventory: Footer labels contain U+2197 in CMS literals (`literal.1ee975dd.3`, `.8`, `.9`). The new Footer presentation removes only the terminal decoration and renders the verified desktop HiraginoSans-W3 glyph outline as SVG in all locales; CMS records remain untouched. This supersedes the earlier “no arrow component/literal found” footer inventory row. See [REAL_IPHONE_UI_FIX.md](REAL_IPHONE_UI_FIX.md) for the full source, before/after screenshots and tests. This follow-up also fixes the unprotected menu scrollport and service price-preview row gap; no additional Hero hash changes occurred.
