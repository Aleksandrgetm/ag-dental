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
import { clinic } from "../../content/clinic";
const { t, locale } = useContent();
const consent = useCookieConsentStore();
const route = useRoute();
const open = ref(false),
  scrolled = ref(false),
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
const light = computed(
  () => route.path !== "/" || scrolled.value || open.value,
);
const scroll = () => {
  scrolled.value = window.scrollY > 40;
};
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
  () => route.fullPath,
  () => {
    open.value = false;
  },
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
  scroll();
  window.addEventListener("scroll", scroll, { passive: true });
  document.addEventListener("keydown", keydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", scroll);
  document.removeEventListener("keydown", keydown);
  document.body.style.overflow = "";
});
</script>
<template>
  <a class="skip-link" href="#main">{{ t("ui.skip") }}</a>
  <header class="site-header" :class="{ solid: light, 'menu-is-open': open }">
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
      <RouterLink class="button header-book" to="/kontakti"
        >{{ t("common.bookAppointment")
        }}</RouterLink
      ><button
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
        <RouterLink class="button" to="/kontakti"
          >{{ t("common.bookAppointment") }}
          </RouterLink
        >
      </div>
    </div></Transition
  >
</template>
