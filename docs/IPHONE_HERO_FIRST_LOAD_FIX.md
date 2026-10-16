# iPhone Hero first-load investigation — 2026-10-15

> Final status, 2026-10-16: the user confirms that the final mobile Hero works on a physical iPhone; the bounded first-load initialization was previously confirmed on three iPhones. Temporary application diagnostics have been removed and the approved dynamic-viewport cleanup is implemented. Historical investigation and approval checkpoints below are retained as chronology, not outstanding implementation instructions. Physical-device results are user-reported, not independent device testing by Codex.

Status: authorized readiness fix implemented locally. Physical iPhone acceptance remains pending. The investigation below records the pre-fix evidence; the implementation section records the completed change.

## Evidence and root cause

The user reports real iPhone first-load freezing followed by successful scroll scrubbing after video off/on. The actual iPhone event trace is unavailable. A controlled Chromium test reproduced the same visible failure/recovery through a concrete readiness-state defect. This proves the defect exists, not that this exact event order occurred on the phone.

`restorePosition()` assigns `decoded` from `readyState >= HAVE_CURRENT_DATA`. If restoration runs while media has only metadata (including a transient seek/loading state), it resets that flag to false. `update()` then rejects every seek. `seeked()` only clears its watchdog and calls `measure()`; it never reconciles `decoded`. `canplay` and `loadedmetadata` have no handlers. If readiness returns without another `loadeddata`, the application flag remains stale despite the browser being ready. The reveal gate remains closed and the poster stays visible until failure handling or a reset.

This is not missing touch handling, and the investigation does not establish an autoplay restriction. No play call exists in either successful or failed path.

## Initial mount versus toggle

| Initial mount | Video off/on |
|---|---|
| Source appears on initial video element | Off pauses, removes src, calls load and removes element through v-if |
| Mount registers scroll/lifecycle listeners and measures | On creates a fresh video element with the same source and media event handlers |
| Seeking waits for loadeddata-derived decoded flag | New loadeddata resets decoded to true |
| pageshow/popstate/visibility restoration can reset readiness | Explicit preference is saved and failure/seek counters reset |
| Readiness may become stale after restoration | Cinematic watcher reattaches scrolling, measures after nextTick and preserves section anchor |

The click is also a genuine interaction and the resource may already be cached; neither difference proves gesture-gated decoding. Do not add autoplay or repeatedly recreate the element based on this evidence.

## Controlled test

Temporary `/tmp/ag-init-race.cjs`, isolated local Vite with synthetic configuration and external API traffic blocked:

1. Load the real component with fresh browser storage; wait for ready video.
2. Temporarily model readyState 1 during a synthetic persisted pageshow event.
3. Restore the native readyState getter (actual readyState 4), dispatch seeked without a new loadeddata, and scroll to 600px.
4. Observe frozen time 0 and missing is-ready class despite readyState 4.
5. Toggle video off/on through the actual controls; scroll to 600px.
6. Observe time 1.973723 and is-ready true, readyState 4.

Both assertions passed. This is fault injection, not an actual iPhone or first-load browser event trace. It specifically separates a stale application readiness flag from an incapable decoder. No authentication or personal data was collected. The previous mobile diagnostic already confirmed changing decoded pixels in emulation; this new test checks the readiness deadlock only.

## Reviewed protected scope (subsequently approved)

In `frontend/src/components/home/ScrollClinicHero.vue` only:

- Centralize readiness reconciliation for initial mount, element enablement and restoration.
- Reconcile actual media readiness on loadeddata, canplay and seeked rather than allowing a stale false flag to permanently block updates.
- Handle metadata readiness separately from decoded-frame visibility; keep the correct poster until the initial target is decoded. Do not reveal on metadata alone.
- Preserve one outstanding seek, latest native-scroll target, bounded fallback, and all cleanup. Avoid repeated element recreation, autoplay or new scroll cancellation.
- Add a regression for the reproduced restoration/readiness ordering and first-load/toggle equivalence, plus existing initial-frame, slow-load, preference and navigation scenarios.
- Only after verification, update the component's affected Hero-lock hash. Other 14 baselines remain unchanged.

No gesture-based activation is proposed without further evidence. If this readiness repair does not resolve the real phone failure, collect the bounded device trace documented in `MOBILE_SCROLL_VIDEO_FIX.md` before extending scope.

## Green strip

The separate controlled reproduction is documented in `MOBILE_HERO_GREEN_GAP_FIX.md`: 100svh leaves the dark-green parent exposed when the visible viewport is taller. A browser-only dynamic-height trial removed it. That sizing change also awaits explicit protected-file approval; it has not been bundled silently into this task.

## Tests and limitations

- Controlled stale-readiness/toggle-recovery regression: PASS this investigation.
- All 15 Hero locks: PASS this investigation; no hashes changed.
- Production build and 156 frontend unit tests passed in the immediately preceding green-gap investigation on unchanged application source; not rerun here.
- Earlier initialization tests passed in Chromium/WebKit at 390/1440 and 24 Chromium mode cases passed. Those tests did not cover this event-order defect.
- Full post-fix build/unit/browser/responsive suite remains pending because the protected implementation is not yet approved.
- Actual iPhone Safari, desktop Safari application and Android hardware were not tested by this investigation. A real-device first-visit acceptance run remains required.

## Files and next action

Added only `docs/IPHONE_HERO_FIRST_LOAD_FIX.md` for this task. Temporary diagnostic lives outside the repository. Existing user work is preserved. No production, CMS, Booking, Admin, media, Welcome Intro, deployment or Git history changes.

The user subsequently approved readiness reconciliation and its component-only lock update. Green-gap sizing remains separate and unchanged.


## Authorized implementation

`reconcileReadiness()` derives readiness from the current video element. Mount, toggle enablement, restoration, loadeddata, canplay, seeked and each scroll update now share that check. A previously false flag cannot block a currently decoded frame. The visibility gate still requires the correct target, a completed seek and rendering boundaries; no metadata-only reveal was added.

Media handlers reject events from an element that is no longer current or when video is disabled/unmounted. Restoration callbacks capture their element identity. Async preference watchers check that their enabled state remains current after nextTick. Existing cancellation, seek/load deadlines and poster fallback remain in place. No autoplay, extra video recreation, touch interception, sizing or CSS changes were introduced.

