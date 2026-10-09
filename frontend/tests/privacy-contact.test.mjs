import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseConsent,
  initialLanguage,
  CONSENT_KEY,
  LANGUAGE_KEY,
} from "../src/services/cookieConsent.ts";
import {
  validateContactQuestion,
  fieldLimits,
} from "../src/services/contactQuestions.ts";
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
  name: "Testa Persona",
  phone: "+371 2822 9925",
  email: "test@example.com",
  question: "Vai klīnikā ir pieejama autostāvvieta?",
  privacy: true,
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
test("questions require a single name, email, question and privacy acknowledgement, but no phone", () => {
  assert.deepEqual(
    validateContactQuestion({
      name: " ",
      email: "",
      phone: "",
      question: " \n ",
      privacy: false,
    }),
    {
      name: "required",
      email: "required",
      question: "required",
      privacy: "privacyRequired",
    },
  );
  for (const phone of ["", "   "])
    assert.deepEqual(validateContactQuestion({ ...valid, phone }), {});
  for (const privacy of [false, undefined, "true", 1])
    assert.equal(
      validateContactQuestion({ ...valid, privacy }).privacy,
      "privacyRequired",
    );
});
test("international phone formats and Unicode names are accepted without a country-specific prefix", () => {
  for (const phone of [
    "+371 2822 9925",
    "28229925",
    "+44 (20) 1234-5678",
    "00371 28229925",
    "+1 (415) 555-0123",
    "+49 30 123456",
    "1234567",
    "+123456789012345",
  ])
    for (const name of [
      "Āņna-Marie",
      "Александр",
      "李",
      "O’Connor",
      " Mary Jane ",
    ])
      assert.deepEqual(validateContactQuestion({ ...valid, name, phone }), {});
  for (const phone of [
    "123",
    "call me",
    "1234567890123456",
    "12+34567890",
    "+371\n28229925",
    "++123456789",
    "( ) - .",
  ])
    assert.equal(
      validateContactQuestion({ ...valid, phone }).phone,
      "phoneInvalid",
    );
  assert.equal(
    validateContactQuestion({ ...valid, name: "Test\nName" }).name,
    "nameInvalid",
  );
});
test("email is validated and surrounding whitespace is accepted", () => {
  for (const email of [
    "x",
    "x@",
    "x@domain",
    "x @domain.lv",
    "x@domain. lv",
    "<x>@example.com",
  ])
    assert.equal(
      validateContactQuestion({ ...valid, email }).email,
      "emailInvalid",
    );
  for (const email of [" person@example.com ", "person+question@example.co.uk"])
    assert.deepEqual(validateContactQuestion({ ...valid, email }), {});
});
test("all free-text lengths are enforced even when HTML limits are bypassed", () => {
  for (const [key, limit] of Object.entries(fieldLimits))
    assert.equal(
      validateContactQuestion({ ...valid, [key]: "a".repeat(limit + 1) })[key],
      "tooLong",
    );
  assert.deepEqual(
    validateContactQuestion({ ...valid, question: "a".repeat(1000) }),
    {},
  );
  assert.deepEqual(
    validateContactQuestion({
      ...valid,
      question: "Labdien!\nVai ir autostāvvieta?",
    }),
    {},
  );
});
test("local validation does not mutate, persist, transmit or claim acceptance of a question", () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error("Network must not be called");
  };
  try {
    const fields = Object.freeze({ ...valid });
    assert.deepEqual(validateContactQuestion(fields), {});
    assert.deepEqual(fields, valid);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
