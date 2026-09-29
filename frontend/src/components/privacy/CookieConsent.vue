<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useContent } from "../../content/useContent";
import { useCookieConsentStore } from "../../stores/cookieConsent";
import { CONSENT_KEY } from "../../services/cookieConsent";
const { t, locale } = useContent();
const consent = useCookieConsentStore(),
  route = useRoute();
const dialog = ref<HTMLDialogElement>(),
  preferences = ref(false),
  maps = ref(false);
let returnFocus: HTMLElement | null = null;
watch(
  () => consent.settingsOpen,
  async (open) => {
    if (open) {
      returnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      preferences.value = consent.preferencesAllowed;
      maps.value = consent.mapsAllowed;
      await nextTick();
      dialog.value?.showModal();
    } else {
      dialog.value?.close();
      await nextTick();
      const target = returnFocus?.isConnected
        ? returnFocus
        : document.getElementById("cookie-banner-settings") ||
          document.getElementById("cookie-settings-footer");
      target?.focus({ preventScroll: true });
    }
  },
);
watch(
  () => route.fullPath,
  () => {
    consent.settingsOpen = false;
  },
);
function trapFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const items = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), a[href], input:not(:disabled)",
    ) || [],
  );
  const first = items[0],
    last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
function storage(event: StorageEvent) {
  if (event.key === CONSENT_KEY || event.key === null) consent.synchronize();
}
function save(preference: boolean, allowMaps = false) {
  const wasDialog = consent.settingsOpen;
  consent.save(preference, allowMaps);
  if (!wasDialog)
    nextTick(() =>
      document.getElementById("main")?.focus({ preventScroll: true }),
    );
}
onMounted(() => window.addEventListener("storage", storage));
onBeforeUnmount(() => {
  window.removeEventListener("storage", storage);
  dialog.value?.close();
});
</script>
<template>
  <Teleport to="body">
    <section
      v-if="!consent.choice && !consent.settingsOpen"
      class="cookie-banner cookie-ui"
      aria-labelledby="cookie-banner-title"
    >
      <div>
        <h2 id="cookie-banner-title">{{ t("cookie.title") }}</h2>
        <p>
          {{ t("cookie.description") }}
          <RouterLink to="/sikdatnu-politika">{{
            t("legal.cookieTitle")
          }}</RouterLink>
        </p>
      </div>
      <div class="cookie-actions">
        <button @click="save(true, true)">{{ t("cookie.accept") }}</button
        ><button @click="save(false)">{{ t("cookie.reject") }}</button
        ><button
          id="cookie-banner-settings"
          @click="consent.settingsOpen = true"
        >
          {{ t("cookie.settings") }}
        </button>
      </div>
    </section>
    <div
      v-if="consent.storageFailed"
      class="cookie-storage-notice cookie-ui"
      role="status"
    >
      <p>{{ t("cookie.storageFailed") }}</p>
      <button @click="consent.storageFailed = false">
        {{ t("cookie.dismiss") }}
      </button>
    </div>
    <dialog
      ref="dialog"
      class="cookie-dialog cookie-ui"
      aria-labelledby="cookie-dialog-title"
      aria-describedby="cookie-dialog-intro"
      @cancel.prevent="consent.settingsOpen = false"
      @keydown="trapFocus"
    >
      <div class="cookie-dialog-heading">
        <h2 id="cookie-dialog-title">{{ t("cookie.settingsTitle") }}</h2>
        <button
          class="cookie-close"
          autofocus
          @click="consent.settingsOpen = false"
        >
          {{ t("cookie.close") }}
        </button>
      </div>
      <p id="cookie-dialog-intro">{{ t("cookie.settingsIntro") }}</p>
      <div class="cookie-categories">
        <div class="cookie-category">
          <label for="cookie-necessary"
            ><span
              >{{ t("cookie.necessary")
              }}<small>{{ t("cookie.required") }}</small></span
            ><input
              id="cookie-necessary"
              type="checkbox"
              checked
              disabled
              aria-describedby="cookie-necessary-description"
          /></label>
          <p id="cookie-necessary-description">
            {{ t("cookie.necessaryText") }}
          </p>
        </div>
        <div class="cookie-category">
          <label for="cookie-preferences"
            ><span>{{ t("cookie.preferences") }}</span
            ><input
              id="cookie-preferences"
              v-model="preferences"
              type="checkbox"
              aria-describedby="cookie-preferences-description"
          /></label>
          <p id="cookie-preferences-description">
            {{ t("cookie.preferencesText") }}
          </p>
        </div>
        <div class="cookie-category">
          <label for="cookie-maps"
            ><span>{{ t("cookie.maps") }}</span
            ><input
              id="cookie-maps"
              v-model="maps"
              type="checkbox"
              aria-describedby="cookie-maps-description"
          /></label>
          <p id="cookie-maps-description">{{ t("cookie.mapsText") }}</p>
          <a
            :href="`https://policies.google.com/privacy?hl=${locale}`"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t("contact.googlePrivacy") }} ↗</a
          >
        </div>
        <div
          v-for="category in ['analytics', 'marketing']"
          :key="category"
          class="cookie-category"
        >
          <label :for="`cookie-${category}`"
            ><span
              >{{ t(`cookie.${category}`)
              }}<small>{{ t("cookie.inactive") }}</small></span
            ><input
              :id="`cookie-${category}`"
              type="checkbox"
              disabled
              :aria-describedby="`cookie-${category}-description`"
          /></label>
          <p :id="`cookie-${category}-description`">
            {{ t(`cookie.${category}Text`) }}
          </p>
        </div>
      </div>
      <RouterLink
        to="/sikdatnu-politika"
        @click="consent.settingsOpen = false"
        >{{ t("legal.cookieTitle") }}</RouterLink
      >
      <div class="cookie-actions dialog-actions">
        <button @click="save(true, true)">{{ t("cookie.accept") }}</button
        ><button @click="save(false)">{{ t("cookie.reject") }}</button
        ><button @click="save(preferences, maps)">
          {{ t("cookie.save") }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>
<style scoped>
.cookie-ui {
  color: var(--ink);
  background: var(--paper);
  border: 1px solid #b7bdaf;
  font-family: Manrope, sans-serif;
}
.cookie-ui h2 {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.15;
  margin: 0 0 8px;
}
.cookie-ui p {
  font-size: 12px;
  line-height: 1.75;
  margin: 0;
}
.cookie-ui a {
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: 12px;
}
.cookie-ui button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #8a9481;
  border-radius: 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}
