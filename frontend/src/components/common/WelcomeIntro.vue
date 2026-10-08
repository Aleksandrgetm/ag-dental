<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const root = document.documentElement;
const visible = ref(root.hasAttribute("data-ag-welcome"));
let preference: MediaQueryList | undefined;
let deadline: ReturnType<typeof setTimeout> | undefined;

function hide() {
  visible.value = false;
  clearTimeout(deadline);
  window.removeEventListener("ag:welcome-ended", hide);
  window.removeEventListener("keydown", finish, true);
  preference?.removeEventListener("change", reduce);
}
function finish() {
  window.dispatchEvent(new Event("ag:welcome-dismiss"));
  hide();
}
function reduce() {
  if (preference?.matches) finish();
}
function animationEnded(event: AnimationEvent) {
  if (event.target === event.currentTarget) finish();
}

watch(
  () => route.path,
  (path) => {
    if (visible.value && path !== "/") finish();
  },
);
onMounted(() => {
  if (!visible.value) return;
  preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches || !root.hasAttribute("data-ag-welcome")) {
    finish();
    return;
  }
  window.addEventListener("ag:welcome-ended", hide);
  // Dismiss rather than trapping focus or swallowing the visitor's next key.
  window.addEventListener("keydown", finish, true);
  preference.addEventListener("change", reduce);
  root.setAttribute("data-ag-welcome", "active");
  deadline = setTimeout(finish, 2300);
});
onBeforeUnmount(finish);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="welcome-intro"
      aria-hidden="true"
      @animationend="animationEnded"
      @pointerdown="finish"
    >
      <div class="welcome-identity">
        <div class="welcome-mask">
          <span class="welcome-monogram">AG</span>
        </div>
        <div class="welcome-mask welcome-name-mask">
          <span class="welcome-name">ZOBĀRSTNIECĪBA</span>
        </div>
        <span class="welcome-location">RĪGA · TEIKA</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.welcome-intro {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--ink, #30392f);
  color: var(--paper, #f7f6f0);
  cursor: default;
  animation: ag-welcome-curtain 750ms 1200ms cubic-bezier(0.76, 0, 0.24, 1) both;
}
.welcome-identity {
  padding: 32px;
  text-align: center;
}
.welcome-mask {
  overflow: hidden;
}
.welcome-monogram {
  display: block;
  padding: 0.08em 0.12em 0.12em 0;
  font: 400 clamp(110px, 13vw, 180px)/0.85 var(--serif);
  letter-spacing: -0.075em;
  animation: ag-welcome-line 550ms 180ms var(--ease) both;
}
.welcome-name-mask {
  margin-top: 20px;
  padding-block: 3px;
}
.welcome-name {
  display: block;
  font: 500 clamp(11px, 1vw, 14px)/1.5 var(--sans);
  letter-spacing: 0.26em;
  padding-left: 0.26em;
  animation: ag-welcome-line 500ms 260ms var(--ease) both;
}
.welcome-location {
  display: block;
  margin-top: 28px;
  font: 400 10px/1.5 var(--sans);
  letter-spacing: 0.22em;
  padding-left: 0.22em;
  color: rgb(247 246 240 / 0.7);
  animation: ag-welcome-location 400ms 450ms ease-out both;
}
@keyframes ag-welcome-line {
  from {
    transform: translateY(110%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes ag-welcome-location {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes ag-welcome-curtain {
  from {
    clip-path: inset(0 0 0 0);
  }
  to {
    clip-path: inset(0 0 100% 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .welcome-intro {
    display: none;
    animation: none;
  }
  .welcome-intro * {
    animation: none;
  }
}
</style>
