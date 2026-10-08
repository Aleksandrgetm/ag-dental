<script setup lang="ts">
import { media, about, philosophy, doctorBio } from "../content/clinic";
import { useContent } from "../content/useContent";
import ContactBand from "../components/ContactBand.vue";
const { t, local } = useContent();
</script>
<template>
  <header class="page-head container">
    <h1>{{ t("nav.about") }}</h1>
  </header>
  <section class="about-page-section container">
    <img
      data-reveal="image"
      :src="media.original"
      alt="AG Zobārstniecība"
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
        <h2>Dr. Anda<br /><em>Gutovska</em></h2>
        <p class="doctor-role">{{ t("home.doctorRole") }}</p>
        <p>{{ local(doctorBio) }}</p>
        <p>{{ local(about) }}</p>
        <RouterLink class="button" to="/kontakti"
          >{{ t("common.bookAppointment") }} </RouterLink
        >
      </div>
      <figure class="doctor-photo">
        <img
          data-reveal="image"
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
