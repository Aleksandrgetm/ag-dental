# Real clinic media integration

> Final status, 2026-10-16: the user confirms that the final mobile Hero works on a physical iPhone; the bounded first-load initialization was previously confirmed on three iPhones. Temporary application diagnostics have been removed and the approved dynamic-viewport cleanup is implemented. Historical investigation and approval checkpoints below are retained as chronology, not outstanding implementation instructions. Physical-device results are user-reported, not independent device testing by Codex.

**Latest verified state:** see “Approved initialization fix and contextual photography” at the end. Earlier sections retain the initial integration and approval investigation history; the former reception poster and paused status are superseded.

Date: 2026-10-15. Branch: `feature/clinic-photography`. Local integration only; no commit, push, deployment, Storage upload or production connection.

## Video source and delivery

Original: `/Users/aleksandrgetmanenko/Downloads/AG-Dental-Hero-Video.mp4` (untouched).

| Property | Original | Web copy |
|---|---|---|
| Duration | 7.257250 seconds | 7.257250 seconds |
| Resolution / aspect | 1280×720 / 16:9 | unchanged |
| Codec | H.264 High, yuv420p | H.264, yuv420p |
| Frame rate / count | 24000/1001 (~23.976), 174 | unchanged |
| Bytes | 9,780,114 | 3,298,185 |
| Audio | AAC stereo, 48 kHz | removed |
| Keyframe interval | 30 frames / 1.25125 seconds | 12 frames / 0.5005 seconds |
| Fast start | not assumed | verified `ftyp, moov, free, mdat` atom order |

Source SHA-256: `0095412044b4ea718b15ba7d789577cce059b5777c153dca04fa45076cd5fd1c`.
Output SHA-256: `8d1174ccc8d70171edbc21d1938564fe095a35f3df1a1d9ca7f01694889d6889`.

Encoding: `-map 0:v:0 -an -c:v libx264 -preset slow -crf 20 -g 12 -keyint_min 12 -sc_threshold 0 -bf 0 -pix_fmt yuv420p -movflags +faststart`. No montage reconstruction, transitions, resampling, crop or scene generation. Eight sampled frames were visually inspected. Source-to-output SSIM: **0.992735**. Size reduction **66.3%**. Mobile uses the same 720p, 3.30 MB asset: avoids duplicate source selection or changes to protected Hero logic. The source resolution limits large high-density desktop sharpness; no upscaling was applied.

Connected through unprotected `content/heroMedia.ts`; no Hero component or baseline hashes changed. Existing video-off `v-if` behavior prevents requests when the preference is stored before loading. Existing animation toggle, reduced motion, touch scrolling, error fallback and persistence remain implemented. Authentic reception still is the fallback. Rejected third-party media remains untouched for lock preservation but is not selected for public presentation.

## Selected photography

Only five of the 70 WebPs were used. Originals remain outside Git. Each has 480, 960 and 1600px WebP derivatives, quality 88, without enlargement; combined 15-image payload **2,054,110 bytes** (all variants combined, not a single-page download).

| Source | Asset | Placement |
|---|---|---|
| DSCF4390.webp | room | Home room, service index and service detail legacy room/detail slots |
| DSCF4403.webp | reception | Existing clinic editorial section; Hero still fallback |
| DSCF4411.webp | about | About opening image |
| DSCF4439.webp | exterior | Existing Contacts map-consent area on desktop |
| DSCF4450.webp | entrance | Same Contacts area on mobile |

Existing specialist portrait paths and files remain unchanged. Existing News article images/content remain unchanged. Reception imagery is not substituted for a procedure image: service consumers use the room image for the old generic clinic-original slot. No new decorative sections or galleries were added. Contacts retains its map and consent behavior; the local arrival photo occupies part of the existing placeholder while external maps are disallowed.

LV/RU/EN descriptions live in `clinicPhotography.ts`. Existing meaningful images use localized alternatives, decorative service-preview images remain empty-alt inside aria-hidden. `srcset` and `sizes` serve responsive stills; below-fold lazy loading retained; static dimensions updated for changed sources. Public replacements match only known legacy local paths: custom published CMS images, specialist portraits and News content are not overwritten. Clinic editorial reception selection also preserves custom CMS media.

## Public-page scope

Home, About, Services and Contacts existing image placements refreshed. Prices, Booking, Auth, legal pages and News were reviewed and retain their current design/content; no gratuitous photos added to forms, prices or policies. Language button appearance and Welcome Intro unchanged.

