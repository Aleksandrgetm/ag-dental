<script setup lang="ts">
import { computed, ref } from "vue";
import { services, media } from "../../content/clinic";
import { useContent } from "../../content/useContent";
import { refinement as copy } from "../../content/refinement";
const { t, local } = useContent();
const selected = ref(1);
const current = computed(() => services[selected.value]!);
</script>
<template>
  <section class="section service-index">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <p class="eyebrow">02 / {{ t("home.servicesLabel") }}</p>
          <h2>{{ t("home.servicesTitle") }}</h2>
        </div>
        <p class="section-aside">{{ local(copy.servicesNote) }}</p>
      </div>
      <div class="service-index-layout">
        <div
          class="service-index-visual"
          data-reveal="image"
          aria-hidden="true"
        >
          <div class="service-index-images">
            <img
              v-for="(s, i) in services"
              :key="s.slug"
              :src="media[s.image as keyof typeof media]"
              alt=""
              loading="lazy"
              :class="{ 'is-selected': selected === i }"
              width="840"
              height="900"
            />
          </div>
          <div class="service-index-caption">
            <span>0{{ selected + 1 }} / 08</span>
            <p>{{ local(current.short) }}</p>
          </div>
        </div>
        <div class="service-index-list">
          <p class="eyebrow index-caption">{{ local(copy.servicesIndex) }}</p>
          <RouterLink
            v-for="(s, i) in services"
            :key="s.slug"
            :to="`/pakalpojumi/${s.slug}`"
            class="index-entry"
            :class="{ 'is-selected': selected === i }"
            @mouseenter="selected = i"
            @focus="selected = i"
            ><span class="index-number">0{{ i + 1 }}</span>
            <h3>{{ local(s.title) }}</h3>
            </RouterLink
          ><RouterLink class="text-link" to="/pakalpojumi"
            >{{ t("common.allServices") }} </RouterLink
          >
        </div>
      </div>
    </div>
  </section>
</template>
