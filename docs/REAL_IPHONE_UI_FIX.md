# Real iPhone UI fixes

14 October 2026 · `feature/final-audit`

## Scope and evidence

The three supplied real iPhone Safari/Cloudflare Tunnel screenshots are the defect evidence. Local verification uses Chrome emulation, synthetic consent and blocked API/external requests. No production database, CMS content, Booking configuration, media or tunnel deployment changed. Existing uncommitted audit/arrow changes remain preserved.

## Root causes and fixes

### Mobile navigation

The menu was a fixed full-viewport scroll container behind the fixed Header, relying on 100/112/125px padding to position its first link. Padding does not constrain scrolled or browser-focused content below an overlay. Opening also focused the first link with default browser scrolling. Thus the layout allowed Safari's focused/scrolled menu content to pass behind the Header. Chrome's initial before capture did **not** reproduce the same Safari clipping; the user's screenshot demonstrates that defect. We do not claim the exact native Safari scrolling event was reproduced locally.

The unprotected SiteHeader component now measures the actual Header bottom, reusing its ResizeObserver, and makes that the menu scrollport's top. It updates on visualViewport resize and Header size changes. The existing viewport meta does not opt into viewport-fit=cover, so Safari retains its normal safe-area viewport; env() padding also handles nonzero insets where supplied. Height uses 100dvh minus that measured offset, with a 100vh fallback. The menu has normal 20px breathing room, safe-area side/bottom padding, internal scrolling and overscroll containment. Opening resets its scroll position and focuses the first link with preventScroll. Menu transition classes, typography, closed Header geometry and focus trap remain. Menu language buttons have 44×44 minimum hit areas.

Measured first-link top after opening is 94px against a 74px Header bottom at all four mobile widths. The first link remains below the Header after landscape resizing. The last action is reachable after scrolling at both 844px and 650px viewport heights. Safe-area env() syntax is implemented, but nonzero iPhone insets and native Safari browser-bar behavior still require device retesting.

### Service price preview spacing

The screenshot is the service detail price preview, not the standalone /cenas listing. The higher-specificity editorial `.content-design .service-detail-grid { gap: 9%; }` overrides the original mobile gap. Once the grid becomes one column, the percentage row gap overflows its intrinsic block height and consumes the following section's spacing. Before measurements were -14.05 to 0px from CTA bottom to heading top across mobile locales/widths.

ServiceView now sets only the mobile grid **row-gap to 32px**, with no added heading margin, typography changes or desktop adjustment. This fixes the overflow rather than compensating downstream. The existing price-section padding produces a consistent 65px CTA-to-heading separation. Desktop remains 210.70px before and after in the tested fixture. An intermediate compensating margin was discarded after computed-style inspection identified the percentage-gap cause.

### Footer arrows

The address, Instagram and Facebook labels come from CMS literal values containing a trailing U+2197. These did not appear as arrow literals in the Vue templates, so the earlier template-only search was incomplete. iOS rendered those characters as emoji.

Footer presentation strips only that terminal decorative suffix (including optional variation selector) and adds an aria-hidden, nonfocusable SVG. Stored CMS values, visible words, URLs, target/rel attributes and natural accessible link names remain unchanged. CDP verified that the original desktop footer glyph uses **HiraginoSans-W3** (Manrope handles the words). CoreText extracted the actual glyph outline, identical in geometry to the previously verified W4 arrow. The new DesktopExternalArrow component uses this filled outline/currentColor at 1em, without a library substitution. No Unicode arrow remains in rendered footer text in LV/RU/EN. Mobile footer contact/social links have at least 44px target height; desktop spacing is unchanged.

## Before/after evidence

All 15 locale/viewport cases have service-price and footer comparisons; the 12 mobile cases also have menu comparisons. Screenshots are Chrome, not newly captured iPhone Safari results. Labels identify before/after. The original three user screenshots remain the real-device evidence in the conversation.

- [390px menu](screenshots/real-iphone-ui/lv-390-menu.png)
- [390px service prices](screenshots/real-iphone-ui/lv-390-prices.png)
- [390px footer](screenshots/real-iphone-ui/lv-390-footer.png)
- [320px menu](screenshots/real-iphone-ui/lv-320-menu.png)
- [375px menu](screenshots/real-iphone-ui/lv-375-menu.png)
- [430px menu](screenshots/real-iphone-ui/lv-430-menu.png)
- [1440px desktop prices](screenshots/real-iphone-ui/lv-1440-prices.png)
- RU/EN equivalents use the corresponding `ru-`/`en-` filenames in the same directory.
- Raw measurements: [before](screenshots/real-iphone-ui/before.json), [after](screenshots/real-iphone-ui/after.json).

Visual inspection confirms clear price separation, visible initial menu links and consistently rendered footer arrows. Footer screenshots have different scroll positions because the larger mobile hit areas increase footer height; this is not a desktop layout change.

## Tests

- Production build: PASS; pre-existing large-chunk warning remains.
- Frontend unit tests: 153 PASS.
- Focused `iphone-ui-browser.cjs`: 15 locale/viewport cases PASS (LV/RU/EN × 320/375/390/430/1440). Verifies spacing, footer text/three SVGs, no horizontal overflow, mobile first-link/header geometry, last-action reachability, landscape/short-viewport resizing, Escape close.
- Public responsive suite: 480 route/locale/width checks PASS, zero errors, including a successful final rerun on the settled source after the grid-gap correction.
- Hero locks: 15/15 PASS against the previously authorized arrow baseline. **No protected file or hash changed in this task.**
- git diff --check: PASS.

## Exact changes for this task

- frontend/src/components/layout/SiteHeader.vue
- frontend/src/components/layout/SiteFooter.vue
- frontend/src/components/common/DesktopExternalArrow.vue (new)
- frontend/src/views/ServiceView.vue
- frontend/tests/iphone-ui-browser.cjs (new)
- docs/REAL_IPHONE_UI_FIX.md (new)
- docs/MOBILE_ARROW_CONSISTENCY_FIX.md (follow-up)
- docs/screenshots/real-iphone-ui/: 42 before/after PNG comparisons plus before.json and after.json.

## Remaining limitations and handover

Retest on the original iPhone Safari tunnel session with the latest local frontend: open the menu from top and a scrolled position, expand/collapse browser bars, rotate, reach the bottom action, and inspect all footer links. No physical iPhone/Android device was available to this agent; emulated viewport resizing is not native Safari certification. No production CMS response was fetched, but the bundled imported literal values reproduce the Unicode source and the display-only suffix handling also applies to returned CMS labels.

No protected shared stylesheet override or hash update was needed. Hero video/controls and Welcome Intro were untouched. No deployment, commit, merge or push.
