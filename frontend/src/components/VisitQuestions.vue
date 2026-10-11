<script setup lang="ts">
import { refinement as copy, createdContent } from "../services/cms/content";
import {computed} from "vue";
import { useContent } from "../content/useContent";
import { vAccordionMotion } from "../directives/accordionMotion";
const { local } = useContent();
const questions=computed(()=>[...copy.faq,...createdContent.value.filter(r=>r.key.startsWith('created.faq.')).sort((a,b)=>a.payload.order-b.payload.order).map(r=>({q:r.payload.title,a:r.payload.body}))]);
</script>
<template>
  <section class="container section visit-questions">
    <p class="eyebrow">{{ local(copy.visit) }}</p>
    <details v-for="item in questions" :key="item.q.lv" v-accordion-motion>
      <summary>{{ local(item.q) }}<span aria-hidden="true"></span></summary>
      <p>{{ local(item.a) }}</p>
    </details>
  </section>
</template>
