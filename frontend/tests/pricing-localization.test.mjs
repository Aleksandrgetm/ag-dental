import { test } from "node:test";
import assert from "node:assert/strict";
import source from "../src/content/prices.json" with { type: "json" };
import { localizedPrices } from "../src/content/pricing.ts";

for (const locale of ["lv", "ru", "en"]) {
  test(`${locale}: all pricing text is localized without changing any amount, order or review flag`, () => {
    assert.deepEqual(
      localizedPrices.map((category) => category.items.length),
      [2, 10, 10, 11, 7, 29],
    );
    for (const [index, category] of localizedPrices.entries()) {
      const original = source[index];
      assert.equal(category.title.lv, original.title);
      assert.equal(category.concession, index === 5);
      const labels = [category.title[locale]];
      category.items.forEach((item, itemIndex) => {
        const originalItem = original.items[itemIndex];
        assert.equal(item.name.lv, originalItem.name);
        assert.deepEqual({ ...item, name: item.name.lv }, originalItem);
        labels.push(item.name[locale]);
      });
      for (const label of labels) {
        assert.ok(typeof label === "string" && label.trim().length > 0);
        if (locale !== "lv") assert.doesNotMatch(label, /[āčēģīķļņšūž]/i);
        if (locale === "ru") assert.match(label, /[а-яё]/i);
        if (locale === "en") assert.doesNotMatch(label, /[а-яё]/i);
      }
      if (locale !== "lv") {
        assert.notEqual(category.title[locale], original.title);
        category.items.forEach((item) =>
          assert.notEqual(item.name[locale], item.name.lv),
        );
      }
    }
  });
}

test("questionable source amount and dual prices retain their original representations", () => {
  assert.equal(localizedPrices[2].items[1].price, "11800");
  assert.equal(localizedPrices[2].items[1].review, true);
  assert.equal(localizedPrices[5].items[9].price, "170.00/200.00");
});
