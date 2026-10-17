<script setup lang="ts">
import { publicMedia as media } from "../services/hero/publicMedia";
import { cmsMediaSrcset } from "../services/cms/content";
import { services } from "../services/cms/content";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, local, locale } = useContent();
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.services") }}</h1>
  </header>
  <section class="container services-directory">
    <RouterLink
      v-for="s in services"
      :key="s.slug"
      :to="{path:`/pakalpojumi/${s.slug}`,query:locale==='lv'?{}:{lang:locale}}"
      class="service-row"
      >
      <div>
        <h2>
          <span class="editorial-link-title">{{ local(s.title) }}</span>
        </h2>
        <p>{{ local(s.short) }}</p>
      </div>
      <span class="service-row-image"
        ><img
        v-if="s.image"
          :src="media[s.image as keyof typeof media]"
          :srcset="cmsMediaSrcset(media[s.image as keyof typeof media])"
          sizes="(max-width: 768px) 100vw, 60vw"
          alt=""
          loading="lazy"
          width="240"
          height="160" /></span
    ></RouterLink>
  </section>
  <ContactBand />
</template>
