export const CONSENT_KEY = "ag-cookie-consent";
export const LANGUAGE_KEY = "ag-language";
export const CONSENT_VERSION = 2;
export interface CookieChoice {
  version: typeof CONSENT_VERSION;
  necessary: true;
  preferences: boolean;
  maps: boolean;
  analytics: false;
  marketing: false;
  timestamp: string;
}

// An inventory change requires review and a version bump before optional code is enabled.
export function parseConsent(raw: string | null): CookieChoice | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      value.version !== CONSENT_VERSION ||
      value.necessary !== true ||
      typeof value.preferences !== "boolean" ||
      typeof value.maps !== "boolean" ||
      value.analytics !== false ||
      value.marketing !== false ||
      typeof value.timestamp !== "string" ||
      !Number.isFinite(Date.parse(value.timestamp)) ||
      Date.parse(value.timestamp) > Date.now()
    )
      return null;
    return {
      version: CONSENT_VERSION,
      necessary: true,
      preferences: value.preferences,
      maps: value.maps,
      analytics: false,
      marketing: false,
      timestamp: value.timestamp,
    };
  } catch {
    return null;
  }
}
export function readConsent(): CookieChoice | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}
export function initialLanguage(): string {
  try {
    if (!readConsent()?.preferences) {
      localStorage.removeItem(LANGUAGE_KEY);
      return "lv";
    }
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved && ["lv", "ru", "en"].includes(saved) ? saved : "lv";
  } catch {
    return "lv";
  }
}
