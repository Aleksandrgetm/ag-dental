import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaID, publicMediaURL } from "../src/services/cms/mediaReference.ts";
import {
  filterMedia,
  selectableMedia,
  checkFile,
} from "../src/services/cms/mediaModel.ts";
import { mediaMessages } from "../src/i18n/media.ts";
test("media references only create fixed API delivery paths, never arbitrary Storage URLs", () => {
  const value = "cms-media:upload." + "a".repeat(32);
  assert.equal(mediaID(value), "upload." + "a".repeat(32));
  assert.equal(
    publicMediaURL("/api", value),
    "/api/cms/media/upload." + "a".repeat(32) + "/display.webp",
  );
  for (const v of [
    "cms-media:../../x",
    "https://evil.invalid/x",
    "cms-media:media.hero",
    "cms-media:upload." + "a".repeat(33),
  ])
    assert.equal(mediaID(v), null);
  assert.equal(publicMediaURL(undefined, value), undefined);
  assert.equal(publicMediaURL("/api", value, "original.png"), undefined);
});
test("media filters and picker refuse protected, archived, video and unsupported legacy assets", () => {
  const asset = {
    id: "x",
    url: "/media/clinic/photo.jpg",
    state: "ready",
    origin: "registered",
    protected: false,
    usages: [],
    metadata: { filename: "Photo.JPG", kind: "image", bytes: 10 },
  };
  assert.equal(selectableMedia(asset), true);
  for (const change of [
    { protected: true },
    { state: "archived" },
    { metadata: { ...asset.metadata, kind: "video" } },
    { url: "/favicon.svg" },
  ])
    assert.equal(selectableMedia({ ...asset, ...change }), false);
  assert.equal(
    filterMedia([asset], "photo", "image", "unused", "registered").length,
    1,
  );
  assert.equal(filterMedia([asset], "photo", "video", "", "").length, 0);
  assert.equal(filterMedia([asset], "", "image", "used", "").length, 0);
});
test("client file precheck is bounded but never substitutes for server signature verification", () => {
  assert.equal(checkFile({ name: "photo.png", size: 1024 }), null);
  assert.equal(checkFile({ name: "clip.mp4", size: 31 * 1024 * 1024 }), null);
  for (const file of [
    { name: "bad.svg", size: 20 },
    { name: "bad.exe", size: 20 },
    { name: "bad.jpg", size: 0 },
    { name: "huge.png", size: 13 * 1024 * 1024 },
    { name: "huge.mp4", size: 33 * 1024 * 1024 },
  ])
    assert.equal(checkFile(file), "invalid_file");
});
for (const locale of ["lv", "ru", "en"])
  test(locale + ": media translations cover all controls and errors", () => {
    assert.deepEqual(
      Object.keys(mediaMessages[locale]).sort(),
      Object.keys(mediaMessages.en).sort(),
    );
    for (const value of Object.values(mediaMessages[locale]))
      assert.ok(value.trim());
  });
