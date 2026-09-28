<script setup lang="ts">
import { refinement as copy } from "../content/refinement";
import { useContent } from "../content/useContent";
const { local } = useContent();
</script>
<template>
  <section class="container section visit-questions">
    <p class="eyebrow">{{ local(copy.visit) }}</p>
    <details v-for="item in copy.faq" :key="item.q.lv">
      <summary>{{ local(item.q) }}<span aria-hidden="true">+</span></summary>
      <p>{{ local(item.a) }}</p>
    </details>
  </section>
</template>
