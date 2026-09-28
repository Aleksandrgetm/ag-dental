<script setup lang="ts">
import { ref } from "vue";
import { useContent } from "../../content/useContent";
const { t } = useContent();
const open = ref<number | null>(1);
</script>
<template>
  <section class="section journey-section">
    <div class="container journey-layout">
      <div class="journey-intro" data-reveal>
        <p class="eyebrow">05 / {{ t("home.journeyLabel") }}</p>
        <h2>{{ t("home.journeyTitle") }}</h2>
        <RouterLink class="text-link" to="/pieraksts"
          >{{ t("common.bookAppointment") }} </RouterLink
        >
        <div class="journey-line-art" aria-hidden="true">
          <span>AG.</span><i></i><i></i>
        </div>
      </div>
      <ol class="journey-accordion">
        <li v-for="i in 4" :key="i" :class="{ 'is-open': open === i }">
          <h3>
            <button
              :aria-expanded="open === i"
              :aria-controls="`journey-step-${i}`"
              @click="open = open === i ? null : i"
            >
              <span class="step-number">0{{ i }}</span
              ><span>{{ t(`home.step${i}`) }}</span
              ><span class="disclosure-symbol" aria-hidden="true">{{
                open === i ? "−" : "+"
              }}</span>
            </button>
          </h3>
          <div
            :id="`journey-step-${i}`"
            class="journey-answer"
            :inert="open !== i"
            :aria-hidden="open !== i"
          >
            <div>
              <p>{{ t(`home.step${i}Text`) }}</p>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
