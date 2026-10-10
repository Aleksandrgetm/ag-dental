<script setup lang="ts">
import { services, media } from "../services/cms/content";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, local } = useContent();
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.services") }}</h1>
  </header>
  <section class="container services-directory">
    <RouterLink
      v-for="(s, i) in services"
      :key="s.slug"
      :to="`/pakalpojumi/${s.slug}`"
      class="service-row"
      ><span class="service-number">0{{ i + 1 }}</span>
      <div>
        <h2>
          <span class="editorial-link-title">{{ local(s.title) }}</span>
        </h2>
        <p>{{ local(s.short) }}</p>
      </div>
      <span class="service-row-image"
        ><img
          :src="media[s.image as keyof typeof media]"
          alt=""
          loading="lazy"
          width="240"
          height="160" /></span
    ></RouterLink>
  </section>
  <ContactBand />
</template>
