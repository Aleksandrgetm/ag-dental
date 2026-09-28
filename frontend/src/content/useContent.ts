import { useI18n } from "vue-i18n";
import type { Language, Localized } from "./clinic";
export function useContent() {
  const { t, locale } = useI18n();
  const local = (value: Localized) =>
    value[locale.value as Language] || value.lv;
  const date = (value: string) =>
    new Intl.DateTimeFormat(
      locale.value === "lv"
        ? "lv-LV"
        : locale.value === "ru"
          ? "ru-RU"
          : "en-GB",
      { day: "numeric", month: "long", year: "numeric" },
    ).format(new Date(value + "T12:00:00"));
  return { t, locale, local, date };
}
