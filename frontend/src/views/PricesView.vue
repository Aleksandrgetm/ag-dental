<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { localizedPrices } from "../content/pricing";
import { useContent } from "../content/useContent";
import { refinement as copy } from "../content/refinement";
import PriceList from "../components/PriceList.vue";
import ContactBand from "../components/ContactBand.vue";
const { t, local, locale } = useContent();
const query = ref("");
const searchInput = ref<HTMLInputElement>();
const selectedCategory = ref(0);
const pricingContent = ref<HTMLElement>();
function clearSearch() {
  query.value = "";
  searchInput.value?.focus();
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
const prices = computed(() =>
  localizedPrices.map((category) => ({
    ...category,
    title: local(category.title),
    items: category.items.map((item) => ({ ...item, name: local(item.name) })),
  })),
);
const filtered = computed(() =>
  prices.value
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

// A narrow reading band tracks native scrolling without a scroll event loop.
let categoryObserver: IntersectionObserver | undefined;
function observeCategories() {
  categoryObserver?.disconnect();
  if (!pricingContent.value || typeof IntersectionObserver === "undefined")
    return;
  const sections = Array.from(
    pricingContent.value.querySelectorAll<HTMLElement>(".price-category"),
  );
  if (!sections.length) return;
  // Native anchors combine document scroll padding and section scroll margin.
  const readingLine = Math.min(
    innerHeight - 1,
    (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0) +
      (parseFloat(getComputedStyle(sections[0]!).scrollMarginTop) || 0) +
      2,
  );
  categoryObserver = new IntersectionObserver(
    () => {
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingLine) break;
        current = section;
      }
      if (current) selectedCategory.value = Number(current.dataset.category);
    },
    {
      rootMargin: `-${readingLine - 1}px 0px -${Math.max(0, innerHeight - readingLine)}px 0px`,
      threshold: 0,
    },
  );
  sections.forEach((section) => categoryObserver!.observe(section));
}
watch([pricingContent, filtered], observeCategories, { flush: "post" });
onMounted(() => window.addEventListener("resize", observeCategories));
onBeforeUnmount(() => {
  categoryObserver?.disconnect();
  window.removeEventListener("resize", observeCategories);
});
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
    <p
      id="price-search-count"
      class="result-count"
      role="status"
      aria-atomic="true"
    >
      {{ local(copy.results) }}: {{ total }}
    </p>
  </div>
  <section
    class="container pricing-layout"
    :class="{ 'pricing-no-results': !filtered.length }"
  >
    <aside v-if="filtered.length">
      <nav :aria-label="t('page.priceCategories')">
        <a
          v-for="category in filtered"
          :key="category.index"
          :href="`#prices-${category.index}`"
          :lang="locale"
          :class="{ 'is-active': activeCategory === category.index }"
          :aria-current="
            activeCategory === category.index ? 'location' : undefined
          "
          @click="selectedCategory = category.index"
        >
          <span class="category-number">0{{ category.index + 1 }}</span>
          <span class="category-name">{{ category.title }}</span>
          <span class="category-count">{{ category.items.length }}</span></a
        >
      </nav>
    </aside>
    <div ref="pricingContent" class="pricing-content">
      <p v-if="filtered.length" class="pricing-context">
        {{ t("ui.updated") }}
      </p>
      <p v-if="!filtered.length" class="price-empty">
        {{ local(copy.noResults) }}
      </p>
      <section
        v-for="category in filtered"
        :id="`prices-${category.index}`"
        :key="category.index"
        class="price-category"
        :data-category="category.index"
      >
        <div class="price-category-title">
          <span class="eyebrow">0{{ category.index + 1 }} / EUR</span>
          <h2 :lang="locale">{{ category.title }}</h2>
        </div>
        <PriceList :items="category.items" :language="locale" />
        <p
          v-if="category.concession"
          class="pricing-context pricing-concession"
        >
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
  transition:
    border-color 200ms ease,
    color 200ms ease;
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
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 24px;
  gap: 14px;
  align-items: baseline;
  padding-block: 20px;
  border-bottom: 1px solid var(--editorial-rule);
  color: var(--editorial-caption);
  transition:
    color 200ms ease,
    border-color 200ms ease;
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
}
.pricing-layout nav a::after {
  content: "";
  position: absolute;
  inset: auto 0 -1px;
  height: 1px;
  background: var(--olive);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 240ms ease;
}
.pricing-layout nav a.is-active::after {
  transform: scaleX(1);
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
