<script setup lang="ts">
import { useI18n } from "vue-i18n";
defineProps<{
  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "rejected"
    | "no_show";
}>();
const { t } = useI18n();
</script>
<template>
  <span class="admin-status" :class="`status-${status}`">{{
    t(`booking.${status}`)
  }}</span>
</template>
<style scoped>
.admin-status {
  display: inline-block;
  padding: 5px 9px;
  background: var(--sage);
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.status-pending {
  background: #efe8d8;
}
.status-cancelled,
.status-rejected,
.status-no_show {
  background: #ede6e1;
}
.status-completed {
  background: #e4eae5;
}
</style>
