# Hero & mobile experience — final local report

## Outcome and approval boundary

Implemented on `feature/hero-mobile-fix`, based on `0e5ab93`. The implementation stage performed no Git publication or production operation. A subsequent user-authorized Git review is recorded below; no merge, deployment, production call, database write or upload is part of that review.

**Cinematic scroll-video remains implemented and is the default when approved footage is configured. It is not permanently replaced by a static design.** No approved real AG Dental film is currently configured. The current public rendering therefore honestly reports the missing video and shows a neutral abstract brand visual. Rejected footage is not a fallback. Supplying and approving real footage is a launch blocker, not a completed media replacement.

The user's latest correction supersedes the initial three-mode proposal: disabling animation pauses the frame and releases the sticky scroll distance; it does **not** start an independently autoplaying background movie. Video-off is a separate preference that unloads the media completely. Re-enabling either requires no page reload.

## Root causes and implementation

- The previous Hero had no user preference controls. Reduced motion was checked only after mounting, so its initial `preload=auto` video could already be requested.
- Previous interpolation scheduled repeated animation frames while repeatedly seeking compressed video. Actual performance depends on encoding/device; no claim is made that this alone explained every reported lag.
- Native document scrolling and CSS sticky positioning already drove the Hero; there was no wheel-only handler to replace. The new path remains native, passive and touch-compatible.
- One outstanding seek is now allowed at a time. Scroll/resize events coalesce through animation frames; `seeked` uses the newest target, with a 1/30-second threshold. There is no perpetual smoothing loop. Failed/throwing/stalled seeks and load timeouts release the sticky experience. Three completed seeks that fail to advance trigger fallback rather than an endless decode loop.
- Scroll progress uses the actual sticky viewport height, matching its `svh` geometry. Changing mode preserves the visible section/content anchor when the scroll distance changes; resize does not programmatically reposition the page.
- Disabled animation stops the scroll listener/animation scheduling and pauses video. Hidden/offscreen activity is suspended. Video-off removes the source, calls `load()` to release it, and removes the element; a persisted off preference is read before initial rendering.
- Preferences tolerate restricted/corrupt storage. System reduced motion applies until an explicit user preference exists. A scoped override permits explicit animation opt-in even when global reduced-motion CSS would otherwise hide the video. Shared CSS and Welcome Intro are unchanged.
- LV/RU/EN controls have native button keyboard behavior, visible focus, pressed state, 44px minimum height and spacing. Headline, CTA destination, typography and composition are retained.
- Public Unicode arrows were replaced with consistent decorative SVGs. Internal/external link destinations and existing arrow placement are unchanged.

## Rejected-media handling

`docs/CONTENT_AUDIT.md` identifies the current film and `tour-poster.jpg`, `tour-room.jpg`, `tour-detail.jpg` as development imagery, not evidence of the clinic's facilities. The original registry, media files and CMS records remain intact. A **read-only public presentation filter** replaces those references with `/media/clinic/neutral-brand.svg`, including references supplied by the existing CMS. Neutral imagery has empty decorative alt text rather than claiming to show a clinic interior. No CMS mutation, import or publication behavior changed.

`frontend/src/content/heroMedia.ts` is the explicit reviewed configuration point for future approved footage. It currently contains an empty `approvedHeroVideo`. Synthetic footage is accepted only by a development build through `VITE_HERO_TEST_VIDEO=/__hero-test.mp4`; the production build contains no test clip. Original source files remain on disk, including their historical public paths, but no tested public rendering requests them. No claim is made that retained source files were deleted or access-restricted.

## Hero-lock impact

- Original 15-entry baseline preserved in `docs/HERO_LOCK_PRE_MOBILE.json`.
- Only `ScrollClinicHero.vue` has an authorized new hash in `docs/HERO_LOCK.json`.
- **The other 14 hashes are identical**, including `clinic.ts`, shared CSS, i18n bootstrap, fonts, video and poster.
- Existing CTA destination normalization is retained. No lock was disabled or deleted. A new regression checks the scope of the baseline exception.
- All 15 current locks pass. This is an explicitly approved baseline change, not a claim that the Hero component's original bytes remain identical.

