<script setup lang="ts">
import { watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { cmsSEO } from "../../services/cms/content";
const route = useRoute(),
  { locale } = useI18n();
// Published metadata takes precedence only for this route; the approved fallback
// and page-specific title watchers continue to own routes without a publication.
watch(
  () => [route.path, locale.value, cmsSEO[route.path]?.[locale.value]],
  async () => {
    await nextTick();
    const content = cmsSEO[route.path]?.[locale.value];
    if (!content || route.meta.adminLayout) return;
    document.title = content.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", content.description);
  },
  { deep: true, immediate: true, flush: "post" },
);
</script>
<template></template>
