<script setup lang="ts">
import { clinic } from "../content/clinic";
import { useContent } from "../content/useContent";
const { t } = useContent();
</script>
<template>
  <section class="contact-band">
    <div class="container">
      <div class="contact-band-top">
        <p class="eyebrow">AG ZOBĀRSTNIECĪBA · RĪGA</p>
        <span class="tiny-label">Ūnijas iela 25</span>
      </div>
      <div class="contact-band-grid">
        <h2 data-reveal>{{ t("home.contactTitle") }}</h2>
        <div data-reveal data-delay="100">
          <p>{{ t("home.contactText") }}</p>
          <RouterLink class="button button-light" to="/pieraksts"
            >{{ t("common.bookAppointment") }} </RouterLink
          ><a class="contact-phone" :href="clinic.tel">{{ clinic.phone }}</a>
        </div>
      </div>
      <div class="contact-band-bottom">
        <span>{{ t("ui.hours") }} · 09:00–18:00</span
        ><RouterLink to="/kontakti">{{ t("common.directions") }}</RouterLink
        ><span>{{ t("ui.parking") }}</span>
      </div>
    </div>
  </section>
</template>
