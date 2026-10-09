// Imported only by an explicit Vite development branch; no fetch or Supabase client.
import type { BookingAPI, BookingAuth, Receipt, Service } from "./types.ts";
import { clinicDate } from "./calendar.ts";
// Reuse the public catalogue and its existing translated category names.
// These UI choices do not establish real online eligibility or treatment times.
import { services as websiteServices } from "../../content/clinic.ts";
import { localizedPrices } from "../../content/pricing.ts";
const doctors = [
  {
    id: "d2000000-0000-4000-8000-000000000001",
    name: "Dr. Anda Gutovska",
    provenance: "development_fixture",
  },
];
const services: Service[] = websiteServices.map((service, index) => ({
  id: `d1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  slug: service.slug,
  name_lv: service.title.lv,
  name_ru: service.title.ru,
  name_en: service.title.en,
  description_lv: service.short.lv,
  description_ru: service.short.ru,
  description_en: service.short.en,
  category: {
    id: String(service.category),
    title: localizedPrices[service.category]!.title,
  },
  duration_minutes: null,
  provenance: "development_fixture",
}));
// A technical fixture range required by the Slot/Receipt contract, not a
// treatment duration. Never assigned to a service or displayed in demo UI.
const SIMULATED_RANGE_MS = 30 * 60000;
const delay = async (signal?: AbortSignal) => {
  await new Promise((resolve) => setTimeout(resolve, 160));
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
};
export function createDemoClients(): { api: BookingAPI; auth: BookingAuth } {
  let userID: string | null = null;
  const receipts = new Map<string, Receipt>();
  return {
    api: {
      async services(signal) {
        await delay(signal);
        return { services, privacy_notice_version: "DEMO-NOT-A-LEGAL-NOTICE" };
      },
      async doctors(service, signal) {
        await delay(signal);
        return services.some((item) => item.id === service) ? doctors : [];
      },
      async availability(service, doctor, date, signal) {
        await delay(signal);
        const day = new Date(`${date}T09:00:00Z`),
          today = clinicDate(),
          end = new Date();
        end.setUTCDate(end.getUTCDate() + 60);
        const slots =
          services.some((item) => item.id === service) &&
          date >= today &&
          date <= clinicDate(end) &&
          ![0, 6].includes(day.getUTCDay())
            ? [9, 11, 13]
                .flatMap((hour) =>
                  doctors
                    .filter((d) => !doctor || doctor === d.id)
                    .map((d) => {
                      const start = new Date(
                        `${date}T${String(hour).padStart(2, "0")}:00:00Z`,
                      );
                      return {
                        doctor_id: d.id,
                        starts_at: start.toISOString(),
                        ends_at: new Date(
                          +start + SIMULATED_RANGE_MS,
                        ).toISOString(),
                      };
                    }),
                )
                .filter(
                  (s) => Date.parse(s.starts_at) > Date.now() + 120 * 60000,
                )
            : [];
        return {
          slots,
          timezone: "Europe/Riga",
          privacy_notice_version: "DEMO-NOT-A-LEGAL-NOTICE",
        };
      },
      async create(request, key) {
        await delay();
        if (receipts.has(key)) return receipts.get(key)!;
        const result: Receipt = {
          id: crypto.randomUUID(),
          booking_reference: `DEMO-${key.slice(0, 8).toUpperCase()}`,
          service_id: request.service_id,
          doctor_id: request.doctor_id,
          starts_at: request.starts_at,
          ends_at: new Date(
            Date.parse(request.starts_at) + SIMULATED_RANGE_MS,
          ).toISOString(),
          status: "confirmed",
        };
        receipts.set(key, result);
        return result;
      },
    },
    auth: {
      userID: () => userID,
      async token() {
        return undefined;
      },
      async register() {
        await delay();
        userID = "d3000000-0000-4000-8000-000000000001";
        return null;
      },
    },
  };
}
