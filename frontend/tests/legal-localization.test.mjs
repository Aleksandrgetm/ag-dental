import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "vue-i18n";
import { legalDocuments } from "../src/i18n/legalDocuments.ts";
import { privacyAndContact } from "../src/i18n/privacyAndContact.ts";
import { legalReview } from "../src/content/legal.ts";

function paths(value, prefix = "") {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof item === "string" ? [path] : paths(item, path);
    })
    .sort();
}
for (const locale of ["lv", "ru", "en"]) {
  test(`${locale}: complete legal documents and UI message coverage`, () => {
    assert.deepEqual(
      paths(privacyAndContact[locale]),
      paths(privacyAndContact.lv),
    );
    for (const kind of ["privacy", "cookies"]) {
      const document = legalDocuments[locale][kind];
      const source = legalDocuments.lv[kind];
      assert.deepEqual(
        document.sections.map((section) => [
          section.id,
          section.paragraphs.length,
        ]),
        source.sections.map((section) => [
          section.id,
          section.paragraphs.length,
        ]),
      );
      assert.ok(document.title && document.intro);
      if (kind === "privacy") assert.ok(document.notice);
      if (locale !== "lv") {
        assert.notEqual(document.intro, source.intro);
        document.sections.forEach((section, index) => {
          // “Preferences” is also the established Latvian category label.
          if (!(locale === "en" && kind === "cookies" && section.id === "preferences")) {
            assert.notEqual(section.title, source.sections[index].title);
          }
          section.paragraphs.forEach((paragraph, position) => {
            assert.notEqual(
              paragraph,
              source.sections[index].paragraphs[position],
            );
            // Verified proper names and postal addresses retain their official spelling.
            const prose = paragraph
              .replaceAll("AG Zobārstniecība", "")
              .replaceAll("Ūnijas iela", "");
            assert.doesNotMatch(prose, /[āčēģīķļņšūž]/iu);
          });
        });
      }
    }
  });
}
test("vue-i18n switches whole documents and renders literal email addresses without linked-message errors", () => {
  const errors = [];
  const i18n = createI18n({
    legacy: false,
    locale: "lv",
    fallbackLocale: "lv",
    messages: privacyAndContact,
    onWarn: (message) => errors.push(message),
  });
  const translatedIntros = new Set();
  for (const locale of ["lv", "ru", "en"]) {
    i18n.global.locale.value = locale;
    for (const kind of ["privacy", "cookies"]) {
      const document = i18n.global.tm(`legalDocuments.${kind}`);
      translatedIntros.add(i18n.global.rt(document.intro));
      const text = document.sections
        .flatMap((section) =>
          section.paragraphs.map((paragraph) => i18n.global.rt(paragraph)),
        )
        .join("\n");
      assert.ok(text.includes("ag@inbox.lv"));
      assert.ok(text.includes("+371 28229925"));
      assert.ok(!text.includes("{'@'}"));
    }
  }
  assert.equal(translatedIntros.size, 6);
  assert.deepEqual(errors, []);
  assert.equal(legalReview.status, "CLIENT_CONFIRMATION_REQUIRED");
});
