<script setup lang="ts">
import { useRoute } from "vue-router";
import { media, about, philosophy, doctorBio } from "../content/clinic";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const route = useRoute(),
  { t, local } = useContent();
</script>
<template>
  <div class="page-head container">
    <p class="eyebrow">
      {{ t(route.meta.team ? "nav.team" : "nav.about") }} / AG ZOBĀRSTNIECĪBA
    </p>
    <h1>{{ t(route.meta.team ? "page.team" : "page.about") }}</h1>
    <p class="lead">
      {{ route.meta.team ? t("page.teamIntro") : local(philosophy) }}
    </p>
  </div>
  <section v-if="!route.meta.team" class="about-page-section container">
    <img
      :src="media.original"
      alt="AG Zobārstniecība"
      width="526"
      height="526"
    />
    <div>
      <p class="eyebrow">{{ t("home.introLabel") }}</p>
      <h2>{{ t("home.introTitle") }}</h2>
      <p>{{ local(about) }}</p>
      <p>{{ t("home.introAside") }}</p>
    </div>
  </section>
  <section class="section doctor-section">
    <div class="container doctor-grid">
      <div class="doctor-copy">
        <p class="eyebrow">{{ t("home.doctorLabel") }}</p>
        <h2>Dr. Anda<br /><em>Gutovska</em></h2>
        <p class="doctor-role">{{ t("home.doctorRole") }}</p>
        <p>{{ local(doctorBio) }}</p>
        <p>{{ local(about) }}</p>
        <RouterLink class="button" to="/pieraksts"
          >{{ t("common.bookAppointment") }} <span>↗</span></RouterLink
        >
      </div>
      <figure class="doctor-photo">
        <img
          :src="media.doctor"
          alt="Dr. Anda Gutovska"
          width="840"
          height="1120"
        />
        <figcaption>
          Dr. Anda Gutovska <span>AG Zobārstniecība</span>
        </figcaption>
      </figure>
    </div>
  </section>
  <ContactBand />
</template>
