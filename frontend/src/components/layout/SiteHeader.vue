<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { useContent } from "../../content/useContent";
import { useCookieConsentStore } from "../../stores/cookieConsent";
import { LANGUAGE_KEY } from "../../services/cookieConsent";
import AuthControl from "./AuthControl.vue";
import { clinic } from "../../content/clinic";
const { t, locale } = useContent();
const consent = useCookieConsentStore();
const route = useRoute();
const open = ref(false),
  heroPassed = ref(false),
  header = ref<HTMLElement>(),
  panel = ref<HTMLElement>(),
  toggle = ref<HTMLButtonElement>();
const links = [
  ["/", "home"],
  ["/pakalpojumi", "services"],
  ["/cenas", "prices"],
  ["/par-mums", "about"],
  ["/jaunumi", "news"],
  ["/kontakti", "contact"],
];
const state = computed(() =>
  route.path !== "/" || heroPassed.value || open.value ? "normal" : "hero",
);
let boundary: IntersectionObserver | undefined;
let headerSize: ResizeObserver | undefined;
let boundaryVersion = 0;
let boundaryEdge = 0;
async function observeBoundary() {
  const version = ++boundaryVersion;
  boundary?.disconnect();
  // The initial route is also "/" before its lazy component has mounted.
  // Wait for the resolved route's DOM, not just a pathname change.
  await nextTick();
  if (version !== boundaryVersion) return;
  const hero = route.path === "/" ? document.querySelector(".tour") : null;
  if (!hero || !header.value) return;
  const edge = header.value.offsetHeight;
  boundaryEdge = edge;
  heroPassed.value = hero.getBoundingClientRect().bottom < edge;
  boundary = new IntersectionObserver(
    ([entry]) => {
      if (version !== boundaryVersion || !entry) return;
      // isIntersecting handles edge contact correctly when scrolling back up.
      heroPassed.value =
        !entry.isIntersecting && entry.boundingClientRect.bottom < edge;
    },
    { rootMargin: `-${edge}px 0px 0px 0px`, threshold: 0 },
  );
  boundary.observe(hero);
}
function language(lang: string) {
  locale.value = lang;
}
watch(
  [locale, () => consent.preferencesAllowed],
  ([value, allowed]) => {
    document.documentElement.lang = value;
    try {
      if (allowed) localStorage.setItem(LANGUAGE_KEY, value);
      else localStorage.removeItem(LANGUAGE_KEY);
    } catch {
      /* Optional persistence. */
    }
  },
  { immediate: true },
);
watch(
  [() => route.fullPath, () => route.matched],
  () => {
    open.value = false;
    observeBoundary();
  },
  { flush: "post" },
);
watch(open, async (value) => {
  document.body.style.overflow = value ? "hidden" : "";
  if (value) {
    await nextTick();
    panel.value?.querySelector<HTMLElement>("a")?.focus();
  } else toggle.value?.focus();
});
function keydown(event: KeyboardEvent) {
  if (!open.value) return;
  if (event.key === "Escape") {
    open.value = false;
    return;
  }
  if (event.key !== "Tab") return;
  const items = Array.from(
    panel.value?.querySelectorAll<HTMLElement>("a,button") || [],
  );
  const first = toggle.value,
    last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => {
  observeBoundary();
  headerSize = new ResizeObserver(() => {
    if (route.path === "/" && header.value?.offsetHeight !== boundaryEdge)
      observeBoundary();
  });
  if (header.value) headerSize.observe(header.value);
  document.addEventListener("keydown", keydown);
});
onBeforeUnmount(() => {
  ++boundaryVersion;
  boundary?.disconnect();
  headerSize?.disconnect();
  document.removeEventListener("keydown", keydown);
  document.body.style.overflow = "";
});
</script>
<template>
  <a class="skip-link" href="#main">{{ t("ui.skip") }}</a>
  <header
    ref="header"
    class="site-header"
    :class="{
      solid: state === 'normal',
      'homepage-header': route.path === '/',
      'menu-is-open': open,
    }"
  >
    <RouterLink to="/" class="brand" aria-label="AG Zobārstniecība — Sākums"
      ><span class="brand-monogram">AG<span class="brand-dot">.</span></span
      ><span class="brand-name"
        >ZOBĀRSTNIECĪBA<span>RĪGA · TEIKA</span></span
      ></RouterLink
    >
    <nav class="desktop-nav" :aria-label="t('ui.menu')">
      <RouterLink
        v-for="[path, key] in links"
        :key="path"
        :to="path!"
        :class="{
          active:
            path === '/' ? route.path === '/' : route.path.startsWith(path!),
        }"
        >{{ t(`nav.${key}`) }}</RouterLink
      >
    </nav>
    <div class="header-actions">
      <div class="language-switch" role="group" :aria-label="t('ui.languages')">
        <button
          v-for="lang in ['lv', 'ru', 'en']"
          :key="lang"
          :aria-pressed="locale === lang"
          :lang="lang"
          @click="language(lang)"
        >
          {{ lang.toUpperCase() }}
        </button>
      </div>
      <AuthControl />
      <button
        ref="toggle"
        class="menu-toggle"
        :aria-expanded="open"
        aria-controls="mobile-menu"
        :aria-label="open ? t('ui.close') : t('ui.menu')"
        @click="open = !open"
      >
        <span>{{ open ? t("common.back") : t("ui.menu") }}</span
        ><span class="menu-lines" :class="{ cross: open }"><i></i><i></i></span>
      </button>
    </div>
  </header>
  <Transition name="menu"
    ><div
      v-if="open"
      id="mobile-menu"
      ref="panel"
      class="mobile-menu refined-menu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('ui.menu')"
    >
      <nav>
        <RouterLink
          v-for="([path, key], index) in links"
          :style="{ '--menu-index': index }"
          :key="path"
          :to="path!"
          ><small>0{{ index + 1 }}</small
          >{{ t(`nav.${key}`) }}</RouterLink
        >
      </nav>
      <div class="mobile-menu-bottom">
        <div
          class="language-switch"
          role="group"
          :aria-label="t('ui.languages')"
        >
          <button
            v-for="lang in ['lv', 'ru', 'en']"
            :key="lang"
            :aria-pressed="locale === lang"
            @click="language(lang)"
          >
            {{ lang.toUpperCase() }}
          </button>
        </div>
        <a :href="clinic.tel">{{ clinic.phone }}</a>
        <div class="menu-visit-info">
          Ūnijas iela 25 · Rīga
          <p>{{ t("ui.hours") }} · 09:00–18:00</p>
        </div>
        <AuthControl mobile @signed-out="open = false" />
      </div></div
  ></Transition>
