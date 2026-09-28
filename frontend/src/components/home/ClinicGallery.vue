<script setup lang="ts">
import { ref } from "vue";
import { media } from "../../content/clinic";
import { refinement as copy } from "../../content/refinement";
import { useContent } from "../../content/useContent";
const { t, local } = useContent();
const current = ref(0);
const images = [media.detail, media.room, media.original];
function move(step: number) {
  current.value = (current.value + step + images.length) % images.length;
}
</script>
<template>
  <section class="section gallery-section">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <p class="eyebrow">07 / {{ t("home.galleryLabel") }}</p>
          <h2>{{ t("home.galleryTitle") }}</h2>
        </div>
        <div class="gallery-controls">
          <span aria-live="polite">0{{ current + 1 }} / 03</span
          ><button :aria-label="local(copy.galleryPrevious)" @click="move(-1)">
            ←</button
          ><button :aria-label="local(copy.galleryNext)" @click="move(1)">
            →
          </button>
        </div>
      </div>
      <div class="gallery-stage" data-reveal="image">
        <div class="gallery-main">
          <img
            v-for="(src, i) in images"
            :key="src"
            :src="src"
            :alt="i === 2 ? 'AG Zobārstniecība' : ''"
            :aria-hidden="current !== i"
            :class="{ 'is-current': current === i }"
            loading="lazy"
            width="1280"
            height="720"
          />
        </div>
        <div class="gallery-side">
          <p class="eyebrow">AG ZOBĀRSTNIECĪBA</p>
          <p class="gallery-motto">{{ local(copy.care) }}</p>
          <div class="gallery-thumbnails">
            <button
              v-for="(src, i) in images"
              :key="src"
              :aria-label="`${local(copy.galleryView)} ${i + 1}`"
              :aria-pressed="current === i"
              @click="current = i"
            >
              <img :src="src" alt="" loading="lazy" width="1280" height="720" />
            </button>
          </div>
          <span class="tiny-label">RĪGA · TEIKA</span>
        </div>
      </div>
    </div>
  </section>
</template>
