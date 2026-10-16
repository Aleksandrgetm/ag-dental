<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useContent } from "../../content/useContent";
import { heroVideo, neutralHeroPoster } from "../../content/heroMedia";
import { heroControls } from "../../content/heroControls";
import { hasPreference, readPreferences, savePreferences } from "../../services/hero/preferences";
const { t, locale } = useContent();
const labels = computed(() => heroControls[locale.value as keyof typeof heroControls] || heroControls.lv);
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Privacy mode. */ }
const query = window.matchMedia("(prefers-reduced-motion: reduce)");
const preferences = ref(readPreferences(storage, query.matches));
let explicit = hasPreference(storage);
const section = ref<HTMLElement>(), viewport = ref<HTMLElement>(), video = ref<HTMLVideoElement>();
const progress = ref(0), failed = ref(false), ready = ref(false), decoded = ref(false), visible = ref(true);
const cinematic = computed(() => !!heroVideo && preferences.value.video && preferences.value.animation && !failed.value);
const staticMode = computed(() => !cinematic.value);
const loadVideo = computed(() => !!heroVideo && preferences.value.video && !failed.value);
let frame = 0, watchdog = 0, loadTimer = 0, target = 0, requestedTime = 0, stalledSeeks = 0, alive = true, observer: IntersectionObserver | undefined;
let presentationFrame = 0, restoreFrame = 0;
const attempted = new WeakSet<HTMLVideoElement>();
let preparing: HTMLVideoElement | undefined, preparationTimer = 0, preparationGeneration = 0;
function cancelPreparation() {
  preparationGeneration++; clearTimeout(preparationTimer); preparationTimer = 0;
  preparing?.pause(); preparing = undefined;
}
function finishPreparation() {
  const v = preparing;
  if (!v || v !== video.value || v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  v.pause(); cancelPreparation(); reconcileReadiness(v); measure();
}
function initializeFromGesture(event: Event) {
  const v = video.value;
  if (!window.matchMedia('(pointer: coarse)').matches || !event.isTrusted || !(event.target instanceof Element) || !event.target.closest('.tour') || event.target.closest('button, a') || !alive || !cinematic.value || !loadVideo.value || document.hidden || !visible.value || !v || attempted.has(v) || v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  attempted.add(v); preparing = v; ready.value = false;
  cancelPresentation(); clearTimeout(watchdog); watchdog = 0;
  const generation = ++preparationGeneration;
  preparationTimer = window.setTimeout(() => fail('initialization-timeout'), 2500);
  v.muted = true; v.playsInline = true;
  try {
    void v.play().then(() => {
      if (generation !== preparationGeneration || !alive || video.value !== v || !cinematic.value) { v.pause(); return; }
      finishPreparation();
    }).catch(() => {
      if (generation === preparationGeneration && alive && video.value === v) fail('initialization-rejected');
    });
  } catch { if (generation === preparationGeneration) fail('initialization-rejected'); }
}

function cancelPresentation() { cancelAnimationFrame(presentationFrame); presentationFrame = 0; }
function desiredTime() { return cinematic.value ? target * Math.max(0, (video.value?.duration || 0) - 0.04) : 0; }
// loadeddata/seeked supply a decoded frame; cross a rendering boundary before showing it.
function presentDecodedFrame(v: HTMLVideoElement) {
  if (ready.value || presentationFrame) return;
  presentationFrame = requestAnimationFrame(() => {
    presentationFrame = requestAnimationFrame(() => {
      presentationFrame = 0;
      if (!alive || video.value !== v || !loadVideo.value || document.hidden) return;
      measure();
      if (!v.seeking && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && Math.abs(v.currentTime - desiredTime()) < 1 / 30) {
        ready.value = true; clearTimeout(loadTimer);
      }
    });
  });
}
function stopUpdates() {
  cancelPreparation();
  cancelPresentation();
  cancelAnimationFrame(restoreFrame); restoreFrame = 0;
  cancelAnimationFrame(frame); frame = 0;
  clearTimeout(watchdog); watchdog = 0; clearTimeout(loadTimer);
  video.value?.pause();
}
function releaseMedia(element = video.value) {
  if (!element) return;
  element.pause(); element.removeAttribute('src'); element.load();
}
function measure() {
  if (!loadVideo.value || (!cinematic.value && ready.value) || !visible.value || document.hidden || !section.value || !viewport.value) return;
  if (!preparing && video.value?.seeking && !watchdog) watchdog = window.setTimeout(() => fail("seek-observed-timeout"), 2500);
  const rect = section.value.getBoundingClientRect();
  target = Math.min(1, Math.max(0, -rect.top / Math.max(1, section.value.offsetHeight - viewport.value.offsetHeight)));
  if (!frame) frame = requestAnimationFrame(update);
}
function update() {
  frame = 0;
  const v = video.value;
  if (!alive || !loadVideo.value || (!cinematic.value && ready.value) || !visible.value || document.hidden || !v || v.readyState < HTMLMediaElement.HAVE_METADATA || v.seeking || !Number.isFinite(v.duration) || v.duration <= 0) return;
  if (preparing) { finishPreparation(); return; }
  // Avoid the observed cold metadata-only touch seek before genuine activation.
  if (window.matchMedia('(pointer: coarse)').matches && v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !attempted.has(v)) return;
  reconcileReadiness(v);
  // Metadata permits seeking; decoded-frame readiness still gates visibility.
  // One outstanding seek; seeked schedules the latest scroll target. No smoothing loop.
  progress.value = cinematic.value ? target : 0;
  const time = desiredTime();
  if (Math.abs(v.currentTime - time) < 1 / 30) { presentDecodedFrame(v); return; }
  cancelPresentation();
  requestedTime = time;
  try { v.currentTime = time; } catch { fail("seek-assignment-exception"); return; }
  clearTimeout(watchdog);
  watchdog = window.setTimeout(() => fail("seek-request-timeout"), 2500);
}
function fail(_reason: string) {
  if (!alive) return;
  stopUpdates(); releaseMedia(); failed.value = true;
}
// Every lifecycle path reads the current element, not a permanently latched event flag.
function reconcileReadiness(v = video.value) {
  if (!alive || !loadVideo.value || !v || v !== video.value) return false;
  decoded.value = v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  return decoded.value;
}
function currentEvent(event: Event) {
  return alive && loadVideo.value && event.currentTarget === video.value;
}
function loaded(event: Event) {
  if (!currentEvent(event)) return;
  if (preparing) { finishPreparation(); return; }
  reconcileReadiness(); video.value?.pause(); measure();
}
function mediaError(event: Event) { if (currentEvent(event)) fail("media-error"); }
function seeked(event: Event) {
  if (!currentEvent(event)) return;
  if (preparing) { finishPreparation(); return; }
  reconcileReadiness();
  clearTimeout(watchdog); watchdog = 0;
  if (!loadVideo.value) return;
  // Some engines fire seeked without advancing; avoid an endless decode loop.
  stalledSeeks = Math.abs((video.value?.currentTime || 0) - requestedTime) > .15 ? stalledSeeks + 1 : 0;
  if (stalledSeeks >= 3) { fail("inaccurate-seek-completions"); return; }
  measure();
}
function motion() { if (!explicit) preferences.value = { ...preferences.value, animation: !query.matches }; }
function choose(key: 'animation' | 'video') {
  explicit = true;
  preferences.value = { ...preferences.value, [key]: !preferences.value[key] };
  if (preferences.value.video && preferences.value.animation) failed.value = false;
  stalledSeeks = 0;
  savePreferences(storage, preferences.value);
}
function restorePosition() {
  if (!alive) return;
  const element = video.value;
  ready.value = false; cancelPresentation();
  video.value?.classList.remove('is-ready');
  cancelAnimationFrame(restoreFrame);
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = 0;
    if (!alive || element !== video.value) return;
    reconcileReadiness();
    armLoadTimeout(); measure();
  });
}
function suspendPage() { ready.value = false; video.value?.classList.remove('is-ready'); stopUpdates(); }
function pageVisibility() { if (document.hidden) suspendPage(); else restorePosition(); }
function armLoadTimeout() {
  clearTimeout(loadTimer);
  if (loadVideo.value && !ready.value && cinematic.value) loadTimer = window.setTimeout(() => fail("initial-frame-timeout"), 12000);
}
watch(cinematic, async (enabled) => {
  const rect = section.value?.getBoundingClientRect();
  const oldHeight = section.value?.offsetHeight || 0;
  const oldY = window.scrollY;
  stopUpdates();
  if (enabled) ready.value = false;
  window.removeEventListener('scroll', measure);
  if (enabled) window.addEventListener('scroll', measure, { passive: true });
  await nextTick();
  if (!alive || enabled !== cinematic.value) return;
  // Preserve the visible section/content anchor when the sticky distance changes.
  if (rect && rect.top < 0) {
    const y = rect.bottom <= 0 ? oldY + (section.value!.offsetHeight - oldHeight) : oldY + rect.top;
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  }
  progress.value = 0; armLoadTimeout(); measure();
}, { flush: 'pre' });
watch(loadVideo, async (enabled) => {
  if (!enabled) { releaseMedia(); ready.value = false; decoded.value = false; }
  await nextTick();
  if (alive && enabled === loadVideo.value) { reconcileReadiness(); armLoadTimeout(); measure(); }
}, { flush: 'pre' });
onMounted(() => {
  query.addEventListener('change', motion);
  for (const name of ['touchend', 'pointerup', 'click']) document.addEventListener(name, initializeFromGesture, { passive: true });
  if (cinematic.value) window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('pageshow', restorePosition);
  window.addEventListener('pagehide', suspendPage);
  window.addEventListener('popstate', restorePosition);
  document.addEventListener('visibilitychange', pageVisibility);
  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting;
    if (visible.value) { armLoadTimeout(); measure(); } else stopUpdates();
  });
  if (section.value) observer.observe(section.value);
  reconcileReadiness(); armLoadTimeout(); measure();
});
onBeforeUnmount(() => {
  for (const name of ['touchend', 'pointerup', 'click']) document.removeEventListener(name, initializeFromGesture);
  alive = false; stopUpdates(); releaseMedia(); observer?.disconnect();
  window.removeEventListener('scroll', measure);
  window.removeEventListener('resize', measure);
  window.removeEventListener('pageshow', restorePosition);
  window.removeEventListener('pagehide', suspendPage);
  window.removeEventListener('popstate', restorePosition);
  document.removeEventListener('visibilitychange', pageVisibility);
  query.removeEventListener('change', motion);
});
</script>
<template>
  <section
    ref="section"
    class="tour"
    :class="{ 'tour-static': staticMode }"
    :aria-label="t('ui.tour')"
  >
    <div ref="viewport" class="tour-viewport">
      <img
        class="tour-poster"
        :src="neutralHeroPoster"
        alt=""
        width="1280"
        height="720"
        fetchpriority="high"
      />
      <video
        v-if="loadVideo"
        ref="video"
        class="tour-video"
        :class="{ 'is-ready': ready }"
        :src="heroVideo"
        :poster="neutralHeroPoster"
        muted
        playsinline
        :preload="cinematic ? 'auto' : 'metadata'"
        aria-hidden="true"
        @loadedmetadata="loaded"
        @loadeddata="loaded"
        @canplay="loaded"
        @seeked="seeked"
        @error="mediaError"
      ></video>
      <div class="tour-shade"></div>
      <div class="tour-controls" role="group" :aria-label="labels.label">
        <button type="button" :disabled="!heroVideo" :aria-pressed="!preferences.animation" @click="choose('animation')">{{ preferences.animation ? labels.disable : labels.enable }}</button>
        <button type="button" :disabled="!heroVideo" :aria-pressed="!preferences.video" @click="choose('video')">{{ preferences.video ? labels.off : labels.on }}</button>
        <span v-if="!heroVideo || failed" role="status">{{ failed ? labels.failed : labels.unavailable }}</span>
      </div>
      <div
        class="tour-exit"
        :style="{ opacity: Math.max(0, (progress - 0.88) / 0.12) }"
      ></div>
      <div class="tour-topline">
        <span>AG ZOBĀRSTNIECĪBA</span><span>{{ t("hero.location") }}</span>
      </div>
      <div class="tour-copy">
        <div>
          <p class="eyebrow">{{ t("hero.eyebrow") }}</p>
          <h1>
            {{ t("hero.first") }}<em>{{ t("hero.italic") }}</em>
          </h1>
          <p class="tour-description">{{ t("hero.sub") }}</p>
          <RouterLink class="button button-light" to="/pieraksts"
            >{{ t("common.bookAppointment") }} <span aria-hidden="true"><svg viewBox="0 -800 1000 1000" fill="currentColor"><path d="M75 78L861 -711L871 -500H900C902 -622 909 -690 930 -810C810 -789 742 -782 620 -780V-751L831 -741L46 49Z" /></svg></span></RouterLink
          >
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Scoped additions preserve shared typography and composition. */
.tour-copy .button {
  position: relative;
}
.tour-copy .button > span {
  position: absolute;
  inset-inline-end: 0;
  padding-inline-end: inherit;
}
.tour-copy .button svg { width: 1em; height: 1em; display: block; }
.tour-controls { position: absolute; z-index: 4; bottom: 18px; left: var(--gutter); right: var(--gutter); display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; font-size: 11px; }
.tour-controls button { min-height: 44px; padding: 8px 0; color: inherit; background: none; border: 0; border-bottom: 1px solid currentColor; cursor: pointer; font: inherit; }
.tour-controls button:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.tour-controls button:disabled { cursor: default; opacity: .65; }
.tour-controls span { max-width: 100%; }
@media (max-height: 650px) { .tour-controls { bottom: 8px; } }
/* An explicit opt-in may override the system default, only inside this Hero. */
@media (prefers-reduced-motion: reduce) {
  .tour:not(.tour-static) { height: 500vh; min-height: 0; }
  .tour:not(.tour-static) .tour-viewport { position: sticky; height: 100svh; }
  .tour .tour-video { display: block; }
}
@media (prefers-reduced-motion: reduce) and (max-width: 800px) { .tour:not(.tour-static) { height: 360vh; } }
/* Keep active touch/mobile cinema covered as browser toolbars retract. */
@media (max-width: 800px), (pointer: coarse) {
  .tour:not(.tour-static) .tour-viewport {
    height: 100svh;
    height: 100dvh;
  }
}
</style>