**Specialist limitation:** AdminDoctorSetup retains the existing creation/profile/portrait/publication workflow. The current public router has no `/specialisti` or specialist-detail route; About renders a single existing lead-doctor section. Therefore automatic public rendering of future specialists in that same layout is not established by this media task. No placeholder, new person, portrait replacement or speculative professional content was introduced. A separate approved public specialist-content integration is needed before promising that future published profiles appear automatically.

## Verification

- Production build passed; existing >500 kB chunk warning remains (entry JS ~1,317.79 kB raw / 295.43 kB gzip). No bundle-performance improvement claimed.
- Frontend unit suite: **155 passed**, including 2 new photo/config tests.
- Hero modes: **24** language/viewport cases passed, plus system reduced-motion checks; touch input, seeking, enable/disable, preference persistence and zero new video requests on video-off reload checked. Approved public Hero: **2 widths passed**, no rejected/test footage requests.
- Auth: **96 layout checks**, registration/login/persistence/logout/recovery/confirmation passed with synthetic mocked Auth.
- Booking: **172 layout checks + 31 flows**, mocked API, passed; no Booking configuration or data changes.
- Public routes: **480 checks across 20 routes**, passed on rerun.
- Photo layouts: final **90 route/locale/width checks passed** (6 routes × 3 languages × 5 widths: 320/375/390/430/1440). The actual specialist section is covered on About; the sixth route is `/pakalpojumi/konsultacija`.
- Mobile navigation, viewport resizing/orientation, footer SVG arrows and Prices spacing: **15 cases passed**; screenshots/results at `/tmp/ag-media-mobile-ui`.
- All **15 Hero locks passed**; `git diff --check` passed.
- Initial Hero navigation timeout and public-route aborted navigation were observed; reruns passed. They are not presented as initial successes.

Browser checks use local Chrome/Chromium emulation with external calls blocked. No physical iPhone Safari or Android device was available; no real-device success claimed. No production API/Storage writes or real patient tests.

## Screenshots

Local screenshot evidence (ignored by Git) in `docs/screenshots/clinic-media/`:

- `current-public-390.png`, `current-public-1440.png`: approved scroll-video Hero.
- `chromium-cinematic-390.png`, `chromium-cinematic-1440.png`: mode tests.
- `home-390.png`, `home-1440.png`.
- `par-mums-390.png`, `par-mums-1440.png`.
- `kontakti-390.png`, `kontakti-1440.png`.
- `pakalpojumi-390.png`, `pakalpojumi-1440.png`, service-detail screenshots.
- `cenas-390.png`, `cenas-1440.png`.

Hero viewport captures and About/Contacts page captures were visually inspected. Full-page scroll-video screenshots contain the intentional tall scroll region and are not a substitute for interactive playback inspection. Frame-seeking and mobile behavior were tested separately.

## Exact application and test files

- `frontend/src/components/home/ClinicGallery.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/content/heroMedia.ts`
- `frontend/src/services/cms/publishedMedia.ts`
- `frontend/src/services/hero/publicMedia.ts`
- `frontend/src/views/AboutView.vue`
- `frontend/src/views/ContactView.vue`
- `frontend/src/views/HomeView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/tests/hero-modes-browser.cjs`
- `frontend/tests/hero-public-browser.cjs`
- `frontend/src/content/clinicPhotography.ts`
- `frontend/tests/clinic-photography.test.mjs`
- `frontend/tests/clinic-photography-browser.cjs`
- `frontend/public/media/clinic/approved/about-1600.webp`
- `frontend/public/media/clinic/approved/about-480.webp`
- `frontend/public/media/clinic/approved/about-960.webp`
- `frontend/public/media/clinic/approved/clinic-hero.mp4`
- `frontend/public/media/clinic/approved/entrance-1600.webp`
- `frontend/public/media/clinic/approved/entrance-480.webp`
- `frontend/public/media/clinic/approved/entrance-960.webp`
- `frontend/public/media/clinic/approved/exterior-1600.webp`
- `frontend/public/media/clinic/approved/exterior-480.webp`
- `frontend/public/media/clinic/approved/exterior-960.webp`
- `frontend/public/media/clinic/approved/reception-1600.webp`
- `frontend/public/media/clinic/approved/reception-480.webp`
- `frontend/public/media/clinic/approved/reception-960.webp`
- `frontend/public/media/clinic/approved/room-1600.webp`
- `frontend/public/media/clinic/approved/room-480.webp`
- `frontend/public/media/clinic/approved/room-960.webp`