## Verification executed

- Frontend production build: PASS; existing large-bundle advisory remains.
- Frontend unit/HTTP tests: **150 PASS, zero failures/skips**.
- Hero synthetic browser matrix: **24 PASS** (LV/RU/EN × 320, 375, 390, 430, 768, 1024, 1440, 1920px).
- Matrix covers default cinematic seeking, animation disable/enable, release to normal scrolling, separate video-off, persisted off reload with no video requests, re-enable, error fallback, SVG CTA, no horizontal overflow, viewport/orientation changes, reduced-motion changes and explicit opt-in.
- Chrome touch-event emulation at phone widths: PASS; reaches subsequent content. **Not a real Android phone test.**
- Current no-approved-media configuration: 390/1440px PASS; zero rejected/test-film requests while scrolling the full homepage, no video element, disabled controls and a clear missing-media notice.
- Existing public route/responsive suite: **480 checks PASS**.
- Existing Auth browser suite: **96 checks PASS**.
- Existing Booking browser suite: **172 layout checks + 31 flows PASS** (mocked API; no production or real appointments).
- Hero locks: **15/15 PASS**. Whitespace check: PASS.
- WebKit launch attempted but unavailable: local `webkit-2336/pw_run.sh` is absent. **iOS Safari, real Android Chrome and hardware decoding have not been verified.** No mobile-device result is inferred from Chrome emulation.

Initial test corrections: the sandbox blocked localhost HTTP fixtures, so the suite was rerun with permitted local networking. A mocked video response did not provide usable seeking; the final tests used the local server's real range-capable response. An early reduced-motion test asserted before Vue mounted; it now waits for the Hero. CMS registry tests exposed that changing original media identifiers would break reference invariants, so those edits were removed and the public-only filter was used. No failing assertion was removed or weakened.

## Measured performance (synthetic, local Chrome)

4-second, 640×360, 24fps synthetic H.264 test pattern; 31 scroll samples spaced 50ms apart. No third-party clinic footage was played. These results do not predict production-footage performance or represent a controlled before/after benchmark.

| Width | Video transfer including response overhead | Seek events | Max sampled media-time lag | Main-thread task time during scroll test | Idle extra seeks/decoded frames | Off reload video requests | Settled layout shift |
|---|---:|---:|---:|---:|---:|---:|---:|
| 390 | 418,952 bytes | 33 | 0.396s | 0.069s | 0 / 0 | 0 | 0 |
| 1440 | 418,952 bytes | 31 | 0.000s | 0.086s | 0 / 0 | 0 | 0 |

Decoded frames are measured using the browser video-quality counter, not GPU profiling. The one-second paused interval produced no additional decoded frames. Initial cold development-page shift totals were approximately **0.94 mobile / 0.71 desktop**, mainly the footer appearing before the route mounts, plus font/layout settling. These are raw observed shift totals, not Lighthouse scores or field Core Web Vitals. The settled measurement was zero, but startup layout movement remains a limitation outside this scoped Hero change. The mobile sampled lag also means no universal smoothness claim is justified. Repeat performance/seek tests with the approved film and real devices before launch.

## Screenshots (local generated evidence, ignored by Git)

- [Current public missing-media state, mobile](screenshots/hero-mobile/current-public-390.png)
- [Current public missing-media state, desktop](screenshots/hero-mobile/current-public-1440.png)
- [Synthetic cinematic mode, mobile](screenshots/hero-mobile/chromium-cinematic-390.png)
- [Synthetic cinematic mode, desktop](screenshots/hero-mobile/chromium-cinematic-1440.png)
- [Simulated failure fallback, mobile](screenshots/hero-mobile/chromium-390.png)
- [Simulated failure fallback, desktop](screenshots/hero-mobile/chromium-1440.png)

## Reproduction

From the repository root, generate a synthetic clip only for local testing:

```sh
ffmpeg -f lavfi -i 'testsrc2=size=640x360:rate=24:duration=4' -c:v libx264 -preset fast -g 12 -pix_fmt yuv420p -movflags +faststart /tmp/ag-hero-synthetic.mp4
cp /tmp/ag-hero-synthetic.mp4 frontend/public/__hero-test.mp4
```

