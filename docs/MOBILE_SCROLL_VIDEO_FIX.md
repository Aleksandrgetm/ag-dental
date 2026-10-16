# Mobile scroll-video investigation — 2026-10-15

> Final status, 2026-10-16: the user confirms that the final mobile Hero works on a physical iPhone; the bounded first-load initialization was previously confirmed on three iPhones. Temporary application diagnostics have been removed and the approved dynamic-viewport cleanup is implemented. Historical investigation and approval checkpoints below are retained as chronology, not outstanding implementation instructions. Physical-device results are user-reported, not independent device testing by Codex.

Status: **real iPhone failure unresolved; protected implementation unchanged**. Branch: `feature/clinic-photography`.

## Observed failure and limits

The owner confirms that finger scrolling works, the Hero occupies its expected scroll distance, but its image never visibly changes. The page subsequently reaches the next section normally. This excludes a permanent scroll trap as the reported symptom; it does not prove that `video.currentTime` advances. The affected iPhone session is not accessible to the available browser tools (only desktop Chrome is connected). iOS version, power settings and the current tunnel URL have not been supplied. No real Android result is available.

## Code findings

- `ScrollClinicHero.vue` uses a passive native window `scroll` listener, not wheel interception. No Hero touch cancellation or `touch-action` restriction was found.
- Video uses `muted`, `playsinline`, no autoplay and no `play()` calls. Cinematic preload is `auto`, which is a browser hint, not a decoding guarantee.
- `update()` refuses to seek until `decoded` is true. On initial load, that flag comes from `loadeddata`, not `loadedmetadata`. Metadata-only loading can therefore leave scrolling active without seeking until the 12-second failure fallback. This is a conditional code path, **not an established explanation of this iPhone**.
- The video remains opacity zero until `presentDecodedFrame()` observes a non-seeking frame within 1/30 second of the current scroll target across two animation frames. New seeks cancel that pending reveal. Slow decoding/continuous motion could delay initial visibility. Once ready, normal scroll seeks do not deliberately hide it.
- The poster precedes the video and has no overriding z-index. The shade is a translucent overlay. There is no unconditional poster layer above a ready video in the inspected CSS.
- `seeked`/`currentTime` are checked, but actual compositor presentation is not observed using `requestVideoFrameCallback`. A time change alone is not proof that the user saw a new frame.
- Explicit saved preferences and system reduced motion can make the Hero static. These shorten the Hero rather than retaining the full cinematic distance, so they are less consistent with the reported symptom. The actual device preference is still unknown.
- Seeks have a 2.5-second watchdog; three inaccurate completions fall back. No unbounded seek retry or automatic source reload loop was found.

No causal fix has been selected. Adding touch cancellation, autoplay, a new encoding, or a guessed Safari workaround would be speculative.

## Media and transport

`frontend/public/media/clinic/approved/clinic-hero.mp4`:

- H.264 High, level 3.1, yuv420p; 1280×720; 24000/1001 fps; no B frames.
- 7.257250 seconds; 3,298,185 bytes; 15 keyframes, maximum interval 0.5005 seconds.
- Fast start: `moov` at byte 32, `mdat` at byte 1676.
- Local Vite range request `bytes=0-1`: HTTP 206, `Content-Type: video/mp4`, `Accept-Ranges: bytes`, `Content-Range: bytes 0-1/3298185`, two-byte body.
- These checks do **not** verify the Cloudflare tunnel or iPhone decoder. No separate mobile source was generated; the inspected encoding supplies no evidence that re-encoding is necessary.

## Browser evidence

Isolated local Vite on port 5199, synthetic frontend configuration, external requests blocked. No production API use.

| Engine/input | Initial time | Forward | Reverse | Pixel change | Video visibility |
|---|---:|---:|---:|---|---|
| Desktop Chrome, 390×844, CDP synthetic touch | 0 | 1.727008 | 0.131581 | Different decoded canvas hashes | opacity 1, display block |
| Desktop WebKit, 390×844, programmatic scroll | 0 | 1.973724 | 0.394745 | Different decoded canvas hashes | opacity 1, display block |

All sampled frames were paused, not seeking, readyState 4. Screenshots visually show different frames. WebKit programmatic scrolling is **not iPhone touch testing**; Chrome mobile emulation is **not Android hardware testing**.

Evidence (local ignored artifacts): `docs/screenshots/mobile-scroll-video/results.json` and six `ag-mobile-{chrome,webkit}-{initial,forward,backward}.png` screenshots. The cookie banner is visible in these captures; the upper video region and decoded-pixel samples still distinguish the frames.

