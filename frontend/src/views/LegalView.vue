<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { POLICY_UPDATED, type LegalDocument } from "../content/legal";
import { useI18n } from "vue-i18n";
import { useCookieConsentStore } from "../stores/cookieConsent";
const route = useRoute(),
  { t, tm, rt, d, locale } = useI18n(),
  consent = useCookieConsentStore();
const isCookie = computed(() => route.meta.legal === "cookies");
const document = computed(
  () =>
    tm(
      `legalDocuments.${isCookie.value ? "cookies" : "privacy"}`,
    ) as LegalDocument,
);
</script>
<template>
  <header class="page-head container legal-head">
    <h1>{{ t(isCookie ? "legal.cookieTitle" : "legal.privacyTitle") }}</h1>
    <p class="legal-date">
      {{ t("legal.updated") }}
      <time :datetime="POLICY_UPDATED">{{
        d(new Date(`${POLICY_UPDATED}T12:00:00Z`), {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      }}</time>
    </p>
  </header>
  <div class="container legal-layout">
    <aside class="legal-index">
      <nav :aria-label="t('legal.contents')">
        <p>{{ t("legal.contents") }}</p>
        <a
          v-for="section in document.sections"
          :key="section.id"
          :href="`#${section.id}`"
          :lang="locale"
          >{{ rt(section.title) }}</a
        >
      </nav>
    </aside>
    <article class="legal-copy" :lang="locale" :aria-label="rt(document.title)">
      <p class="legal-intro">{{ rt(document.intro) }}</p>
      <p v-if="document.notice" class="legal-notice">
        {{ rt(document.notice) }}
      </p>
      <section
        v-for="section in document.sections"
        :id="section.id"
        :key="section.id"
        class="legal-section"
      >
        <h2>{{ rt(section.title) }}</h2>
        <p v-for="paragraph in section.paragraphs" :key="paragraph">
          {{ rt(paragraph) }}
        </p>
      </section>
      <div class="legal-related" :lang="locale">
        <button class="button" @click="consent.settingsOpen = true">
          {{ t("legal.settings") }}
        </button>
        <RouterLink
          :to="isCookie ? '/privatuma-politika' : '/sikdatnu-politika'"
          >{{
            t(isCookie ? "legal.privacyTitle" : "legal.cookieTitle")
          }}</RouterLink
        >
      </div>
    </article>
  </div>
</template>
<style scoped>
.legal-head .legal-date {
  font-size: 12px;
  line-height: 1.7;
  margin-top: 16px;
}
.legal-layout {
  display: grid;
  grid-template-columns: minmax(180px, 0.65fr) minmax(0, 1.65fr);
  gap: clamp(32px, 6vw, 96px);
  padding-bottom: 100px;
  align-items: start;
}
.legal-index {
  position: sticky;
  top: 130px;
}
.legal-index p {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 18px;
}
.legal-index a {
  display: block;
  font-size: 12px;
  line-height: 1.6;
  padding: 8px 0;
}
.legal-index a:hover,
.legal-related a:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.legal-copy {
  max-width: 720px;
}
.legal-copy p {
  font-size: 15px;
  line-height: 1.9;
  margin-bottom: 16px;
  overflow-wrap: anywhere;
}
.legal-copy .legal-intro {
  font-size: 19px;
  line-height: 1.7;
  margin-bottom: 28px;
}
.legal-notice {
  padding-block: 20px;
  border-block: 1px solid var(--line);
  color: #5f6858;
}
.legal-section {
  margin-top: 40px;
  scroll-margin-top: 130px;
}
.legal-section h2 {
  font-size: clamp(27px, 2.5vw, 34px);
  line-height: 1.2;
  margin-bottom: 18px;
}
.legal-related {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  margin-top: 48px;
}
.legal-related a {
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.legal-layout :is(a, button):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .legal-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .legal-index {
    position: static;
  }
  .legal-index nav {
    border-bottom: 1px solid var(--line);
    padding-bottom: 24px;
  }
  .legal-copy {
    max-width: 720px;
  }
}
@media (max-width: 600px) {
  .legal-copy p {
    font-size: 14px;
  }
  .legal-layout {
    padding-bottom: 64px;
  }
  .legal-section {
    scroll-margin-top: 105px;
  }
}
</style>
