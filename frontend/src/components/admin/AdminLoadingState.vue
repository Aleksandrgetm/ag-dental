<script setup lang="ts">
defineProps<{ label: string }>();
</script>
<template>
  <div class="admin-loading" role="status" aria-live="polite" aria-busy="true">
    <span aria-hidden="true"></span>
    <p>{{ label }}</p>
  </div>
</template>
<style scoped>
.admin-loading {
  padding: 28px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
}
.admin-loading span {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--olive);
}
</style>
