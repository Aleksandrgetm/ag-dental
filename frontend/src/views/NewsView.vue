<script setup lang="ts">
import { computed } from "vue";
import { localizeArticle } from "../services/cms/content";
import { articles } from "../services/cms/content";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, date, locale } = useContent();
const localizedArticles = computed(() =>
  articles.map((article) => localizeArticle(article, locale.value)),
);
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.news") }}</h1>
  </header>
  <section class="container journal-list">
    <RouterLink
      v-for="(a, i) in localizedArticles"
      :key="a.slug"
      :to="`/jaunumi/${a.slug}`"
      class="journal-row"
      ><div>
        <span class="service-number">0{{ i + 1 }}</span
        ><time :datetime="a.date">{{ date(a.date) }}</time>
      </div>
      <div :lang="locale">
        <p class="eyebrow">{{ a.category }}</p>
        <h2>
          <span class="editorial-link-title">{{ a.title }}</span>
        </h2>
        <p>{{ a.excerpt }}</p>
      </div>
      <span class="row-arrow" aria-hidden="true">→</span></RouterLink
    >
  </section>
  <ContactBand />
</template>
