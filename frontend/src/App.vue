<script setup lang="ts">
import { onMounted, watch } from "vue";
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
        <div
          v-else
          :key="route.path"
          class="content-design interior-design"
          v-editorial-motion
        >
          <component :is="Component" />
        </div>
      </RouterView>
    </v-main>
    <SiteFooter />
    <CookieConsent />
  </v-app>
</template>
