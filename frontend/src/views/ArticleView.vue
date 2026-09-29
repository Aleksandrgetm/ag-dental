<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { articles } from "../content/articles";
import { media } from "../content/clinic";
import { useContent } from "../content/useContent";
import ArticleProgress from "../components/common/ArticleProgress.vue";
import ContactBand from "../components/ContactBand.vue";
import NotFoundView from "./NotFoundView.vue";
const route = useRoute(),
  { t, date, locale } = useContent();
const reading = ref<HTMLElement>();
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
      <div ref="reading" class="container article-reading">
        <p v-if="locale !== 'lv'" class="source-note">
          {{ t("ui.sourceLanguage") }}
        </p>
        <p class="article-lead" lang="lv">{{ article.paragraphs[0] }}</p>
        <figure class="article-photograph">
          <img
            :src="media[article.image as keyof typeof media]"
            :class="{ portrait: article.image === 'doctor' }"
            :alt="
              article.image === 'doctor'
                ? 'Dr. Anda Gutovska'
                : 'AG Zobārstniecība'
            "
            width="840"
            height="840"
          />
        </figure>
        <div class="article-prose">
          <p v-for="(p, i) in article.paragraphs.slice(1)" :key="i" lang="lv">
            {{ p }}
          </p>
        </div>
      </div>
      <div class="container article-actions">
        <a
          class="text-link"
          :href="`https://www.zobarstnieciba-ag.lv/jaunumi/params/post/${article.source}`"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t("ui.source") }}</a
        >
        <RouterLink class="button" to="/kontakti">{{
          t("common.bookAppointment")
        }}</RouterLink>
      </div>
      <ArticleProgress v-if="reading" :target="reading" />
    </article>
    <ContactBand /></template
  ><NotFoundView v-else />
</template>

<style scoped>
.article-reading {
  max-width: 1120px;
}
.article-reading .source-note,
.article-lead,
.article-prose {
  max-width: 680px;
  margin-inline: auto;
}
.article-reading .source-note {
  margin-bottom: 24px;
}
.article-reading .article-lead {
  font: 400 clamp(20px, 2vw, 25px)/1.65 var(--serif);
}
.article-photograph {
  margin: 44px 0 48px;
  overflow: hidden;
  background: var(--sand);
}
.article-photograph img {
  width: 100%;
  height: clamp(280px, 45vw, 560px);
  object-fit: cover;
  object-position: center 45%;
}
.article-photograph img.portrait {
  object-position: center 28%;
}
.article-prose p {
  font-size: 17px;
  line-height: 1.9;
  margin-bottom: 26px;
}
.article-actions {
  max-width: 840px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding-block: 38px 80px;
}
@media (max-width: 580px) {
  .article-photograph {
    margin-block: 30px;
  }
  .article-prose p {
    font-size: 16px;
    line-height: 1.85;
  }
  .article-actions {
    padding-block: 22px 56px;
  }
}
</style>
