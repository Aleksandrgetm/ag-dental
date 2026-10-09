import type { BookingLocale, Service, Slot } from "./types.ts";
export const CLINIC_ZONE = "Europe/Riga";
export const intlLocale = (locale: string) =>
  ({ lv: "lv-LV", ru: "ru-RU", en: "en-GB" })[locale] || "lv-LV";
export function clinicDate(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
// UTC noon is used only for calendar labels/arithmetic, never to create a slot instant.
export const calendarDate = (date: string) => new Date(`${date}T12:00:00Z`);
export function shiftMonth(month: string, offset: number): string {
  const date = calendarDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function monthDates(month: string): string[] {
  const start = calendarDate(`${month}-01`),
    count = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    ).getUTCDate();
  return Array.from(
    { length: count },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
export function calendarCells(month: string): (string | null)[] {
  const first = calendarDate(`${month}-01`),
    blanks = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array(blanks).fill(null),
    ...monthDates(month),
  ];
  while (cells.length % 7) cells.push(null);
  return cells;
}
export const monthLabel = (month: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: CLINIC_ZONE,
  }).format(calendarDate(`${month}-01`));
export const dateLabel = (date: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CLINIC_ZONE,
  }).format(calendarDate(date));
export const timeLabel = (instant: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: CLINIC_ZONE,
  }).format(new Date(instant));
export const weekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: "short",
      timeZone: CLINIC_ZONE,
    }).format(new Date(Date.UTC(2026, 0, 5 + i, 12))),
  );
export const slotKey = (slot: Slot) =>
  `${slot.doctor_id}/${slot.starts_at}/${slot.ends_at}`;
export const duration = (slot: Slot) =>
  Math.round((Date.parse(slot.ends_at) - Date.parse(slot.starts_at)) / 60000);
export function localized(
  service: Service | null,
  field: "name" | "description" | "price_display",
  locale: string,
): string {
  return service?.[`${field}_${locale as BookingLocale}`] || "";
}