### Exact files changed by this fix

- `frontend/src/components/home/ScrollClinicHero.vue`: readiness reconciliation and stale-event/callback guards; added canplay handler and guarded error handler.
- `frontend/tests/hero-readiness-browser.cjs`: deterministic readiness-race regression, decoded-pixel changes without a toggle, and late events from a removed video.
- `docs/HERO_LOCK.json`: only the component entry updated after validation.
- `docs/IPHONE_HERO_FIRST_LOAD_FIX.md`: this implementation record.

Earlier photography changes remain untouched. The component's entire scoped style block is byte-identical to its pre-fix version. Template changes are confined to video event handlers.

### Regression evidence

The injected restoration state is readyState 1, followed by native readyState 4 and a seeked event without another loadeddata. At scrollY 600 the repaired video becomes visible at 1.973723 seconds; at scrollY 1200 it reaches 3.947447 seconds. Canvas pixel output changes. No toggle occurs between failure injection and these assertions. A subsequent independent test recreates the video through its controls and dispatches error/loadeddata/canplay/seeked on the removed element; the current video remains ready.

- Production build: PASS; existing large-chunk advisory remains.
- Frontend unit tests: 156 PASS, zero failures/skips.
- New readiness browser regression: PASS in desktop Chrome mobile emulation.
- Existing initial-frame suite: PASS, Chromium and WebKit at 390/1440, including delayed media, first exterior frame, refresh, restored scroll, route/back navigation, video-off, synthetic seek failure fallback.
- Hero modes: 24 Chromium cases PASS (preferences, animation/video controls, reduced motion).
- Chrome synthetic touch: forward/reverse time and decoded-pixel changes PASS; WebKit mobile viewport programmatic forward/reverse scrolling PASS. Screenshots visually checked in the earlier identical diagnostic; fresh pixel assertions pass after this fix.
- All 15 Hero locks PASS after updating only the authorized component hash.
- Scoped CSS equality, template event-only comparison and git diff whitespace checks PASS.

No real iPhone or Android hardware is accessible here. The confirmed code defect is fixed and the failure sequence passes locally; this does not constitute proof that every physical Safari decoding issue is resolved. Retest a fresh visit on the affected iPhone without toggling video. If it still fails, collect the bounded diagnostic rather than adding speculative autoplay or repeated reloads.

## Follow-up: physical iPhone fallback activation

The user now reports the localized failure message on physical Safari after the readiness repair. **The physical first-load issue is still unresolved.** The previous local regression proves one defect was repaired, not complete iPhone success.

### Exact message path

`labels.failed` is rendered only when `failed` is true. `fail()` stops updates, pauses/removes the media source, removes the video through `loadVideo=false`, and changes to the naturally scrolling static layout. The visible clinic image after this can be the exterior poster, not an active video.

Every current fail caller in ScrollClinicHero.vue:

1. Current-element media `error` event.
2. Exception assigning video.currentTime.
3. 2500ms watchdog after assigning currentTime.
4. The same 2500ms watchdog when measure observes a seek without a running watchdog.
5. Three seeked completions whose currentTime differs from the requested time by over 0.15 seconds.
6. 12000ms load/initial-frame deadline while cinematic mode is active and `ready` is false.

The last timer measures failure to reveal the correct initial frame. It does not distinguish downloading, decoding, readiness or presentation delays. Preferences and reduced motion do not call fail directly. No timeout has been increased or fallback disabled.

### Served source

Local port 5173 is Vite from this repository's frontend directory (observed PID 76826). Its served component contains reconcileReadiness, currentEvent and onCanplay. The running cloudflared command targets http://localhost:5173 (observed PID 76834). This verifies the local origin only. The current external tunnel URL has been requested; public response/cache/byte-range verification remains pending. No process was restarted.

### Added safe diagnostics

Files added/changed in this follow-up:

- `frontend/src/diagnostics/heroTrace.ts`: bounded opt-in DOM/media observation.
- `frontend/src/main.ts`: DEV-only lazy activation with `?heroDebug=1`.
- This report.

Open the existing tunnel homepage with `?heroDebug=1` (or append `&heroDebug=1` if it already has a query). Start scrolling immediately. After 20 seconds, tap “Hero diagnostic v1 — tap to read/copy” and copy the JSON. The panel exists only for this explicit development request. Its report retains at most 240 entries, includes media event names, readyState, networkState, currentTime, seeking, opacity, error code and fallback appearance, and then removes listeners/timer. No tokens, resource URLs, storage contents, credentials or network transmission are included. A very early event can precede the lazy diagnostic import; sampling still records subsequent state.

The trace intentionally reports its exact fail caller as unknown. Inferring a timeout from elapsed time is supporting evidence, not authoritative reason attribution. Browser-only observers cannot reliably recover a swallowed seek exception or distinguish two timers that invoke the same function after cleanup.

### Narrow protected approval needed

To identify the exact trigger, authorize **diagnostic-only changes in ScrollClinicHero.vue**: pass a fixed reason code at each fail call, capture the current media state immediately before releaseMedia, and expose that sanitized event only when DEV and heroDebug=1. Do not alter seek behavior, timers, layout or preferences. Update only its affected lock hash after tests. Then obtain the physical-phone trace before choosing a further behavioral fix. Green-gap changes remain separate.

### Verification

Production build PASS; 156 frontend unit tests PASS; 15 Hero locks PASS unchanged. Production dist search found no diagnostic panel/reason strings. Bounded diagnostic browser and Hero initialization regression results are recorded after completion below. No production writes, deployment, commit or push. Physical iPhone and external tunnel acceptance remain pending.

Final follow-up results: bounded diagnostic browser test PASS (84 entries, disabled by default); Hero initialization suite PASS in Chromium/WebKit at 390 and 1440px. The user supplied the current Cloudflare URL. Read-only requests through that tunnel verified the latest readiness functions and canplay handler. MP4 Range bytes=0-1 returned HTTP/2 206, video/mp4, Accept-Ranges bytes, Content-Range bytes 0-1/3298185, exactly 2 bytes. This rules out stale origin code and missing basic range support in that request; it does not establish iPhone decoding success or sustained throughput. The tunnel URL is temporary and is not persisted in this report.

