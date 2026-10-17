<script setup lang="ts">
import { publicMedia as media, servicePhoto } from "../../services/hero/publicMedia";
import { cmsMediaSrcset } from "../../services/cms/content";
import { computed, ref } from "vue";
import { services } from "../../services/cms/content";
import { useContent } from "../../content/useContent";
import { refinement as copy } from "../../services/cms/content";
const { t, local, locale } = useContent();
const selected = ref(1);
function selectPreview(index: number) {
  if (matchMedia("(hover: hover) and (pointer: fine)").matches)
    selected.value = index;
}
const current = computed(() => services[selected.value]||services[0]);
</script>
<template>
  <section v-if="current" class="section service-index">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <p class="eyebrow">
            {{ t("home.servicesLabel") }}
          </p>
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
            <template v-for="(s, i) in services" :key="s.slug"><img v-if="s.image"
              :src="servicePhoto(media[s.image as keyof typeof media], s.slug, 'index')"
              :srcset="cmsMediaSrcset(servicePhoto(media[s.image as keyof typeof media], s.slug, 'index'))"
              sizes="(max-width: 768px) 100vw, 60vw"
              alt=""
              loading="lazy"
              :class="{ 'is-selected': selected === i }"
              width="840"
              height="900"
            /></template>
          </div>
          <div class="service-index-caption">
            <p>{{ local(current.short) }}</p>
          </div>
        </div>
        <div class="service-index-list">
          <p class="eyebrow index-caption">{{ local(copy.servicesIndex) }}</p>
          <RouterLink
            v-for="(s, i) in services"
            :key="s.slug"
            :to="{path:`/pakalpojumi/${s.slug}`,query:locale==='lv'?{}:{lang:locale}}"
            class="index-entry"
            :class="{ 'is-selected': selected === i }"
            @mouseenter="selectPreview(i)"
            @focus="selectPreview(i)"
            >
            <h3>{{ local(s.title) }}</h3> </RouterLink
          ><RouterLink class="text-link" to="/pakalpojumi"
            >{{ t("common.allServices") }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
