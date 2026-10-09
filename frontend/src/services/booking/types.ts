export type BookingLocale = "lv" | "ru" | "en";
export interface Service {
  id: string;
  slug: string;
  name_lv: string;
  name_ru: string;
  name_en: string;
  description_lv?: string;
  description_ru?: string;
  description_en?: string;
  // Optional display metadata for the development catalogue; not a Go API requirement.
  category?: { id: string; title: Record<BookingLocale, string> };
  duration_minutes: number | null;
  price_display_lv?: string;
  price_display_ru?: string;
  price_display_en?: string;
  provenance: string;
}
export interface Doctor {
  id: string;
  name: string;
  provenance: string;
}
export interface Slot {
  doctor_id: string;
  starts_at: string;
  ends_at: string;
}
export interface Catalog {
  services: Service[];
  privacy_notice_version: string | null;
}
export interface Availability {
  slots: Slot[];
  timezone: "Europe/Riga";
  privacy_notice_version: string | null;
}
export type BookingStatus =
  "pending" | "confirmed" | "completed" | "cancelled" | "rejected" | "no_show";
export interface Receipt extends Slot {
  id: string;
  booking_reference: string;
  service_id: string;
  status: BookingStatus;
}
export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}
export interface CreateBooking extends Contact {
  service_id: string;
  doctor_id: string;
  starts_at: string;
  privacy_acknowledged: boolean;
  privacy_notice_version: string;
}
export interface BookingAPI {
  services(signal?: AbortSignal): Promise<Catalog>;
  doctors(service: string, signal?: AbortSignal): Promise<Doctor[]>;
  availability(
    service: string,
    doctor: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<Availability>;
  create(request: CreateBooking, key: string, token?: string): Promise<Receipt>;
}
export interface BookingAuth {
  userID(): string | null;
  token(userID: string | null, refresh?: boolean): Promise<string | undefined>;
  register(
    email: string,
    password: string,
    repeat: string,
    consent: boolean,
  ): Promise<string | null>;
}
export interface Intent {
  key: string;
  request: CreateBooking;
  userID: string | null;
  service: Service;
  doctor: Doctor;
  slot: Slot;
  createdAt: string;
}
export interface SavedBooking {
  version: 1;
  intent: Intent | null;
  receipt: Receipt | null;
  service: Service | null;
  doctor: Doctor | null;
}
export interface BookingStorage {
  read(): SavedBooking | null;
  write(value: SavedBooking): void;
  clear(): void;
}
export class BookingError extends Error {
  status: number;
  code: string;
  retryAfter: number;
  constructor(status: number, code: string, retryAfter = 0) {
    super(code);
    this.name = "BookingError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}
