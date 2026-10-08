export type AuthMode = "login" | "register" | "forgot" | "reset";
export const MIN_PASSWORD_LENGTH = 8;
export function validateAuth(
  mode: AuthMode,
  email: string,
  password: string,
  repeat: string,
  consent: boolean,
) {
  const errors: Record<string, string> = {};
  if (
    mode !== "reset" &&
    (!email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.length > 254)
  )
    errors.email = "emailInvalid";
  if (mode !== "forgot" && !password) errors.password = "passwordRequired";
  if (
    (mode === "register" || mode === "reset") &&
    password.length < MIN_PASSWORD_LENGTH
  )
    errors.password = "passwordShort";
  if ((mode === "register" || mode === "reset") && password !== repeat)
    errors.repeat = "passwordMismatch";
  if (mode === "register" && !consent) errors.consent = "consentRequired";
  return errors;
}
export function authError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const mappings: Record<string, string> = {
    invalid_credentials: "credentials",
    user_already_exists: "duplicate",
    email_exists: "duplicate",
    weak_password: "weakPassword",
    same_password: "samePassword",
    over_request_rate_limit: "rateLimit",
    over_email_send_rate_limit: "rateLimit",
    email_not_confirmed: "accountUnavailable",
    email_address_invalid: "emailInvalid",
    signup_disabled: "unavailable",
    otp_expired: "recoveryInvalid",
    bad_code_verifier: "recoveryInvalid",
    flow_state_expired: "recoveryInvalid",
    flow_state_not_found: "recoveryInvalid",
    session_not_found: "recoveryInvalid",
  };
  return mappings[code] || "unavailable";
}