## Authorized exact-reason diagnostics (v2)

Implemented diagnostic-only protected changes with explicit approval. Each fail caller now passes one of: media-error, seek-assignment-exception, seek-request-timeout, seek-observed-timeout, inaccurate-seek-completions, initial-frame-timeout. Before cleanup, DEV + heroDebug=1 captures the reason, media readiness/network/error codes, current/requested time, scroll target, decoded/ready flags, seeking, paused, visibility, opacity and timeout threshold. Up to eight snapshots are retained in page memory so early failures survive diagnostic-module startup; the first is never overwritten. No exception messages, URLs, credentials, storage values or personal data are captured. No network transmission occurs.

The v2 panel includes a `fallbacks` array alongside the bounded 20-second event trace. Empty fallbacks means no instrumented failure was captured, not proof of success. Reload with the query parameter for a new capture and reproduce promptly; records after the panel's 20-second snapshot are not included in that displayed report.

Exact files for this increment: ScrollClinicHero.vue (reason capture only), heroTrace.ts (v2 output), hero-fallback-diagnostics-browser.cjs (new regression), HERO_LOCK.json (component entry only), this report. The component's full template and CSS match the pre-instrumentation snapshot. No media, timeout values, playback, scroll or layout changes.

Verification: production build PASS; 156 frontend unit tests PASS; Chromium/WebKit initialization regressions PASS at 390/1440; synthetic seek-assignment failure reports the exact reason and readyState 4 before cleanup even though the video is then removed; diagnostic off without query PASS; bounded report PASS; all 15 Hero locks PASS. Production assets contain no __agHeroFallbacks, diagnostic panel or custom diagnostic event strings. Build retains its pre-existing large chunk warning.

Physical iPhone instructions: open the current tunnel homepage with ?heroDebug=1, verify the panel says v2, scroll without toggling video, wait 20 seconds, open the panel and copy the complete JSON (especially fallbacks). Include iOS version and whether Low Power Mode is enabled. Do not change device settings merely for the initial capture. No further playback fix should be selected before this real-device evidence arrives.

## Physical-device evidence: metadata-only stall

The owner supplied actual iPhone observations: loadedmetadata about 673ms, duration 7.25725s, persistent readyState 1, networkState 1, time 0, seeking false, paused true, opacity 0, no ready class, no media error, scrolling beyond 2500px, and no captured fallback reason. These are supplied observations, not an independently collected raw trace.

### Confirmed application cause

`update()` returns on `!reconcileReadiness(v)`. That function returns true only for readyState >= HAVE_CURRENT_DATA (2). Therefore the reported readyState 1 necessarily prevents every currentTime assignment, even with metadata and a valid duration. loadeddata and canplay may reconcile state, but neither arrives in the reported session. There is no loadedmetadata handler. This is an incorrect prerequisite for attempting a seek: permission to seek and permission to reveal a decoded frame are conflated.

`readyClass=false` is an effect, not the direct scroll blocker. In cinematic mode, the update guard does not reject `ready=false`; the decoded readiness predicate rejects state 1. The poster remains visible because video opacity is zero. No seek is attempted, so seek timeouts cannot run.

A circular wait is consistent with these facts: the application waits for frame data before seeking, and never tests whether a seek would cause Safari to decode. We have **not** yet established that seeking alone unlocks the physical decoder, or that Safari requires a gesture. Metadata loading confirms source assignment happened. Adding load(), play(), repeated remounts or gesture workarounds is not justified yet.

Toggle off/on differs by explicitly clearing/loading and replacing the element, rearming timers and running under a genuine interaction, often with cached media. Its success cannot isolate which of those differences matters. The proposed change removes the confirmed gate first.

No fallback in the captured interval is not evidence that timers are absent. Leaving the Hero or hiding the page calls stopUpdates(), which clears the load deadline; intersection re-entry rearms it. A user can scroll beyond the section before the 12-second deadline. The supplied summary lacks timing/visibility details to establish whether that occurred on this phone. Do not infer a new fallback cause from an empty array.

### Regression added and executed

`frontend/tests/hero-metadata-readiness-browser.cjs` models state 1, suppresses decoded-data/canplay notifications, counts currentTime assignments, and scrolls after loadedmetadata. It blocks all external/API traffic. Actual result on current code:

`metadata: 1, seeks: 0, y: 600, time: 0, ready: 1`

The regression intentionally **FAILS** its required first-seek assertion. It is a pre-fix acceptance test, not a passing test and not real iPhone emulation. It does not claim eventual decoded pixels under a deliberately persistent state-1 stub. Post-approval testing must also verify actual decoded-frame changes, bounded failure and initial-poster correctness.

### Exact smallest protected proposal (not applied)

In ScrollClinicHero.vue update():

```diff
- ... || !v || !reconcileReadiness(v) || v.seeking || !Number.isFinite(v.duration)) return;
+ ... || !v || v.readyState < HTMLMediaElement.HAVE_METADATA || v.seeking || !Number.isFinite(v.duration)) return;
+ reconcileReadiness(v);
```

Also add `@loadedmetadata="loaded"` so valid metadata schedules synchronization with the current scroll position (the existing handler is identity-guarded and pauses rather than plays). Keep presentDecodedFrame's state >= 2, completed-seek and correct-target visibility checks unchanged. At scroll position zero, retain the exterior poster if no decoded frame exists; the first nonzero touch-scroll target can initiate a seek. No forced playback, source reload, tiny artificial seek, new retries or timeout changes.

This proposal requires explicit approval for the protected component and its single hash update after verification. All other protected files and green-gap sizing remain untouched. Follow with physical iPhone testing before declaring success.

Files changed for this investigation only: the new metadata regression and this report. All 15 Hero locks PASS unchanged. No protected implementation edits, production operations, deploy, commit or push.

## Approved metadata-ready seek fix — implementation

Implemented the explicitly approved component-only behavior change:

- `update()` now permits seeking from HAVE_METADATA (1), provided duration is finite and positive and no seek is outstanding. The target remains derived from clamped native scroll progress within the media duration. Browser seek errors retain the existing safe fallback; no eager load(), play(), fake gesture or forced remount was added.
- `loadedmetadata` uses the existing guarded media handler to schedule synchronization.
- Reconciliation still records decoded state separately. The visibility gate still requires HAVE_CURRENT_DATA, completed seeking and the correct target before reveal.
- All prior stale-event checks, timeout thresholds, preferences and controls remain unchanged. Scoped CSS and green-gap sizing are unchanged.

The metadata-only regression now PASSes: one metadata event, one seek request, scrollY 600, currentTime 1.973723, readyState 1, visible false. The test additionally asserts that metadata alone cannot reveal the video. This confirms removal of the application gate, not physical Safari decoding success.

Exact files for this increment: ScrollClinicHero.vue, hero-metadata-readiness-browser.cjs (adds hidden-video assertion and updates pre-fix comment), HERO_LOCK.json (only component entry), this report.

Verification completed so far: production build PASS (existing bundle-size advisory); 156 unit tests PASS; Chromium/WebKit initialization suite PASS at 390/1440 including initial frame, delayed media, refresh, restoration, route/back, video-off and seek-failure fallback; Chrome synthetic touch forward/reverse decoded-pixel checks PASS; WebKit mobile-dimension programmatic forward/reverse decoded pixels PASS. Mode/fallback/lock final results follow.

Physical iPhone acceptance is still required. On a fresh diagnostic visit, expect at least one seeking/seeked sequence after the first nonzero scroll target, followed by readyState >=2 and visible changing frames. If Safari remains at state 1 or triggers fallback, send the v2 report before any additional media-activation change is considered. Do not report this as real-device success yet.

Final validation: 24 Chromium mode cases PASS; fallback diagnostic regression PASS; all 15 Hero locks PASS after updating only the authorized component hash. Template comparison confirms only the loadedmetadata binding changed; scoped CSS is byte-identical. git diff whitespace check PASS. No production data, deployment, commit, merge or push.

## Initial-load versus successful toggle: latest investigation

Owner reconfirms failure on first visit and successful manual video off/on in Safari and Chrome on physical iPhone 13. No paired raw A/B diagnostic trace after the metadata-ready fix has yet been supplied. The previously supplied state-1/no-seek observations established the old gate; they must not be reused as proof of the current implementation's failure path.

### Actual code differences

| Operation | Initial load | Off/on |
|---|---|---|
| Video creation | Vue creates initial video | Vue v-if removes old and creates new video |
| Source and attributes | Approved MP4, muted, playsinline, cinematic preload auto | Identical |
| Explicit load() | Not called to initialize source | Called only on OLD element after removing src during disable; not called on replacement |
| Media listeners | metadata/data/canplay/seeked/error bindings | Same bindings on replacement |
| Readiness | mount + guarded media handlers + current-state update | enable watcher after nextTick + same guarded handlers and update |
| Scroll listener | registered on mount | removed/re-added when cinematic changes |
| Requested target | native scroll position | current position after existing anchor-preservation logic |
| Readiness/failure reset | initial false state | readiness reset; failed and stalled counter reset on enabling |
| User interaction | initial creation has no initiating click | enabling follows genuine button click; transient activation in later async media work is not established |
| Cache | can be cold | resource may already be cached; not measured on phone |
| Visibility | same decoded-frame gate | same decoded-frame gate |

No play() exists in either path. There is no evidence that blindly adding load(), playback priming, or automatic remounting would reproduce the successful part safely. No such workaround was implemented.

Current code permits a seek at readyState 1 and finite positive duration when cinematic/loading/visible/alive guards pass and no seek is outstanding. Once scrolling creates a nonzero target, persistent time 0 needs a new trace to distinguish a skipped update from a stalled requested seek, fallback, or stale served source. Ready class false is not itself a cinematic update blocker.

### Missing evidence and verification

The previously supplied tunnel returned HTTP 530 during this investigation. Latest externally served source therefore could not be verified. Obtain the current URL and capture one v2 trace containing BOTH initial scroll and the successful toggle sequence within its 20-second window: fresh load, scroll briefly, disable/enable by approximately 5 seconds, scroll again, wait for report, copy complete JSON including fallbacks and rows. Do not wait until collection ends before toggling. If this timing cannot capture the failure, extend only the unprotected diagnostic collection window in a subsequent step.

The decisive comparison is whether the replacement alone emits loadeddata/canplay, whether currentTime/seeking changes before those events, and whether the first element failed with a specific reason before removal. This narrows decoding versus gate versus presentation; gesture causality may still require a controlled physical-device test.

Exact present root cause remains **unconfirmed beyond the already corrected metadata gate**. The smallest justified next step is paired real-device evidence, not another protected playback edit. No new protected change or hash update is proposed without that evidence. All 15 locks PASS unchanged. This investigation changes documentation only; no production operations or Git history changes.

## Local Wi-Fi isolation and A/B diagnostic proposal

The owner reports identical physical iPhone 13 behavior over local Wi-Fi and Cloudflare: initial load frozen, off/on works. This excludes a Cloudflare-only explanation; it does not independently identify the decoder or activation mechanism. Read-only inspection of the supplied Wi-Fi server confirmed that its compiled Hero contains the HAVE_METADATA seek gate, loadedmetadata handler and exact fallback diagnostics. Accessing that URL from this Mac is not accessing the physical iPhone session.

### Existing trace gaps

v2 lacks stable element identity, initial element/source observation, explicit seek assignment start/result, gesture timestamps and browser user-activation state. It samples currentTime and captures media events, but cannot attribute them reliably to A versus B. The lazy import can also miss early events. No paired physical-device raw trace demonstrating the successful B transition is available in the conversation. A specific causally verified root cause or safe behavioral fix cannot yet be selected.

Working hypothesis: initial loading is held at metadata-only readiness while a later user-initiated replacement permits decoding. Evidence supports this as a candidate (reported metadata stall plus repeatable toggle recovery), but does not distinguish transient activation, caching, replacement, reset, visibility, or a stalled first seek. Do not label load() as the fix: the explicit call currently targets the removed old element.

### Minimal diagnostic-only approval request