From `frontend`, start an isolated Vite server on 5197 with `VITE_HERO_TEST_VIDEO=/__hero-test.mp4`, `VITE_API_URL=/api`, synthetic Auth configuration and `VITE_BOOKING_DEMO=false`. Run `tests/hero-modes-browser.cjs` and `tests/hero-performance-browser.cjs` with a local Playwright installation. Run another server on 5198 without the test-video variable for `tests/hero-public-browser.cjs`. Each test rejects non-local origins. Remove **only** the generated `frontend/public/__hero-test.mp4` before the production build; this task did so and verified it is absent from `dist`. Never stage the fixture or substitute the rejected film.

## Remaining limitations / next steps

1. Clinic must provide and explicitly approve real AG Dental footage (and an optional approved poster). Configure its new source path in `heroMedia.ts`, then repeat media/network/browser tests. Do not reuse the rejected film under a renamed path.
2. Run real iOS Safari and Android Chrome acceptance, including low-end hardware, browser chrome changes, landscape, accessibility text scaling and network failures. WebKit installation alone would still not prove real-device behavior.
3. Benchmark the actual approved encode; current synthetic results do not establish real-film transfer/decoding cost. Startup page layout movement and existing bundle advisory remain documented.
4. Public-video approval is not deployment authorization. No production, Booking, CMS, Admin or Welcome changes were performed.

## Exact changed/new files

- `docs/HERO_LOCK.json`
- `docs/HERO_LOCK_PRE_MOBILE.json`
- `docs/HERO_MOBILE_FINAL_REPORT.md`
- `frontend/public/media/clinic/neutral-brand.svg`
- `frontend/scripts/check-hero-lock.mjs`
- `frontend/src/components/common/ArrowIcon.vue`
- `frontend/src/components/common/CmsMetadata.vue`
- `frontend/src/components/home/ClinicGallery.vue`
- `frontend/src/components/home/ScrollClinicHero.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/components/privacy/CookieConsent.vue`
- `frontend/src/content/heroControls.ts`
- `frontend/src/content/heroMedia.ts`
- `frontend/src/services/hero/preferences.ts`
- `frontend/src/services/hero/publicMedia.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ArticleView.vue`
- `frontend/src/views/ContactView.vue`
- `frontend/src/views/CreatedContentView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/src/views/ServicesView.vue`
- `frontend/vercel.json`
- `frontend/tests/deployment-guard.test.mjs`
- `frontend/tests/hero-modes-browser.cjs`
- `frontend/tests/hero-modes.test.mjs`
- `frontend/tests/hero-performance-browser.cjs`
- `frontend/tests/hero-public-browser.cjs`

Generated screenshot files are listed above; no screenshot of a real patient or production record was captured. Temporary fixture was removed.

## Authorized Git review

The subsequent user request authorizes one commit (`feat(hero): improve mobile scrolling and add motion controls`) and a push only to `feature/hero-mobile-fix`. Review removed an empty import and normalized adjacent import formatting; application behavior and protected component hashes are unchanged.

The existing Vercel guard covered only `feature/final-development`. This review adds an explicit `feature/hero-mobile-fix: false` exclusion and updates the exact configuration assertion. Other branches are unchanged. This follows [Vercel's branch deployment configuration](https://vercel.com/docs/project-configuration/git-configuration). GitHub reported zero repository workflows and no existing deployments for this branch before pushing. No custom Git hooks were present. These checks cover the available repository integration evidence, not unknown external automation.

Fresh pre-commit verification passed: frontend build, 150 unit/HTTP tests, 24 Hero responsive/mode cases, two no-approved-media checks, 480 public-route checks, 96 Auth checks, 172 Booking layout checks plus 31 flows, and all 15 Hero locks. The staged audit covered all 29 reviewed files and found no credentials, private data or unintended changes. The Git task's final response records the resulting commit and remote verification. Synthetic footage is removed before building/staging; ignored local screenshots, environment files and private configuration are not staged.
