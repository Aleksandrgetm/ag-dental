const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createCMSFixture } = require("./helpers/cms-fixture.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5196";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const { mediaMessages } = await import("../src/i18n/media.ts");
  const { cmsMessages } = await import("../src/i18n/cms.ts");
  let checks = 0;
  const errors = [];
  fs.mkdirSync("/tmp/ag-media-browser", { recursive: true });
  try {
    for (const locale of process.argv.includes("--flows-only")
      ? []
      : ["lv", "ru", "en"])
      for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
        const f = await createCMSFixture(browser, locale, width, errors);
        f.state.uploadEnabled = true;
        await f.page.goto(BASE + "/admin/media");
        await f.page.locator(".media-tile").first().waitFor();
        assert.equal(await f.page.locator(".media-tile").count(), 12);
        assert.equal(
          await f.page.locator('img[src*="tour-poster"],video').count(),
          0,
        );
        await f.page.locator(".media-filters input").fill("anda");
        assert.equal(await f.page.locator(".media-tile").count(), 1);
        await f.page.locator(".media-filters input").fill("");
        await f.page
          .locator(".media-filters select")
          .nth(0)
          .selectOption("video");
        assert.equal(await f.page.locator(".media-tile").count(), 1);
        await f.page.locator(".media-tile").click();
        assert.ok(
          (await f.page.locator(".media-detail").innerText()).includes(
            mediaMessages[locale].protectedNote,
          ),
        );
        assert.equal(
          await f.page.locator(".media-detail img,.media-detail video").count(),
          0,
        );
        assert.equal(
          await f.page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        checks++;
        if ([390, 1440].includes(width)) {
          await f.page
            .getByRole("button", {
              name: mediaMessages[locale].back,
              exact: true,
            })
            .click();
          await f.page.locator(".media-filters select").nth(0).selectOption("");
          await f.page.screenshot({
            path: `/tmp/ag-media-browser/${locale}-${width}-library.png`,
            fullPage: true,
          });
        }
        await f.context.close();
      }
    const f = await createCMSFixture(browser, "en", 1440, errors);
    f.state.uploadEnabled = true;
    const p = f.page,
      t = mediaMessages.en,
      c = cmsMessages.en;
    await p.goto(BASE + "/admin/media");
    await p.locator(".media-upload summary").waitFor();
    for (const row of f.state.mediaRows) {
      await p.locator(`[data-media-id="${row.id}"]`).click();
      await p
        .locator(".media-detail h3")
        .filter({ hasText: row.metadata.filename })
        .waitFor();
      if (row.protected)
        assert.equal(
          await p.locator(".media-detail img,.media-detail video").count(),
          0,
        );
      checks++;
    }
    await p.getByRole("button", { name: t.back, exact: true }).click();
    await p.locator(".media-upload summary").click();
    const file = {
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9sAAAAASUVORK5CYII=",
        "base64",
      ),
    };
    await p
      .locator("input[type=file]")
      .setInputFiles({ ...file, name: "bad.svg" });
    await p.getByText(t.invalid_file, { exact: false }).waitFor();
    assert.equal(f.state.uploadKeys.length, 0);
    checks++;
    await p.locator("input[type=file]").setInputFiles(file);
    for (const lang of ["lv", "ru", "en"])
      await p
        .locator(`textarea[lang="${lang}"]`)
        .fill("Synthetic " + lang + " image");
    await p.screenshot({
      path: "/tmp/ag-media-browser/en-1440-upload.png",
      fullPage: true,
    });
    f.state.uploadStatus = 503;
    await p.getByRole("button", { name: t.start, exact: true }).click();
    await p.getByText(t.media_unavailable, { exact: false }).waitFor();
    assert.equal(f.state.mediaRows.length, 12);
    checks++;
    f.state.uploadStatus = 200;
    f.state.uploadDelay = 700;
    await p.getByRole("button", { name: t.retry, exact: true }).click();
    await p.locator("progress").waitFor();
    await p.getByText(t.ready, { exact: true }).waitFor();
    assert.equal(f.state.uploadKeys[0], f.state.uploadKeys[1]);
    assert.equal(f.state.mediaRows.length, 13);
    const asset = f.state.mediaRows.at(-1);
    await p.waitForURL(BASE + "/admin/media/" + asset.id);
    checks++;
    await p.goto(BASE + "/admin/services/service.konsultacija");
    await p.getByRole("button", { name: t.replace, exact: true }).click();
    await p.locator(`.cms-media-picker [data-media-id="${asset.id}"]`).click();
    await p.getByRole("button", { name: t.select, exact: true }).click();
    assert.equal(await p.locator(".cms-media-picker[open]").count(), 0);
    await p.getByRole("button", { name: c.preview, exact: true }).click();
    await p.locator('.cms-preview img[src^="blob:"]').waitFor();
    await p.getByRole("button", { name: c.preview, exact: true }).click();
    await p.getByRole("button", { name: c.save, exact: true }).click();
    await p.getByText(c.saved, { exact: true }).waitFor();
    assert.equal(f.state.mediaRows.at(-1).published_at, undefined);
    checks++;
    await p.getByRole("button", { name: c.publish, exact: true }).click();
    await p.getByText(c.done, { exact: true }).waitFor();
    assert.ok(f.state.mediaRows.at(-1).published_at);
    checks++;
    const pub = await f.context.newPage();
    await pub.goto(BASE + "/pakalpojumi/konsultacija");
    await pub.waitForFunction(() =>
      document.querySelector("img")?.src.includes("/api/cms/media/upload."),
    );
    assert.ok(
      (await pub.locator("img").first().getAttribute("alt")).includes(
        "Synthetic en image",
      ),
    );
    await pub.close();
    checks++;
    await p.locator(".cms-history summary").click();
    await p
      .getByRole("button", { name: c.restore, exact: true })
      .last()
      .click();
    await p.getByText(c.done, { exact: true }).waitFor();
    assert.ok(
      !JSON.stringify(
        f.state.rows
          .get("service.konsultacija")
          .revisions.find(
            (r) =>
              r.id ===
              f.state.rows.get("service.konsultacija").document
                .published_revision,
          ).payload,
      ).includes(asset.url),
    );
    checks++;
    await p.goto(BASE + "/admin/media/" + asset.id);
    await p.locator(".media-detail").waitFor();
    assert.equal(
      await p.getByRole("button", { name: t.archive, exact: true }).count(),
      0,
    );
    checks++;
    await f.context.close();
    const cancel = await createCMSFixture(browser, "en", 390, errors);
    cancel.state.uploadEnabled = true;
    cancel.state.uploadDelay = 700;
    cancel.state.uploadStatus = 503;
    await cancel.page.goto(BASE + "/admin/media");
    await cancel.page.locator(".media-upload summary").click();
    await cancel.page.locator("input[type=file]").setInputFiles(file);
    for (const lang of ["lv", "ru", "en"])
      await cancel.page
        .locator(`textarea[lang="${lang}"]`)
        .fill("Synthetic cancellation fixture");
    await cancel.page
      .getByRole("button", { name: t.start, exact: true })
      .click();
    await cancel.page
      .getByRole("button", { name: t.cancel, exact: true })
      .click();
    await cancel.page.getByText(t.cancelled, { exact: false }).waitFor();
    assert.equal(
      await cancel.page.getByText(t.ready, { exact: true }).count(),
      0,
    );
    await cancel.page.waitForTimeout(800);
    await cancel.context.close();
    checks++;
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        mediaChecks: checks,
        productionRequests: 0,
        screenshots: "/tmp/ag-media-browser",
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