Keep production behavior unchanged. In DEV with heroDebug=1 only:

1. Assign small in-memory element IDs via WeakMap. Record first observation/attachment and source-attribute presence/change; label observation time accurately, not as exact allocation time. Do not record URLs. Start the observer before app mount to avoid losing initial assignment events.
2. Record passive trusted pointer/touch/click event type and timing on Hero only; record userActivation.isActive/hasBeenActive if available. Never capture text, coordinates, identifiers or authentication data.
3. In protected ScrollClinicHero.vue, add observational calls immediately before/after currentTime assignment, at guarded metadata/readiness handlers, and before releaseMedia cleanup. Include element ID, requested time, ready/network state, seekable/buffered numeric ranges and current time. Label load() as cleanup, never as new-element initialization. Capture safe error name only on assignment exception.
4. Attach the same element ID to existing fallback snapshots; preserve the original pre-cleanup state and first reason.
5. In the unprotected trace module, observe first presented frames where requestVideoFrameCallback exists, bounded per element; absence of a callback on paused media is not proof of failure. Cancel callbacks/listeners on stop. Do not call play(), load(), seek or recreate elements from diagnostics.
6. Provide an explicit 45-second A/B capture with bounded event/sample capacity and a truncation flag, retaining lifecycle/first-failure records. DEV + explicit query only; no telemetry requests or persistent storage.

Affected protected file: ScrollClinicHero.vue only, diagnostic calls/IDs only. Related unprotected files: diagnostics/heroTrace.ts and main.ts for early observation, diagnostic browser regression, this report. Update only the component lock hash after diagnostic verification. No timer, readiness, source, scroll or layout behavior changes. Green-gap sizing remains excluded.

After approval and implementation, collect A and B on the physical phone within one capture: fresh diagnostic visit, first scroll, off/on, forward and reverse scroll, export report. A first successful decoding/frame event must be correlated to element ID, seek request and gesture state before proposing any behavioral change. If the trace only shows correlation, a further controlled diagnostic may be needed to establish causality.

This investigation changed documentation only. All 15 locks pass unchanged. No protected edits, playback workaround, encoding changes, production writes, deploy, commit, merge or push.

## Physical iPhone A/B summary: first seek times out

New owner-supplied evidence: initial `seek-request-timeout` at 2500ms, readyState 1, currentTime approximately 0.055, seeking true, decoded false, opacity zero, no media error. After manual video off/on, state 4, successful seeked events, changing currentTime and opacity one. No complete trace attachment or path accompanied this message; this analysis uses the supplied summary only and does not claim to have inspected raw timestamps, buffer ranges or gesture records.

### Confirmed failure path

The application now actually assigns currentTime. The first small target (~0.055s) remains pending; the seek-request watchdog calls fail after 2500ms, which releases the source before that element can finish later. A changed currentTime while seeking is true is not evidence of a decoded frame. The poster is intentionally retained, correctly preventing an undecoded/incorrect frame from appearing.

This supersedes the earlier no-seek gate diagnosis for this particular trace. It confirms failure to complete the first seek, not the underlying WebKit reason. No media error means no reported fatal error; it does not prove a healthy pipeline.

### What the A/B result does and does not establish

The same asset can decode and scrub on this device in the later session. That weakens an outright codec incompatibility explanation. The replacement also changes elapsed download/cache time, media element state, preceding cleanup and user interaction. These variables are confounded. The summary contains no seekable/buffered ranges, source timing, user-activation state or timestamped transition to state 4, so it cannot establish early-seek timing or gesture gating as the cause.

The working hypothesis is a cold-start pending seek receiving the same 2.5-second deadline as steady-state scrubbing, before the media pipeline can complete it. This is supported as a hypothesis by the state-1 pending seek and later successful session. Whether that seek would recover is unknown because fail cancels it. Extending a deadline or recreating the element without observing that would be an experiment, not a verified fix.

### Smallest evidence-based next change to consider

No protected edit is applied or recommended as a proven behavioral repair yet. First obtain the full paired trace, especially seekable/buffered ranges and timing of metadata, request, gesture and first decoded frame.

Conditional minimal repair if the trace shows the first request targets unavailable media: introduce a bounded initial preparation phase that holds the latest scroll target until metadata and a seekable range containing that target are available. Observe readiness/progress events within the existing startup deadline, keep the exterior poster, then issue one seek. Do not wait for decoded state before seeking (that reintroduces the previous circular gate), call play, reload, recreate, or continually reset the deadline. Preserve steady-state 2500ms seeks. Empty seekable ranges on Safari must be measured before adopting this gate; otherwise it may create a new stall.

If the target was already seekable, that proposal lacks support. A separately approved diagnostic experiment could distinguish a recoverable startup delay by allowing only the already-pending first seek to settle within the existing overall startup budget, recording the original 2500ms threshold, with no retry/reload. It must be presented as a bounded experiment, not silently shipped as a timeout increase. Only actual observed completion would justify a startup-specific recovery policy. No such experiment was implemented.

### Required regression scenarios for an approved repair

- Metadata-only readiness; target initially unavailable, later available; exactly one initial request for the latest target.
- Decoded frame remains hidden until completed seek; correct exterior poster at initial scroll zero.
- Target never available / seek never completes: bounded fallback and natural scrolling, no repeated reload or timer resets.
- First seek slow but completes within an approved startup policy; subsequent seeks retain steady-state timeout.
- Toggle/off/unmount during preparation cancels old work; stale events cannot affect replacement.
- Actual decoded pixels advance and reverse; existing controls/preferences/desktop checks remain intact.

Tests were not added for an unselected repair. Current all-15 Hero-lock check PASS. Documentation is the only file changed in this investigation. No playback, timing, protected hash, green-gap sizing, encoding or production changes. Physical first-visit acceptance remains unmet.

## Second physical trace: diagnostic extension pending approval

Owner reports seek-request-timeout at 5942ms, currentTime 0.21418, target 0.44649, state 1, network state 1, seeking true, decoded false, opacity zero and no media error; replacement subsequently decodes and seeks both directions. The `target` field is normalized scroll progress, not seconds: it represents approximately 3.22 seconds for this clip. A pending seek blocks updates while later scroll events continue changing target. Therefore the time/target difference is expected during a stalled seek and does not by itself identify a bad time calculation. The requestedTime and complete timing trace are needed to compare the original request. The 5942ms timestamp is performance.now(), not necessarily time since the diagnostic started.

