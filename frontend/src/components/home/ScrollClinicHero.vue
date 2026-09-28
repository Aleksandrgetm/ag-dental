<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { media } from "../../content/clinic";
import { useContent } from "../../content/useContent";
const { t } = useContent();
const section = ref<HTMLElement>(),
  video = ref<HTMLVideoElement>();
const progress = ref(0),
  reduced = ref(false),
  failed = ref(false),
  ready = ref(false),
  stopped = ref(false);
const staticMode = computed(
  () => reduced.value || failed.value || stopped.value,
);
let frame = 0,
  watchdog = 0,
  loadTimer = 0,
  target = 0,
  query: MediaQueryList | undefined,
  alive = true;
const chapter = computed(() =>
  progress.value < 0.25
    ? 0
    : progress.value < 0.51
      ? 1
      : progress.value < 0.79
        ? 2
        : 3,
);
function measure() {
  if (!section.value || staticMode.value) return;
  const rect = section.value.getBoundingClientRect();
  target = Math.min(
    1,
    Math.max(
      0,
      -rect.top / Math.max(1, section.value.offsetHeight - window.innerHeight),
    ),
  );
  if (!frame) frame = requestAnimationFrame(update);
}
function update() {
  frame = 0;
  if (!alive || staticMode.value) return;
  progress.value += (target - progress.value) * 0.18;
  if (Math.abs(target - progress.value) < 0.0005) progress.value = target;
  const v = video.value;
  if (v && ready.value && Number.isFinite(v.duration) && !v.seeking) {
    const time = progress.value * Math.max(0, v.duration - 0.04);
    if (Math.abs(v.currentTime - time) > 0.025) {
      v.currentTime = time;
      clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        if (v.seeking) failed.value = true;
      }, 4500);
    }
  }
  if (Math.abs(target - progress.value) > 0.0005)
    frame = requestAnimationFrame(update);
}
function loaded() {
  ready.value = true;
  clearTimeout(loadTimer);
  measure();
}
function seeked() {
  clearTimeout(watchdog);
  if (!frame && !staticMode.value) frame = requestAnimationFrame(update);
}
function motion() {
  reduced.value = !!query?.matches;
  measure();
}
function skip() {
  document.getElementById("intro")?.scrollIntoView({ behavior: "instant" });
}
function stop() {
  stopped.value = true;
  window.scrollTo({ top: 0, behavior: "instant" });
}
onMounted(() => {
  query = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion();
  query.addEventListener("change", motion);
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", measure);
  loadTimer = window.setTimeout(() => {
    if (!ready.value) failed.value = true;
  }, 12000);
  measure();
});
onBeforeUnmount(() => {
  alive = false;
  cancelAnimationFrame(frame);
  clearTimeout(watchdog);
  clearTimeout(loadTimer);
  window.removeEventListener("scroll", measure);
  window.removeEventListener("resize", measure);
  query?.removeEventListener("change", motion);
});
</script>
<template>
  <section
    ref="section"
    class="tour"
    :class="{ 'tour-static': staticMode }"
    :aria-label="t('ui.tour')"
  >
    <div class="tour-viewport">
      <img
        class="tour-poster"
        :src="media.poster"
        alt=""
        width="1280"
        height="720"
        fetchpriority="high"
      />
      <video
        v-if="!staticMode"
        ref="video"
        class="tour-video"
        :class="{ 'is-ready': ready }"
        :src="media.video"
        :poster="media.poster"
        muted
        playsinline
        preload="auto"
        aria-hidden="true"
        @loadeddata="loaded"
        @seeked="seeked"
        @error="failed = true"
      ></video>
      <div class="tour-shade"></div>
      <div
        class="tour-exit"
        :style="{ opacity: Math.max(0, (progress - 0.88) / 0.12) }"
      ></div>
      <div class="tour-topline">
        <span>AG ZOBĀRSTNIECĪBA</span><span>{{ t("hero.location") }}</span>
      </div>
      <div class="tour-copy" :class="[`chapter-${staticMode ? 0 : chapter}`]">
        <Transition name="chapter" mode="out-in"
          ><div :key="staticMode ? 0 : chapter">
            <template v-if="staticMode || chapter === 0"
              ><p class="eyebrow">{{ t("hero.eyebrow") }}</p>
              <h1>
                {{ t("hero.first") }}<em>{{ t("hero.italic") }}</em>
              </h1>
              <p class="tour-description">{{ t("hero.sub") }}</p>
              <RouterLink class="button button-light" to="/pieraksts"
                >{{ t("common.bookAppointment") }} <span>↗</span></RouterLink
              ></template
            >
            <template v-else
              ><p class="eyebrow">AG ZOBĀRSTNIECĪBA</p>
              <h2>
                {{
                  t(
                    chapter === 1
                      ? "hero.second"
                      : chapter === 2
                        ? "hero.third"
                        : "hero.last",
                  )
                }}
              </h2>
              <RouterLink
                v-if="chapter === 3"
                class="button button-light"
                to="/pieraksts"
                >{{ t("common.bookAppointment") }} <span>↗</span></RouterLink
              ></template
            >
          </div></Transition
        >
      </div>
      <div class="tour-bottom">
        <button class="scroll-prompt" @click="skip">
          <span class="scroll-circle">↓</span
          ><span>{{ staticMode ? t("ui.skipTour") : t("ui.scroll") }}</span>
        </button>
        <div v-if="!staticMode" class="tour-progress">
          <span>0{{ chapter + 1 }}</span>
          <div><i :style="{ transform: `scaleX(${progress})` }"></i></div>
          <span>04</span>
        </div>
        <button v-if="!staticMode" class="tour-skip" @click="stop">
          {{ t("ui.stopTour") }} <span>↗</span>
        </button>
      </div>
    </div>
  </section>
</template>
