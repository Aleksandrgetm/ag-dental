# Public website implementation

## Run

```sh
cd frontend
npm install
npm run dev
npm run build
```

Continue using the existing ignored frontend environment with `VITE_API_URL` pointing to the API base (including `/api`). The existing backend and its ignored environment are unchanged. Its health route remains `GET /api/health`. The public shell invokes the original `getHealth()` through the clinic Pinia store; service status is not presented as patient-facing UI. Booking currently offers telephone and email contact, with a clear confirmation explanation. No appointment is recorded automatically.

## Structure

- `src/content/clinic.ts`: verified contacts, localized clinic/service copy and replaceable media registry.
- `src/content/prices.json`: 69 source rows in six categories, including an explicit review flag.
- `src/content/articles.ts`: four migrated posts with original dates and sources.
- `src/i18n/index.ts`: LV/RU/EN interface translations and optional language persistence.
- `src/components/home/ScrollClinicHero.vue`: 500vh sticky desktop tour; 360vh on mobile; scroll-to-time seeking, interpolated progress and seek throttling. No autoplay, wheel interception or artificial scroll lock. Poster-first rendering, media error/timeout fallback, seek watchdog, reduced motion, skip link and manual static option.
- `src/components/layout`: responsive site shell and keyboard-accessible mobile menu.
- `src/style.css`: shared design tokens and responsive editorial layouts.
- `src/stores/clinic.ts`: existing API health integration boundary; future booking can use separate service/store modules without changing content views.
- `src/views`: route-based public pages, with lazy loading and missing-content fallbacks.

## Deployment notes

Serve Vue history routes with an `index.html` fallback while preserving real static-file 404s. The API remains a separate existing service; do not send `/api` requests through the frontend history fallback. Match the frontend origin in the existing backend CORS configuration when deploying beyond the existing localhost environment. Supply `VITE_API_URL` at build time. This task did not deploy or modify backend CORS.

The supplied video is 35 MB. The hero has static fallback controls; test seeking on real iOS/Android hardware before release. A later authorized media optimization could supply fast-seeking encodes, but the user's original video was deliberately preserved. Font files and poster frames are served locally.

## Verification

- TypeScript and Vite production build pass.
- Browser smoke checks cover all page types, missing routes, missing service/article slugs, desktop and 390px layouts, menu language switching and reduced motion.
- Video remained paused and non-autoplaying; scrolling forward to 1800px yielded approximately 11.2 seconds, then backward to 700px approximately 4.37 seconds.
- Existing live API health returned `status: ok`, `service: ag-dental-api`, `database: connected`.
- Mobile checks cover all main routes in LV/RU/EN, broken images, horizontal overflow and video error fallback.

See `CONTENT_AUDIT.md` and `CONTENT_REVIEW_REQUIRED.md` for publication requirements and exact language scope.

## September 28 refinement

The approved Hero and its shared dependencies are locked by `docs/HERO_LOCK.json`; validate them with `node frontend/scripts/check-hero-lock.mjs` from the repository root. New post-Hero and interior styles live in `src/styles/editorial.css`, with bounded motion in `src/directives/editorialMotion.ts`. Research, design decisions and validation are recorded in `docs/REFINEMENT_RESEARCH.md`; the limited security review is in `docs/SECURITY_REVIEW.md`. No animation dependencies or backend changes were added.

### Authorized Hero text refinement

The subsequent text-only request supersedes the earlier lock for Hero typography rules in `src/style.css`. All chapters now use one fixed-height composition area (680px maximum width), so differing headline lengths and the empty phase of the existing out-in transition cannot recenter the container. Desktop is anchored at 50% viewport height; mobile uses 24px side insets and a 16svh bottom offset. Short landscape screens use a compact shared anchor below the header. Middle headlines are capped at 88px instead of 100px, with responsive mobile sizes; transitions use opacity and ±12px vertical movement. The existing gradient remains sufficient and unchanged.

Only the stylesheet hash in `HERO_LOCK.json` was refreshed for this authorized exception. The Hero Vue component, copy, fonts, MP4, poster, video synchronization, scroll distance, header, controls, and all other website styling remain unchanged.

Validation: production build and whitespace checks pass. Browser measurements confirm identical settled anchor and headline origins across all four chapters and reverse scrolling in Latvian, Russian, and English at 1440×900, 1024×768, 768×1024, 390×844, 320×700, 844×390, 667×375, and 568×320. Text and CTA fit above the controls at each size. Desktop/mobile animation-frame sampling confirms an unchanged container rectangle, no horizontal transition movement, and at most 12px vertical movement. Video time mapping, original tour heights, manual static mode, and reduced-motion mode pass. All other protected file hashes still match the previous baseline.
