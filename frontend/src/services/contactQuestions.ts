export const fieldLimits = {
  name: 100,
  email: 254,
  phone: 40,
  question: 1000,
} as const;

export interface ContactQuestionFields {
  name: string;
  email: string;
  phone: string;
  question: string;
  privacy: boolean;
}
export type ContactQuestionErrors = Partial<
  Record<keyof ContactQuestionFields, string>
>;

// Local feedback only. There is no contact endpoint, transport, persistence,
// booking payload or success result. Revalidate on the server before enabling delivery.
export function validateContactQuestion(
  fields: ContactQuestionFields,
): ContactQuestionErrors {
  const errors: ContactQuestionErrors = {};
  for (const key of ["name", "email", "question"] as const) {
    if (!fields[key].trim()) errors[key] = "required";
  }
  for (const key of Object.keys(fieldLimits) as (keyof typeof fieldLimits)[]) {
    if (fields[key].length > fieldLimits[key]) errors[key] = "tooLong";
  }
  if (!errors.name && /[\u0000-\u001f\u007f-\u009f]/.test(fields.name))
    errors.name = "nameInvalid";
  if (
    !errors.email &&
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.email.trim())
  )
    errors.email = "emailInvalid";
  const phone = fields.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (
    phone &&
    !errors.phone &&
    (!/^\+?[0-9 ().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
  )
    errors.phone = "phoneInvalid";
  if (fields.privacy !== true) errors.privacy = "privacyRequired";
  return errors;
}