## Required real-device diagnostic

Use Safari Web Inspector on a Mac connected to the affected iPhone: enable Web Inspector in the iPhone Safari advanced settings, select that device and its affected page in the Mac Safari Develop menu. Run the snippet below, swipe down and up for 15 seconds, then copy its JSON output. It reads only Hero state, installs temporary listeners and observes frame callbacks. It does not seek, play, reload, transmit data, read authentication storage, or change preferences. If remote inspection is unavailable, report that limitation; a separately approved local diagnostic UI can be prepared without changing protected files.

```js
(() => {
  const v = document.querySelector('.tour-video');
  const s = document.querySelector('.tour');
  if (!v || !s) return console.log('No Hero video element', {static: s?.classList.contains('tour-static')});
  const samples = [], events = [], presented = [];
  let callback;
  const sample = () => {
    const b = document.querySelector('.tour-viewport');
    const css = getComputedStyle(v);
    samples.push({y: scrollY, target: Math.max(0, Math.min(1,
      -s.getBoundingClientRect().top / Math.max(1, s.offsetHeight - b.offsetHeight))),
      time: v.currentTime, duration: v.duration, readyState: v.readyState,
      networkState: v.networkState, seeking: v.seeking, paused: v.paused,
      readyClass: v.classList.contains('is-ready'), opacity: css.opacity,
      display: css.display, errorCode: v.error?.code || null,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      static: s.classList.contains('tour-static')});
  };
  const names = ['loadedmetadata', 'loadeddata', 'seeking', 'seeked', 'waiting', 'stalled', 'error'];
  const log = e => events.push({event: e.type, time: v.currentTime, state: v.readyState});
  names.forEach(n => v.addEventListener(n, log));
  const observe = (_, m) => {
    presented.push({mediaTime: m.mediaTime, presentedFrames: m.presentedFrames});
    callback = v.requestVideoFrameCallback(observe);
  };
  if (v.requestVideoFrameCallback) callback = v.requestVideoFrameCallback(observe);
  sample();
  const timer = setInterval(sample, 250);
  setTimeout(() => {
    clearInterval(timer);
    names.forEach(n => v.removeEventListener(n, log));
    if (callback !== undefined) v.cancelVideoFrameCallback(callback);
    console.log(JSON.stringify({samples, events, presented}));
  }, 15000);
})();
```

Interpretation:

- Target changes, time stays zero, readyState 1: readiness/decoding gate; inspect metadata vs loadeddata and network.
- Time changes, opacity zero/no ready class: initialization reveal path, not missing touch input.
- Time changes, opacity one, presented frames do not change and visible image is static: investigate decoder/compositor. A missing callback alone is insufficient proof, especially for paused video.
- Persistent seeking: investigate range delivery and seek completion.
- Video removed/static mode: inspect fallback status and preferences.

Also record the iOS version, Low Power Mode and Reduce Motion settings, and verify MP4 range responses in the affected tunnel's Network panel. Do not export cookies or authorization headers.

## Approval boundary and next step

The affected protected file is `frontend/src/components/home/ScrollClinicHero.vue`. A change to decode activation, seek scheduling or presentation failure detection goes beyond the prior initialization-only authorization and requires separate approval once the device evidence identifies the failing path. No protected file or lock hash was changed in this investigation. No public layout, media file, database or preference configuration was changed.

## Validation

- Frontend production build: PASS; existing >500 kB chunk warning remains.
- Frontend unit tests: 156 PASS, zero failures/skips.
- Hero initialization browser suite: PASS in Chromium and WebKit at 390 and 1440 px, including initial frame, refresh, restored scroll, navigation, video-off and synthetic seek failure fallback.
- New temporary decoded-pixel diagnostic: PASS in Chrome synthetic touch and desktop WebKit programmatic scroll.
- All 15 Hero locks: PASS, unchanged.
- `git diff --check`: PASS.
- Hero modes suite: PASS, 24 Chromium cases covering motion/video controls, preferences and reduced motion.
- Real iPhone Safari and Android Chrome: NOT verified. The reported iPhone bug remains open.

Exact tracked-source changes for this investigation: this new report only. Diagnostic runner/logs are in `/tmp`; screenshot/results artifacts are ignored under `docs/screenshots/mobile-scroll-video`. Prior photography/initialization work remains untouched and uncommitted.
