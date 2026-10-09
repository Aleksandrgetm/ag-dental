<script setup lang="ts">
import { useCookieConsentStore } from "../../stores/cookieConsent";
import { clinic } from "../../content/clinic";
import { useContent } from "../../content/useContent";
const { t } = useContent();
const consent = useCookieConsentStore();
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
    <nav class="container footer-legal" :aria-label="t('legal.privacyTitle')">
      <RouterLink to="/privatuma-politika">{{
        t("legal.privacyTitle")
      }}</RouterLink>
      <RouterLink to="/sikdatnu-politika">{{
        t("legal.cookieTitle")
      }}</RouterLink>
      <button id="cookie-settings-footer" @click="consent.settingsOpen = true">
        {{ t("legal.settings") }}
      </button>
    </nav>
  </footer>
</template>

<style scoped>
.footer-legal {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 28px;
  padding-block: 14px 24px;
  border-top: 1px solid var(--line);
}
.footer-legal a,
.footer-legal button {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font: inherit;
  font-size: 12px;
  text-align: left;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
}
.footer-legal a:hover,
.footer-legal button:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.footer-legal :focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .footer-legal {
    gap: 0 24px;
  }
}
</style>
