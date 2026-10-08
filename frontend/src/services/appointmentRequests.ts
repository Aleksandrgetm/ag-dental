export const REQUEST_POLICY_VERSION = "2026-09-28";
export const REQUEST_SUBMISSION_ENABLED = false;
export const fieldLimits = {
  firstName: 80,
  lastName: 80,
  phone: 40,
  email: 254,
  message: 1000,
} as const;
export interface RequestFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  consent: boolean;
}
export type RequestErrors = Partial<Record<keyof RequestFields, string>>;
export interface AppointmentRequest extends Omit<RequestFields, "consent"> {
  consent: { granted: true; timestamp: string; policyVersion: string };
}
export type RequestResult = { status: "received" } | { status: "unavailable" };
export function validateRequest(
  fields: RequestFields,
  serviceSlugs: readonly string[],
): RequestErrors {
  const errors: RequestErrors = {};
  for (const key of ["firstName", "lastName", "phone", "email"] as const) {
    if (!fields[key].trim()) errors[key] = "required";
  }
  for (const key of Object.keys(fieldLimits) as (keyof typeof fieldLimits)[]) {
    if (fields[key].length > fieldLimits[key]) errors[key] = "tooLong";
  }
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    errors.email = "emailInvalid";
  const phone = fields.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (
    !errors.phone &&
    (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
  )
    errors.phone = "phoneInvalid";
  if (
    fields.service &&
    fields.service !== "unsure" &&
    !serviceSlugs.includes(fields.service)
  )
    errors.service = "serviceInvalid";
  if (!fields.consent) errors.consent = "consentRequired";
  return errors;
}
export function prepareRequest(fields: RequestFields): AppointmentRequest {
  if (!fields.consent) throw new Error("Consent is required");
  return {
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    phone: fields.phone.trim(),
    email: fields.email.trim(),
    service: fields.service,
    message: fields.message.trim(),
    consent: {
      granted: true,
      timestamp: new Date().toISOString(),
      policyVersion: REQUEST_POLICY_VERSION,
    },
  };
}
// Deliberately inert: no endpoint, patient-data storage, logging, or simulated success.
// Replace only after the Go API has server validation, limits, spam protection and a reviewed privacy notice.
// The future adapter must return "received" only after a verified successful POST /api/appointment-requests.
export async function submitAppointmentRequest(
  _request: AppointmentRequest,
): Promise<RequestResult> {
  return { status: "unavailable" };
}
