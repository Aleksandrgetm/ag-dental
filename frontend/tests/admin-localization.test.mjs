import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "vue-i18n";
import { adminMessages } from "../src/i18n/admin.ts";
import { adminGroups, adminPath } from "../src/services/admin/navigation.ts";
import { adminPaths } from "../src/services/admin/access.ts";
const paths = (value, prefix = "") =>
  Object.entries(value)
    .flatMap(([key, v]) =>
      typeof v === "string" ? [prefix + key] : paths(v, prefix + key + "."),
    )
    .sort();
test("all admin routes and return destinations share the same complete module inventory", () => {
  assert.deepEqual(adminGroups.flatMap((g) => g.items).map(adminPath), [
    ...adminPaths,
  ]);
});
for (const locale of ["lv", "ru", "en"])
  test(`${locale}: complete admin navigation, dashboard and safe error translations`, () => {
    assert.deepEqual(paths(adminMessages[locale]), paths(adminMessages.lv));
    const i18n = createI18n({
      legacy: false,
      locale,
      fallbackLocale: false,
      messages: { [locale]: { admin: adminMessages[locale] } },
    });
    for (const key of paths(adminMessages[locale])) {
      const value = i18n.global.t("admin." + key, {
        count: 50,
        limit: 50,
        time: "12:00",
      });
      assert.ok(value && !value.startsWith("admin."), key);
      if (locale !== "lv") assert.doesNotMatch(value, /[āčēģīķļņšūž]/iu, key);
    }
  });
