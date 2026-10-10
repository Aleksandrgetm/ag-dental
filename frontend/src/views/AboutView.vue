<script setup lang="ts">
import { cmsMediaAlt, cmsMediaSrcset } from "../services/cms/content";
import { cmsLiteral } from "../services/cms/content";
import { media, about, philosophy, doctorBio } from "../services/cms/content";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, local, locale } = useContent();
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.about") }}</h1>
  </header>
  <section class="about-page-section container">
    <img
      data-reveal="image"
      :src="media.original"
      :srcset="cmsMediaSrcset(media.original)"
      sizes="(max-width: 768px) 100vw, 60vw"
      :alt="
        cmsMediaAlt(media.original, locale, cmsLiteral('literal.ca8a2c47.0'))
      "
      width="526"
      height="526"
    />
    <div>
      <p class="eyebrow">{{ t("home.introLabel") }}</p>
      <h2>{{ t("home.introTitle") }}</h2>
      <p>{{ local(philosophy) }}</p>
      <p>{{ local(about) }}</p>
      <p>{{ t("home.introAside") }}</p>
    </div>
  </section>
  <section class="section doctor-section">
    <div class="container doctor-grid">
      <div class="doctor-copy">
        <p class="eyebrow">{{ t("home.doctorLabel") }}</p>
        <h2>
          {{ cmsLiteral("literal.ca8a2c47.1") }}<br /><em>{{
            cmsLiteral("literal.ca8a2c47.2")
          }}</em>
        </h2>
        <p class="doctor-role">{{ t("home.doctorRole") }}</p>
        <p>{{ local(doctorBio) }}</p>
        <p>{{ local(about) }}</p>
        <RouterLink class="button" to="/pieraksts"
          >{{ t("common.bookAppointment") }}
        </RouterLink>
      </div>
      <figure class="doctor-photo">
        <img
          data-reveal="image"
          :src="media.doctor"
          :srcset="cmsMediaSrcset(media.doctor)"
          sizes="(max-width: 768px) 100vw, 60vw"
          :alt="
            cmsMediaAlt(media.doctor, locale, cmsLiteral('literal.ca8a2c47.3'))
          "
          width="840"
          height="1120"
        />
        <figcaption>
          {{ cmsLiteral("literal.ca8a2c47.4")
          }}<span>{{ cmsLiteral("literal.ca8a2c47.5") }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
  <ContactBand />
</template>
