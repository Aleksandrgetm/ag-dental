<script setup lang="ts">
defineProps<{ title: string; description: string }>();
</script>
<template>
  <div class="admin-empty">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
<style scoped>
.admin-empty {
  padding: 28px 0;
  max-width: 68ch;
}
.admin-empty h2 {
  font: 400 28px/1.2 var(--serif);
  margin-bottom: 12px;
}
.admin-empty p {
  font-size: 13px;
  line-height: 1.75;
  color: #646e60;
  margin-bottom: 12px;
}
</style>