The new request explicitly requires approval before protected changes. No code changed. Proposed exact protected-component diff:

```diff
@@
   requestedTime = time;
+  traceSeek('before-seek');
   try { v.currentTime = time; } catch { fail("seek-assignment-exception"); return; }
@@
-function fail(reason: string) {
+function traceSeek(phase: 'before-seek' | 'before-fallback', reason?: string) {
+  if (import.meta.env.DEV && new URLSearchParams(location.search).get('heroDebug') === '1') {
+    try {
+      window.dispatchEvent(new CustomEvent('ag-hero-seek-state', {
+        detail: { phase, reason, video: video.value, at: performance.now(), target, requestedTime },
+      }));
+    } catch { /* Diagnostic failure must not alter playback. */ }
+  }
+}
+function fail(reason: string) {
   if (!alive) return;
+  traceSeek('before-fallback', reason);
```

The unprotected observer will install before app mount and synchronously snapshot this event's element into plain bounded JSON (never retain DOM objects in exported output). It will add seekable/buffered arrays of numeric start/end pairs, element ID, ready/network/currentTime/seeking/opacity and a shared performance.now timeline. Its existing 250ms sample will record ranges during pending seeks. The before-fallback snapshot runs before pause/remove-src/load cleanup. No currentTime, load, play or timer calls are added by diagnostics.

Unprotected companion changes: record loadeddata/canplay/progress/waiting counts and first/last timestamps per element; record the first trusted touchstart/pointerdown/click on the Hero and userActivation flags if supported, without coordinates/text; distinguish initial/replacement elements using WeakMap IDs; retain early lifecycle records with bounded sampling and a truncation indicator. Use a 45-second explicit comparison capture; stop/cancel all observer listeners afterwards. No authentication/storage reads, URLs or network telemetry. DEV + heroDebug=1 only.

Approval requested for precisely the component hooks above and its sole lock hash update after diagnostic regression/build/unit/Hero checks. No seekable waiting, timeout changes, automatic toggle, media changes or green-gap sizing. All 15 locks currently PASS unchanged. This investigation updates only this report.

## Approved range and gesture diagnostics — v3

Implemented exactly the two approved component hooks: before currentTime assignment and before fallback cleanup. The DEV/query-guarded helper synchronously dispatches state for the observer; failure to observe is caught and cannot alter playback. No timeout or source changes. Template/CSS unchanged.

The observer now installs before app creation, assigns WeakMap video IDs and records first-observed attachment/source changes (not claimed as exact DOM allocation timestamps). All rows share performance.now timing. Before-seek and before-fallback rows include requestedTime, normalized target, seekable/buffered ranges and media state. Samples every 250ms include pending-seek ranges. Per-element event counters include first/last timestamps for loadedmetadata, loadeddata, canplay, progress, waiting and other lifecycle events. Trusted Hero touchstart/pointerdown/click records include activation flags where available; no coordinates or text are captured. Export contains firstTrustedGesture and first occurrence of each gesture type.

Collection lasts 45 seconds. Lifecycle rows and samples each cap at 600 with a truncation flag. Observation listeners, interval and mutation observer are removed at completion. The output contains plain JSON, never DOM objects, URLs, credentials, tokens or storage contents. Diagnostics remain DEV + heroDebug=1 only. The built production asset search contains none of the v3 panel, gesture-export or seek-hook event strings.

Files changed in this increment: ScrollClinicHero.vue (two hooks plus diagnostic helper); diagnostics/heroTrace.ts; main.ts (install observer before mount); hero-fallback-diagnostics-browser.cjs (v3 checks); HERO_LOCK.json (component hash only after checks); this report.

Physical capture: http://192.168.1.116:5173/?heroDebug=1. Verify v3, fresh load, scroll during initial failing phase, then disable/re-enable video around 8–12 seconds and scroll forward/back. Finish actions before 45 seconds; wait for “tap to read/copy”, expand and copy the complete JSON. Do not reload between A and B. Include whether the video visibly changed in each phase. If the address changes, use the current local server IP with the same query. This captures the existing behavior and is not another playback fix.

v3 verification: final production build PASS (existing chunk warning); 156 frontend unit tests PASS; diagnostic browser regression PASS including visible completed panel, exact reason before cleanup, per-element range snapshots, media metadata event accounting, bounded samples and no records without query. Initial panel visibility assertion timed out; the report data passed independently, explicit summary visibility/touch sizing was added to the diagnostic panel, and the visible-panel regression then passed. Production assets contain none of the diagnostic marker strings. Template and scoped CSS equality PASS; all 15 Hero locks PASS after the component-only hash update; whitespace check PASS. Physical-device A/B capture is still pending; no new playback fix has been attempted.

## Multi-iPhone strategy review — 2026-10-16

Three physical iPhones reportedly fail on initial load and recover after a genuine click plus replacement. The latest reported initial target is already inside seekable, but buffered is empty, state remains 1 and the seek never completes. Treat this as a multi-device iOS compatibility defect. **Do not implement seekable-range waiting:** the new evidence invalidates that as the demonstrated blocker. Seekable indicates addressable time, not decoded/downloaded data.

### Activation evidence and remaining uncertainty

The current implementation assigns src, requests preload and stays paused. It never calls play in either initial or toggle path. Toggle therefore does not prove a play restriction; it changes gesture context, element state and cache timing together. The evidence supports investigating a metadata-only cold media pipeline, but cannot yet distinguish activation from resource/pipeline initialization. Low Power Mode, iOS versions and browser-specific settings must be recorded for acceptance.

WebKit's official policy description (https://webkit.org/blog/6784/new-video-policies-for-ios/) documents muted/no-audio inline playback and play-promise rejection, and describes direct calls from genuine interaction handlers. This is historical policy guidance, not proof of present hardware behavior. A scroll event or arbitrary touchstart must not be assumed to grant transient activation. Record actual activation and promise outcome; do not synthesize gestures or prevent native scrolling.

