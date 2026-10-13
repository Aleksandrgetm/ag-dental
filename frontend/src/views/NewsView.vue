<script setup lang="ts">
import { computed } from "vue";
import { createdContent } from "../services/cms/content";
import { localizeArticle } from "../services/cms/content";
import { articles } from "../services/cms/content";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, date, locale } = useContent();
const localizedArticles = computed(() =>
  [...articles.map((article) => localizeArticle(article, locale.value)),...createdContent.value.filter(r=>r.key.startsWith("created.news.")).sort((a,b)=>a.payload.order-b.payload.order).map(({payload:p})=>({slug:p.slug,date:p.date,category:p.category?.[locale.value as "lv"|"ru"|"en"]||t("nav.news"),title:p.title[locale.value as "lv"|"ru"|"en"],excerpt:p.summary[locale.value as "lv"|"ru"|"en"]}))].sort((a,b)=>b.date.localeCompare(a.date)),
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
<style scoped>
@media (max-width: 600px) {
  .journal-list .journal-row { grid-template-columns: minmax(0, 1fr) 27px; }
  .journal-row > div { min-width: 0; }
  .journal-row h2 { overflow-wrap: anywhere; }
}
</style>