Documentation: this report is new. `docs/CLINIC_PHOTOGRAPHY_INVENTORY.md` was already untracked at the start and preserved. No originals or all-70-photo collection copied into the application.

## Remaining review

Approve desktop/mobile crops and inspect on actual iOS Safari/Android Chrome before deployment. The completed montage includes intentional soft/blurry frames between scenes; these were preserved, not “corrected.” Source remains 720p. Future public specialist-profile rendering is the explicit limitation above. No protected change is needed for the media hookup performed here. No deployment or commit authorized/performed.

## Follow-up investigation — initial frame and photo diversity (2026-10-15)

Status: paused at the explicit protected-code approval boundary; not fixed or revalidated yet.

Confirmed by extracting and visually inspecting frame zero from both original and optimized MP4: both begin with the AG exterior sign. The montage is not the cause of the incorrect initial **poster**. `heroMedia.ts` currently selects `reception-1600.webp` for both the persistent poster image and the video poster. Thus reception is explicitly displayed before video readiness, and in video-off/failure modes. Matching the poster to extracted frame zero is an unprotected configuration/media correction.

Separate initialization risk found by code inspection: `loaded()` sets `ready=true` before `measure()` schedules the scroll-position seek. The same flag controls video visibility (`is-ready`) and permits seeking. On a restored nonzero scroll position, there is no distinct “target frame presented” gate, nor an explicit pageshow/BFCache resynchronization handler. This is not evidence that every reported refresh is a seek race; actual runtime restoration/caching tests remain pending. No independent autoplay exists in the video template.

To meet the no-wrong-frame-flash and restored-position requirements robustly, proposed protected change is limited to `ScrollClinicHero.vue`: separate decoded/seek-ready state from presentation-ready state; measure current scroll after mount/layout and page restoration; seek to that target before revealing the video; reveal after the matching frame is available; reset/cancel initialization on mode changes and unmount. Preserve the existing normalized scroll mapping, distance, controls, preferences, fallback, layout, typography, CTA and animation-disabled behavior. Add and remove a pageshow handler as needed. No changes to shared CSS, Welcome Intro or other protected files are proposed. Update only that component's lock hash after approved implementation and successful visual/regression checks, never beforehand.

Repetition traced to presentation mapping: both old room and detail paths resolve to DSCF4390; servicePhoto additionally maps the old clinic-original/About image to that room, so the room occurs in Home, service index and service details. DSCF4403 appears in clinic editorial plus Hero fallback. DSCF4411 is used on About and the homepage journal feature. These are actual reference-sharing causes, not a shortage of photos. The next approved implementation should assign contextual images at individual consumer slots, preserving custom CMS media and all News/specialist portraits, rather than globally redirecting unrelated media keys.

Current-turn verification: source and delivery frame zero visually verified; 15 Hero locks pass. No protected source, hashes, website assets or production data changed during this investigation. New first-frame browser tests, before/after captures, photography replacements and full regression reruns have not yet been performed. Prior integration test results above are historical and are not claimed as verification of this follow-up fix.


## Approved initialization fix and contextual photography — 2026-10-15

### Root cause and fix

Both source and optimized video start at the exterior sign. The configured `reception-1600.webp` poster, not a wrong opening scene in the MP4, was the confirmed cause of the reception image before decoding. Replaced it with `hero-first-frame.webp`, extracted from frame zero of the approved delivery video and encoded as WebP. No montage edits or changes to the video were made in this follow-up.

The old `loaded()` immediately set the same `ready` flag used to reveal the video, then scheduled its scroll seek. This allowed an unsynchronized frame to become visible on restoration. The approved component fix separates `decoded` readiness from presentation `ready`. After loadeddata/seeked, it verifies currentTime against the latest scroll target, readyState ≥ HAVE_CURRENT_DATA, and no outstanding seek across two animation frames before revealing video. No autoplay, arbitrary time offset, continuous initialization loop or added fixed delay. The usual scroll-to-time formula and single outstanding seek remain.

`pageshow`, `pagehide`, `popstate` and visibility lifecycle now hide stale presentation and remeasure after restoration. Pending presentation/restore animation frames, timers and listeners are cancelled on suspension/unmount. Seek exceptions retain the authentic first-scene poster and invoke the existing natural-scroll fallback. Video-off still removes the media element and makes no new video requests on reload. Reduced-motion and explicit preference override remain intact.

