<script setup lang="ts">
import { computed, ref } from "vue";
import prices from "../content/prices.json";
import { useContent } from "../content/useContent";
import { refinement as copy } from "../content/refinement";
import PriceList from "../components/PriceList.vue";
import ContactBand from "../components/ContactBand.vue";
const { t, local, locale } = useContent();
const query = ref("");
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
const filtered = computed(() =>
  prices
    .map((category, index) => ({
      ...category,
      index,
      items: category.items.filter((item) =>
        normalize(item.name + " " + category.title).includes(
          normalize(query.value.trim()),
        ),
      ),
    }))
    .filter((category) => category.items.length),
);
const total = computed(() =>
  filtered.value.reduce((sum, category) => sum + category.items.length, 0),
);
</script>
<template>
  <div class="page-head container">
    <p class="eyebrow">{{ t("nav.prices") }} / AG ZOBĀRSTNIECĪBA</p>
    <h1>{{ t("page.prices") }}</h1>
    <p class="lead">{{ t("page.pricesIntro") }}</p>
  </div>
  <div class="container price-search-region">
    <label for="price-search" class="eyebrow">{{
      local(copy.priceSearch)
    }}</label>
    <div class="price-search-control">
      <span aria-hidden="true">⌕</span
      ><input
        id="price-search"
        v-model="query"
        type="search"
        :placeholder="local(copy.pricePlaceholder)"
        autocomplete="off"
      /><button v-if="query" @click="query = ''">
        {{ local(copy.clear) }} ×
      </button>
    </div>
    <p class="result-count" role="status">
      {{ local(copy.results) }}: {{ total }}
    </p>
  </div>
  <section class="container pricing-layout">
    <aside>
      <nav :aria-label="t('page.priceCategories')">
        <a
          v-for="category in filtered"
          :key="category.title"
          :href="`#prices-${category.index}`"
          lang="lv"
          ><span>0{{ category.index + 1 }}</span
          >{{ category.title }}<small>{{ category.items.length }}</small></a
        >
      </nav>
      <div class="pricing-note">
        <p>{{ t("page.concession") }}</p>
        <small>{{ t("ui.updated") }}</small>
      </div>
    </aside>
    <div>
      <p v-if="locale !== 'lv'" class="source-note">
        {{ t("ui.sourceLanguage") }}
      </p>
      <p v-if="!filtered.length" class="price-empty">
        {{ local(copy.noResults) }}
      </p>
      <section
        v-for="category in filtered"
        :id="`prices-${category.index}`"
        :key="category.title"
        class="price-category"
      >
        <div class="price-category-title">
          <span class="eyebrow">0{{ category.index + 1 }} / EUR</span>
          <h2 lang="lv">{{ category.title }}</h2>
        </div>
        <PriceList :items="category.items" />
      </section>
    </div>
  </section>
  <ContactBand />
</template>
