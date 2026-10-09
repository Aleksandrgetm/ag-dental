import {
  BookingError,
  type Availability,
  type BookingAPI,
  type Catalog,
  type Doctor,
  type Receipt,
} from "./types.ts";
const ids = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const instant = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const statuses = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
];
export function validReceipt(value: unknown): value is Receipt {
  return (
    record(value) &&
    ["id", "doctor_id", "service_id"].every(
      (k) => typeof value[k] === "string" && ids.test(value[k] as string),
    ) &&
    typeof value.booking_reference === "string" &&
    value.booking_reference.length > 0 &&
    statuses.includes(String(value.status)) &&
    instant(value.starts_at) &&
    instant(value.ends_at) &&
    Date.parse(String(value.ends_at)) > Date.parse(String(value.starts_at))
  );
}
export function createBookingAPI(
  base: string,
  transport: typeof fetch = fetch,
): BookingAPI {
  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    if (!base) throw new BookingError(0, "api_unavailable");
    const timeout = AbortSignal.timeout(18000);
    const signal = init.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    let response: Response;
    try {
      response = await transport(`${base.replace(/\/$/, "")}/booking/${path}`, {
        ...init,
        signal,
        cache: "no-store",
        credentials: "omit",
      });
    } catch {
      if (init.signal?.aborted)
        throw new DOMException("Cancelled", "AbortError");
      throw new BookingError(0, "network");
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BookingError(
        response.ok ? 0 : response.status,
        "invalid_response",
      );
    }
    if (!response.ok) {
      const code =
        record(body) && typeof body.error === "string"
          ? body.error
          : "api_unavailable";
      const seconds = Number(response.headers.get("Retry-After"));
      throw new BookingError(
        response.status,
        code,
        Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : 60,
      );
    }
    return body;
  }
  return {
    async services(signal) {
      const body = await request("services", { signal });
      if (
        !record(body) ||
        !Array.isArray(body.services) ||
        !(
          body.privacy_notice_version === null ||
          typeof body.privacy_notice_version === "string"
        ) ||
        !body.services.every(
          (s) =>
            record(s) &&
            typeof s.id === "string" &&
            ids.test(s.id) &&
            ["name_lv", "name_ru", "name_en", "slug", "provenance"].every(
              (k) => typeof s[k] === "string",
            ) &&
            typeof s.duration_minutes === "number" &&
            s.duration_minutes > 0,
        )
      )
        throw new BookingError(0, "invalid_response");
      return body as unknown as Catalog;
    },
    async doctors(service, signal) {
      const body = await request(
        `doctors?${new URLSearchParams({ service_id: service })}`,
        { signal },
      );
      if (
        !record(body) ||
        !Array.isArray(body.doctors) ||
        !body.doctors.every(
          (d) =>
            record(d) &&
            typeof d.id === "string" &&
            ids.test(d.id) &&
            typeof d.name === "string",
        )
      )
        throw new BookingError(0, "invalid_response");
      return body.doctors as Doctor[];
    },
    async availability(service, doctor, date, signal) {
      const query = new URLSearchParams({ service_id: service, date });
      if (doctor) query.set("doctor_id", doctor);
      const body = await request(`availability?${query}`, { signal });
      if (
        !record(body) ||
        body.timezone !== "Europe/Riga" ||
        !(
          body.privacy_notice_version === null ||
          typeof body.privacy_notice_version === "string"
        ) ||
        !Array.isArray(body.slots) ||
        !body.slots.every(
          (s) =>
            record(s) &&
            typeof s.doctor_id === "string" &&
            ids.test(s.doctor_id) &&
            instant(s.starts_at) &&
            instant(s.ends_at) &&
            Date.parse(String(s.ends_at)) > Date.parse(String(s.starts_at)),
        )
      )
        throw new BookingError(0, "invalid_response");
      return body as unknown as Availability;
    },
    async create(payload, key, token) {
      const body = await request("appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!validReceipt(body)) throw new BookingError(0, "invalid_response");
      // Retain only the public receipt, even if an API response gains extra fields.
      return {
        id: body.id,
        booking_reference: body.booking_reference,
        service_id: body.service_id,
        doctor_id: body.doctor_id,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        status: body.status,
      };
    },
  };
}