.cookie-ui button:hover {
  background: var(--olive);
  color: var(--paper);
}
.cookie-ui :is(a, button, input):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}
.cookie-banner {
  position: fixed;
  z-index: 120;
  bottom: 20px;
  left: 24px;
  right: 24px;
  max-width: 1100px;
  margin-inline: auto;
  padding: 22px 26px;
  display: flex;
  align-items: center;
  gap: 30px;
}
.cookie-banner > div:first-child {
  flex: 1;
}
.cookie-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cookie-banner .cookie-actions {
  flex-shrink: 0;
}
.cookie-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(600px, calc(100% - 32px));
  max-height: calc(100dvh - 40px);
  padding: 28px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.cookie-dialog::backdrop {
  background: rgb(28 35 26 / 0.38);
}
.cookie-dialog-heading {
  display: flex;
  align-items: start;
  gap: 20px;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cookie-ui .cookie-close {
  border: 0;
  padding-inline: 8px;
  flex-shrink: 0;
}
.cookie-categories {
  margin: 24px 0 18px;
}
.cookie-category {
  padding-block: 15px;
  border-top: 1px solid var(--line);
}
.cookie-category label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  font-size: 14px;
  gap: 20px;
  cursor: pointer;
}
.cookie-category small {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: #5f6858;
  margin-top: 4px;
}
.cookie-category input {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  accent-color: var(--olive);
}
.cookie-category input:disabled {
  cursor: not-allowed;
}
.cookie-category p {
  margin-top: 8px;
}
.dialog-actions {
  margin-top: 24px;
}
.cookie-storage-notice {
  position: fixed;
  z-index: 121;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 580px;
  margin: auto;
  padding: 18px;
  display: flex;
  gap: 16px;
  align-items: center;
}
@media (max-width: 1050px) {
  .cookie-banner {
    display: block;
  }
  .cookie-banner .cookie-actions {
    margin-top: 16px;
  }
}
@media (max-width: 600px) {
  .cookie-banner {
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px 20px max(20px, env(safe-area-inset-bottom));
    max-height: 65dvh;
    overflow-y: auto;
  }
  .cookie-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .cookie-actions button:last-child {
    grid-column: 1 / -1;
  }
  .cookie-dialog {
    padding: 22px;
  }
  .cookie-dialog-heading {
    gap: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cookie-ui button {
    transition: none;
  }
}
</style>
