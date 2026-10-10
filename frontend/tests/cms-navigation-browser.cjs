// Real browser lifecycle + URL regressions. Auth/CMS are intercepted; no production requests.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createCMSFixture } = require("./helpers/cms-fixture.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5196";
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: process.env.CMS_HEADFUL !== "1",
  });
  const errors = [];
  let checks = 0;
  const doctor = "/admin/doctors/clinic.doctorBio";
  const editable = (f) =>
    f.page.locator(".cms-field textarea:not([readonly])").first();
  async function ready(f, key) {
    await f.page
      .locator(`.cms-editor[data-document="${key}"]:visible`)
      .waitFor();
    await editable(f).waitFor();
  }
  try {
    for (const width of [390, 1440]) {
      const f = await createCMSFixture(browser, "en", width, errors);
      const p = f.page;
      await p.goto(BASE + "/admin/doctors");
      await p
        .locator(".cms-card")
        .filter({ hasText: "Dr. Anda Gutovska" })
        .getByRole("button", { name: f.t.edit, exact: true })
        .click();
      await ready(f, "clinic.doctorBio");
      assert.equal(new URL(p.url()).pathname, doctor);
      checks++;
      for (const lang of ["LV", "RU", "EN"]) {
        await p
          .locator(".cms-languages")
          .getByRole("button", { name: lang, exact: true })
          .click();
        await editable(f).fill("Synthetic " + lang + " preserved draft");
      }
      const other = await f.context.newPage();
      await other.goto(BASE + "/favicon.svg");
      await other.bringToFront();
      f.state.delay = 350;
      await f.rotate(other);
      await p.bringToFront();
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await ready(f, "clinic.doctorBio");
      assert.equal(new URL(p.url()).pathname, doctor);
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      checks += 2;
      // Same-token role refetch and page lifecycle suspension must not reload the draft.
      await p.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await ready(f, "clinic.doctorBio");
      const cdp = await f.context.newCDPSession(p);
      await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
      await cdp.send("Page.setWebLifecycleState", { state: "active" });
      if (process.env.CMS_HEADFUL === "1") {
        const { windowId } = await cdp.send("Browser.getWindowForTarget");
        await cdp.send("Browser.setWindowBounds", {
          windowId,
          bounds: { windowState: "minimized" },
        });
        await cdp.send("Browser.setWindowBounds", {
          windowId,
          bounds: { windowState: "normal" },
        });
      }
      await p.bringToFront();
      await ready(f, "clinic.doctorBio");
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      checks++;
      f.state.delay = 0;
      for (const lang of ["LV", "RU", "EN"]) {
        await p
          .locator(".cms-languages")
          .getByRole("button", { name: lang, exact: true })
          .click();
        assert.equal(
          await editable(f).inputValue(),
          "Synthetic " + lang + " preserved draft",
        );
        checks++;
      }
      await p.getByRole("button", { name: f.t.preview, exact: true }).click();
      assert.ok(
        (await p.locator(".cms-preview").innerText()).includes(
          "Synthetic EN preserved draft",
        ),
      );
      await p.getByRole("button", { name: f.t.preview, exact: true }).click();
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      checks++;
      // The interface language switch does not replace the independently selected editing language.
      await p
        .locator(".admin-languages")
        .getByRole("button", { name: "LV", exact: true })
        .click();
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      await p
        .locator(".admin-languages")
        .getByRole("button", { name: "EN", exact: true })
        .click();
      checks++;
      fs.mkdirSync("/tmp/ag-cms-navigation", { recursive: true });
      await p.screenshot({
        path: `/tmp/ag-cms-navigation/editor-${width}.png`,
        fullPage: true,
      });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      // Cancel client-side navigation and keep the complete draft.
      p.removeAllListeners("dialog");
      let warned = false;
      p.once("dialog", async (d) => {
        warned = true;
        await d.dismiss();
      });
      await p.getByRole("button", { name: f.t.back, exact: true }).click();
      assert.ok(warned);
      assert.equal(new URL(p.url()).pathname, doctor);
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      checks++;
      p.on("dialog", (d) => d.accept());
      await p.getByRole("button", { name: f.t.save, exact: true }).click();
      await p.getByText(f.t.saved, { exact: true }).waitFor();
      assert.equal(f.state.writes, 1);
      await p.reload();
      await ready(f, "clinic.doctorBio");
      assert.equal(
        await editable(f).inputValue(),
        "Synthetic EN preserved draft",
      );
      checks++;
      await p.getByRole("button", { name: f.t.back, exact: true }).click();
      await p.locator(".cms-search:visible").waitFor();
      await p.goBack();
      await ready(f, "clinic.doctorBio");
      await p.goForward();
      await p.locator(".cms-search:visible").waitFor();
      checks++;
      // Back from a different admin module returns to the exact editor URL.
      await p.goBack();
      await ready(f, "clinic.doctorBio");
      if (width < 1100) await p.locator(".admin-menu-button").click();
      await p
        .locator(width < 1100 ? ".admin-drawer" : ".admin-sidebar")
        .getByRole("link", { name: "News", exact: true })
        .click();
      await p.locator(".cms-search:visible").waitFor();
      if (width < 1100) await p.locator(".admin-menu-button").click();
      await p
        .locator(width < 1100 ? ".admin-drawer" : ".admin-sidebar")
        .locator('a[href="' + doctor + '"]')
        .click();
      await ready(f, "clinic.doctorBio");
      checks++;
      // Unavailable identity check hides/inerts the editor without discarding content; verified retry restores it.
      await editable(f).fill("Unsaved after API interruption");
      f.state.identityStatus = 503;
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await p.locator(".admin-access").waitFor();
      assert.equal(await p.locator(".cms-editor:visible").count(), 0);
      f.state.identityStatus = 200;
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await ready(f, "clinic.doctorBio");
      assert.equal(
        await editable(f).inputValue(),
        "Unsaved after API interruption",
      );
      checks++;
      f.state.role = "user";
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await p.locator(".admin-access").waitFor();
      await p.waitForTimeout(400);
      assert.equal(await p.locator(".cms-editor").count(), 0);
      assert.equal(f.state.writes, 1);
      checks++;
      await f.context.close();
    }
    const f = await createCMSFixture(browser, "en", 1440, errors),
      p = f.page;
    for (const path of [
      "/admin/doctors/unknown",
      "/admin/pages/home/hero",
      "/admin/pages/home/intro?part=messages.hero",
    ]) {
      await p.goto(BASE + path);
      await p.getByText(f.t.editorMissing, { exact: false }).waitFor();
      assert.equal(new URL(p.url()).pathname, new URL(BASE + path).pathname);
      assert.equal(await p.locator(".cms-editor").count(), 0);
      checks++;
    }
    f.state.deleted.add("clinic.doctorBio");
    await p.goto(BASE + doctor);
    await p.getByText(f.t.editorMissing, { exact: false }).waitFor();
    assert.equal(await p.locator(".cms-editor").count(), 0);
    checks++;
    f.state.deleted.clear();
    f.state.cmsOutage = true;
    await p.reload();
    await p.locator(".cms-error").waitFor();
    assert.ok(
      await p.getByRole("button", { name: f.t.save, exact: true }).isDisabled(),
    );
    checks++;
    f.state.cmsOutage = false;
    await p.getByRole("button", { name: f.t.reload, exact: true }).click();
    await ready(f, "clinic.doctorBio");
    checks++;
    // Every editor destination category supports direct load and refresh, including scoped parts.
    for (const [path, key] of [
      ["/admin/services/service.konsultacija", "service.konsultacija"],
      ["/admin/services/prices.0/items/0", "prices.0"],
      ["/admin/pages/par-mums/about?part=clinic.about", "clinic.about"],
      ["/admin/news/news.zobu-higiena", "news.zobu-higiena"],
      ["/admin/settings/hours", "settings.hours"],
    ]) {
      await p.goto(BASE + path);
      await p.locator(`.cms-editor[data-document="${key}"]:visible`).waitFor();
      await p.reload();
      await p.locator(`.cms-editor[data-document="${key}"]:visible`).waitFor();
      assert.ok(p.url().endsWith(path));
      checks++;
    }
    await p.goto(BASE + "/admin/seo");
    await p
      .locator(".cms-card")
      .first()
      .locator(".cms-card-actions button")
      .first()
      .click();
    const seo = p.url();
    assert.notEqual(new URL(seo).pathname, "/admin/seo");
    await p.reload();
    await p.locator(".cms-editor:visible").waitFor();
    assert.equal(p.url(), seo);
    checks++;
    assert.equal(f.state.writes, 0);
    await f.context.close();
    // Guest and expired-session recovery retain the complete internal URL, including a scoped part.
    const g = await createCMSFixture(browser, "en", 1440, errors, false),
      q = g.page;
    const deep = "/admin/pages/par-mums/about?part=clinic.about";
    async function login() {
      await q.locator("#auth-email").fill("cms@example.invalid");
      await q.locator("#auth-password").fill("synthetic-password");
      await q.locator(".auth-submit").click();
      await q
        .locator('.cms-editor[data-document="clinic.about"]:visible')
        .waitFor();
      assert.ok(q.url().endsWith(deep));
    }
    await q.goto(BASE + deep);
    await q.waitForURL(
      (u) => u.pathname === "/login" && u.searchParams.get("returnTo") === deep,
    );
    await login();
    checks++;
    await editable(g).fill("Never retained after access expires");
    g.state.identityStatus = 401;
    await q.evaluate(() => window.dispatchEvent(new Event("focus")));
    await q.locator('.admin-access a[href^="/login?"]').waitFor();
    assert.equal(await q.locator(".cms-editor").count(), 0);
    g.state.identityStatus = 200;
    await q.locator('.admin-access a[href^="/login?"]').click();
    await login();
    assert.notEqual(
      await editable(g).inputValue(),
      "Never retained after access expires",
    );
    checks++;
    await editable(g).fill("Never retained after logout");
    await q.locator(".admin-account button").click();
    await q.waitForURL((u) => u.pathname === "/login");
    assert.equal(await q.locator(".cms-editor").count(), 0);
    await q.goto(BASE + deep);
    await q.waitForURL(
      (u) => u.pathname === "/login" && u.searchParams.get("returnTo") === deep,
    );
    await login();
    assert.notEqual(
      await editable(g).inputValue(),
      "Never retained after logout",
    );
    assert.equal(g.state.writes, 0);
    checks++;
    await g.context.close();
    assert.deepEqual(errors, []);
    console.log(
      `CMS navigation: ${checks} checks passed; production requests: 0; all writes intercepted.`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