The entire Hero template and style block were byte-compared with the saved pre-fix component and are unchanged. Only script initialization logic changed. No typography, composition, CTA, navigation, controls, Welcome Intro or other protected files changed. Only the authorized component hash changed, from `14f9ae2f0f4ddfb0145dd1baf8fb8a171d99f068de7b85db898d12f7` to `3e15f012a716361d435ce86025eac5f6a5954ce16cfa844ffd1fcbb65c4e0bee`; all other 14 entries remain identical.

### Current photo usage map

The complete 70-photo numbered inventory remains in CLINIC_PHOTOGRAPHY_INVENTORY.md; room, detail and exterior contact sheets were revisited for these choices. There is only one photographed treatment room and many near-duplicate portraits. Variation does not imply additional facilities. No staff portraits were repurposed.

| Public page / slot | Current photo | Change / preservation |
|---|---|---|
| Home Hero poster/video-off/error | Frame 0 of approved clinic-hero.mp4 | Exterior sign; replaces unrelated reception poster |
| Home Hero video | Existing optimized approved montage | Unchanged |
| Home large clinic image | DSCF4378 (`room-tall`) | Daylight side view; no longer shared DSCF4390 |
| Home clinic editorial image | DSCF4447 (`signage`) | Exterior sign detail; removes repeated woman-at-reception image |
| Home service index, general room selections | DSCF4389 (`equipment`) | Distinct equipment view; subject is still the actual same treatment room |
| Home service index, hygiene | DSCF4382 (`hygiene`) | Oral-care samples, accurately described, no procedure claim |
| Home service index, prosthetics | DSCF4380 (`consultation`) | Contextual desk/interior, not a representation of a prosthetic procedure |
| Home doctor feature | Existing approved doctor image | Unchanged |
| Home journal feature | Existing DSCF4411 presentation mapping | Preserved; not duplicated on About anymore |
| About opening image | DSCF4380 (`consultation`) | Desk and daylight/clinic atmosphere; replaces shared reception |
| About doctor portrait | Existing approved portrait | Unchanged |
| Services overview | Existing editorial list | No gratuitous photo blocks added |
| Service detail: treatment, root canal, surgery | DSCF4390 (`room`) | Shared where relevant; no misleading new facilities |
| Service detail: hygiene | DSCF4382 (`hygiene`) | Product samples, no invented clinical scene |
| Service detail: whitening | DSCF4389 (`equipment`) | Contextual equipment, no claim it depicts whitening |
| Service detail: prosthetics | DSCF4380 (`consultation`) | Contextual desk |
| Consultation / children service existing portrait references | Existing approved portrait | Pass through unchanged |
| Contacts map-consent area desktop | DSCF4439 (`exterior`) | Unchanged real exterior |
| Contacts map-consent area mobile | DSCF4450 (`entrance`) | Unchanged real entrance |
| News list/detail, CMS custom media | Existing image URLs | Not replaced or republished |
| Prices, Booking, Auth, legal pages | Existing presentation | No new images or content changes |

`sectionPhoto` and `servicePhoto` select only known local legacy presentation replacements. Custom CMS URLs and portrait references pass through untouched; tested directly. The CMS database and published content are not mutated. The homepage journal feature intentionally remains unchanged to avoid changing News presentation. Repetition between a contextually related overview and detail page is retained where useful; the collection does not contain enough distinct procedure scenes to assign a unique clinical image to every service honestly.

New selections have LV/RU/EN descriptive alternatives and 480/960/1600px WebP variants. Tall images retain their original orientation; the existing container crops remain. Home and About intrinsic dimensions were updated for these portrait sources. Existing lazy loading and `srcset` remain. No all-70 import, new section or layout redesign.

### Fresh verification results

- Production build: PASS (existing large-JS-chunk warning remains).
- Frontend unit tests: **156 passed**, including responsive local assets, localized descriptions, preserved custom CMS/portrait references, context selection, and current first-frame config.
- Initial-frame browser tests: **4 combinations passed** (Chromium and WebKit × 390/1440px). Delayed video loading showed the correct sign poster; decoded initial video was at time zero and paused. Hard reload with Chromium cache disabled, real SPA route departure/back, nonzero reload restoration, synthetic persisted pageshow/pagehide, video-off reload, and synthetic failed seek were exercised.
- Actual reload scroll restoration was **800px** in both engines at both widths. At reveal, mobile video time **2.467435s** matched the computed target; desktop **1.603833s** matched the target. Every recorded reveal had no pending seek and readyState 4. The pageshow simulation separately matched 600px. Native OS BFCache eviction conditions were not exhaustively reproduced; actual browser back navigation was exercised.
- Hero motion controls: **24 cases per engine**, Chromium and WebKit, plus reduced-motion changes/explicit override. Chromium includes dispatched touch gestures. Both suites PASS.
- Public routes: **480 checks across 20 routes**, LV/RU/EN, PASS.
- Photo/loading/responsive suite: **90 cases**, 6 routes × 3 locales × 320/375/390/430/1440px, PASS. One earlier run overlapped development HMR and lost its execution context; the clean rerun passed.
- Delayed-image reservation: **8 checks passed** across Home, About, hygiene and Contacts at 390/1440px. Approved images were held pending, then decoded: bounding-box widths/heights remained identical. This measures media-induced box shifts, not a claim of zero global CLS from fonts or unrelated startup code.
- Auth: **96 layout checks**, registration/login/persistence/logout/recovery/confirmation PASS (mocked fixtures).
- Booking: **172 layouts + 31 flows** PASS (mocked API).
- **15/15 Hero locks PASS** and whitespace diff check PASS.

