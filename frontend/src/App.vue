<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useContent } from "./content/useContent";
import { useClinicStore } from "./stores/clinic";
import SiteHeader from "./components/layout/SiteHeader.vue";
import CookieConsent from "./components/privacy/CookieConsent.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
import WelcomeIntro from "./components/common/WelcomeIntro.vue";
import { vEditorialMotion } from "./directives/editorialMotion";
import "./styles/editorial.css";
const route = useRoute(),
  { t, locale } = useContent(),
  store = useClinicStore();
const animateRoute = ref(false);
watch(
  () => route.path,
  (to, from) => {
    // The locked tour and first-entry curtain own homepage motion.
    animateRoute.value =
      to !== "/" &&
      from !== "/" &&
      !document.documentElement.hasAttribute("data-ag-welcome");
  },
);
function leavingPage(element: Element) {
  element.setAttribute("inert", "");
  element.setAttribute("aria-hidden", "true");
}
onMounted(() => store.checkHealth());
watch(
  [() => route.fullPath, locale],
  () => {
    document.title = `${t(String(route.meta.title || "nav.home"))} · AG Zobārstniecība`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      "content",
      t("page.servicesIntro") + " " + t("hero.location") + ". +371 28229925.",
    );
  },
  { immediate: true },
);
</script>
<template>
  <v-app>
    <WelcomeIntro />
    <SiteHeader />
    <v-main id="main" tabindex="-1">
      <RouterView v-slot="{ Component }">
        <component :is="Component" v-if="route.path === '/'" />
        <Transition name="page" :css="animateRoute" @before-leave="leavingPage">
          <div
            v-if="route.path !== '/'"
            :key="route.path"
            class="content-design interior-design"
            v-editorial-motion
          >
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </v-main>
    <SiteFooter />
    <CookieConsent />
  </v-app>
</template>

<style>
#main {
  position: relative;
}
.page-enter-active {
  transition:
    opacity 300ms var(--ease),
    transform 300ms var(--ease);
}
.page-leave-active {
  position: absolute;
  inset: 0 0 auto;
  pointer-events: none;
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
