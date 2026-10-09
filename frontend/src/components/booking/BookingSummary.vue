<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
defineProps<{ items: { label: string; value: string }[]; review?: boolean }>();
</script>
<template>
  <dl class="booking-summary-list" :class="{ review }">
    <div v-for="item in items" :key="item.label">
      <dt>{{ t(`booking.${item.label}`) }}</dt>
      <dd :class="{ empty: !item.value }">
        {{ item.value || t("booking.noSelection") }}
      </dd>
    </div>
  </dl>
</template>
<style scoped>
.booking-summary-list {
  display: grid;
  gap: 22px;
}
.booking-summary-list div {
  min-width: 0;
}
.booking-summary-list dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 5px;
}
.booking-summary-list dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.booking-summary-list .empty {
  color: var(--muted);
  font-size: 12px;
}
.booking-summary-list.review {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 25px 35px;
}
.review dd {
  font-size: 16px;
}
@media (max-width: 430px) {
  .booking-summary-list.review {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>