</template>

<style scoped>
.site-header {
  transition:
    background-color 360ms var(--ease),
    color 360ms var(--ease),
    border-color 360ms var(--ease),
    height 360ms var(--ease);
}
.site-header
  :is(
    .brand,
    .desktop-nav a,
    .language-switch button,
    .header-book,
    .menu-toggle
  ) {
  transition:
    background-color 360ms var(--ease),
    color 360ms var(--ease),
    border-color 360ms var(--ease),
    opacity 240ms ease;
}
/* Match the existing internal-page heights in both homepage states.
   Geometry stays fixed; only the existing color treatments change. */
.site-header.homepage-header {
  height: 86px;
  transition-property: background-color, color, border-color;
}
/* These elements inherit the header's animated color. A second color
   transition would trail behind it and leave pale text on the light surface. */
.site-header.homepage-header
  :is(.brand, .desktop-nav a, .language-switch button, .menu-toggle) {
  transition-property: background-color, border-color, opacity;
  transition-duration: 360ms, 360ms, 240ms;
}
@media (max-width: 1200px) {
  .site-header.homepage-header {
    height: 78px;
  }
}
@media (max-width: 800px) {
  .site-header.homepage-header {
    height: 74px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .site-header.homepage-header,
  .site-header.homepage-header * {
    transition: none !important;
  }
  .site-header,
  .site-header * {
    transition: none;
  }
}
</style>
