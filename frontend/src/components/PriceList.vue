<script setup lang="ts">
import { useContent } from "../content/useContent";
withDefaults(
  defineProps<{
    items: { name: string; price: string; display_price?: Record<string,string>; review?: boolean }[];
    language?: string;
  }>(),
  { language: "lv" },
);
const { t,locale } = useContent();
const price = (value: string) =>
  value
    .split("/")
    .map(
      (n) =>
        Number(n).toLocaleString("lv-LV", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " €",
    )
    .join(" / ");
</script>
<template>
  <dl class="price-list" :lang="language">
    <div v-for="item in items" :key="item.name">
      <dt>{{ item.name }}</dt>
      <dd :class="{ 'price-review': item.review }">
        {{ item.review ? t("ui.verify") : item.display_price?.[locale] || price(item.price) }}
      </dd>
    </div>
  </dl>
</template>