### Recommended first experiment: one bounded preparation on the existing element

Request approval for an explicitly experimental component-only initialization state, not a claim of a proven production solution:

1. Keep desktop/warm decoded-video path unchanged. For touch-capable metadata-only startup with empty buffered data, retain the exterior poster and latest native scroll target. Do not issue the known-stalling initial seek before preparation.
2. Register passive genuine interaction handling on the Hero. Use trusted touchend/pointerup/click with deduplication, excluding mode-control actions. Whether the end of a real swipe supplies activation is a physical-device test, not an assumption. No scroll cancellation or new mandatory button.
3. Attempt muted inline play exactly once on the SAME element, synchronously in that handler. Do not toggle preferences, replace the element or reload the source. This is a bounded decoder-preparation experiment behind the poster, not visible autonomous montage playback.
4. Coordinate the existing media handler's unconditional pause while preparing; otherwise loadeddata/canplay could immediately abort the experiment. On the first usable decoded/presented frame, pause immediately, seek once to the latest scroll target, and reveal only when synchronized. A promise resolving alone is not proof of a presented frame; use frame callbacks where supported plus a carefully bounded readiness/render fallback.
5. Bound preparation by at most the existing 2500ms seek budget and the existing absolute startup budget, whichever expires first. Do not extend or repeatedly reset deadlines. Rejection, absent usable frame, or timeout retains the authentic poster and exits to the existing navigable fallback. No retry loop. The no-gesture case must also reach bounded fallback, not an indefinite long frozen section.
6. Cancel all preparation callbacks and pause immediately on video-off, animation-off, preference change, hiding/unmounting or a new session. Guard promise continuations by element/session identity. Video-off must not initiate a play/load or frame request.
7. Log trusted interaction/activation, attempt, promise outcome, first decoded/presented frame, pause, synchronized seek and fallback in the existing opt-in trace. Do not collect text, URLs, credentials or patient data.

This requires protected changes in ScrollClinicHero.vue and its one lock hash only after tests; no shared CSS, typography, media source, Welcome Intro or green-gap changes. If a real swipe cannot initialize the pipeline without a tap, reject this as failing the first-scroll UX acceptance and evaluate the sequence alternative. Do not ship a hidden tap requirement.

### Alternative: progressive still-frame renderer, NOT implemented

Feasibility extraction only, outside Git at `/tmp/ag-sequence-study`, from the approved MP4; no source/media asset replaced. ffmpeg fps=12 scale=960:-2, then Sharp WebP quality 75:

- 87 frames, each 960×540.
- Total encoded bytes: 1,927,860 (1.839 MiB), excluding HTTP overhead; existing MP4 is 3,298,185 bytes (3.145 MiB).
- Full decoded RGBA pixel storage: 180,403,200 bytes / 172.05 MiB.
- Eight decoded frames: 16,588,800 bytes / 15.82 MiB, plus about 1.98 MiB for a 960×540 canvas. These are calculated pixel allocations, **not measured browser process/GPU memory**; actual peak includes decoder, compositor and browser copies.
- Full traversal could request 87 resources, versus ranged MP4. More HTTP requests, 12fps temporal stepping and quality/crop changes are trade-offs even if this sample's encoded total is smaller. No claim of equivalent visual quality or smoothness without comparison.

Proposed design if separately approved: a cover-cropped canvas with capped backing resolution, nearest target index from native scroll progress, a small decoded LRU window (~8 frames), at most two concurrent requests, current frame priority and a few direction-aware neighbors. Release ImageBitmaps on eviction, abort stale queued fetches, cache compressed responses normally. Reverse direction reprioritizes the same sequence. Retain last decoded image while a target loads, authentic poster on failure, bounded initialization and natural fallback. Off/reduced-motion must stop scheduling and avoid eager sequence fetch. Do not fetch all 87 on initial visit or keep all decoded.

Use a measured opt-in comparison first; do not assume all iPhones require a sequence or choose solely by a fragile UA rule. Confirm original/sequence content and responsive crop equivalence, forward/reverse stepping and cold-cache latency on each phone. A higher-frame-rate/resolution variant requires new byte and memory measurements. No alternative renderer has been implemented or approved.

### Verification and decision gate

Existing tests rerun on unchanged behavior: 156 frontend unit tests PASS. Hero initialization and locks recorded below after completion. No physical success claimed.

For the proposed experiment: regression tests must cover exactly one trusted-attempt path, no synthetic-event activation, late/rejected play promises, mode disable during preparation, first frame hidden until synchronized, cold metadata-only startup, reverse touch scroll, no interaction deadline, stale element events, and unchanged desktop/preferences/video-off. Test the full suite and lock afterward.

Real acceptance on all three physical iPhones: record model/iOS/browser/power settings; cold first visit, warm reload, route/back restoration, rapid first swipe, forward/reverse, video-off, reduced-motion, interrupted network and slow network. Confirm no manual toggle/tap, no visible autonomous playback, no trap, no background playback after off, and correct poster. Use the existing v3 trace. Native phone memory profiling and network capture are required before choosing a sequence renderer for handover.

Next approval requested: the bounded same-element genuine-interaction preparation experiment above. Frame-sequence implementation requires separate approval. This review changes documentation only; extracted study files remain outside Git. No protected behavior/hash changes, deployment, commit, merge, push or production operations.

Final existing-regression results for this review: Chromium and WebKit initialization suite PASS at 390/1440 (initial frame, delayed loading, refresh/restoration, video-off and synthetic seek-failure fallback); all 15 Hero locks PASS unchanged; whitespace check PASS. These results validate the existing local baseline, not the proposed initialization experiment or physical iPhone compatibility.

## Authorized same-element initialization experiment — implemented locally

Status: local experiment verified; physical acceptance on all three iPhones remains pending.

For coarse-pointer cold startup (metadata available but no current decoded frame), update retains the poster and latest scroll target rather than issuing the observed stalling seek. On the first qualifying trusted touchend/pointerup/click within the Hero, excluding buttons/links, it attempts muted inline play on the existing element exactly once (WeakSet keyed by element). Synthetic events do not qualify. Fine-pointer desktop and already-decoded media retain the existing seek path.

