<script setup lang="ts">
import { useContent } from "../content/useContent";
const { t } = useContent();
</script>
<template>
  <section class="container page-head not-found">
    <p class="eyebrow">404 / AG ZOBĀRSTNIECĪBA</p>
    <h1>{{ t("ui.notFound") }}</h1>
    <p class="lead">{{ t("ui.notFoundText") }}</p>
    <RouterLink class="button" to="/"
      >{{ t("common.home") }} </RouterLink
    >
  </section>
</template>
