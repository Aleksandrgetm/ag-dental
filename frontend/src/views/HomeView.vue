<script setup lang="ts">
import ScrollClinicHero from "../components/home/ScrollClinicHero.vue";
import ServiceIndex from "../components/home/ServiceIndex.vue";
import PatientJourney from "../components/home/PatientJourney.vue";
import ClinicGallery from "../components/home/ClinicGallery.vue";
import ContactBand from "../components/ContactBand.vue";
import { vEditorialMotion } from "../directives/editorialMotion";
import {
  media,
  philosophy,
  about,
  doctorBio,
  services,
  l,
} from "../content/clinic";
import { articles } from "../content/articles";
import { refinement as copy } from "../content/refinement";
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
          <p class="eyebrow">01 / {{ t("home.introLabel") }}</p>
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
              >{{ t("common.about") }} <span>↗</span></RouterLink
            >
          </div>
        </div>
        <div class="intro-footnote">
          <span>AG ZOBĀRSTNIECĪBA</span><span>Ūnijas iela 25 · Rīga–Teika</span
          ><span>{{ t("ui.appointment") }}</span>
        </div>
      </div>
    </section>
    <ServiceIndex />
    <section class="about-editorial">
      <div class="about-editorial-image" data-reveal="image">
        <img
          :src="media.room"
          alt=""
          loading="lazy"
          width="1280"
          height="720"
        /><span class="image-annotation">AG / RĪGA</span>
      </div>
      <div class="about-editorial-copy" data-reveal>
        <p class="eyebrow">03 / {{ t("home.aboutLabel") }}</p>
        <h2>{{ t("home.aboutTitle") }}</h2>
        <p>{{ local(about) }}</p>
        <RouterLink class="text-link" to="/par-mums"
          >{{ t("common.about") }} <span>↗</span></RouterLink
        >
      </div>
    </section>
    <section class="section doctor-feature">
      <div class="container">
        <div class="doctor-feature-top" data-reveal>
          <p class="eyebrow">04 / {{ t("home.doctorLabel") }}</p>
          <h2>Dr. Anda <em>Gutovska.</em></h2>
        </div>
        <div class="doctor-feature-grid">
          <figure class="doctor-feature-photo" data-reveal="image">
            <img
              :src="media.doctor"
              alt="Dr. Anda Gutovska"
              loading="lazy"
              width="840"
              height="1120"
            />
            <figcaption>{{ t("home.doctorRole") }}</figcaption>
          </figure>
          <div class="doctor-feature-copy" data-reveal>
            <p class="doctor-principle">{{ t("home.doctorTitle") }}</p>
            <p>{{ local(doctorBio) }}</p>
            <div class="experience-note">
              <span>15+</span>
              <p>{{ local(copy.years) }}</p>
            </div>
            <RouterLink class="text-link" to="/specialisti"
              >{{ t("common.more") }} <span>↗</span></RouterLink
            >
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
          <p class="eyebrow">06 / {{ t("home.pricesLabel") }}</p>
          <h2>{{ t("home.pricesTitle") }}</h2>
          <p class="section-aside">{{ t("page.pricesIntro") }}</p>
          <RouterLink class="text-link" to="/cenas"
            >{{ t("common.prices") }} <span>↗</span></RouterLink
          >
        </div>
        <div class="price-sheet" data-reveal data-delay="100">
          <div class="price-sheet-heading">
            <span>AG / {{ t("nav.prices") }}</span
            ><span>EUR</span>
          </div>
          <div class="price-preview" v-for="(s, i) in preview" :key="s.slug">
            <span class="index-number">0{{ i + 1 }}</span
            ><RouterLink :to="`/pakalpojumi/${s.slug}`">{{
              s.slug === "bernu-zobarstnieciba"
                ? local(
                    l(
                      "Bērna konsultācija",
                      "Детская консультация",
                      "Child’s consultation",
                    ),
                  )
                : s.slug === "zobu-higiena"
                  ? local(
                      l(
                        "Pilna higiēna ar sodas strūklu",
                        "Гигиена с содоструйной обработкой",
                        "Full hygiene with air polishing",
                      ),
                    )
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
            <p class="eyebrow">08 / {{ t("home.newsLabel") }}</p>
            <h2>{{ t("home.newsTitle") }}</h2>
          </div>
          <RouterLink class="text-link" to="/jaunumi"
            >{{ t("common.allNews") }} <span>↗</span></RouterLink
          >
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
                alt="AG Zobārstniecība"
                loading="lazy"
                width="526"
                height="526"
              /><span class="image-arrow" aria-hidden="true">↗</span>
            </div>
            <div class="news-meta">
              <time :datetime="articles[0]!.date">{{
                date(articles[0]!.date)
              }}</time
              ><span lang="lv">{{ articles[0]!.category }}</span>
            </div>
            <h3 lang="lv">{{ articles[0]!.title }}</h3></RouterLink
          >
          <div class="journal-home-list">
            <RouterLink
              v-for="article in articles.slice(1, 4)"
              :key="article.slug"
              :to="`/jaunumi/${article.slug}`"
              class="journal-compact"
              data-reveal
              ><time :datetime="article.date">{{ date(article.date) }}</time>
              <h3 lang="lv">{{ article.title }}</h3>
              <p lang="lv">{{ article.excerpt }}</p>
              <span class="text-link"
                >{{ t("common.read") }} <span>↗</span></span
              ></RouterLink
            >
          </div>
        </div>
      </div>
    </section>
    <ContactBand />
  </div>
</template>
