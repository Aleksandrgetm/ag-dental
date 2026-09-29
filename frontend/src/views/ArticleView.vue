<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { articles } from "../content/articles";
import { media } from "../content/clinic";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
import NotFoundView from "./NotFoundView.vue";
const route = useRoute(),
  { t, date, locale } = useContent();
const article = computed(() =>
  articles.find((a) => a.slug === route.params.slug),
);
watchEffect(() => {
  if (article.value)
    document.title = article.value.title + " · AG Zobārstniecība";
});
</script>
<template>
  <template v-if="article"
    ><article>
      <header class="page-head container article-head">
        <RouterLink class="eyebrow breadcrumb" to="/jaunumi"
          >← {{ t("nav.news") }}</RouterLink
        >
        <div class="article-meta">
          <time :datetime="article.date">{{ date(article.date) }}</time
          ><span lang="lv">{{ article.category }}</span>
        </div>
        <h1 lang="lv">{{ article.title }}</h1>
      </header>
      <div class="container article-layout">
        <aside>
          <img
            :src="media[article.image as keyof typeof media]"
            alt="AG Zobārstniecība"
            width="526"
            height="526"
          /><a
            class="text-link"
            :href="`https://www.zobarstnieciba-ag.lv/jaunumi/params/post/${article.source}`"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t("ui.source") }}</a
          >
        </aside>
        <div class="article-body">
          <p v-if="locale !== 'lv'" class="source-note">
            {{ t("ui.sourceLanguage") }}
          </p>
          <p v-for="(p, i) in article.paragraphs" :key="i" lang="lv">{{ p }}</p>
          <RouterLink class="button" to="/kontakti"
            >{{ t("common.bookAppointment") }} </RouterLink
          >
        </div>
      </div>
    </article>
    <ContactBand /></template
  ><NotFoundView v-else />
</template>