Preparation is hidden behind the existing poster. loadeddata/canplay/seeked or the play promise can detect a usable frame; preparation pauses immediately when HAVE_CURRENT_DATA is reached, then schedules the latest scroll target. The normal completed-seek/decoded/target-matching visibility gate still controls reveal. No autoplay attribute, element recreation, off/on workaround, load call, source change or layout edit was added.

The attempt has a 2500ms bound and does not clear or extend the existing startup timer; whichever expires first triggers fallback. Rejection and timeout receive distinct diagnostic reasons. Existing stopUpdates cancels preparation, invalidates promise continuations, clears the preparation timer and pauses. Off, animation disable, visibility/intersection stop and unmount therefore cancel pending work. A late promise resolution pauses the old element; late rejection cannot fail a replacement. No retry occurs for the same element. No-gesture startup retains the existing deadline/fallback behavior.

The gesture path may still be denied by a physical browser, including after a swipe rather than a tap. A rejected play promise now fails safely; it is not evidence of compatibility. The supplied three iPhones must verify first-swipe operation without a special tap or manual toggle. No claim of actual iPhone success is made.

Exact files for this increment:

- ScrollClinicHero.vue: bounded touch initialization, guards, cancellation and event listeners; diagnostic initialization marker.
- hero-initialization-gesture-browser.cjs: new synthetic media-policy regression.
- hero-metadata-readiness-browser.cjs: updated cold-touch expectation to wait for genuine-interaction preparation (supersedes the previously approved metadata-only seek expectation for this cold touch path; warm/desktop readiness remains supported).
- HERO_LOCK.json: component entry only after checks.
- This report.

Regression evidence: six scenarios PASS (success/reject/timeout/remove/off/reduced). Synthetic touchend does not invoke play. Genuine emulated tap invokes it once; muted and playsInline are true; the same element remains; success ends paused with forward/reverse target synchronization. Reject/timeout release to static fallback. Removing video during a pending promise leaves it removed. Off/reduced modes invoke no play. These are controlled stubs of browser media policy, not physical Safari playback.

156 frontend unit tests PASS. Chromium/WebKit existing initialization suite PASS at 390/1440, including exterior first-frame, delayed media, refresh, restored position, back navigation, video-off and seek-failure fallback. Final build/mode/lock results recorded below when complete. The full template and scoped CSS remain unchanged from the pre-experiment snapshot. No green-gap, Welcome Intro, Booking, CMS, legal or production changes.

Physical test: open the existing Wi-Fi homepage with ?heroDebug=1, verify v3, start a normal swipe (no special tap), and test reverse motion. Repeat fresh visits on all three iPhones with model/iOS/power setting recorded. If it falls back, send the full v3 JSON including media-initialization and initialization-rejected/initialization-timeout or other reason. Do not manually toggle until the initial failure is captured. No frame-sequence implementation is authorized by or included in this experiment.

Final experiment validation: production build PASS (existing large-chunk advisory); final six-scenario gesture regression PASS; 24 Chromium mode cases PASS; all 15 Hero locks PASS with only the component hash updated; template/scoped-CSS equality and whitespace checks PASS. No deployment, commit, merge or push. Stop for physical three-iPhone acceptance.

## Physical acceptance confirmed by owner — 2026-10-16

The owner confirms successful first-load scroll-video on all THREE tested physical iPhones, without a manual video toggle. Preserve the bounded same-element initialization exactly. This is user-confirmed hardware evidence, distinct from automated emulation. Model/version/power details beyond those previously provided are not invented.

Final diagnostic cleanup and green-gap repair are awaiting the new protected checkpoint. The exact NOT-APPLIED component diff is `docs/MOBILE_HERO_CLEANUP_PROPOSED.patch`. It removes only diagnostic calls/helper/snapshot storage from the script; fail retains its existing stop/release/failed behavior and reason arguments are retained as an unused parameter to avoid touching operational callers. No existing production log is removed (none exists in that function). The preparation WeakSet, gesture handling, pause/readiness path, deadlines and cleanup remain unchanged.

After approval, remove the unprotected diagnostics module and main.ts opt-in bootstrap, and replace the diagnostic-only browser regression with an absence check. Keep all initialization, readiness, metadata, controls and fallback regression coverage; do not remove tests that protect the working iOS behavior. No new dependency was installed for diagnostics.

At this checkpoint only documentation and a proposed patch were written. All 15 Hero locks PASS unchanged. Full build/browser/width-matrix verification follows approval and implementation, not claimed as completed now. No deployment, commit, merge or push.

## Approved final cleanup — implemented 2026-10-16

Applied `MOBILE_HERO_CLEANUP_PROPOSED.patch` exactly. The working initialization block is byte-identical after excluding its removed diagnostic call; template equality also verified. First-load success on three physical iPhones remains owner-confirmed evidence from before this cleanup; final physical recheck is pending.

Removed diagnostic hooks/helper/snapshot state from the component, removed main.ts's DEV/query bootstrap and deleted diagnostics/heroTrace.ts. Source search finds no heroDebug, heroTrace, traceSeek, ag-hero-seek-state, __agHeroFallbacks or diagnostic overlay strings. Normal fallback behavior and callers remain; no production logging was removed. Diagnostic browser regression was converted to verify safe fallback and absence of debug UI/state even with the former query flag. Initialization, metadata, preference and first-frame regression files are retained.

Changed for this cleanup: ScrollClinicHero.vue; main.ts; deleted diagnostics/heroTrace.ts; hero-fallback-diagnostics-browser.cjs; new hero-viewport-coverage-browser.cjs; component lock entry; this report and MOBILE_HERO_GREEN_GAP_FIX.md. Existing unrelated photography work remains untouched.

Validation: production build PASS (existing large-chunk warning); 156 frontend unit tests PASS; six gesture-initialization scenarios PASS; diagnostic-absence/fallback PASS; first-frame/refresh/restoration/video-off/failure suite PASS in Chromium/WebKit at 390/1440; 24 Chromium mode cases PASS. Width/height coverage and final lock results are recorded in the green-gap report. No deploy, commit, merge or push. Physical acceptance should use the ordinary local URL without heroDebug; the debug query now has no effect.
