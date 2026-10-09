// Self-contained production regression: no local .env files and no VITE_API_URL.
// Auth is synthetic/intercepted; every Go API or external request fails the test.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { tmpdir } = require("node:os");

(async () => {
  const { build, preview } = await import("vite");
  const { bookingMessages } = await import("../src/i18n/booking.ts");
  const { services } = await import("../src/content/clinic.ts");
  const { articles } = await import("../src/content/articles.ts");
  const output = fs.mkdtempSync(path.join(tmpdir(), "ag-missing-api-"));
  let server, browser;
  const errors = [],
    unexpected = [],
    authRequests = [];
  let publicChecks = 0,
    unavailableChecks = 0;
  const authOrigin = "https://integration-test.supabase.co";
  const config = {
    root: path.resolve(__dirname, ".."),
    envDir: false,
    mode: "production",
    logLevel: "warn",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(authOrigin),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        "sb_publishable_integration_test",
      ),
      "import.meta.env.VITE_BOOKING_DEMO": JSON.stringify("false"),
    },
    build: { outDir: output, emptyOutDir: true },
    preview: { host: "127.0.0.1", port: 0 },
  };
  delete process.env.VITE_API_URL;
  process.env.NODE_ENV = "production";
  try {
    await build(config);
    // Assert the demo transport itself is absent, not merely hidden in the UI.
    const scripts = fs
      .readdirSync(path.join(output, "assets"))
      .filter((name) => name.endsWith(".js"));
    assert.ok(
      scripts.every(
        (name) =>
          !fs
            .readFileSync(path.join(output, "assets", name), "utf8")
            .includes("DEMO-NOT-A-LEGAL-NOTICE"),
      ),
    );
    server = await preview(config);
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const id = "11111111-1111-4111-8111-111111111111";
    const user = {
      id,
      email: "test@example.invalid",
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      app_metadata: { provider: "email" },
      user_metadata: { role: "admin" },
      identities: [],
    };
    const b64 = (value) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const session = {
      access_token: `${b64({ alg: "ES256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.${b64("test-signature")}`,
      refresh_token: "test-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user,
    };
    const paths = [
      "/",
      "/pakalpojumi",
      "/cenas",
      "/par-mums",
      "/jaunumi",
      "/kontakti",
      ...services.map(({ slug }) => `/pakalpojumi/${slug}`),
      ...articles.map(({ slug }) => `/jaunumi/${slug}`),
      "/privatuma-politika",
      "/sikdatnu-politika",
      "/login",
      "/admin",
    ];
    for (const locale of ["lv", "ru", "en"]) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        await context.addInitScript((locale) => {
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
          localStorage.setItem("role", "admin");
          sessionStorage.setItem("ag-welcome-seen", "1");
        }, locale);
        await context.route("**/*", (route) => {
          const req = route.request(),
            url = new URL(req.url());
          if (
            url.origin === authOrigin &&
            ["/auth/v1/token", "/auth/v1/user", "/auth/v1/logout"].includes(
              url.pathname,
            )
          ) {
            authRequests.push(url.pathname);
            return route.fulfill({
              json: url.pathname.endsWith("/token")
                ? session
                : url.pathname.endsWith("/user")
                  ? user
                  : {},
              headers: { "X-Supabase-Api-Version": "2024-01-01" },
            });
          }
          if (
            url.origin === base &&
            req.method() === "GET" &&
            !/^\/(?:api|undefined|null)(?:\/|$)/.test(url.pathname)
          )
            return route.continue();
          unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
          return route.abort();
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (["warning", "error"].includes(m.type())) errors.push(m.text());
        });
        for (const route of paths) {
          await page.goto(base + route);
          await page.locator("#main h1").waitFor();
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator(".site-header").count(), 1);
          assert.equal(await page.locator(".site-footer").count(), 1);
          assert.equal(await page.locator("html").getAttribute("lang"), locale);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${route}/${locale}/${width}`,
          );
          // This deployed dev base predates the admin feature; /admin must stay a 404.
          if (route === "/admin")
            assert.equal(await page.locator(".not-found").count(), 1);
          publicChecks++;
        }
        await page.goto(base + "/pieraksts");
        await page.locator(".booking-error").waitFor();
        assert.equal(
          (await page.locator(".booking-error p").textContent()).trim(),
          bookingMessages[locale].api_unavailable,
        );
        assert.equal(
          await page
            .locator(".booking-form, .booking-result, .booking-demo")
            .count(),
          0,
        );
        assert.ok(await page.locator(".booking-empty a[href^='tel:']").count());
        await page.locator(".booking-error button").click();
        await page.locator(".booking-error").waitFor();
        assert.equal(
          await page.evaluate(
            () =>
              document
                .querySelector("#app")
                .__vue_app__.config.globalProperties.$pinia._s.get("clinic")
                .healthState,
          ),
          "unavailable",
        );

        // Supabase login still works, but untrusted metadata cannot establish an API role.
        await page.goto(base + "/login");
        await page.locator("#auth-email").fill(user.email);
        await page.locator("#auth-password").fill("test-password-only");
        await page.locator(".auth-submit").click();
        await page.waitForURL(base + "/");
        await page.waitForFunction(
          () =>
            !!document
              .querySelector("#app")
              .__vue_app__.config.globalProperties.$pinia._s.get("auth").user,
        );
        assert.equal(
          await page.evaluate(
            () =>
              document
                .querySelector("#app")
                .__vue_app__.config.globalProperties.$pinia._s.get("auth").role,
          ),
          null,
        );
        await page.reload();
        await page.waitForFunction(
          () =>
            !!document
              .querySelector("#app")
              ?.__vue_app__?.config.globalProperties.$pinia?._s.get("auth")
              ?.initialized,
        );
        assert.deepEqual(
          await page.evaluate(() => {
            const auth = document
              .querySelector("#app")
              .__vue_app__.config.globalProperties.$pinia._s.get("auth");
            return [auth.user?.id, auth.role];
          }),
          [id, null],
        );
        assert.equal(
          await page.locator(".site-header a[href='/admin']").count(),
          0,
        );
        unavailableChecks++;
        await context.close();
      }
    }
    assert.equal(authRequests.filter((p) => p.endsWith("/token")).length, 6);
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        publicChecks,
        unavailableAndAuthChecks: unavailableChecks,
        unexpectedRequests: unexpected,
        errors,
      }),
    );
  } finally {
    await browser?.close();
    if (server)
      await new Promise((resolve) => server.httpServer.close(resolve));
    fs.rmSync(output, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
