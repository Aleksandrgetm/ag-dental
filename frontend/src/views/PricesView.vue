<script setup lang="ts">
import { computed, ref } from "vue";
import prices from "../content/prices.json";
import { useContent } from "../content/useContent";
import { refinement as copy } from "../content/refinement";
import PriceList from "../components/PriceList.vue";
import ContactBand from "../components/ContactBand.vue";
const { t, local, locale } = useContent();
const query = ref("");
const searchInput = ref<HTMLInputElement>();
const selectedCategory = ref(0);
function clearSearch() {
  query.value = "";
  searchInput.value?.focus();
}
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
const activeCategory = computed(() =>
  filtered.value.some((category) => category.index === selectedCategory.value)
    ? selectedCategory.value
    : filtered.value[0]?.index,
);
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.prices") }}</h1>
  </header>
  <div class="container price-search-region">
    <label for="price-search" class="eyebrow">{{
      local(copy.priceSearch)
    }}</label>
    <div class="price-search-control">
      <v-icon icon="mdi-magnify" size="20" aria-hidden="true" />
      <input
        ref="searchInput"
        id="price-search"
        v-model="query"
        type="search"
        :placeholder="local(copy.pricePlaceholder)"
        autocomplete="off"
        aria-describedby="price-search-count"
      />
      <button
        v-if="query"
        type="button"
        :aria-label="local(copy.clear)"
        @click="clearSearch"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <p id="price-search-count" class="result-count" role="status" aria-atomic="true">
      {{ local(copy.results) }}: {{ total }}
    </p>
  </div>
  <section class="container pricing-layout" :class="{ 'pricing-no-results': !filtered.length }">
    <aside v-if="filtered.length">
      <nav :aria-label="t('page.priceCategories')">
        <a
          v-for="category in filtered"
          :key="category.title"
          :href="`#prices-${category.index}`"
          lang="lv"
          :class="{ 'is-active': activeCategory === category.index }"
          :aria-current="activeCategory === category.index ? 'location' : undefined"
          @click="selectedCategory = category.index"
        >
          <span class="category-number">0{{ category.index + 1 }}</span>
          <span class="category-name">{{ category.title }}</span>
          <span class="category-count">{{ category.items.length }}</span></a
        >
      </nav>
    </aside>
    <div class="pricing-content">
      <p v-if="filtered.length" class="pricing-context">{{ t("ui.updated") }}</p>
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
        <p v-if="category.title === 'Zobu protezēšana'" class="pricing-context pricing-concession">
          {{ t("page.concession") }}
        </p>
      </section>
    </div>
  </section>
  <ContactBand />
</template>

<style scoped>
.price-search-region {
  padding-bottom: 44px;
}
.price-search-region label {
  display: block;
  margin-bottom: 14px;
}
.price-search-control {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 760px;
  height: 68px;
  padding-inline: 20px 12px;
  border: 1px solid var(--editorial-rule);
  background: var(--paper);
  color: var(--editorial-caption);
  transition: border-color 200ms ease, color 200ms ease;
}
.price-search-control:focus-within {
  border-color: var(--olive);
  outline: 1px solid var(--olive);
  outline-offset: 0;
  color: var(--olive);
}
.price-search-control input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 0;
  font: 16px var(--sans);
  color: var(--ink);
}
.price-search-control input:focus-visible {
  outline: none;
}
.price-search-control input::placeholder {
  color: var(--editorial-caption);
  opacity: 1;
}
.price-search-control input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}
.price-search-control button {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  background: transparent;
  color: var(--editorial-caption);
  font-size: 24px;
  transition: color 200ms ease;
}
.price-search-control button:hover {
  color: var(--ink);
}
.result-count {
  margin-top: 12px;
  color: var(--editorial-caption);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.pricing-layout {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  align-items: start;
  gap: clamp(70px, 7vw, 110px);
  padding-bottom: var(--space-section);
}
.pricing-layout aside,
.pricing-content {
  min-width: 0;
}
.pricing-layout nav {
  display: grid;
  border-top: 1px solid var(--editorial-rule);
}
.pricing-layout nav a {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 24px;
  gap: 14px;
  align-items: baseline;
  padding-block: 20px;
  border-bottom: 1px solid var(--editorial-rule);
  color: var(--editorial-caption);
  transition: color 200ms ease, border-color 200ms ease;
}
.category-number,
.category-count {
  font-size: 11px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.category-count {
  text-align: right;
}
.category-name {
  font-size: 14px;
  line-height: 1.65;
  transition: transform 200ms ease;
}
.pricing-layout nav a:is(:hover, :focus-visible) {
  color: var(--ink);
}
.pricing-layout nav a:is(:hover, :focus-visible) .category-name {
  transform: translateX(3px);
}
.pricing-layout nav a.is-active {
  color: var(--olive);
  border-bottom-color: var(--olive);
}
.pricing-layout nav a.is-active .category-name {
  font-weight: 600;
}
.pricing-context {
  font-size: 12px;
  line-height: 1.8;
  color: var(--editorial-caption);
  margin: 0 0 24px;
}
.pricing-concession {
  margin: 20px 0 0;
}
.pricing-no-results .pricing-content {
  grid-column: 1 / -1;
}
@media (max-width: 1100px) {
  .pricing-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 44px;
  }
  .pricing-layout nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 32px;
  }
}
@media (max-width: 580px) {
  .price-search-region {
    padding-bottom: 32px;
  }
  .price-search-control {
    height: 64px;
    gap: 12px;
    padding-inline: 14px 8px;
  }
  .pricing-layout {
    gap: 36px;
  }
  .pricing-layout nav {
    grid-template-columns: minmax(0, 1fr);
  }
  .pricing-layout nav a {
    padding-block: 16px;
    gap: 12px;
  }
}
</style>
