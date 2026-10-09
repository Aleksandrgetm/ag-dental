import { validReceipt } from "./api.ts";
import {
  BookingError,
  type BookingStorage,
  type SavedBooking,
} from "./types.ts";
const KEY = "ag-booking-intent-v1";
// Only a submitted intent is stored, in this tab. Never passwords or tokens.
// Uncertain outcomes have no automatic expiry: losing the key could duplicate a booking.
export function bookingStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): BookingStorage {
  return {
    read() {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw) as SavedBooking;
        if (
          value.version !== 1 ||
          (!value.intent && !value.receipt) ||
          (value.intent && value.receipt)
        )
          throw new Error();
        if (value.receipt && !validReceipt(value.receipt)) throw new Error();
        if (
          value.intent &&
          (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
            value.intent.key,
          ) ||
            !value.intent.request ||
            typeof value.intent.request.first_name !== "string" ||
            !value.intent.service ||
            !value.intent.doctor ||
            !(
              value.intent.userID === null ||
              typeof value.intent.userID === "string"
            ))
        )
          throw new Error();
        if (value.intent) {
          const { request, service, doctor, slot } = value.intent;
          const fields = [
            "service_id",
            "doctor_id",
            "starts_at",
            "first_name",
            "last_name",
            "phone",
            "email",
            "privacy_notice_version",
          ];
          if (
            Object.keys(request).length !== fields.length + 1 ||
            !fields.every(
              (k) => typeof request[k as keyof typeof request] === "string",
            ) ||
            request.privacy_acknowledged !== true ||
            !request.privacy_notice_version ||
            service.id !== request.service_id ||
            doctor.id !== request.doctor_id ||
            !slot ||
            slot.doctor_id !== doctor.id ||
            slot.starts_at !== request.starts_at ||
            !Number.isFinite(Date.parse(slot.starts_at)) ||
            !(Date.parse(slot.ends_at) > Date.parse(slot.starts_at))
          )
            throw new Error();
        }
        return value;
      } catch {
        throw new BookingError(0, "saved_intent_invalid");
      }
    },
    write(value) {
      storage.setItem(KEY, JSON.stringify(value));
    },
    clear() {
      storage.removeItem(KEY);
    },
  };
}
