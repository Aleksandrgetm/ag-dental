<script setup lang="ts">
import { services, media } from "../content/clinic";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, local } = useContent();
</script>
<template>
  <div class="page-head container">
    <p class="eyebrow">{{ t("nav.services") }} / AG ZOBĀRSTNIECĪBA</p>
    <h1>{{ t("page.services") }}</h1>
    <p class="lead">{{ t("page.servicesIntro") }}</p>
  </div>
  <section class="container services-directory">
    <RouterLink
      v-for="(s, i) in services"
      :key="s.slug"
      :to="`/pakalpojumi/${s.slug}`"
      class="service-row"
      ><span class="service-number">0{{ i + 1 }}</span>
      <div>
        <h2>{{ local(s.title) }}</h2>
        <p>{{ local(s.short) }}</p>
      </div>
      <img
        :src="media[s.image as keyof typeof media]"
        alt=""
        loading="lazy"
        width="240"
        height="160"
      /><span class="row-arrow">↗</span></RouterLink
    >
  </section>
  <ContactBand />
</template>