Browser tests block external requests and use local synthetic API fixtures. WebKit was installed temporarily under `/tmp/ag-photo-playwright`; Safari-engine/mobile viewport emulation is not physical iPhone Safari verification. Chromium touch/mobile emulation is not a physical Android Chrome test. No production Supabase, Booking, CMS News, Storage or legal changes.

### Before/after and visual evidence

Evidence directory: `docs/screenshots/hero-initialization/` (local, ignored by Git).

- `before-reception-fallback-390.png`: preserved earlier **fallback-mode** screenshot showing the incorrect reception poster, not claimed as an instrumented before-refresh capture.
- `chromium-poster-390.png`, `chromium-poster-1440.png`: first-scene poster while video requests are deliberately held.
- `webkit-poster-390.png`, `webkit-first-video-390.png`: Safari-engine emulation, sign both before and after decoded video readiness.
- `*-first-video-*.png`, `*-decoded-first-*.png`: first visible Hero and decoded source-frame evidence.
- `*-restored-*.png`: appropriate later frame at restored scroll, rather than forcibly resetting it to zero.
- `*-video-off-*.png`, `*-seek-failure-*.png`: authentic sign fallback with normal scrolling.
- `results.json`: readiness/target evidence for both engines.
- `photos/about-editorial-image-390.png`, `photos/clinic-about-photo-390.png`, `photos/about-page-section-1440.png`, `photos/service-detail-image-390.png`: visually inspected new compositions.
- `image-layout.json`: exact photo URLs and before/after stable box dimensions.

### Exact files changed in this follow-up

- `frontend/src/components/home/ScrollClinicHero.vue` — authorized initialization logic only.
- `docs/HERO_LOCK.json` — only its component hash.
- `frontend/src/content/heroMedia.ts` — first-scene poster.
- `frontend/src/content/clinicPhotography.ts` — contextual selections and localized descriptions.
- `frontend/src/services/hero/publicMedia.ts` — re-export contextual helpers.
- `frontend/src/components/home/ClinicGallery.vue` — signage slot, custom CMS override preserved.
- `frontend/src/components/home/ServiceIndex.vue` — contextual preview selections.
- `frontend/src/views/HomeView.vue` — distinct room image/dimensions; journal and doctor unchanged.
- `frontend/src/views/AboutView.vue` — desk/interior image/dimensions; portrait unchanged.
- `frontend/src/views/ServiceView.vue` — slug-aware contextual image selection.
- `frontend/tests/clinic-photography.test.mjs` — new asset and preservation assertions.
- `frontend/tests/hero-initialization-browser.cjs` — first-frame/history/failure regressions.
- `frontend/tests/clinic-image-layout-browser.cjs` — delayed-image geometry and focused screenshots.
- `docs/REAL_CLINIC_MEDIA_INTEGRATION.md` — this follow-up evidence.

New asset files under `frontend/public/media/clinic/approved/`: `hero-first-frame.webp`; `room-tall-{480,960,1600}.webp` (DSCF4378); `consultation-{480,960,1600}.webp` (DSCF4380); `hygiene-{480,960,1600}.webp` (DSCF4382); `equipment-{480,960,1600}.webp` (DSCF4389); `signage-{480,960,1600}.webp` (DSCF4447). Braces enumerate each of the three actual files. Prior integration changes remain in the working tree; no reset or discard occurred.

### Remaining limitations

Physical iPhone/Android verification and final client crop approval remain. There are intentionally still some related treatment-room views because the real collection shows one room. No unrelated facilities were invented. The pre-existing public specialist-profile expansion limitation remains outside this task. No deployment, commit, merge or push occurred.
