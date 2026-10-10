// Local-only contract tests; intercepted Auth/CMS, no Supabase writes or external requests.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const manifest = require("../../backend/internal/cms/content.json");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5185";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local preview required");
const clone = (v) => JSON.parse(JSON.stringify(v));
const ordered = (v) =>
  Array.isArray(v)
    ? v.map(ordered)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, ordered(v[k])]),
        )
      : v;
const id = "11111111-1111-4111-8111-111111111111",
  b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "cms@example.invalid",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { role: "admin" },
  identities: [],
  created_at: new Date().toISOString(),
};
const session = {
  access_token: `${b64({ alg: "ES256" })}.${b64({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.${b64("synthetic")}`,
  refresh_token: "test-refresh",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user,
};
(async () => {
  const { mediaMessages } = await import("../src/i18n/media.ts");
  const { cmsMessages } = await import("../src/i18n/cms.ts");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  let checks = 0;
  async function setup(locale = "en", width = 1440) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const state = {
      role: "admin",
      outage: false,
      empty: false,
      conflict: false,
      delay: 0,
      writes: 0,
      rows: new Map(
        manifest.documents.map((d, i) => {
          const revision = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
          return [
            d.key,
            {
              document: {
                key: d.key,
                version: 1,
                draft_revision: revision,
                published_revision: revision,
              },
              revisions: [
                {
                  id: revision,
                  payload: ordered(d.data),
                  created_at: new Date().toISOString(),
                  published_at: new Date().toISOString(),
                },
              ],
            },
          ];
        }),
      ),
    };
    await context.addInitScript(
      ({ locale, session }) => {
        localStorage.setItem("ag-language", locale);
        localStorage.setItem(
          "ag-cookie-consent",
          JSON.stringify({
            version: 2,
            necessary: true,
            preferences: true,
            maps: false,
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString(),
          }),
        );
        sessionStorage.setItem("ag-welcome-seen", "1");
        localStorage.setItem(
          "sb-integration-test-auth-token",
          JSON.stringify(session),
        );
      },
      { locale, session },
    );
    await context.route("**/*", async (route) => {
      const req = route.request(),
        u = new URL(req.url());
      if (u.origin === new URL(BASE).origin && !u.pathname.startsWith("/api/"))
        return route.continue();
      if (u.hostname === "integration-test.supabase.co")
        return route.fulfill({
          json: u.pathname.endsWith("/user") ? user : session,
        });
      assert.equal(
        u.origin,
        new URL(BASE).origin,
        "unexpected external request",
      );
      if (u.pathname === "/api/health")
        return route.fulfill({ json: { status: "ok" } });
      if (u.pathname === "/api/auth/me") {
        if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
        return route.fulfill({
          json: { id, role: state.role, email: user.email },
        });
      }
      if (u.pathname === "/api/cms/published") {
        if (state.outage)
          return route.fulfill({ status: 503, json: { error: "unavailable" } });
        return route.fulfill({
          json: {
            schema_version: 1,
            documents: state.empty
              ? []
              : [...state.rows.values()].map((r) => ({
                  key: r.document.key,
                  revision: r.document.published_revision,
                  payload: r.revisions.find(
                    (v) => v.id === r.document.published_revision,
                  ).payload,
                })),
          },
        });
      }
      if (u.pathname === "/api/admin/cms/media")
        return route.fulfill({
          status: 503,
          json: { error: "media_unavailable" },
        });
      if (u.pathname.startsWith("/api/admin/cms/documents")) {
        assert.equal(
          req.headers().authorization,
          `Bearer ${session.access_token}`,
        );
        if (state.role !== "admin")
          return route.fulfill({ status: 403, json: { error: "forbidden" } });
        const parts = u.pathname.split("/").filter(Boolean),
          key = decodeURIComponent(parts[4] || ""),
          action = parts[5];
        if (!key)
          return route.fulfill({
            json: {
              documents: [...state.rows.values()]
                .filter(
                  (r) =>
                    !manifest.documents.find((d) => d.key === r.document.key)
                      .system_managed,
                )
                .map((r) => r.document),
            },
          });
        const row = state.rows.get(key);
        assert.ok(row);
        assert.equal(
          manifest.documents.find((d) => d.key === key).system_managed,
          false,
          "system-managed request",
        );
        if (req.method() === "GET") return route.fulfill({ json: row });
        state.writes++;
        const body = req.postDataJSON();
        if (state.conflict || body.expected_version !== row.document.version) {
          state.conflict = false;
          return route.fulfill({
            status: 409,
            json: { error: "content_conflict" },
          });
        }
        if (action === "draft") {
          assert.equal(req.method(), "PUT");
          const rev = crypto.randomUUID();
          row.revisions.unshift({
            id: rev,
            payload: body.payload,
            created_at: new Date().toISOString(),
            published_at: null,
          });
          row.document.draft_revision = rev;
        } else {
          assert.equal(req.method(), "POST");
          const rev = row.revisions.find((r) => r.id === body.revision_id);
          assert.ok(rev);
          rev.published_at = new Date().toISOString();
          row.document.published_revision = rev.id;
          row.document.draft_revision = rev.id;
        }
        row.document.version++;
        return route.fulfill({ json: row.document });
      }
      throw Error("Unexpected API " + u.pathname);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "warning" && /Vue warn|intlify/.test(m.text()))
        errors.push(m.text());
    });
    page.on("dialog", (d) => d.accept());
    return { context, page, state, t: cmsMessages[locale], locale };
  }
  try {
    // Every CMS section, all languages, desktop/mobile. No technical editor representation.
    for (const lang of ["lv", "ru", "en"])
      for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
        const f = await setup(lang, width);
        for (const group of [
          "pages",
          "services",
          "doctors",
          "news",
          "media",
          "seo",
          "settings",
        ]) {
          await f.page.goto(BASE + "/admin/" + group);
          await f.page.locator(".cms-search").waitFor();
          assert.ok(
            (await f.page
              .locator(".cms-navigator button, .media-library button")
              .count()) > 0,
          );
          assert.equal(
            await f.page
              .locator(
                ".cms-navigator video, .cms-navigator iframe, .media-library video",
              )
              .count(),
            0,
          );
          assert.equal(await f.page.locator("pre,code").count(), 0);
          assert.equal(
            await f.page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${group}/${lang}/${width}`,
          );
          checks++;
        }
        if (lang === "en" && [390, 1440].includes(width)) {
          fs.mkdirSync("/tmp/ag-cms-browser", { recursive: true });
          await f.page.screenshot({
            path: `/tmp/ag-cms-browser/settings-${width}.png`,
            fullPage: true,
          });
        }
        await f.context.close();
      }
    async function openPageSection(f, path, section, preview = false) {
      await f.page
        .locator(`[data-page="${path}"]`)
        .getByRole("button", { name: f.t.edit, exact: true })
        .click();
      await f.page
        .locator(`[data-section="${section}"]`)
        .getByRole("button", {
          name: preview ? f.t.preview : f.t.edit,
          exact: true,
        })
        .click();
      await f.page.locator(".cms-editor").waitFor();
    }
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
      const picker = await setup("en", width);
      await picker.page.goto(BASE + "/admin/pages");
      await picker.page
        .locator('[data-page="/"]')
        .getByRole("button", { name: picker.t.edit, exact: true })
        .click();
      assert.equal(
        await picker.page
          .locator("[data-section]")
          .first()
          .getAttribute("data-section"),
        "intro",
      );
      assert.equal(
        await picker.page
          .locator(
            '[data-section="hero"], [data-section="welcome"], video, iframe',
          )
          .count(),
        0,
      );
      assert.equal(await picker.page.locator("[data-section]").count(), 10); // Ten actual sections; search appearance is separate.
      await picker.page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll("[role=status]")).some((el) =>
            el.textContent.includes("Loading preview"),
          ),
      );
      if ([390, 1440].includes(width))
        await picker.page
          .locator(".cms-navigator img")
          .evaluateAll(async (images) => {
            await Promise.all(
              images.map((img) => {
                img.loading = "eager";
                return img.decode().catch(() => {});
              }),
            );
          });
      if ([390, 1440].includes(width))
        await picker.page.screenshot({
          path: `/tmp/ag-cms-browser/home-sections-${width}.png`,
          fullPage: true,
        });
      await picker.page
        .locator('[data-section="intro"]')
        .getByRole("button", { name: picker.t.edit, exact: true })
        .click();
      await picker.page.locator(".cms-field textarea").first().waitFor();
      assert.equal(await picker.page.locator(".cms-field textarea").count(), 3);
      assert.equal(
        await picker.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await picker.page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll("[role=status]")).some((el) =>
            el.textContent.includes("Loading preview"),
          ),
      );
      if ([390, 1440].includes(width))
        await picker.page.screenshot({
          path: `/tmp/ag-cms-browser/editor-${width}.png`,
          fullPage: true,
        });
      await picker.page
        .getByRole("button", { name: picker.t.back, exact: true })
        .click();
      await picker.page
        .getByRole("button", { name: picker.t.outline, exact: true })
        .click();
      await picker.page.locator(".cms-outline").waitFor();
      assert.equal(
        await picker.page
          .locator(
            'video,iframe,img[src*="tour-poster"],img[src*="clinic-tour"]',
          )
          .count(),
        0,
      );
      assert.ok(
        !(await picker.page.locator(".cms-outline").innerText()).includes(
          "Rūpes par",
        ),
      );
      assert.equal(
        await picker.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await picker.context.close();
      checks += 3;
    }
    const formCheck = await setup();
    await formCheck.page.goto(BASE + "/admin/pages");
    await openPageSection(formCheck, "/kontakti", "form");
    await formCheck.page.locator(".cms-field textarea").first().waitFor();
    assert.equal(
      await formCheck.page.locator(".cms-fields input[type=email]").count(),
      0,
    );
    assert.ok(
      await formCheck.page.locator("form").evaluate((el) => el.checkValidity()),
    );
    await formCheck.page.goto(BASE + "/admin/services");
    await formCheck.page.locator("[data-category]").first().waitFor();
    assert.equal(await formCheck.page.locator("[data-category]").count(), 6);
    await formCheck.page
      .locator('[data-category="prices.0"]')
      .getByRole("button", { name: formCheck.t.edit, exact: true })
      .click();
    await formCheck.page
      .locator('[data-item="0"]')
      .getByRole("button", { name: formCheck.t.edit, exact: true })
      .click();
    await formCheck.page.locator(".cms-field textarea").waitFor();
    assert.equal(await formCheck.page.locator(".cms-field").count(), 2);
    assert.ok(
      await formCheck.page.locator("form").evaluate((el) => el.checkValidity()),
    );
    const beforeItems = clone(
      formCheck.state.rows.get("prices.0").revisions[0].payload.items,
    );
    await formCheck.page.locator(".cms-field input").fill("52.00");
    await formCheck.page
      .getByRole("button", { name: formCheck.t.save, exact: true })
      .click();
    await formCheck.page
      .getByText(formCheck.t.saved, { exact: true })
      .waitFor();
    const afterItems =
      formCheck.state.rows.get("prices.0").revisions[0].payload.items;
    assert.equal(afterItems[0].price, "52.00");
    assert.deepEqual(afterItems.slice(1), beforeItems.slice(1));
    checks += 2;
    await formCheck.page.goto(BASE + "/admin/news");
    await formCheck.page.locator("[data-article]").first().waitFor();
    assert.equal(await formCheck.page.locator("[data-article]").count(), 4);
    await formCheck.page
      .locator("[data-article]")
      .first()
      .getByRole("button", { name: formCheck.t.edit, exact: true })
      .click();
    await formCheck.page
      .getByRole("button", { name: mediaMessages.en.replace, exact: true })
      .click();
    await formCheck.page
      .locator('.cms-media-picker [data-media-id="media.d01fde275cd62850"]')
      .click();
    await formCheck.page
      .getByRole("button", { name: mediaMessages.en.select, exact: true })
      .click();
    assert.ok(
      (
        await formCheck.page.locator(".cms-field-image").getAttribute("src")
      ).endsWith("tour-room.jpg"),
    );
    assert.equal(
      await formCheck.page.locator(".cms-media-picker[open]").count(),
      0,
    );
    await formCheck.page
      .getByRole("button", { name: formCheck.t.preview, exact: true })
      .click();
    assert.ok(
      (
        await formCheck.page.locator(".cms-preview img").getAttribute("src")
      ).endsWith("tour-room.jpg"),
    );
    for (const lang of ["LV", "RU", "EN"]) {
      await formCheck.page
        .locator(".cms-languages")
        .getByRole("button", { name: lang, exact: true })
        .click();
      assert.ok(
        (await formCheck.page.locator(".cms-preview").innerText()).length > 100,
      );
    }
    await formCheck.page.goto(BASE + "/admin/media");
    await formCheck.page.locator(".cms-media-tile").first().waitFor();
    assert.equal(await formCheck.page.locator(".cms-media-tile").count(), 12);
    assert.equal(
      await formCheck.page.locator('video,img[src*="tour-poster"]').count(),
      0,
    );
    await formCheck.page
      .getByRole("button", {
        name: mediaMessages.en.details + ": clinic-tour.mp4",
        exact: true,
      })
      .click();
    assert.ok(
      (await formCheck.page.locator(".cms-media-detail").innerText()).includes(
        mediaMessages.en.protectedNote,
      ),
    );
    assert.equal(
      await formCheck.page
        .locator(".cms-media-detail video,.cms-media-detail img")
        .count(),
      0,
    );
    checks += 4;
    await formCheck.context.close();
    const f = await setup();
    await f.page.goto(BASE + "/admin/pages");
    await f.page.locator(".cms-search").waitFor();
    await openPageSection(f, "/par-mums", "about");
    await f.page
      .locator(".cms-parts button")
      .filter({ hasText: "About the clinic" })
      .click();
    await f.page.locator(".cms-field textarea:not([readonly])").waitFor();
    const field = f.page.locator(".cms-field textarea:not([readonly])").first(),
      draft = "Synthetic CMS browser draft — never sent to Supabase.";
    await field.fill(draft);
    await f.page
      .getByRole("button", { name: f.t.preview, exact: true })
      .click();
    assert.ok(
      (await f.page.locator(".cms-preview").innerText()).includes(draft),
    );
    await f.page
      .getByRole("button", { name: f.t.preview, exact: true })
      .click();
    // Same-token, same-page role recheck hides private UI and preserves an unsaved draft.
    f.state.delay = 300;
    await f.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await f.page.locator(".admin-access").waitFor();
    await f.page.locator(".cms-editor").waitFor();
    assert.equal(await field.inputValue(), draft);
    f.state.delay = 0;
    checks++;
    await f.page.getByRole("button", { name: f.t.save, exact: true }).click();
    await f.page.getByText(f.t.saved, { exact: true }).waitFor();
    const pub = await f.context.newPage();
    await pub.goto(BASE + "/par-mums");
    await pub.locator("#main h1").waitFor();
    assert.ok(!(await pub.locator("#main").innerText()).includes(draft));
    checks++;
    await f.page
      .getByRole("button", { name: f.t.publish, exact: true })
      .click();
    await f.page.getByText(f.t.done, { exact: true }).waitFor();
    await pub.reload();
    await pub.waitForTimeout(300);
    await pub.getByText(draft, { exact: true }).first().waitFor();
    checks++;
    // A transient outage cannot replace the last valid publication with bundled copy.
    f.state.outage = true;
    await pub.evaluate(() => window.dispatchEvent(new Event("focus")));
    await pub.waitForTimeout(150);
    assert.ok((await pub.locator("#main").innerText()).includes(draft));
    f.state.outage = false;
    checks++;
    await f.page.locator(".cms-history summary").click();
    await f.page
      .getByRole("button", { name: f.t.revisionPreview })
      .last()
      .click();
    assert.ok(
      !(await f.page.locator(".cms-preview").innerText()).includes(draft),
    );
    await f.page
      .getByRole("button", { name: f.t.restore, exact: true })
      .click();
    await f.page.getByText(f.t.done, { exact: true }).waitFor();
    await pub.reload();
    await pub.locator("#main h1").waitFor();
    assert.ok(!(await pub.locator("#main").innerText()).includes(draft));
    checks++;
    await field.fill("Local unsaved conflicting edit");
    f.state.conflict = true;
    await f.page.getByRole("button", { name: f.t.save, exact: true }).click();
    await f.page.locator(".cms-error").waitFor();
    assert.equal(await field.inputValue(), "Local unsaved conflicting edit");
    checks++;
    f.page.removeAllListeners("dialog");
    let sawWarning = false;
    f.page.once("dialog", async (dialog) => {
      sawWarning = true;
      await dialog.dismiss();
    });
    await f.page.getByRole("button", { name: f.t.back, exact: true }).click();
    assert.ok(sawWarning);
    assert.equal(await field.inputValue(), "Local unsaved conflicting edit");
    f.page.on("dialog", (d) => d.accept());
    checks++;
    f.state.role = "user";
    await f.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await f.page.locator(".admin-access").waitFor();
    await f.page.waitForTimeout(150);
    assert.equal(await f.page.locator(".cms-editor").count(), 0);
    checks++;
    await f.context.close();
    // JSONB key ordering + baseline publications preserve public text exactly.
    const baseline = await setup();
    for (const path of [
      "/",
      "/cenas",
      "/par-mums",
      "/jaunumi",
      "/privatuma-politika",
      "/sikdatnu-politika",
    ]) {
      baseline.state.empty = true;
      await baseline.page.goto(BASE + path);
      await baseline.page.locator("#main h1").waitFor();
      const approved = (await baseline.page.locator("#main").innerText())
        .replace(/\s+/g, " ")
        .trim();
      baseline.state.empty = false;
      await baseline.page.reload();
      await baseline.page.locator("#main h1").waitFor();
      await baseline.page.waitForTimeout(150);
      assert.equal(
        (await baseline.page.locator("#main").innerText())
          .replace(/\s+/g, " ")
          .trim(),
        approved,
        path + " baseline publication changed content",
      );
      checks++;
    }
    const price = baseline.state.rows.get("prices.0");
    price.revisions[0].payload.items[0].price = "61.00";
    const seoKey = manifest.documents.find(
      (d) => d.target === "seo" && d.path[0] === "/cenas",
    ).key;
    baseline.state.rows.get(seoKey).revisions[0].payload.en.title =
      "Synthetic CMS SEO test";
    await baseline.page.goto(BASE + "/cenas");
    await baseline.page.waitForFunction(
      () => document.title === "Synthetic CMS SEO test",
    );
    assert.ok(
      (await baseline.page.locator("#main").innerText()).includes("61"),
    );
    await baseline.page.goto(BASE + "/");
    await baseline.page.locator(".preview-amount").first().waitFor();
    await baseline.page.waitForTimeout(100);
    assert.equal(
      (
        await baseline.page.locator(".preview-amount").first().innerText()
      ).replace(/\s/g, ""),
      "61€",
    );
    checks++;
    const hours = baseline.state.rows.get("settings.hours");
    hours.revisions[0].payload.text = "10:00–17:00";
    await baseline.page.goto(BASE + "/kontakti");
    await baseline.page.locator("#main h1").waitFor();
    await baseline.page.waitForTimeout(150);
    assert.ok(
      (await baseline.page.locator(".site-footer").innerText()).includes(
        "10:00–17:00",
      ),
    );
    checks++;
    await baseline.context.close();
    assert.deepEqual(errors, []);
    console.log(
      `CMS browser: ${checks} checks passed; real Supabase requests: 0.`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
