import { test } from "node:test";
import assert from "node:assert/strict";
import { articles } from "../src/content/articles.ts";
import {
  articleTranslations,
  localizeArticle,
} from "../src/content/articleTranslations.ts";

const numbers = (text) => text.match(/\d+(?:[.,]\d+)?/g) || [];
const withoutNames = (text) => text.replaceAll("AG Zobārstniecība", "");

test("every published article has exactly one complete RU and EN translation", () => {
  assert.deepEqual(
    Object.keys(articleTranslations).sort(),
    articles.map((a) => a.slug).sort(),
  );
  for (const text of Object.values(articleTranslations))
    assert.deepEqual(Object.keys(text).sort(), ["en", "ru"]);
});
for (const locale of ["lv", "ru", "en"]) {
  test(`${locale}: every article preserves metadata, paragraph structure, prices and numeric facts`, () => {
    for (const original of articles) {
      const article = localizeArticle(original, locale);
      for (const key of ["slug", "date", "image", "source"])
        assert.equal(article[key], original[key]);
      assert.equal(article.paragraphs.length, original.paragraphs.length);
      if (locale === "lv") assert.deepEqual(article, original);
      for (const key of ["title", "category", "excerpt"]) {
        assert.ok(article[key].trim());
        assert.deepEqual(numbers(article[key]), numbers(original[key]));
        if (locale !== "lv") assert.notEqual(article[key], original[key]);
      }
      article.paragraphs.forEach((paragraph, index) => {
        assert.ok(paragraph.trim());
        assert.deepEqual(
          numbers(paragraph),
          numbers(original.paragraphs[index]),
        );
        assert.equal(
          paragraph.includes("%"),
          original.paragraphs[index].includes("%"),
        );
        assert.equal(
          paragraph.includes("€"),
          original.paragraphs[index].includes("€"),
        );
        if (locale !== "lv")
          assert.notEqual(paragraph, original.paragraphs[index]);
      });
      const text = [
        article.title,
        article.category,
        article.excerpt,
        ...article.paragraphs,
      ].join(" ");
      if (locale !== "lv")
        assert.doesNotMatch(withoutNames(text), /[āčēģīķļņšūž]/i);
      if (locale === "en") assert.doesNotMatch(text, /[а-яё]/i);
      if (locale === "ru")
        article.paragraphs.forEach((p) => assert.match(p, /[а-яё]/i));
    }
  });
}
test("missing future translations fail explicitly instead of leaking Latvian into RU/EN", () => {
  const unknown = { ...articles[0], slug: "untranslated-future-article" };
  assert.throws(
    () => localizeArticle(unknown, "ru"),
    /Missing ru article translation/,
  );
  assert.throws(
    () => localizeArticle(unknown, "en"),
    /Missing en article translation/,
  );
});
test("written quantities remain explicit in the hygiene article", () => {
  const original = articles.find((a) => a.slug === "zobu-higiena");
  const en = localizeArticle(original, "en").paragraphs;
  const ru = localizeArticle(original, "ru").paragraphs;
  assert.match(en[1], /six months/);
  assert.match(ru[1], /шести месяцев/);
  assert.match(en[3], /twice a day for two minutes/);
  assert.match(ru[3], /дважды в день по две минуты/);
});
