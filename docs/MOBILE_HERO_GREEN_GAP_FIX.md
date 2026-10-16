# Mobile Hero green gap — investigation, 2026-10-15

> Final status, 2026-10-16: the user confirms that the final mobile Hero works on a physical iPhone; the bounded first-load initialization was previously confirmed on three iPhones. Temporary application diagnostics have been removed and the approved dynamic-viewport cleanup is implemented. Historical investigation and approval checkpoints below are retained as chronology, not outstanding implementation instructions. Physical-device results are user-reported, not independent device testing by Codex.

Status: protected change approval required. No application code or lock hash changed for this task.

## Findings

The user reports that actual iPhone video scrubbing now works. This report supersedes the earlier unresolved-device status for scrubbing; it does not claim we independently tested the phone.

The confirmed local reproduction is a viewport coverage mismatch:

- Protected `frontend/src/style.css` sets `.tour-viewport` to `height: 100svh`, sticky at top zero.
- `.tour` has `background: var(--ink)` = `rgb(48,57,47)` / #30392f, and a long scroll height.
- Video, poster and shade fill 100% of the sticky viewport with `object-fit: cover`.
- When the visible viewport exceeds the small viewport, the uncovered strip belongs to `.tour`, not the next section or a video letterbox.
- The scoped reduced-motion explicit opt-in rule in protected `frontend/src/components/home/ScrollClinicHero.vue` also specifies `100svh`.

[WebKit documents](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) that svh measures the smallest viewport and dvh tracks its dynamic height. Desktop emulation normally makes these equal; simply resizing the emulated window does not reproduce Safari toolbar collapse.

## Controlled reproduction and candidate

Isolated WebKit, 390×844, scrollY 500, synthetic frontend settings and blocked external APIs. Temporary in-memory CSS represented a 664px small viewport within an 844px visible viewport; no source files changed.

| State | Sticky/video bottom | Visible bottom | Bottom hit-test | Result |
|---|---:|---:|---|---|
| Normal emulation | 843.984 | 844 | tour-shade | Covered |
| Simulated small viewport | 664 | 844 | tour | 180px green strip |
| Browser-only 100dvh trial | 843.984 | 844 | tour-shade | Covered |

The next section remained below the screen (Hero section bottom 2538.39px), confirming that this reproduction exposes the Hero parent. The poster and video share the same coverage, so changing readiness or hiding the parent color is not the appropriate repair.

Candidate coverage also measured correctly at 375×667, 430×932, 844×390, 390×664 and 390×844. These are emulated viewport changes, not actual Safari toolbar or hardware orientation tests. No real-device screenshot was attached to the latest request; the exact phone instance remains unverified.

Local ignored screenshots and measurements:

- `docs/screenshots/mobile-hero-gap/simulated-small-viewport.png` — reproduced gap.
- `docs/screenshots/mobile-hero-gap/candidate-dynamic-viewport.png` — in-memory candidate, not implemented fix.
- `docs/screenshots/mobile-hero-gap/measurements.json` — geometry/hit-test evidence.
- Additional normal and candidate viewport screenshots in the same folder.

## Exact proposed protected scope

Prefer a narrowly scoped change in `frontend/src/components/home/ScrollClinicHero.vue` only:

1. Apply dynamic viewport height to the active cinematic sticky viewport on touch/mobile layouts, with the existing height as fallback; include the reduced-motion explicit opt-in case.
2. Preserve cover sizing, typography, CTA, controls and native scroll; do not add overlays or extend the section's scroll distance.
3. Verify viewport-size changes update scroll measurements. If necessary, observe sticky viewport size and clean up that observer on unmount, without introducing scrollTo calls for toolbar resizing.
4. Test progress and section release in both directions, toolbar-height transitions, orientation, static/video-off and reduced-motion modes before updating only the component lock hash.

Alternative editing of shared `frontend/src/style.css` would require separate explicit protected-file approval; it is not proposed here. No override was placed in an unprotected file to evade protection.

A dynamic-height trial proves coverage only. Text anchoring, time synchronization and transition stability during real toolbar animation still require implementation verification; no claim of completed fix or jump-free behavior is made.

## Checks

- Production build PASS (existing large-chunk advisory remains).
- Frontend unit tests: 156 PASS, zero failures/skips.
- WebKit controlled coverage reproduction and candidate geometry checks PASS as described above.
- All 15 Hero locks PASS without hash changes.
- `git diff --check` PASS.
- Full post-fix Hero/mode/responsive regressions deferred: no approved implementation change has been made.
- Actual iPhone Safari toolbar expansion/collapse: not directly tested. Actual Android: not tested.

