<script setup lang="ts">
defineProps<{ title: string; intro?: string; eyebrow?: string }>();
</script>
<template>
  <header class="admin-page-heading">
    <div>
      <p v-if="eyebrow" class="admin-eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="intro" class="admin-intro">{{ intro }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-heading-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
<style scoped>
.admin-page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}
.admin-page-heading > div {
  min-width: 0;
}
.admin-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #646e60;
  margin-bottom: 10px;
}
.admin-page-heading h1 {
  font: 400 clamp(36px, 4vw, 52px)/1.12 var(--serif);
  overflow-wrap: anywhere;
}
.admin-intro {
  font-size: 13px;
  line-height: 1.7;
  max-width: 68ch;
  margin-top: 12px;
  color: #646e60;
}
.admin-heading-actions {
  display: flex;
  gap: 12px;
}
</style>
