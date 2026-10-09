import { AdminError, type Credentials } from "./access.ts";
export const PAGE_LIMIT = 50;
export type Status =
  "pending" | "confirmed" | "completed" | "cancelled" | "rejected" | "no_show";
export interface Visit {
  id: string;
  name: string;
  starts_at: string;
  status: Status;
}
export interface BookingSettings {
  confirmation_mode: "manual" | "automatic";
  booking_horizon_days: number;
  minimum_advance_minutes: number;
  slot_interval_minutes: number;
  timezone: "Europe/Riga";
  privacy_notice_version: string | null;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
export function visits(value: unknown): Visit[] {
  if (
    !object(value) ||
    !Array.isArray(value.appointments) ||
    value.appointments.length > PAGE_LIMIT
  )
    throw new AdminError("unavailable");
  return value.appointments.map((v) => {
    if (
      !object(v) ||
      typeof v.id !== "string" ||
      typeof v.first_name !== "string" ||
      typeof v.last_name !== "string" ||
      v.first_name.length > 100 ||
      v.last_name.length > 100 ||
      typeof v.starts_at !== "string" ||
      !Number.isFinite(Date.parse(v.starts_at)) ||
      ![
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
        "no_show",
      ].includes(String(v.status))
    )
      throw new AdminError("unavailable");
    // Deliberately discard phone, email, Auth IDs, consent details and all other fields.
    return {
      id: v.id,
      name: `${v.first_name} ${v.last_name}`.trim(),
      starts_at: v.starts_at,
      status: v.status as Status,
    };
  });
}
export function settings(value: unknown): BookingSettings {
  if (
    !object(value) ||
    !["manual", "automatic"].includes(String(value.confirmation_mode)) ||
    value.timezone !== "Europe/Riga" ||
    !integer(value.booking_horizon_days, 0, 730) ||
    !integer(value.minimum_advance_minutes, 0, 525600) ||
    !integer(value.slot_interval_minutes, 1, 120) ||
    !(
      value.privacy_notice_version === null ||
      typeof value.privacy_notice_version === "string"
    )
  )
    throw new AdminError("unavailable");
  return {
    confirmation_mode:
      value.confirmation_mode as BookingSettings["confirmation_mode"],
    timezone: "Europe/Riga",
    booking_horizon_days: Number(value.booking_horizon_days),
    minimum_advance_minutes: Number(value.minimum_advance_minutes),
    slot_interval_minutes: Number(value.slot_interval_minutes),
    privacy_notice_version: value.privacy_notice_version as string | null,
  };
}
export function serviceCount(value: unknown): number {
  if (
    !object(value) ||
    !Array.isArray(value.services) ||
    !value.services.every(
      (v) =>
        object(v) &&
        typeof v.id === "string" &&
        typeof v.name_lv === "string" &&
        typeof v.name_ru === "string" &&
        typeof v.name_en === "string",
    )
  )
    throw new AdminError("unavailable");
  return value.services.length;
}
export function countLabel(rows: Visit[] | null): string | null {
  return rows === null
    ? null
    : `${rows.length}${rows.length === PAGE_LIMIT ? "+" : ""}`;
}
export function createAdminReader(
  base: string,
  auth: {
    credentials: () => Credentials | null;
    reject: (reason: "unauthorized" | "forbidden") => void;
  },
  transport: typeof fetch = fetch,
) {
  return async function get(
    path: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    // GET-only, with a fixed relative endpoint family. No CMS writes or arbitrary URL forwarding.
    if (
      !base ||
      !/^\/(admin\/booking\/(appointments|settings)(\?[^#]*)?|booking\/services)$/.test(
        path,
      )
    )
      throw new AdminError("unavailable");
    const initial = auth.credentials();
    if (!initial) {
      auth.reject("unauthorized");
      throw new AdminError("unauthorized");
    }
    {
      const current = auth.credentials();
      if (!current || current.id !== initial.id || signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      let response: Response;
      try {
        response = await transport(`${base.replace(/\/$/, "")}${path}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${current.token}` },
          cache: "no-store",
          credentials: "omit",
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        });
      } catch {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        throw new AdminError("unavailable");
      }
      if (signal.aborted || auth.credentials()?.id !== initial.id)
        throw new DOMException("Cancelled", "AbortError");
      if (response.status === 401 || response.status === 403) {
        const reason = response.status === 401 ? "unauthorized" : "forbidden";
        auth.reject(reason);
        throw new AdminError(reason);
      }
      if (!response.ok) throw new AdminError("unavailable");
      try {
        return await response.json();
      } catch {
        throw new AdminError("unavailable");
      }
    }
  };
}
