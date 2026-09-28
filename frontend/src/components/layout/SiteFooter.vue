<script setup lang="ts">
import { clinic } from "../../content/clinic";
import { useContent } from "../../content/useContent";
const { t } = useContent();
</script>
<template>
  <footer class="site-footer content-design">
    <div class="container footer-grid">
      <div>
        <RouterLink class="brand" to="/"
          ><span class="brand-monogram">AG.</span
          ><span class="brand-name"
            >ZOBĀRSTNIECĪBA<span>RĪGA · TEIKA</span></span
          ></RouterLink
        >
        <p class="footer-tagline">{{ t("page.footer") }}</p>
      </div>
      <div>
        <p class="eyebrow">{{ t("nav.contact") }}</p>
        <a :href="clinic.tel">{{ clinic.phone }}</a
        ><a :href="`mailto:${clinic.email}`">{{ clinic.email }}</a
        ><a :href="clinic.map" target="_blank" rel="noopener noreferrer"
          >Ūnijas iela 25, Rīga ↗</a
        >
      </div>
      <div>
        <p class="eyebrow">{{ t("ui.hoursTitle") }}</p>
        <p>{{ t("ui.hours") }}<br />09:00–18:00</p>
        <small>{{ t("ui.appointment") }}</small>
      </div>
      <div>
        <p class="eyebrow">{{ t("nav.services") }}</p>
        <RouterLink to="/pakalpojumi">{{ t("common.allServices") }}</RouterLink
        ><RouterLink to="/cenas">{{ t("nav.prices") }}</RouterLink
        ><RouterLink to="/pieraksts">{{
          t("common.bookAppointment")
        }}</RouterLink>
      </div>
    </div>
    <div class="footer-wordmark container" aria-hidden="true">
      AG Zobārstniecība<span>RĪGA · TEIKA</span>
    </div>
    <div class="container footer-bottom">
      <span>© {{ new Date().getFullYear() }} AG Zobārstniecība</span>
      <div>
        <a :href="clinic.instagram" target="_blank" rel="noopener noreferrer"
          >Instagram ↗</a
        ><a :href="clinic.facebook" target="_blank" rel="noopener noreferrer"
          >Facebook ↗</a
        >
      </div>
      <span>Rīga, Latvija</span>
    </div>
  </footer>
</template>
