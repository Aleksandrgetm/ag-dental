import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAuth, authError } from "../src/services/authValidation.ts";
import { authMessages } from "../src/i18n/auth.ts";
test("registration requires valid email, matching safe password and explicit consent", () => {
  assert.deepEqual(
    validateAuth(
      "register",
      "person@example.invalid",
      "long-password",
      "long-password",
      true,
    ),
    {},
  );
  assert.equal(
    validateAuth("register", "bad", "long-password", "long-password", true)
      .email,
    "emailInvalid",
  );
  assert.equal(
    validateAuth("register", "person@example.invalid", "short", "short", true)
      .password,
    "passwordShort",
  );
  assert.equal(
    validateAuth(
      "register",
      "person@example.invalid",
      "long-password",
      "different",
      true,
    ).repeat,
    "passwordMismatch",
  );
  assert.equal(
    validateAuth(
      "register",
      "person@example.invalid",
      "long-password",
      "long-password",
      false,
    ).consent,
    "consentRequired",
  );
});
test("login does not reject existing shorter provider passwords; reset validates new passwords", () => {
  assert.deepEqual(
    validateAuth("login", "person@example.invalid", "oldpwd", "", false),
    {},
  );
  assert.equal(
    validateAuth("reset", "", "long-password", "different", false).repeat,
    "passwordMismatch",
  );
  assert.deepEqual(
    validateAuth("forgot", "person@example.invalid", "", "", false),
    {},
  );
});
test("provider errors map to known localized keys, never raw details", () => {
  assert.equal(
    authError({ code: "invalid_credentials", message: "sensitive" }),
    "credentials",
  );
  assert.equal(authError({ code: "user_already_exists" }), "duplicate");
  assert.equal(authError(new Error("internal details")), "unavailable");
  assert.equal(authError({ code: "otp_expired" }), "recoveryInvalid");
});
test("all three languages cover every auth label and validation message", () => {
  const keys = Object.keys(authMessages.lv).sort();
  for (const lang of ["lv", "ru", "en"]) {
    assert.deepEqual(Object.keys(authMessages[lang]).sort(), keys);
    for (const value of Object.values(authMessages[lang]))
      assert.ok(value.trim());
  }
});

test("unexpected unconfirmed accounts fail closed with support guidance, not an email-confirmation journey", () => {
  assert.equal(
    authError({ code: "email_not_confirmed" }),
    "accountUnavailable",
  );
  for (const locale of ["lv", "ru", "en"]) {
    assert.equal(Object.hasOwn(authMessages[locale], "confirmation"), false);
    assert.ok(authMessages[locale].registrationUnavailable);
    assert.ok(authMessages[locale].accountUnavailable);
    assert.ok(authMessages[locale].showPassword);
    assert.ok(authMessages[locale].hidePassword);
  }
});