## Files changed and next step

Only this report was added by this task. Screenshot artifacts are ignored; the temporary diagnostic is `/tmp/ag-gap.cjs`. Existing uncommitted photography and initialization work remains untouched. No production connections, data changes, deployment, commit or push occurred.

Await explicit approval for the component-only sizing and resize-observation scope above, followed by its single affected hash update after verification. After implementation, request real-iPhone confirmation because desktop WebKit cannot reproduce native Safari toolbar animation faithfully.

## Final cleanup checkpoint — 2026-10-16

The owner now confirms that the bounded initialization works on all three tested physical iPhones. Preserve it. The previously reproduced layout defect remains: a 100svh sticky surface can expose the #30392f parent when Safari's visible viewport grows. This is independent of video decoding. No new physical-device screenshot or toolbar measurement was supplied in this turn; the earlier controlled reproduction remains the layout evidence.

Exact combined component proposal is saved in `docs/MOBILE_HERO_CLEANUP_PROPOSED.patch` and has NOT been applied. The only visual change adds a scoped active-cinematic mobile/coarse-pointer rule, after the reduced-motion opt-in rules:

```css
@media (max-width: 800px), (pointer: coarse) {
  .tour:not(.tour-static) .tour-viewport {
    height: 100svh;
    height: 100dvh;
  }
}
```

This overrides small viewport sizing only for active mobile/touch cinema, retains existing fallback for unsupported dynamic units, and leaves object-fit, aspect ratio, section height, static mode, fine-pointer desktop, typography and template untouched. It uses the real dynamic viewport, not an oversized overlay. No shared protected stylesheet modification is proposed. No safe-area inset is subtracted from media coverage; controls remain as currently designed.

The same proposed patch removes protected diagnostic instrumentation only. Related unprotected cleanup is described in IPHONE_HERO_FIRST_LOAD_FIX.md. Request approval for this exact component diff and its sole lock-hash update after verification.

Post-approval verification must cover 320/375/390/430/768/1024/1440 widths; short/tall viewport changes; portrait/landscape; forward/reverse section boundaries; controls and reduced motion; real decoded frames and first-load initialization. Existing resize/scroll measurement reads actual viewport offsetHeight. Verify synchronization when dynamic height changes; do not silently add a resize algorithm or alter the working initialization if tests expose a further defect. Actual Safari toolbar animation and absence of visual jumps still need physical confirmation; desktop emulation alone cannot prove them.

No implementation edits at this checkpoint. All 15 locks PASS unchanged. Full post-change tests are pending approval, not reported as passed.

## Approved patch applied — 2026-10-16

Applied the reviewed scoped 100dvh override exactly, retaining 100svh fallback. Shared style.css and all other protected files are untouched. Active mobile/coarse-pointer Hero media now follows dynamic viewport height; static/reduced-motion behavior is unchanged. No stretch, altered object-fit, overlay, additional section distance or scrollTo behavior was added. The initial video preparation implementation is unchanged except diagnostic removal.

New `frontend/tests/hero-viewport-coverage-browser.cjs` checks Chromium and WebKit at widths 320, 375, 390, 430, 768, 1024 and 1440. At each width, heights change 844 → 664 → 844. Forward/reverse progress samples verify paused media synchronized to the measured scroll target, sticky top zero and viewport coverage within one CSS pixel. Scrolling past the section verifies release. All 14 engine/width combinations passed. This simulates viewport geometry changes, not actual Safari toolbar animation. Smoothness/no-jump acceptance during physical toolbar movement still requires user confirmation.

Screenshots and JSON: `docs/screenshots/mobile-hero-final/` (ignored local artifacts). Earlier simulated-small-viewport image in mobile-hero-gap documents the reproduced before state. Final matrix screenshots use synthetic cookie consent so controls and lower coverage are unobstructed.

Build, unit, initialization, preference and fallback checks passed as listed in IPHONE_HERO_FIRST_LOAD_FIX.md. Final hash check follows below. Final physical check: fresh load and forward/reverse swipe on the tested iPhones; expand/collapse toolbar; rotate; verify the lower edge stays covered and next-section transition is natural. Do not claim physical green-gap verification from emulation alone.

Final verification: unobstructed viewport matrix rerun PASS, 14 combinations; WebKit 390 screenshot visually inspected with continuous coverage and controls visible. All 15 Hero locks PASS after updating only ScrollClinicHero.vue's entry; whitespace check PASS. Stopped for final physical iPhone testing.
