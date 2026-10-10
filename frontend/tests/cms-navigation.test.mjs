import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cmsDestinations,
  cmsDestination,
  cmsSelection,
} from "../src/services/cms/navigation.ts";
import { findDoc } from "../src/services/cms/catalog.ts";
import { safeAdminReturn } from "../src/services/admin/access.ts";
test("CMS identities round-trip through unique internal editor URLs and part scopes", () => {
  assert.equal(
    new Set(cmsDestinations.map((d) => d.path)).size,
    cmsDestinations.length,
  );
  for (const entry of cmsDestinations) {
    assert.equal(cmsDestination(entry.path), entry);
    assert.equal(safeAdminReturn(entry.path), entry.path);
    for (const part of entry.section?.parts || []) {
      assert.ok(findDoc(part.key));
      assert.deepEqual(cmsSelection(entry.path, part.key).part, part);
      const url = entry.path + "?part=" + encodeURIComponent(part.key);
      assert.equal(safeAdminReturn(url), url);
      assert.equal(findDoc(part.key).system_managed, false);
    }
  }
  assert.equal(
    cmsSelection("/admin/doctors/clinic.doctorBio", null).part.key,
    "clinic.doctorBio",
  );
  assert.deepEqual(
    cmsSelection("/admin/services/prices.0/items/1", null).part,
    { key: "prices.0", prefixes: ["items.1"] },
  );
  assert.equal(
    cmsSelection("/admin/pages/home/intro", null).section.id,
    "intro",
  );
});
test("missing, deleted-registry, cross-scope and system-managed destinations never fall back to another editor", () => {
  for (const path of [
    "/admin/doctors/unknown",
    "/admin/pages/home/hero",
    "/admin/pages/home/welcome",
    "/admin/doctors/messages.hero",
  ])
    assert.equal(cmsSelection(path, null), null);
  assert.equal(cmsSelection("/admin/pages/home/intro", "messages.hero"), null);
  assert.equal(
    cmsSelection("/admin/pages/home/intro", ["messages.home"]),
    null,
  );
});
test("deep admin return URLs stay internal and reject traversal, external redirects and unknown query options", () => {
  for (const url of [
    "/admin/doctors/%00",
    "/admin/doctors/%252e%252e/login",
    "/admin/doctors/../login",
    "/admin/doctors/%2e%2e/login",
    "/admin/doctors/%2F%2Fevil.invalid",
    "/admin/doctors/clinic.doctorBio?returnTo=https://evil.invalid",
    "/admin/doctors/clinic.doctorBio?part=clinic.doctorBio&part=messages.hero",
    "/admin/doctors/clinic.doctorBio#https://evil.invalid",
  ])
    assert.equal(safeAdminReturn(url), null);
});
