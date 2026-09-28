<script setup lang="ts">
import { useRoute } from "vue-router";
import VisitQuestions from "../components/VisitQuestions.vue";
import { refinement as copy } from "../content/refinement";
import { clinic, media } from "../content/clinic";
import { useContent } from "../content/useContent";
const route = useRoute(),
  { t, local } = useContent();
</script>
<template>
  <div class="page-head container">
    <p class="eyebrow">
      {{ t(route.meta.booking ? "common.bookAppointment" : "nav.contact") }} /
      AG ZOBĀRSTNIECĪBA
    </p>
    <h1>{{ t(route.meta.booking ? "page.booking" : "page.contact") }}</h1>
    <p class="lead">
      {{ t(route.meta.booking ? "page.bookingIntro" : "page.contactIntro") }}
    </p>
  </div>
  <section class="container contact-layout">
    <div>
      <div class="contact-block">
        <p class="eyebrow">{{ t("ui.phone") }}</p>
        <a class="large-phone" :href="clinic.tel"
          >{{ clinic.phone }} <span>↗</span></a
        >
        <p>{{ t("ui.appointment") }}</p>
      </div>
      <div class="contact-details">
        <div>
          <p class="eyebrow">{{ t("ui.hoursTitle") }}</p>
          <p>{{ t("ui.hours") }}<br /><strong>09:00–18:00</strong></p>
        </div>
        <div>
          <p class="eyebrow">{{ local(copy.email) }}</p>
          <a :href="`mailto:${clinic.email}`">{{ clinic.email }} ↗</a>
        </div>
        <div>
          <p class="eyebrow">{{ t("ui.address") }}</p>
          <p>Ūnijas iela 25<br />Rīga – Teika, LV-1039</p>
        </div>
        <div>
          <p class="eyebrow">{{ t("nav.contact") }}</p>
          <p>{{ t("ui.parking") }}</p>
        </div>
      </div>
      <template v-if="route.meta.booking"
        ><div class="booking-actions">
          <a class="button" :href="clinic.tel"
            >{{ t("page.bookingAction") }} <span>↗</span></a
          ><a
            class="text-link"
            :href="`mailto:${clinic.email}?subject=Vizītes%20pieteikums`"
            >{{ t("page.bookingEmail") }} ↗</a
          >
        </div>
        <p class="price-note">{{ t("page.bookingNote") }}</p></template
      ><a
        v-else
        class="button"
        :href="clinic.map"
        target="_blank"
        rel="noopener noreferrer"
        >{{ t("common.directions") }} <span>↗</span></a
      >
    </div>
    <div v-if="route.meta.booking" class="booking-aside">
      <span class="booking-monogram">AG.</span>
      <h2>{{ t("page.bookingHelp") }}</h2>
      <p>{{ t("page.bookingHelpText") }}</p>
      <span class="eyebrow">{{ t("home.doctorRole") }}</span>
      <div class="booking-doctor">
        <img
          :src="media.doctor"
          alt="Dr. Anda Gutovska"
          width="840"
          height="1120"
        /><span>Dr. Anda<br />Gutovska</span>
      </div>
    </div>
    <figure v-else class="location-image">
      <img
        :src="media.location"
        alt="Ūnijas iela 25, Rīga"
        width="1000"
        height="800"
      />
      <figcaption>Ūnijas iela 25 · Rīga</figcaption>
      <a
        class="text-link"
        :href="clinic.map"
        target="_blank"
        rel="noopener noreferrer"
        >Google Maps ↗</a
      >
    </figure>
  </section>
  <VisitQuestions />
</template>
