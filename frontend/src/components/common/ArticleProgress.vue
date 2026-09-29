<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
const props = defineProps<{ target: HTMLElement | undefined }>();
const line = ref<HTMLElement>();
let frame = 0;
let resize: ResizeObserver | undefined;
function update() {
  frame = 0;
  if (!props.target || !line.value) return;
  const bounds = props.target.getBoundingClientRect();
  const header = document.querySelector(".site-header")?.clientHeight || 0;
  // Start at the lead; finish when the last real paragraph reaches the viewport.
  // Booking CTA and footer are deliberately outside the measured region.
  const distance = bounds.height - (innerHeight - header);
  const progress =
    distance > 0
      ? Math.max(0, Math.min(1, (header - bounds.top) / distance))
      : bounds.top <= header
        ? 1
        : 0;
  line.value.style.transform = `scaleX(${progress})`;
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}
onMounted(() => {
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  resize = new ResizeObserver(schedule);
  if (props.target) resize.observe(props.target);
  schedule();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  resize?.disconnect();
  cancelAnimationFrame(frame);
});
</script>
<template>
  <Teleport to="body"
    ><div ref="line" class="article-progress" aria-hidden="true"
  /></Teleport>
</template>
<style scoped>
.article-progress {
  position: fixed;
  inset: 0 0 auto;
  height: 2px;
  background: var(--olive);
  z-index: 60;
  pointer-events: none;
  transform: scaleX(0);
  transform-origin: left;
}
</style>
