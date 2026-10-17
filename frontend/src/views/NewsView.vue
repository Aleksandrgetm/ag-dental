<script setup lang="ts">
import ArrowIcon from "../components/common/ArrowIcon.vue";
import { usePublicNews } from "../composables/usePublicNews";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, date, locale } = useContent();
const localizedArticles = usePublicNews(locale, () => t("nav.news"));
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.news") }}</h1>
  </header>
  <section class="container journal-list">
    <RouterLink
      v-for="a in localizedArticles"
      :key="a.slug"
      :to="`/jaunumi/${a.slug}`"
      class="journal-row"
      ><div>
        <time :datetime="a.date">{{ date(a.date) }}</time>
      </div>
      <div :lang="locale">
        <p class="eyebrow">{{ a.category }}</p>
        <h2>
          <span class="editorial-link-title">{{ a.title }}</span>
        </h2>
        <p>{{ a.excerpt }}</p>
      </div>
      <span class="row-arrow" aria-hidden="true"><ArrowIcon direction="right" /></span></RouterLink
    >
  </section>
  <ContactBand />
</template>
<style scoped>
.journal-list .journal-row { grid-template-columns: minmax(110px, 140px) minmax(0, 1fr) 28px; column-gap: clamp(24px, 4vw, 56px); }
.journal-row > div { min-width: 0; }
.journal-list .journal-row h2 { overflow-wrap: anywhere; }
/* Keep the approved desktop SVG size at every breakpoint. */
.journal-list .row-arrow :deep(.arrow-icon) { width: 28px; height: 28px; }
@media (max-width: 768px) {
  .journal-list .journal-row { grid-template-columns: minmax(0, 1fr) 27px; }
  .journal-row > div:first-child { grid-column: 1 / -1; }
}
</style>
