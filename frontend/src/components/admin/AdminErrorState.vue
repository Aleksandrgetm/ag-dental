<script setup lang="ts">
import { useI18n } from "vue-i18n";
defineProps<{ title?: string; description: string; retry?: boolean }>();
defineEmits<{ retry: [] }>();
const { t } = useI18n();
</script>
<template>
  <section class="admin-error" role="alert">
    <h2 v-if="title">{{ title }}</h2>
    <p>{{ description }}</p>
    <button v-if="retry" class="admin-retry" @click="$emit('retry')">
      {{ t("admin.retry") }}
    </button>
  </section>
</template>
<style scoped>
.admin-error {
  border-left: 2px solid #8c5f36;
  padding: 18px 22px;
  background: #f0ebe2;
}
.admin-error h2 {
  font: 400 26px/1.2 var(--serif);
  margin-bottom: 10px;
}
.admin-error p {
  font-size: 13px;
  line-height: 1.7;
}
.admin-retry {
  background: transparent;
  min-height: 44px;
  margin-top: 8px;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 13px;
}
</style>
