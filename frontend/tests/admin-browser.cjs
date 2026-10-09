// Synthetic sessions and intercepted APIs only. Never target a deployed site.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { tmpdir } = require("node:os");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5184";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local server required");
const OUT = `${tmpdir()}/ag-admin-browser`;
fs.mkdirSync(OUT, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "admin-test@example.invalid",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { role: "admin" },
  identities: [],
  created_at: new Date().toISOString(),
};
const session = {
  access_token:
    b64({ alg: "ES256", typ: "JWT" }) +
    "." +
    b64({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }) +
    "." +
    b64("test-signature"),
  refresh_token: "test-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user,
};
(async () => {
  const { adminMessages } = await import("../src/i18n/admin.ts");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  let checks = 0;
  async function setup({
    role = "admin",
    signedIn = true,
    width = 1440,
    locale = "en",
    delay = 0,
    path = "/admin",
    mode = "empty",
  } = {}) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const control = {
      role,
      delay,
      mode,
      requests: [],
      external: [],
      refreshes: 0,
    };
    await context.addInitScript(
      ({ session, signedIn, locale }) => {
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
        localStorage.setItem("ag-language", locale);
        sessionStorage.setItem("ag-welcome-seen", "1");
        // A forged role in metadata/storage must not grant access.
        localStorage.setItem("role", "admin");
        if (signedIn)
          localStorage.setItem(
            "sb-integration-test-auth-token",
            JSON.stringify(session),
          );
      },
      { session, signedIn, locale },
    );
    await context.route("**/*", async (route) => {
      const req = route.request(),
        u = new URL(req.url());
      if (u.origin === new URL(BASE).origin && !u.pathname.startsWith("/api/"))
        return route.continue();
      if (
        u.hostname === "integration-test.supabase.co" &&
        u.pathname.startsWith("/auth/v1/")
      ) {
        if (u.pathname.endsWith("/logout"))
          return route.fulfill({ status: 204 });
        if (u.pathname.endsWith("/token")) {
          control.refreshes++;
          if (control.role === "expired")
            return route.fulfill({
              status: 400,
              json: {
                code: "refresh_token_not_found",
                msg: "Invalid refresh token",
              },
            });
          return route.fulfill({ json: session });
        }
        if (u.pathname.endsWith("/user")) return route.fulfill({ json: user });
        throw Error("Unexpected Auth call");
      }
      if (u.origin !== new URL(BASE).origin) {
        control.external.push(u.pathname);
        return route.abort();
      }
      const path = u.pathname;
      control.requests.push({ path, method: req.method(), query: u.search });
      if (path === "/api/health")
        return route.fulfill({ json: { status: "ok" } });
      if (path === "/api/auth/me") {
        const role = control.role;
        if (role === "timeout") return;
        if (control.delay)
          await new Promise((r) => setTimeout(r, control.delay));
        return route.fulfill({
          status:
            role === "outage"
              ? 503
              : ["expired", "rejectedToken"].includes(role)
                ? 401
                : 200,
          json:
            role === "outage"
              ? { error: "unavailable" }
              : { id, email: user.email, role },
        });
      }
      if (path.startsWith("/api/admin/")) {
        assert.equal(
          req.headers().authorization,
          `Bearer ${session.access_token}`,
        );
        assert.equal(req.method(), "GET");
        if (control.role !== "admin")
          return route.fulfill({
            status: control.role === "expired" ? 401 : 403,
            json: { error: "forbidden" },
          });
        if (control.mode === "outage")
          return route.fulfill({
            status: 503,
            json: { error: "private error details" },
          });
        if (path.endsWith("/settings"))
          return route.fulfill({
            json: {
              confirmation_mode: "automatic",
              booking_horizon_days: 60,
              minimum_advance_minutes: 120,
              slot_interval_minutes: 15,
              timezone: "Europe/Riga",
              privacy_notice_version:
                control.mode === "ready" ? "test-v1" : null,
              cancellation_policy: {},
            },
          });
        if (path.endsWith("/appointments")) {
          const date =
            u.searchParams.get("date") || new Date().toISOString().slice(0, 10);
          const row = {
            id: "22222222-2222-4222-8222-222222222222",
            first_name: "Test",
            last_name: "Patient",
            email: "must-not-render@example.invalid",
            phone: "must-not-render",
            starts_at: `${date}T09:00:00Z`,
            status:
              u.searchParams.get("status") === "pending"
                ? "pending"
                : "confirmed",
          };
          return route.fulfill({
            json: { appointments: control.mode === "ready" ? [row] : [] },
          });
        }
        throw Error("Unexpected admin endpoint");
      }
      if (path === "/api/booking/services")
        return route.fulfill({
          status: control.mode === "outage" ? 503 : 200,
          json: {
            services:
              control.mode === "ready"
                ? [{ id, name_lv: "Tests", name_ru: "Тест", name_en: "Test" }]
                : [],
            privacy_notice_version: control.mode === "ready" ? "test-v1" : null,
          },
        });
      throw Error("Unexpected API request " + path);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        /intlify|Vue warn/.test(message.text())
      )
        errors.push(message.text());
    });
    await page.goto(BASE + path);
    return { context, page, control, t: adminMessages[locale], locale };
  }
  try {
    for (const role of ["user", "admin", "outage"]) {
      const f = await setup({ role, delay: 300 });
      await f.page.locator(".admin-access").waitFor();
      assert.equal(await f.page.locator(".admin-dashboard").count(), 0);
      const expected =
        role === "user"
          ? f.t.denied
          : role === "outage"
            ? f.t.unavailable
            : f.t.overview;
      await f.page
        .getByRole("heading", { name: expected, exact: true })
        .waitFor();
      if (role !== "admin")
        assert.equal(
          f.control.requests.filter((r) => r.path.startsWith("/api/admin/"))
            .length,
          0,
        );
      assert.equal(await f.page.locator(".site-header").count(), 0);
      assert.deepEqual(f.control.external, []);
      checks++;
      if (role === "admin") {
        f.control.role = "user";
        await f.page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await f.page
          .getByRole("heading", { name: f.t.denied, exact: true })
          .waitFor();
        checks++;
      }
      await f.context.close();
    }
    {
      const f = await setup({ signedIn: false });
      await f.page.waitForURL(
        (url) =>
          url.pathname === "/login" &&
          url.searchParams.get("returnTo") === "/admin",
      );
      await f.page.locator(".auth-page").waitFor();
      assert.equal(
        f.control.requests.filter((r) => r.path.startsWith("/api/admin/"))
          .length,
        0,
      );
      checks++;
      await f.context.close();
    }
    {
      const f = await setup({ role: "expired" });
      await f.page.waitForFunction(
        () =>
          location.pathname === "/login" ||
          document
            .querySelector(".admin-access")
            ?.textContent.includes("Please sign in again"),
      );
      assert.ok(f.control.refreshes <= 1);
      checks++;
      await f.context.close();
    }
    if (!process.argv.includes("--access")) {
      for (const locale of ["lv", "ru", "en"])
        for (const role of ["user", "admin", "outage"]) {
          const f = await setup({
            locale,
            role,
            path: "/kontakti",
            delay: 150,
          });
          await f.page.locator(".contact-question-form").waitFor();
          await f.page
            .locator(
              '.header-actions .auth-control button[aria-controls="header-account"]',
            )
            .click();
          assert.equal(await f.page.locator(".account-admin").count(), 0);
          if (role === "admin") {
            await f.page
              .getByRole("link", { name: f.t.title, exact: true })
              .waitFor();
            await f.page
              .getByRole("link", { name: f.t.title, exact: true })
              .click();
            await f.page
              .getByRole("heading", { name: f.t.overview, exact: true })
              .waitFor();
          } else {
            await f.page.waitForTimeout(250);
            assert.equal(await f.page.locator(".account-admin").count(), 0);
          }
          checks++;
          await f.context.close();
        }
      const guest = await setup({ signedIn: false, path: "/kontakti" });
      await guest.page.locator(".contact-question-form").waitFor();
      assert.equal(await guest.page.locator(".account-admin").count(), 0);
      checks++;
      await guest.context.close();
    }
    if (process.argv.includes("--layout") || process.argv.includes("--all")) {
      const { adminGroups, adminPath } =
        await import("../src/services/admin/navigation.ts");
      const widths = process.argv.includes("--all")
        ? [320, 375, 390, 430, 768, 1024, 1440, 1920]
        : [390, 1024, 1440];
      const languages = process.argv.includes("--all")
        ? ["lv", "ru", "en"]
        : ["ru"];
      for (const locale of languages)
        for (const width of widths) {
          const f = await setup({ width, locale, mode: "ready" });
          for (const section of adminGroups.flatMap((g) => g.items)) {
            if (section !== "overview")
              await f.page.goto(BASE + adminPath(section));
            await f.page
              .getByRole("heading", { name: f.t.nav[section], exact: true })
              .waitFor();
            if (section === "overview") {
              await f.page.locator(".admin-stats").waitFor();
              if ([390, 1440].includes(width))
                await f.page.screenshot({
                  path: `${OUT}/${locale}-${width}-dashboard.png`,
                  fullPage: true,
                });
            }
            assert.equal(
              await f.page.locator("html").getAttribute("lang"),
              locale,
            );
            assert.equal(
              await f.page
                .locator(".site-header, .site-footer, .welcome-intro")
                .count(),
              0,
            );
            assert.equal(
              await f.page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
              ),
              false,
              `${locale}/${width}/${section} overflow`,
            );
            if (section !== "overview")
              assert.ok(
                (await f.page.locator("#admin-main").innerText()).includes(
                  f.t.placeholderNote,
                ),
              );
            assert.doesNotMatch(
              await f.page.locator(".admin-shell").innerText(),
              /admin\.[A-Za-z]/,
            );
            checks++;
          }
          if (width < 1100) {
            await f.page.locator(".admin-menu-button").click();
            assert.equal(
              await f.page.locator(".admin-drawer").evaluate((el) => el.open),
              true,
            );
            for (let i = 0; i < 16; i++) {
              await f.page.keyboard.press("Tab");
              assert.equal(
                await f.page.evaluate(
                  () => !!document.activeElement.closest("dialog"),
                ),
                true,
              );
            }
            await f.page.keyboard.press("Escape");
            assert.equal(
              await f.page.locator(".admin-drawer").evaluate((el) => el.open),
              false,
            );
            assert.equal(
              await f.page.evaluate(() =>
                document.activeElement.classList.contains("admin-menu-button"),
              ),
              true,
            );
            await f.page.locator(".admin-menu-button").click();
            await f.page
              .locator('.admin-drawer a[href="/admin/media"]')
              .click();
            await f.page
              .getByRole("heading", { name: f.t.nav.media, exact: true })
              .waitFor();
            assert.equal(
              await f.page.locator(".admin-drawer").evaluate((el) => el.open),
              false,
            );
          }
          if ([390, 1440].includes(width))
            await f.page.screenshot({
              path: `${OUT}/${locale}-${width}-layout.png`,
              fullPage: true,
            });
          assert.deepEqual(f.control.external, []);
          await f.context.close();
        }
    }
    if (
      process.argv.includes("--dashboard") ||
      process.argv.includes("--all")
    ) {
      for (const locale of ["lv", "ru", "en"])
        for (const mode of ["empty", "ready", "outage"]) {
          const f = await setup({ locale, mode });
          await f.page.locator(".admin-stats").waitFor();
          const values = await f.page
            .locator(".admin-stat-value")
            .allTextContents();
          assert.deepEqual(
            values,
            mode === "outage"
              ? Array(4).fill(f.t.notAvailable)
              : [
                  mode === "ready" ? "1" : "0",
                  mode === "ready" ? "1" : "0",
                  mode === "ready" ? "1" : "0",
                  f.t.notAvailable,
                ],
          );
          if (mode === "ready") {
            assert.equal(
              await f.page.locator(".admin-patient").innerText(),
              "Test Patient",
            );
            assert.doesNotMatch(
              await f.page.locator(".admin-dashboard").innerText(),
              /must-not-render|22222222/,
            );
            assert.equal(
              await f.page.locator(".admin-visits time").innerText(),
              new Intl.DateTimeFormat(
                locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB",
                {
                  timeZone: "Europe/Riga",
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                },
              ).format(
                new Date(
                  await f.page
                    .locator(".admin-visits time")
                    .getAttribute("datetime"),
                ),
              ),
            );
            f.control.role = "user";
            await f.page.locator(".admin-refresh").click();
            await f.page
              .getByRole("heading", { name: f.t.denied, exact: true })
              .waitFor();
            assert.doesNotMatch(
              await f.page.locator("body").innerText(),
              /Test Patient/,
            );
          } else if (mode === "outage") {
            assert.ok(
              await f.page
                .getByRole("heading", { name: f.t.partialError, exact: true })
                .isVisible(),
            );
            assert.equal(
              await f.page
                .getByRole("heading", { name: f.t.noVisits, exact: true })
                .count(),
              0,
            );
            f.control.mode = "empty";
            await f.page.locator(".admin-retry").click();
            await f.page
              .getByRole("heading", { name: f.t.noVisits, exact: true })
              .waitFor();
          } else {
            assert.ok(
              await f.page
                .getByRole("heading", { name: f.t.noVisits, exact: true })
                .isVisible(),
            );
            assert.ok(
              (await f.page.locator(".admin-attention").innerText()).includes(
                f.t.privacyMissing,
              ),
            );
          }
          assert.equal(
            f.control.requests.filter((r) => r.method !== "GET").length,
            0,
          );
          checks++;
          await f.context.close();
        }
    }
    if (process.argv.includes("--security") || process.argv.includes("--all")) {
      {
        const f = await setup({ signedIn: false, path: "/admin/media" });
        await f.page.waitForURL(
          (url) =>
            url.pathname === "/login" &&
            url.searchParams.get("returnTo") === "/admin/media",
        );
        await f.page.locator("#auth-email").fill(user.email);
        await f.page.locator("#auth-password").fill("long-password");
        await f.page.locator(".auth-submit").click();
        await f.page
          .getByRole("heading", { name: f.t.nav.media, exact: true })
          .waitFor();
        await f.page.locator(".admin-account button").click();
        await f.page.waitForURL((url) => url.pathname === "/login");
        assert.equal(await f.page.locator(".admin-shell").count(), 0);
        assert.equal(
          await f.page.evaluate(() =>
            localStorage.getItem("sb-integration-test-auth-token"),
          ),
          null,
        );
        checks++;
        await f.context.close();
      }
      {
        const f = await setup({ role: "user", path: "/kontakti" });
        await f.page.locator(".contact-question-form").waitFor();
        await f.page.waitForFunction(
          () =>
            document
              .querySelector("#app")
              .__vue_app__.config.globalProperties.$pinia._s.get("auth")
              .adminStatus === "user",
        );
        const trusted = await f.page.evaluate(() => {
          const globals =
            document.querySelector("#app").__vue_app__.config.globalProperties;
          const auth = globals.$pinia._s.get("auth");
          auth.role = "admin";
          auth.adminStatus = "admin";
          return auth.verifiedAdmin;
        });
        assert.equal(trusted, false);
        await f.page.evaluate(() =>
          document
            .querySelector("#app")
            .__vue_app__.config.globalProperties.$router.push("/admin"),
        );
        await f.page
          .getByRole("heading", { name: f.t.denied, exact: true })
          .waitFor();
        assert.equal(
          f.control.requests.filter((r) => r.path.startsWith("/api/admin/"))
            .length,
          0,
        );
        checks++;
        await f.context.close();
      }
      for (const role of ["rejectedToken", "timeout"]) {
        const f = await setup({ role });
        await f.page
          .getByRole("heading", {
            name: role === "timeout" ? f.t.unavailable : f.t.expired,
            exact: true,
          })
          .waitFor();
        assert.ok(f.control.refreshes <= 1);
        assert.equal(
          f.control.requests.filter((r) => r.path.startsWith("/api/admin/"))
            .length,
          0,
        );
        checks++;
        await f.context.close();
      }
      for (const locale of ["lv", "ru", "en"]) {
        const f = await setup({ width: 390, locale, path: "/kontakti" });
        await f.page.locator(".contact-question-form").waitFor();
        await f.page.locator(".menu-toggle").click();
        await f.page.locator('[aria-controls="mobile-account"]').click();
        await f.page.locator(".auth-mobile .account-admin").click();
        await f.page
          .getByRole("heading", { name: f.t.overview, exact: true })
          .waitFor();
        for (const lang of ["lv", "ru", "en"]) {
          await f.page
            .locator(`.admin-languages button[lang="${lang}"]`)
            .click();
          assert.equal(
            await f.page.locator(".admin-page-heading h1").innerText(),
            adminMessages[lang].overview,
          );
          assert.equal(await f.page.locator("html").getAttribute("lang"), lang);
        }
        assert.deepEqual(f.control.external, []);
        checks++;
        await f.context.close();
      }
      for (const destination of [
        "https://evil.invalid",
        "//evil.invalid",
        "/admin/../login",
      ]) {
        const f = await setup({
          path: "/login?returnTo=" + encodeURIComponent(destination),
        });
        await f.page.waitForURL((url) => url.pathname === "/");
        assert.deepEqual(f.control.external, []);
        checks++;
        await f.context.close();
      }
    }
    // Later checkpoint suites are added below; these checks always run first.
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ adminAccessChecks: checks, errors }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
