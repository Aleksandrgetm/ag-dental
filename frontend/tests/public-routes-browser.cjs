// Public-shell regressions: local preview only; external services and writes blocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5185";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local test server required");

(async () => {
  const { services } = await import("../src/content/clinic.ts");
  const { articles } = await import("../src/content/articles.ts");
  const paths = [
    "/",
    "/pakalpojumi",
    "/cenas",
    "/par-mums",
    "/jaunumi",
    ...services.map(({ slug }) => `/pakalpojumi/${slug}`),
    ...articles.map(({ slug }) => `/jaunumi/${slug}`),
    "/privatuma-politika",
    "/sikdatnu-politika",
    "/missing-page-test",
  ];
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    unexpectedRequests = [];
  let checks = 0;
  try {
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
          sessionStorage.setItem("ag-welcome-seen", "1");
        }, locale);
        await context.route("**/*", (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (
            url.origin === new URL(BASE).origin &&
            request.method() === "GET"
          ) {
            if (url.pathname === "/api/cms/published")
              return route.fulfill({
                json: { schema_version: 1, documents: [] },
              });
            if (url.pathname === "/api/health")
              return route.fulfill({ json: { status: "ok" } });
            if (!url.pathname.startsWith("/api/")) return route.continue();
          }
          unexpectedRequests.push(
            `${request.method()} ${url.origin}${url.pathname}`,
          );
          return route.abort();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (["warning", "error"].includes(message.type()))
            errors.push(message.text());
        });
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await page.locator("#main h1").waitFor();
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator(".site-header").count(), 1);
          assert.equal(await page.locator(".site-footer").count(), 1);
          assert.equal(await page.locator(".admin-shell").count(), 0);
          assert.equal(await page.locator("html").getAttribute("lang"), locale);
          assert.ok((await page.locator("#main h1").textContent()).trim());
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${path}/${locale}/${width}: overflow`,
          );
          checks++;
        }
        await context.close();
      }
    }
    assert.deepEqual(unexpectedRequests, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        publicRoutes: paths.length,
        publicRouteChecks: checks,
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
