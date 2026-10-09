<script setup lang="ts">
import { useI18n } from "vue-i18n";
defineProps<{ label: string; value: string | null; note: string }>();
const { t } = useI18n();
</script>
<template>
  <div class="admin-stat">
    <p class="admin-stat-label">{{ label }}</p>
    <p class="admin-stat-value" :class="{ 'is-unknown': value === null }">
      {{ value ?? t("admin.notAvailable") }}
    </p>
    <p class="admin-stat-note">{{ note }}</p>
  </div>
</template>
<style scoped>
.admin-stat {
  border: 1px solid var(--line);
  padding: 22px;
  background: var(--white);
  min-width: 0;
}
.admin-stat-label {
  font-size: 12px;
  line-height: 1.5;
  min-height: 3em;
}
.admin-stat-value {
  font: 400 42px/1.2 var(--serif);
  margin: 12px 0;
}
.admin-stat-value.is-unknown {
  font: 400 18px/1.4 var(--sans);
  margin: 18px 0;
}
.admin-stat-note {
  font-size: 11px;
  color: #646e60;
  line-height: 1.6;
}
</style>
