# Clinic media commit review — 2026-10-16

Branch: `feature/clinic-photography`. Reviewed baseline: `1499eb1`.

## Scope and preservation

Approved optimized clinic assets and contextual presentation mappings, exterior-sign poster, bounded same-element iOS initialization, dynamic viewport coverage, regression tests and implementation history. Only the authorized Hero component lock entry changed; all other protected files remain unchanged. Specialist portraits, CMS News records/images, Booking, legal content, language controls and Welcome Intro are preserved. No production connection or data mutation was performed.

Original media remains outside Git. Temporary diagnostics are absent from source and production bundles. The historical cleanup proposal `docs/MOBILE_HERO_CLEANUP_PROPOSED.patch` is intentionally left untracked; screenshots and logs remain ignored/local. Investigation reports contain historical checkpoints explicitly marked as superseded by the final status.

## Fresh verification

- Production build PASS; existing large-chunk warning remains (~1,319 kB raw entry bundle).
- Frontend unit tests: 156 PASS, no failures/skips. Initial sandbox run could not bind test HTTP listeners; authorized rerun passed.
- Initial-frame/refresh/restoration/back-navigation/failure: Chromium and WebKit at 390/1440, all four combinations PASS.
- Hero modes: 24 Chromium cases PASS, including reduced motion, preferences, video-off, animation controls and touch behavior.
- Gesture preparation: six scenarios PASS (success, rejection, timeout, element removal, video-off, reduced motion).
- Metadata-only cold touch guard, restoration readiness recovery and stale-element events PASS; decoded pixels change without a toggle.
- Safe fallback and diagnostic absence, including former debug query: PASS.
- Public approved footage: two widths PASS, no rejected/test-media requests.
- Photography: 90 route/locale/viewport cases PASS; LV/RU/EN at 320/375/390/430/1440.
- Delayed-image geometry: eight cases PASS, dimensions unchanged after decoding.
- Viewport coverage: 14 Chromium/WebKit combinations PASS at 320/375/390/430/768/1024/1440, heights 844 → 664 → 844, forward/reverse synchronization and section release.
- All 15 Hero locks PASS. Whitespace check PASS.

Browser checks are emulation; physical first-load success on three iPhones and final mobile Hero acceptance are user-confirmed. Real Android hardware was not independently tested.

## Security and push safety

Reviewed candidate and staged text for private keys, privileged Supabase keys, connection URLs with passwords and JWT/token patterns: no findings. No environment files, backups, patient records, temporary traces or source-media archive staged. Delivery images visually reviewed; no patient records apparent. Derived media has no EXIF/XMP metadata in inspected variants.

The user separately approved adding `feature/clinic-photography: false` to Vercel's existing `git.deploymentEnabled` map and its unit guard. No overlapping enabling rule exists. No repository Actions workflows or configured repository webhooks were found. The [official Vercel configuration](https://vercel.com/docs/project-configuration/git-configuration) documents that this branch setting prevents automatic deployments. Push is restricted to the named branch; no force push, merge or deployment command.

## Exact files in this commit series

- `docs/CLINIC_MEDIA_COMMIT_REVIEW.md`
- `docs/CLINIC_PHOTOGRAPHY_INVENTORY.md`
- `docs/HERO_LOCK.json`
- `docs/IPHONE_HERO_FIRST_LOAD_FIX.md`
- `docs/MOBILE_HERO_GREEN_GAP_FIX.md`
- `docs/MOBILE_SCROLL_VIDEO_FIX.md`
- `docs/REAL_CLINIC_MEDIA_INTEGRATION.md`
- `frontend/public/media/clinic/approved/about-1600.webp`
- `frontend/public/media/clinic/approved/about-480.webp`
- `frontend/public/media/clinic/approved/about-960.webp`
- `frontend/public/media/clinic/approved/clinic-hero.mp4`
- `frontend/public/media/clinic/approved/consultation-1600.webp`
- `frontend/public/media/clinic/approved/consultation-480.webp`
- `frontend/public/media/clinic/approved/consultation-960.webp`
- `frontend/public/media/clinic/approved/entrance-1600.webp`
- `frontend/public/media/clinic/approved/entrance-480.webp`
- `frontend/public/media/clinic/approved/entrance-960.webp`
- `frontend/public/media/clinic/approved/equipment-1600.webp`
- `frontend/public/media/clinic/approved/equipment-480.webp`
- `frontend/public/media/clinic/approved/equipment-960.webp`
- `frontend/public/media/clinic/approved/exterior-1600.webp`
- `frontend/public/media/clinic/approved/exterior-480.webp`
- `frontend/public/media/clinic/approved/exterior-960.webp`
- `frontend/public/media/clinic/approved/hero-first-frame.webp`
- `frontend/public/media/clinic/approved/hygiene-1600.webp`
- `frontend/public/media/clinic/approved/hygiene-480.webp`
- `frontend/public/media/clinic/approved/hygiene-960.webp`
- `frontend/public/media/clinic/approved/reception-1600.webp`
- `frontend/public/media/clinic/approved/reception-480.webp`
- `frontend/public/media/clinic/approved/reception-960.webp`
- `frontend/public/media/clinic/approved/room-1600.webp`
- `frontend/public/media/clinic/approved/room-480.webp`
- `frontend/public/media/clinic/approved/room-960.webp`
- `frontend/public/media/clinic/approved/room-tall-1600.webp`
- `frontend/public/media/clinic/approved/room-tall-480.webp`
- `frontend/public/media/clinic/approved/room-tall-960.webp`
- `frontend/public/media/clinic/approved/signage-1600.webp`
- `frontend/public/media/clinic/approved/signage-480.webp`
- `frontend/public/media/clinic/approved/signage-960.webp`
- `frontend/src/components/home/ClinicGallery.vue`
- `frontend/src/components/home/ScrollClinicHero.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/content/clinicPhotography.ts`
- `frontend/src/content/heroMedia.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/services/hero/publicMedia.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ContactView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/tests/clinic-image-layout-browser.cjs`
- `frontend/tests/clinic-photography-browser.cjs`
- `frontend/tests/clinic-photography.test.mjs`
- `frontend/tests/deployment-guard.test.mjs`
- `frontend/tests/hero-fallback-diagnostics-browser.cjs`
- `frontend/tests/hero-initialization-browser.cjs`
- `frontend/tests/hero-initialization-gesture-browser.cjs`
- `frontend/tests/hero-metadata-readiness-browser.cjs`
- `frontend/tests/hero-modes-browser.cjs`
- `frontend/tests/hero-public-browser.cjs`
- `frontend/tests/hero-readiness-browser.cjs`
- `frontend/tests/hero-viewport-coverage-browser.cjs`
- `frontend/vercel.json`
