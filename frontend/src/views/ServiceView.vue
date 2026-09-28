<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { services, media } from "../content/clinic";
import prices from "../content/prices.json";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
import PriceList from "../components/PriceList.vue";
import NotFoundView from "./NotFoundView.vue";
const route = useRoute(),
  { t, local, locale } = useContent();
const service = computed(() =>
  services.find((s) => s.slug === route.params.slug),
);
watchEffect(() => {
  if (service.value)
    document.title = local(service.value.title) + " · AG Zobārstniecība";
});
</script>
<template>
  <template v-if="service"
    ><div class="container page-head service-head">
      <RouterLink class="eyebrow breadcrumb" to="/pakalpojumi"
        >← {{ t("nav.services") }}</RouterLink
      >
      <h1>{{ local(service.title) }}</h1>
      <p class="lead">{{ local(service.short) }}</p>
    </div>
    <section class="container service-detail-grid">
      <img
        class="service-detail-image"
        :src="media[service.image as keyof typeof media]"
        :alt="local(service.title)"
        width="840"
        height="720"
      />
      <div>
        <p class="eyebrow">{{ t("page.serviceDetail") }}</p>
        <p class="lead">{{ local(service.text) }}</p>
        <p class="detail-note">{{ t("ui.updated") }}</p>
        <RouterLink class="button" to="/pieraksts"
          >{{ t("common.bookAppointment") }} </RouterLink
        >
      </div>
    </section>
    <section class="container section service-prices">
      <div class="section-heading">
        <h2>{{ t("nav.prices") }}</h2>
        <RouterLink class="text-link" to="/cenas"
          >{{ t("common.prices") }}</RouterLink
        >
      </div>
      <p v-if="locale !== 'lv'" class="source-note">
        {{ t("ui.sourceLanguage") }}
      </p>
      <PriceList :items="prices[service.category]?.items || []" />
    </section>
    <div class="container related-services">
      <p class="eyebrow">{{ t("page.related") }}</p>
      <RouterLink
        v-for="s in services
          .filter((s) => s.slug !== service!.slug)
          .slice(0, 3)"
        :key="s.slug"
        :to="`/pakalpojumi/${s.slug}`"
        >{{ local(s.title) }} </RouterLink
      >
    </div>
    <ContactBand /></template
  ><NotFoundView v-else />
</template>
