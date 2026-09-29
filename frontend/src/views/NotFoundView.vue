<script setup lang="ts">
import { useContent } from "../content/useContent";
const { t } = useContent();
</script>
<template>
  <section class="container page-head not-found">
    <p class="eyebrow">404 / AG ZOBĀRSTNIECĪBA</p>
    <h1>{{ t("ui.notFound") }}</h1>
    <p class="lead">{{ t("ui.notFoundText") }}</p>
    <RouterLink class="button" to="/">{{ t("common.home") }} </RouterLink>
    <nav class="not-found-links" :aria-label="t('ui.menu')">
      <RouterLink class="text-link" to="/pakalpojumi">{{
        t("nav.services")
      }}</RouterLink>
      <RouterLink class="text-link" to="/cenas">{{
        t("nav.prices")
      }}</RouterLink>
      <RouterLink class="text-link" to="/kontakti">{{
        t("nav.contact")
      }}</RouterLink>
    </nav>
  </section>
</template>

<style scoped>
.not-found {
  min-height: min(820px, 90svh);
  padding-bottom: 80px;
}
.not-found h1 {
  max-width: 850px;
}
.not-found .lead {
  max-width: 580px;
  margin-bottom: 32px;
}
.not-found-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.not-found-links a {
  min-height: 44px;
}
@media (max-width: 580px) {
  .not-found-links {
    margin-top: 36px;
  }
}
</style>
