<script setup lang="ts">
import { articles } from "../content/articles";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, date, locale } = useContent();
</script>
<template>
  <div class="page-head container">
    <p class="eyebrow">{{ t("nav.news") }} / AG ZOBĀRSTNIECĪBA</p>
    <h1>{{ t("page.news") }}</h1>
    <p class="lead">{{ t("page.newsIntro") }}</p>
  </div>
  <section class="container journal-list">
    <p v-if="locale !== 'lv'" class="source-note">
      {{ t("ui.sourceLanguage") }}
    </p>
    <RouterLink
      v-for="(a, i) in articles"
      :key="a.slug"
      :to="`/jaunumi/${a.slug}`"
      class="journal-row"
      ><div>
        <span class="service-number">0{{ i + 1 }}</span
        ><time :datetime="a.date">{{ date(a.date) }}</time>
      </div>
      <div lang="lv">
        <p class="eyebrow">{{ a.category }}</p>
        <h2>{{ a.title }}</h2>
        <p>{{ a.excerpt }}</p>
      </div>
      <span class="row-arrow">↗</span></RouterLink
    >
  </section>
  <ContactBand />
</template>
