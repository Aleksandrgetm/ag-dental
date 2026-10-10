import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { services, media } from "../src/content/clinic.ts";
import prices from "../src/content/prices.json" with { type: "json" };
import { articles } from "../src/content/articles.ts";
import { cmsMessages } from "../src/i18n/cms.ts";
import { createI18n } from "vue-i18n";
const manifest = JSON.parse(
  readFileSync(
    new URL("../../backend/internal/cms/content.json", import.meta.url),
    "utf8",
  ),
);
const inventory = JSON.parse(
  readFileSync(
    new URL("../../docs/CMS_CONTENT_INVENTORY.json", import.meta.url),
    "utf8",
  ),
);
const docs = new Map(manifest.documents.map((d) => [d.key, d]));
test("all public routes, including operational pages and legal documents, are inventoried", () => {
  const routes = [
    "/",
    "/pakalpojumi",
    "/cenas",
    "/par-mums",
    "/jaunumi",
    "/kontakti",
    "/pieraksts",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/privatuma-politika",
    "/sikdatnu-politika",
    ...services.map((s) => `/pakalpojumi/${s.slug}`),
    ...articles.map((a) => `/jaunumi/${a.slug}`),
  ];
  for (const route of routes) {
    assert.ok(inventory.routes.includes(route), route);
    assert.ok(
      inventory.items.some((i) => i.routes.includes(route)),
      route,
    );
    assert.ok(
      manifest.documents.some((d) => d.target === "seo" && d.path[0] === route),
      route,
    );
  }
  assert.equal(docs.size, manifest.documents.length);
  for (const row of inventory.items) {
    assert.ok(
      row.source &&
        row.identifier &&
        (row.system_managed || row.cmsDestination),
    );
    assert.ok(Object.hasOwn(row, "value"));
    assert.ok(["lv", "ru", "en", "shared"].includes(row.language));
  }
});
test("verified public service content and every price row survive the export unchanged", () => {
  assert.equal(
    manifest.documents.filter((d) => d.key.startsWith("service.")).length,
    services.length,
  );
  for (const service of services) {
    assert.deepEqual(docs.get("service." + service.slug).data, service);
    assert.ok(
      !("duration_minutes" in docs.get("service." + service.slug).data),
    );
  }
  prices.forEach((category, index) => {
    const data = docs.get("prices." + index).data;
    assert.equal(data.title.lv, category.title);
    assert.equal(data.items.length, category.items.length);
    category.items.forEach((item, n) => {
      assert.equal(data.items[n].name.lv, item.name);
      assert.equal(data.items[n].price, item.price);
      if (item.review) assert.equal(data.items[n].review, item.review);
    });
  });
  for (const doc of manifest.documents.filter((d) => d.price_reference)) {
    const [category, index] = doc.price_reference;
    assert.equal(
      Number(doc.data.price),
      Number(prices[category].items[index].price),
    );
    assert.ok(doc.fields.find((f) => f.path.at(-1) === "price").locked);
  }
});
test("news retains dates, slugs, bodies and existing LV/RU/EN variants", () => {
  for (const article of articles) {
    const doc = docs.get("news." + article.slug);
    assert.deepEqual(doc.data.lv, article);
    for (const lang of ["lv", "ru", "en"]) {
      assert.equal(doc.data[lang].slug, article.slug);
      assert.equal(doc.data[lang].date, article.date);
      assert.ok(doc.data[lang].title);
      assert.equal(doc.data[lang].paragraphs.length, article.paragraphs.length);
    }
  }
});
test("all existing media URLs and file checksums are retained; protected assets are locked", () => {
  for (const url of Object.values(media)) {
    const asset = manifest.media.find((a) => a.url === url);
    assert.ok(asset, url);
    const bytes = readFileSync(new URL("../public" + url, import.meta.url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    assert.equal(bytes.length, asset.bytes);
  }
  assert.ok(manifest.media.find((a) => a.url === media.video).protected);
  assert.ok(manifest.media.find((a) => a.url === media.poster).protected);
  assert.ok(docs.get("messages.hero").locked);
  assert.ok(docs.get("system.auth").locked);
  assert.ok(docs.get("system.booking").locked);
});
for (const locale of ["lv", "ru", "en"])
  test(
    locale + ": every CMS action/state has a natural translated message",
    () => {
      assert.deepEqual(
        Object.keys(cmsMessages[locale]).sort(),
        Object.keys(cmsMessages.en).sort(),
      );
      const i18n = createI18n({
        legacy: false,
        locale,
        messages: { [locale]: { cms: cmsMessages[locale] } },
        fallbackLocale: false,
      });
      for (const key of Object.keys(cmsMessages.en)) {
        const value = i18n.global.t("cms." + key);
        assert.ok(value && !value.startsWith("cms."));
      }
    },
  );

test("translated contact field labels are plain text, not actual email/phone values", () => {
  for (const key of ["messages.ui", "messages.request"])
    for (const f of docs
      .get(key)
      .fields.filter((f) => ["phone", "email"].includes(f.path.at(-1))))
      assert.equal(f.type, "text");
  assert.equal(
    docs.get("clinic.clinic").fields.find((f) => f.path[0] === "email").type,
    "email",
  );
});

test("Hero is a system reference, never an editable section or preview asset", async () => {
  const c = await import("../src/services/cms/catalog.ts");
  assert.equal(c.homeSections[0].id, "intro");
  assert.equal(c.homeSections.length, 10);
  assert.equal(
    c.documents.some(
      (d) => d.system_managed || d.source.includes("ScrollClinicHero"),
    ),
    false,
  );
  assert.equal(c.findDoc("messages.hero"), undefined);
  assert.equal(c.imageURL("room"), media.room);
  assert.equal(docs.get("messages.hero").system_managed, true);
  for (const a of manifest.media.filter((a) => a.protected))
    assert.equal(c.imageURL(a.url), undefined);
  for (const lang of ["lv", "ru", "en"]) {
    const fields = c.visibleFields(c.findDoc("clinic.media"), lang);
    assert.ok(fields.length);
    assert.equal(
      fields.some((f) => ["video", "poster"].includes(f.path[0])),
      false,
    );
  }
});
test("section scopes preserve real page order and isolate price items and legal documents", async () => {
  const c = await import("../src/services/cms/catalog.ts");
  assert.equal(c.pages.length, manifest.routes.length);
  assert.equal(c.priceDocs.length, 6);
  assert.equal(
    c.priceDocs.reduce((n, d) => n + d.data.items.length, 0),
    69,
  );
  for (const page of c.pages)
    for (const section of page.sections)
      for (const part of section.parts) {
        assert.ok(c.findDoc(part.key), part.key);
        for (const lang of ["lv", "ru", "en"])
          assert.ok(
            c.visibleFields(c.findDoc(part.key), lang, part).length,
            `${page.path}/${section.id}/${part.key}`,
          );
      }
  const fields = c.visibleFields(c.findDoc("prices.2"), "en", {
    key: "prices.2",
    prefixes: ["items.1"],
  });
  assert.equal(fields.length, 2);
  assert.ok(fields.every((f) => f.path[0] === "items" && f.path[1] === "1"));
  for (const s of c
    .pageSections("/privatuma-politika")
    .filter((s) => s.id !== "seo"))
    for (const p of s.parts)
      assert.ok(
        c
          .visibleFields(c.findDoc(p.key), "en", p)
          .every((f) => f.path[1] === "privacy"),
      );
});
