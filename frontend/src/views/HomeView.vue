<script setup lang="ts">
import { cmsMediaAlt, cmsMediaSrcset } from "../services/cms/content";
import { cmsLiteral, cmsInline } from "../services/cms/content";
import ScrollClinicHero from "../components/home/ScrollClinicHero.vue";
import ServiceIndex from "../components/home/ServiceIndex.vue";
import PatientJourney from "../components/home/PatientJourney.vue";
import ClinicGallery from "../components/home/ClinicGallery.vue";
import ContactBand from "../components/ContactBand.vue";
import { vPhotoParallax } from "../directives/photoParallax";
import { vEditorialMotion } from "../directives/editorialMotion";
import {
  media,
  philosophy,
  about,
  doctorBio,
  services,
} from "../services/cms/content";
import { articles } from "../services/cms/content";
import { refinement as copy } from "../services/cms/content";
import { useContent } from "../content/useContent";
const { t, local, date, locale } = useContent();
const preview = services.filter((s) =>
  ["konsultacija", "zobu-higiena", "bernu-zobarstnieciba"].includes(s.slug),
);
</script>
<template>
  <ScrollClinicHero />
  <div class="content-design home-content" v-editorial-motion>
    <section id="intro" class="section intro-section">
      <div class="container">
        <div class="intro-masthead">
          <p class="eyebrow">
            {{ cmsLiteral("literal.dceb04b2.0") }}{{ t("home.introLabel") }}
          </p>
          <span class="tiny-label">{{ local(copy.welcome) }}</span>
        </div>
        <div class="intro-editorial">
          <div data-reveal>
            <h2>{{ t("home.introTitle") }}</h2>
            <p class="intro-manifesto">{{ local(copy.care) }}</p>
          </div>
          <div class="intro-copy" data-reveal data-delay="100">
            <p class="lead">{{ local(philosophy) }}</p>
            <p>{{ t("home.introAside") }}</p>
            <RouterLink class="text-link" to="/par-mums"
              >{{ t("common.about") }}
            </RouterLink>
          </div>
        </div>
        <div class="intro-footnote">
          <span>{{ cmsLiteral("literal.dceb04b2.1") }}</span
          ><span>{{ cmsLiteral("literal.dceb04b2.2") }}</span
          ><span>{{ t("ui.appointment") }}</span>
        </div>
      </div>
    </section>
    <ServiceIndex />
    <section class="about-editorial">
      <div class="about-editorial-image" data-reveal="image">
        <img
          v-photo-parallax
          :src="media.room"
          :srcset="cmsMediaSrcset(media.room)"
          sizes="(max-width: 768px) 100vw, 60vw"
          alt=""
          loading="lazy"
          width="1280"
          height="720"
        /><span class="image-annotation">{{
          cmsLiteral("literal.dceb04b2.3")
        }}</span>
      </div>
      <div class="about-editorial-copy" data-reveal>
        <p class="eyebrow">
          {{ cmsLiteral("literal.dceb04b2.4") }}{{ t("home.aboutLabel") }}
        </p>
        <h2>{{ t("home.aboutTitle") }}</h2>
        <p>{{ local(about) }}</p>
        <RouterLink class="text-link" to="/par-mums"
          >{{ t("common.about") }}
        </RouterLink>
      </div>
    </section>
    <section class="section doctor-feature">
      <div class="container">
        <div class="doctor-feature-top" data-reveal>
          <p class="eyebrow">
            {{ cmsLiteral("literal.dceb04b2.5") }}{{ t("home.doctorLabel") }}
          </p>
          <h2>
            {{ cmsLiteral("literal.dceb04b2.6")
            }}<em>{{ cmsLiteral("literal.dceb04b2.7") }}</em>
          </h2>
        </div>
        <div class="doctor-feature-grid">
          <figure class="doctor-feature-photo" data-reveal="image">
            <div class="portrait-crop">
              <img
                v-photo-parallax
                :src="media.doctor"
                :srcset="cmsMediaSrcset(media.doctor)"
                sizes="(max-width: 768px) 100vw, 60vw"
                :alt="
                  cmsMediaAlt(
                    media.doctor,
                    locale,
                    cmsLiteral('literal.dceb04b2.8'),
                  )
                "
                loading="lazy"
                width="840"
                height="1120"
              />
            </div>
            <figcaption>{{ t("home.doctorRole") }}</figcaption>
          </figure>
          <div class="doctor-feature-copy" data-reveal>
            <p class="doctor-principle">{{ t("home.doctorTitle") }}</p>
            <p>{{ local(doctorBio) }}</p>
            <div class="experience-note">
              <span>{{ cmsLiteral("literal.dceb04b2.9") }}</span>
              <p>{{ local(copy.years) }}</p>
            </div>
            <RouterLink class="text-link" to="/par-mums"
              >{{ t("common.more") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
    <section class="why-editorial">
      <div class="container">
        <p class="eyebrow" data-reveal>{{ t("home.why") }}</p>
        <div class="why-editorial-grid">
          <article
            v-for="(description, i) in copy.whyDescriptions"
            :key="i"
            data-reveal
            :data-delay="(i % 2) * 80"
          >
            <span class="index-number">0{{ i + 1 }}</span>
            <h3>{{ t(`home.why${i + 1}`) }}</h3>
            <p>{{ local(description) }}</p>
          </article>
        </div>
      </div>
    </section>
    <PatientJourney />
    <section class="section prices-home">
      <div class="container prices-editorial">
        <div data-reveal>
          <p class="eyebrow">
            {{ cmsLiteral("literal.dceb04b2.11") }}{{ t("home.pricesLabel") }}
          </p>
          <h2>{{ t("home.pricesTitle") }}</h2>
          <p class="section-aside">{{ t("page.pricesIntro") }}</p>
          <RouterLink class="text-link" to="/cenas"
            >{{ t("common.prices") }}
          </RouterLink>
        </div>
        <div class="price-sheet" data-reveal data-delay="100">
          <div class="price-sheet-heading">
            <span
              >{{ cmsLiteral("literal.dceb04b2.12")
              }}{{ t("nav.prices") }}</span
            ><span>{{ cmsLiteral("literal.dceb04b2.13") }}</span>
          </div>
          <div class="price-preview" v-for="(s, i) in preview" :key="s.slug">
            <span class="index-number">0{{ i + 1 }}</span
            ><RouterLink :to="`/pakalpojumi/${s.slug}`">{{
              s.slug === "bernu-zobarstnieciba"
                ? local(cmsInline("inline.home.0"))
                : s.slug === "zobu-higiena"
                  ? local(cmsInline("inline.home.1"))
                  : local(s.title)
            }}</RouterLink
            ><span class="preview-amount">{{ s.price }}<small>€</small></span>
          </div>
          <p class="price-note">{{ t("ui.updated") }}</p>
        </div>
      </div>
    </section>
    <ClinicGallery />
    <section class="section news-section">
      <div class="container">
        <div class="section-heading" data-reveal>
          <div>
            <p class="eyebrow">
              {{ cmsLiteral("literal.dceb04b2.15") }}{{ t("home.newsLabel") }}
            </p>
            <h2>{{ t("home.newsTitle") }}</h2>
          </div>
          <RouterLink class="text-link" to="/jaunumi"
            >{{ t("common.allNews") }}
          </RouterLink>
        </div>
        <p v-if="locale !== 'lv'" class="source-note">
          {{ t("ui.sourceLanguage") }}
        </p>
        <div class="journal-home">
          <RouterLink
            :to="`/jaunumi/${articles[0]!.slug}`"
            class="journal-feature"
            data-reveal
            ><div class="journal-feature-image">
              <img
                :src="media.original"
                :srcset="cmsMediaSrcset(media.original)"
                sizes="(max-width: 768px) 100vw, 60vw"
                :alt="
                  cmsMediaAlt(
                    media.original,
                    locale,
                    cmsLiteral('literal.dceb04b2.16'),
                  )
                "
                loading="lazy"
                width="526"
                height="526"
              />
            </div>
            <div class="news-meta">
              <time :datetime="articles[0]!.date">{{
                date(articles[0]!.date)
              }}</time
              ><span lang="lv">{{ articles[0]!.category }}</span>
            </div>
            <h3 lang="lv">
              <span class="editorial-link-title">{{ articles[0]!.title }}</span>
            </h3></RouterLink
          >
          <div class="journal-home-list">
            <RouterLink
              v-for="article in articles.slice(1, 4)"
              :key="article.slug"
              :to="`/jaunumi/${article.slug}`"
              class="journal-compact"
              data-reveal
              ><time :datetime="article.date">{{ date(article.date) }}</time>
              <h3 lang="lv">
                <span class="editorial-link-title">{{ article.title }}</span>
              </h3>
              <p lang="lv">{{ article.excerpt }}</p>
              <span class="text-link"
                >{{ t("common.read") }} <span aria-hidden="true">→</span></span
              ></RouterLink
            >
          </div>
        </div>
      </div>
    </section>
    <ContactBand />
  </div>
</template>

<style scoped>
.portrait-crop {
  overflow: hidden;
}
</style>
