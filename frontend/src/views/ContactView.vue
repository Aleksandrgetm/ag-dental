<script setup lang="ts">
import AppointmentRequestForm from "../components/AppointmentRequestForm.vue";
import VisitQuestions from "../components/VisitQuestions.vue";
import { clinic } from "../content/clinic";
import { useContent } from "../content/useContent";
import { useCookieConsentStore } from "../stores/cookieConsent";
const { t } = useContent();
const consent = useCookieConsentStore();
// Reuse the verified address query. No guessed coordinates or private API key.
const mapQuery =
  new URL(clinic.map).searchParams.get("query") || clinic.address;
const mapSource = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
</script>
<template>
  <div class="contacts-page">
    <section class="container contacts-main">
      <div class="contacts-information">
        <p class="eyebrow">{{ t("request.title") }}</p>
        <h1>{{ t("request.headline") }}</h1>
        <p class="contacts-intro">{{ t("request.intro") }}</p>
        <div class="contacts-phone">
          <p class="eyebrow">{{ t("ui.phone") }}</p>
          <a :href="clinic.tel">{{ clinic.phone }}</a>
        </div>
        <dl class="contacts-facts">
          <div>
            <dt>{{ t("request.email") }}</dt>
            <dd>
              <a :href="`mailto:${clinic.email}`">{{ clinic.email }}</a>
            </dd>
          </div>
          <div>
            <dt>{{ t("ui.hoursTitle") }}</dt>
            <dd>{{ t("ui.hours") }}<br />09:00–18:00</dd>
          </div>
          <div>
            <dt>{{ t("ui.address") }}</dt>
            <dd>Ūnijas iela 25<br />Rīga · Teika · LV-1039</dd>
          </div>
          <div>
            <dt>{{ t("contact.parking") }}</dt>
            <dd>{{ t("ui.parking") }}</dd>
          </div>
        </dl>
      </div>
      <AppointmentRequestForm />
    </section>
    <section class="container contacts-map" aria-labelledby="map-heading">
      <div class="map-heading">
        <div>
          <p class="eyebrow">Rīga · Teika</p>
          <h2 id="map-heading">{{ t("common.directions") }}</h2>
        </div>
        <div class="map-address">
          <p>Ūnijas iela 25, Rīga</p>
          <a
            class="text-link"
            :href="clinic.map"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t("contact.openMap") }} ↗</a
          >
        </div>
      </div>
      <div class="map-surface">
        <iframe
          v-if="consent.mapsAllowed"
          :src="mapSource"
          :title="t('contact.mapTitle')"
          width="1200"
          height="480"
          loading="lazy"
          referrerpolicy="no-referrer"
          allowfullscreen
        />
        <div v-else class="map-placeholder">
          <p class="eyebrow">Google Maps</p>
          <h3>{{ t("contact.mapConsent") }}</h3>
          <p>{{ t("cookie.mapsText") }}</p>
          <button class="button" @click="consent.settingsOpen = true">
            {{ t("legal.settings") }}
          </button>
        </div>
      </div>
      <button
        v-if="consent.mapsAllowed"
        class="map-settings"
        @click="consent.settingsOpen = true"
      >
        {{ t("legal.settings") }}
      </button>
    </section>
    <VisitQuestions class="contacts-faq" />
  </div>
</template>
<style scoped>
.contacts-main {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.35fr);
  gap: clamp(36px, 6vw, 88px);
  align-items: start;
  padding-top: clamp(140px, 12vw, 168px);
  padding-bottom: 56px;
}
.contacts-information {
  max-width: 430px;
}
.contacts-information h1 {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-weight: 400;
  font-size: clamp(46px, 4.8vw, 68px);
  line-height: 1.02;
  margin: 18px 0;
  max-width: 9ch;
}
.contacts-intro {
  font-size: 14px;
  line-height: 1.75;
  max-width: 36ch;
  margin-bottom: 28px;
}
.contacts-phone {
  padding-block: 20px;
  border-top: 1px solid var(--line);
}
.contacts-phone a {
  display: inline-block;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(30px, 3.3vw, 46px);
  margin-top: 8px;
  line-height: 1.2;
}
.contacts-facts {
  display: grid;
  gap: 18px;
}
.contacts-facts dt {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5f6858;
  margin-bottom: 6px;
}
.contacts-facts dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}
.map-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  border-top: 1px solid var(--line);
  padding-top: 28px;
  margin-bottom: 24px;
}
.map-heading h2 {
  font-size: clamp(36px, 3.5vw, 48px);
  margin-top: 10px;
  line-height: 1.1;
}
.map-address p {
  font-size: 13px;
  margin-bottom: 8px;
}
.map-address .text-link {
  font-size: 12px;
}
.map-surface {
  height: 480px;
  background: #eeeee6;
  border-block: 1px solid var(--line);
}
.map-surface iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.map-placeholder {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  text-align: center;
}
.map-placeholder h3 {
  font-size: clamp(28px, 3vw, 40px);
  max-width: 24ch;
  line-height: 1.12;
  margin: 14px 0;
}
.map-placeholder > p:not(.eyebrow) {
  font-size: 12px;
  line-height: 1.7;
  max-width: 58ch;
  margin-bottom: 22px;
}
.map-settings {
  min-height: 44px;
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.contacts-page :is(a, button):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
.contacts-page :deep(.contacts-faq) {
  padding-block: 48px 56px;
}
.contacts-page :deep(.contacts-faq summary) {
  padding-block: 18px;
  font-size: clamp(23px, 2.2vw, 30px);
}
@media (max-width: 900px) {
  .contacts-main {
    gap: 32px;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }
}
@media (max-width: 700px) {
  .contacts-main {
    grid-template-columns: 1fr;
    padding-top: 120px;
    padding-bottom: 36px;
    gap: 32px;
  }
  .contacts-information {
    max-width: none;
  }
  .contacts-information h1 {
    max-width: none;
  }
  .contacts-facts {
    grid-template-columns: 1fr 1fr;
    gap: 18px 20px;
  }
  .map-heading {
    align-items: start;
    flex-direction: column;
    gap: 16px;
  }
  .map-surface {
    height: 380px;
  }
  .contacts-page :deep(.contacts-faq) {
    padding-block: 36px 44px;
  }
}
</style>
