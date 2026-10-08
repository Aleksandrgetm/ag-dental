import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  LANGUAGE_KEY,
  readConsent,
  type CookieChoice,
} from "../services/cookieConsent";

export const useCookieConsentStore = defineStore("cookieConsent", () => {
  const choice = ref<CookieChoice | null>(readConsent());
  const settingsOpen = ref(false);
  const storageFailed = ref(false);
  const preferencesAllowed = computed(() => choice.value?.preferences === true);
  const mapsAllowed = computed(() => choice.value?.maps === true);
  function save(preferences: boolean, maps = false) {
    choice.value = {
      version: CONSENT_VERSION,
      necessary: true,
      preferences,
      maps,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(choice.value));
      if (!preferences) localStorage.removeItem(LANGUAGE_KEY);
      storageFailed.value = false;
    } catch {
      storageFailed.value = true;
    }
    settingsOpen.value = false;
  }
  function synchronize() {
    choice.value = readConsent();
    if (!choice.value?.preferences) {
      try {
        localStorage.removeItem(LANGUAGE_KEY);
      } catch {
        /* Storage may be unavailable. */
      }
    }
  }
  return {
    choice,
    settingsOpen,
    storageFailed,
    preferencesAllowed,
    mapsAllowed,
    save,
    synchronize,
  };
});
