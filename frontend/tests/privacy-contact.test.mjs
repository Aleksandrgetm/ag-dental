import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseConsent,
  initialLanguage,
  CONSENT_KEY,
  LANGUAGE_KEY,
} from "../src/services/cookieConsent.ts";
import {
  validateRequest,
  prepareRequest,
  submitAppointmentRequest,
  fieldLimits,
} from "../src/services/appointmentRequests.ts";
const choice = {
  version: 2,
  necessary: true,
  preferences: true,
  maps: false,
  analytics: false,
  marketing: false,
  timestamp: "2026-01-01T00:00:00.000Z",
};
const valid = {
  firstName: "Testa",
  lastName: "Persona",
  phone: "+371 2822 9925",
  email: "test@example.com",
  service: "consultation",
  message: "",
  consent: true,
};
test("consent fails closed for missing, malformed, obsolete, future-dated or inactive-category consent", () => {
  for (const raw of [
    null,
    "{",
    "[]",
    JSON.stringify({ ...choice, version: 0 }),
    JSON.stringify({ ...choice, version: 1 }),
    JSON.stringify({ ...choice, maps: undefined }),
    JSON.stringify({ ...choice, necessary: false }),
    JSON.stringify({ ...choice, preferences: "yes" }),
    JSON.stringify({ ...choice, analytics: true }),
    JSON.stringify({ ...choice, marketing: true }),
    JSON.stringify({ ...choice, timestamp: "invalid" }),
    JSON.stringify({ ...choice, timestamp: "2999-01-01T00:00:00Z" }),
  ])
    assert.equal(parseConsent(raw), null);
  assert.deepEqual(
    parseConsent(JSON.stringify({ ...choice, unwantedData: "ignored" })),
    choice,
  );
});
test("language persistence requires valid preference consent; legacy unconsented language is removed", () => {
  const data = new Map([[LANGUAGE_KEY, "ru"]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      removeItem: (key) => data.delete(key),
    },
  });
  assert.equal(initialLanguage(), "lv");
  assert.equal(data.has(LANGUAGE_KEY), false);
  data.set(CONSENT_KEY, JSON.stringify(choice));
  data.set(LANGUAGE_KEY, "en");
  assert.equal(initialLanguage(), "en");
  data.set(CONSENT_KEY, JSON.stringify({ ...choice, preferences: false }));
  assert.equal(initialLanguage(), "lv");
  assert.equal(data.has(LANGUAGE_KEY), false);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw Error("blocked");
    },
  });
  assert.equal(initialLanguage(), "lv");
});
test("all required fields including operational consent are validated", () => {
  assert.deepEqual(
    validateRequest(
      {
        firstName: " ",
        lastName: "",
        phone: "",
        email: "",
        service: "",
        message: "",
        consent: false,
      },
      [],
    ),
    {
      firstName: "required",
      lastName: "required",
      phone: "required",
      email: "required",
      consent: "consentRequired",
    },
  );
});
test("international phones, Unicode names, service selection and email are checked without overrestricting names", () => {
  for (const phone of [
    "+371 2822 9925",
    "28229925",
    "+44 (20) 1234-5678",
    "00371 28229925",
  ])
    assert.deepEqual(
      validateRequest({ ...valid, firstName: "Āņna-Marie", phone }, [
        "consultation",
      ]),
      {},
    );
  for (const phone of ["123", "call me", "1234567890123456", "12+34567890"])
    assert.equal(
      validateRequest({ ...valid, phone }, ["consultation"]).phone,
      "phoneInvalid",
    );
  for (const email of ["x", "x@", "x@domain", "x @domain.lv"])
    assert.equal(
      validateRequest({ ...valid, email }, ["consultation"]).email,
      "emailInvalid",
    );
  assert.equal(
    validateRequest({ ...valid, service: "<script>" }, ["consultation"])
      .service,
    "serviceInvalid",
  );
  for (const service of ["", "unsure"])
    assert.deepEqual(validateRequest({ ...valid, service }, []), {});
});
test("all free-text fields are length-limited even if HTML constraints are bypassed", () => {
  for (const [key, limit] of Object.entries(fieldLimits))
    assert.equal(
      validateRequest({ ...valid, [key]: "a".repeat(limit + 1) }, [
        "consultation",
      ])[key],
      "tooLong",
    );
});
test("payload includes explicit consent evidence, and the inert adapter never sends data or fakes receipt", async () => {
  assert.throws(() => prepareRequest({ ...valid, consent: false }));
  const request = prepareRequest({ ...valid, firstName: " Testa " });
  assert.equal(request.firstName, "Testa");
  assert.equal(request.consent.granted, true);
  assert.ok(Number.isFinite(Date.parse(request.consent.timestamp)));
  assert.ok(request.consent.policyVersion);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error("Network must not be called");
  };
  try {
    assert.deepEqual(await submitAppointmentRequest(request), {
      status: "unavailable",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
