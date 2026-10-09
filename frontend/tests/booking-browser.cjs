// Isolated browser contract tests. Never point these at a live booking deployment.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5184";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local test server required");
const DEMO = process.argv.includes("--demo");
const { tmpdir } = require("node:os");
const OUT = process.env.TEST_SCREENSHOT_DIR || `${tmpdir()}/ag-booking-browser`;
fs.mkdirSync(OUT, { recursive: true });
const s1 = "11111111-1111-4111-8111-111111111111",
  s2 = "11111111-1111-4111-8111-111111111112",
  d1 = "22222222-2222-4222-8222-222222222221",
  d2 = "22222222-2222-4222-8222-222222222222";
const services = [s1, s2].map((id, i) => ({
  id,
  slug: `browser-fixture-${i}`,
  name_lv: i ? "Testa procedūra" : "Testa konsultācija",
  name_ru: i ? "Тестовая процедура" : "Тестовая консультация",
  name_en: i ? "Test procedure" : "Test consultation",
  description_lv: "Tikai pārlūka pārbaudei.",
  description_ru: "Только для проверки браузера.",
  description_en: "For browser testing only.",
  duration_minutes: i ? 60 : 30,
  provenance: "development_fixture",
}));
const doctors = [
  { id: d1, name: "TEST · A", provenance: "development_fixture" },
  { id: d2, name: "TEST · B", provenance: "development_fixture" },
];
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const user = {
  id: s2,
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.invalid",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { first_name: "UNTRUSTED" },
  identities: [],
  created_at: new Date().toISOString(),
};
const session = {
  access_token:
    b64({ alg: "ES256", typ: "JWT" }) +
    "." +
    b64({
      sub: s2,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
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
  const { bookingMessages } = await import("../src/i18n/booking.ts");
  const { services: websiteServices } =
    await import("../src/content/clinic.ts");
  const { localizedPrices } = await import("../src/content/pricing.ts");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let layoutChecks = 0,
    flows = 0;
  const errors = [];
  async function setup({
    width = 1440,
    locale = "en",
    mode = "normal",
    signedIn = false,
    reducedMotion = "reduce",
  } = {}) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion,
    });
    const control = {
      mode,
      posts: [],
      signup: [],
      availability: [],
      external: [],
      active: 0,
      max: 0,
      allSlots: false,
    };
    await context.addInitScript(
      ({ locale, session, signedIn }) => {
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
        if (signedIn)
          localStorage.setItem(
            "sb-integration-test-auth-token",
            JSON.stringify(session),
          );
      },
      { locale, session, signedIn },
    );
    // External traffic cannot escape the test. Supabase routes below are mocked.
    await context.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.origin === new URL(BASE).origin) return r.continue();
      control.external.push(u.origin + u.pathname);
      return r.abort();
    });
    await context.route("https://*.supabase.co/auth/v1/**", async (r) => {
      const req = r.request(),
        path = new URL(req.url()).pathname;
      if (DEMO) throw Error("Demo attempted Supabase Auth request");
      let status = 200,
        data = path.endsWith("/user") ? user : session;
      if (path.endsWith("/signup")) {
        control.signup.push(req.postDataJSON());
        if (control.mode === "account-failed") {
          status = 422;
          data = { code: "user_already_exists", msg: "Private raw detail" };
        }
        if (control.mode === "account-no-session") data = user;
      }
      await r.fulfill({
        status,
        contentType: "application/json",
        headers: { "X-Supabase-Api-Version": "2024-01-01" },
        body: JSON.stringify(data),
      });
    });
    await context.route("**/api/auth/me", (r) =>
      r.fulfill({ json: { id: s2, email: user.email, role: "user" } }),
    );
    await context.route("**/api/health", (r) =>
      r.fulfill({ json: { status: "ok" } }),
    );
    await context.route("**/api/booking/**", async (r) => {
      if (DEMO) throw Error("Demo attempted booking API request");
      const req = r.request(),
        u = new URL(req.url()),
        path = u.pathname;
      if (path.endsWith("/services"))
        return r.fulfill({
          status: control.mode === "unavailable" ? 503 : 200,
          json:
            control.mode === "unavailable"
              ? { error: "booking_unavailable" }
              : {
                  services: control.mode === "empty" ? [] : services,
                  privacy_notice_version:
                    control.mode === "unconfigured" ? null : "browser-test-v1",
                },
        });
      if (path.endsWith("/doctors"))
        return r.fulfill({
          json: {
            doctors:
              control.mode === "no-doctors"
                ? []
                : u.searchParams.get("service_id") === s2
                  ? [doctors[0]]
                  : doctors,
          },
        });
      if (path.endsWith("/availability")) {
        control.availability.push(Object.fromEntries(u.searchParams));
        control.max = Math.max(control.max, ++control.active);
        const date = u.searchParams.get("date"),
          doc = u.searchParams.get("doctor_id");
        const start = new Date(`${date}T09:00:00Z`),
          ends = new Date(+start + 30 * 60000);
        const slots =
          control.mode === "no-dates" ||
          control.allSlots ||
          [0, 6].includes(start.getUTCDay())
            ? []
            : doctors
                .filter((d) => !doc || d.id === doc)
                .map((d) => ({
                  doctor_id: d.id,
                  starts_at: start.toISOString(),
                  ends_at: ends.toISOString(),
                }));
        await new Promise((res) => setTimeout(res, 5));
        control.active--;
        return r.fulfill({
          json: {
            slots,
            timezone: "Europe/Riga",
            privacy_notice_version: "browser-test-v1",
          },
        });
      }
      if (path.endsWith("/appointments")) {
        const body = req.postDataJSON();
        control.posts.push({
          body,
          key: req.headers()["idempotency-key"],
          authorization: req.headers().authorization,
        });
        if (control.mode === "timeout") {
          control.mode = "normal";
          return r.abort();
        }
        if (control.mode === "conflict") {
          control.mode = "normal";
          return r.fulfill({
            status: 409,
            json: { error: "slot_unavailable" },
          });
        }
        if (control.mode === "key-conflict")
          return r.fulfill({
            status: 409,
            json: { error: "idempotency_conflict" },
          });
        return r.fulfill({
          status: 201,
          json: {
            ...body,
            id: s2,
            booking_reference: "BROWSER-TEST-ONLY",
            ends_at: new Date(
              Date.parse(body.starts_at) + 30 * 60000,
            ).toISOString(),
            status: control.mode === "pending" ? "pending" : "confirmed",
          },
        });
      }
      throw Error("Unexpected booking request " + path);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "warning" && /Not found.*booking\./.test(m.text()))
        errors.push(m.text());
    });
    await page.goto(BASE + "/pieraksts");
    await page.locator(".booking-page").waitFor();
    await page.locator(".booking-loading").waitFor({ state: "hidden" });
    return { context, page, control, t: bookingMessages[locale], locale };
  }
  async function layout(f, stage) {
    const { page } = f;
    await page.waitForTimeout(60);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(
      overflow,
      false,
      `${stage} ${f.locale} overflow at ${page.viewportSize().width}`,
    );
    assert.equal(await page.locator("html").getAttribute("lang"), f.locale);
    assert.ok(
      !(await page.locator(".booking-page").innerText()).match(
        /booking\.[A-Za-z]/,
      ),
    );
    const broken = await page
      .locator(".booking-page button:visible, .booking-page input:visible")
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.right > innerWidth + 1 || r.left < -1;
          })
          .map((n) => n.outerHTML.slice(0, 100)),
      );
    assert.deepEqual(broken, [], stage + " controls overflow");
    for (const text of await page
      .locator(".time-grid strong")
      .allTextContents())
      assert.match(text.trim(), /^\d{2}:\d{2}$/);
    assert.doesNotMatch(
      (await page.locator(".time-grid").allTextContents()).join(" "),
      /(?:GMT|UTC)[+−-]/,
    );
    const summary = await page
      .locator(".booking-summary-list > div")
      .evaluateAll((items) =>
        items.map((item) => ({
          label: item.querySelector("dt")?.textContent,
          value: item.querySelector("dd")?.textContent,
        })),
      );
    for (const item of summary.filter(
      (item) => item.label === f.t.time && item.value !== f.t.noSelection,
    ))
      assert.match(item.value.trim(), /^\d{2}:\d{2}$/);
    if (DEMO) {
      assert.ok(
        !summary.some(
          (item) => item.label === f.t.duration || item.label === f.t.price,
        ),
      );
      assert.doesNotMatch(
        await page.locator(".booking-page").innerText(),
        /DEMO · [AB](?:\s|$)/,
      );
    }
    layoutChecks++;
    if (
      (page.viewportSize().width === 1440 && f.locale === "en") ||
      (page.viewportSize().width === 390 && f.locale === "lv")
    ) {
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: `${OUT}/${DEMO ? "demo-" : ""}${page.viewportSize().width}-${f.locale}-${stage}.png`,
        fullPage: true,
      });
    }
  }
  async function toCalendar(f, { serviceIndex = 0, doctor = "any" } = {}) {
    const { page } = f;
    await page.locator("input[name=booking-service]").nth(serviceIndex).check();
    await page.locator(".booking-next").click();
    await page.locator("input[name=booking-doctor]").first().waitFor();
    if (DEMO) {
      assert.deepEqual(
        await page
          .locator(".booking-options .option-copy strong")
          .allTextContents(),
        [f.t.anyDoctor, "Dr. Anda Gutovska"],
      );
      assert.equal(
        await page.locator("input[name=booking-doctor]").first().isChecked(),
        true,
      );
      if (doctor === "named")
        await page.locator("input[name=booking-doctor]").nth(1).check();
      assert.equal(
        await page
          .locator("input[name=booking-doctor]")
          .nth(doctor === "named" ? 1 : 0)
          .isChecked(),
        true,
      );
    }
    await layout(f, "doctor");
    await page.locator(".booking-next").click();
    await page.locator(".calendar-grid[aria-busy=false]").waitFor();
    if (!(await page.locator(".calendar-row button:not(:disabled)").count())) {
      await page
        .getByRole("button", { name: f.t.nextMonth, exact: true })
        .click();
      await page.locator(".calendar-grid[aria-busy=false]").waitFor();
    }
  }
  async function toContact(f) {
    const { page } = f;
    await page.locator(".calendar-row button:not(:disabled)").first().click();
    await page.locator(".time-grid button").first().waitFor();
    await page.locator(".time-grid button").first().click();
    assert.equal(
      await page
        .locator(".time-grid button")
        .first()
        .getAttribute("aria-pressed"),
      "true",
    );
    await layout(f, "calendar");
    await page.locator(".booking-next").click();
    await page.locator("#booking-first_name").waitFor();
  }
  async function fill(f, { account = false, mismatch = false } = {}) {
    const { page } = f;
    await page.locator("#booking-first_name").fill("Test");
    await page.locator("#booking-last_name").fill("Person");
    await page.locator("#booking-email").fill("test@example.invalid");
    await page.locator("#booking-phone").fill("+371 20000000");
    if (account) {
      await page.locator(".booking-account input[type=checkbox]").check();
      await page.locator("#booking-password").fill("long-password");
      await page
        .locator("#booking-repeat")
        .fill(mismatch ? "not-matching" : "long-password");
    }
    await page.locator("#booking-privacy").check();
    await layout(f, "contact");
    await page.locator(".booking-next").click();
  }
  async function review(f) {
    await toCalendar(f);
    await toContact(f);
    await fill(f);
    await layout(f, "review");
    assert.equal(f.control.posts.length, 0);
  }
  async function submit(f) {
    await f.page.locator(".booking-submit").click();
    await f.page.locator(".booking-result").waitFor();
    assert.equal(f.control.external.length, 0);
    flows++;
  }
  if (DEMO) {
    let selection = 0;
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
      for (const locale of ["lv", "ru", "en"]) {
        const f = await setup({ width, locale });
        await layout(f, "service");
        assert.equal(await f.page.locator(".booking-demo").count(), 1);
        const expectedCategories = [
          ...new Set(websiteServices.map((item) => item.category)),
        ];
        assert.equal(
          await f.page.locator(".booking-service-group").count(),
          expectedCategories.length,
        );
        for (const category of expectedCategories) {
          const group = f.page.getByRole("group", {
            name: localizedPrices[category].title[locale],
            exact: true,
          });
          assert.deepEqual(
            await group.locator(".option-copy strong").allTextContents(),
            websiteServices
              .filter((item) => item.category === category)
              .map((item) => item.title[locale]),
          );
        }
        assert.equal(await f.page.locator(".option-meta").count(), 0);
        if (width === 1440 && locale === "en") {
          // Category headings and service names update in-place with the existing language switch.
          await f.page.locator('.site-header button[lang="ru"]').click();
          assert.equal(
            await f.page.locator(".option-copy strong").first().innerText(),
            websiteServices[0].title.ru,
          );
          assert.equal(
            await f.page
              .locator(".booking-service-category")
              .first()
              .textContent(),
            localizedPrices[0].title.ru,
          );
          await f.page.locator('.site-header button[lang="en"]').click();
          // Native radio keyboard navigation remains usable across category groups.
          await f.page.locator("input[name=booking-service]").first().focus();
          await f.page.keyboard.press("ArrowDown");
          assert.equal(
            await f.page
              .locator("input[name=booking-service]")
              .nth(1)
              .isChecked(),
            true,
          );
        }
        const serviceIndex = selection % websiteServices.length;
        const selectedName = await f.page
          .locator(".option-copy strong")
          .nth(serviceIndex)
          .innerText();
        await toCalendar(f, {
          serviceIndex,
          doctor: selection++ % 2 ? "named" : "any",
        });
        await toContact(f);
        await fill(f, { account: true });
        await layout(f, "review");
        await submit(f);
        assert.match(
          await f.page.locator(".booking-reference").innerText(),
          /DEMO-/,
        );
        assert.ok(
          (await f.page.locator(".booking-result").innerText()).includes(
            selectedName,
          ),
        );
        assert.ok(
          (await f.page.locator(".booking-result").innerText()).includes(
            "Dr. Anda Gutovska",
          ),
        );
        assert.equal(f.control.posts.length, 0);
        assert.equal(f.control.signup.length, 0);
        assert.equal(f.control.availability.length, 0);
        await layout(f, "result");
        await f.context.close();
      }
    }
  } else {
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920])
      for (const locale of ["lv", "ru", "en"]) {
        const f = await setup({ width, locale });
        assert.equal(await f.page.locator("h1").innerText(), f.t.title);
        await layout(f, "service");
        await review(f);
        await submit(f);
        await layout(f, "result");
        assert.equal(f.control.posts.length, 1);
        assert.equal(f.control.signup.length, 0);
        assert.equal(f.control.posts[0].authorization, undefined);
        assert.ok(f.control.max <= 3);
        await f.context.close();
      }
    for (const mode of [
      "empty",
      "unconfigured",
      "unavailable",
      "no-doctors",
      "no-dates",
    ]) {
      const f = await setup({ mode });
      if (mode === "no-doctors") {
        await f.page.locator("input[name=booking-service]").first().check();
        await f.page.locator(".booking-next").click();
        await f.page.getByText(f.t.noDoctors, { exact: true }).waitFor();
      } else if (mode === "no-dates") {
        await f.page.locator("input[name=booking-service]").first().check();
        await f.page.locator(".booking-next").click();
        await f.page.locator(".booking-next").click();
        await f.page.getByText(f.t.noDates, { exact: true }).waitFor();
      } else await f.page.locator(".booking-empty").waitFor();
      assert.equal(f.control.posts.length, 0);
      assert.equal(await f.page.locator(".booking-demo").count(), 0);
      await layout(f, mode);
      await f.context.close();
    }
    {
      const f = await setup();
      await toCalendar(f);
      const cells = f.page.locator(".calendar-row button:not(:disabled)");
      await cells.first().focus();
      await f.page.keyboard.press("ArrowRight");
      assert.notEqual(
        await f.page.evaluate(() => document.activeElement.dataset.date),
        await cells.first().getAttribute("data-date"),
      );
      await f.page.keyboard.press("Enter");
      await f.page.locator(".time-grid button").first().waitFor();
      const month = await f.page.locator("#booking-month").innerText();
      await cells.first().focus();
      await f.page.keyboard.press("PageDown");
      await f.page.locator(".calendar-grid[aria-busy=false]").waitFor();
      assert.notEqual(
        await f.page.locator("#booking-month").innerText(),
        month,
      );
      assert.equal(
        await f.page.evaluate(() =>
          document.activeElement.matches("[data-date]"),
        ),
        true,
      );
      await f.page
        .getByRole("button", { name: f.t.previousMonth, exact: true })
        .click();
      await f.page.locator(".calendar-grid[aria-busy=false]").waitFor();
      assert.equal(await f.page.locator("#booking-month").innerText(), month);
      assert.equal(
        await f.page
          .locator(".booking-step")
          .evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      await f.context.close();
    }
    for (const mode of [
      "timeout",
      "conflict",
      "pending",
      "account-failed",
      "account-no-session",
      "normal",
    ]) {
      const signedIn = mode === "normal",
        f = await setup({ mode, signedIn });
      await toCalendar(f);
      await toContact(f);
      if (signedIn) {
        assert.equal(await f.page.locator(".booking-account").count(), 0);
        assert.equal(
          await f.page.locator("#booking-email").inputValue(),
          user.email,
        );
        assert.equal(
          await f.page.locator("#booking-first_name").inputValue(),
          "",
        );
      }
      await f.page.locator(".booking-next").click();
      assert.equal(
        (await f.page.locator("[aria-invalid=true]").count()) > 0,
        true,
      );
      assert.equal(await f.page.locator("#booking-privacy").isChecked(), false);
      const account = mode.startsWith("account");
      await fill(f, { account });
      await f.page.locator(".booking-submit").click();
      if (mode === "timeout") {
        await f.page.getByText(f.t.uncertain, { exact: true }).waitFor();
        const original = f.control.posts[0];
        await f.page.reload();
        await f.page.getByText(f.t.resumed, { exact: true }).waitFor();
        assert.match(
          await f.page.locator(".booking-summary-list").first().innerText(),
          /12:00|11:00/,
        );
        await submit(f);
        assert.deepEqual(f.control.posts[1], original);
      } else if (mode === "conflict") {
        await f.page.locator(".calendar-grid[aria-busy=false]").waitFor();
        await f.page.getByText(f.t.slotChanged, { exact: true }).waitFor();
        await toContact(f);
        assert.equal(
          await f.page.locator("#booking-email").inputValue(),
          user.email,
        );
        await f.page.locator(".booking-next").click();
        await submit(f);
        assert.notEqual(f.control.posts[0].key, f.control.posts[1].key);
      } else if (account) {
        await f.page
          .getByRole("button", { name: f.t.guest, exact: true })
          .waitFor();
        assert.equal(f.control.posts.length, 0);
        await f.page
          .getByRole("button", { name: f.t.guest, exact: true })
          .click();
        await submit(f);
        assert.equal(f.control.signup.length, 1);
        assert.equal(f.control.posts[0].authorization, undefined);
        assert.equal(
          await f.page.getByText(f.t.guestResult, { exact: true }).count(),
          1,
        );
      } else {
        await f.page.locator(".booking-result").waitFor();
        if (mode === "pending")
          assert.equal(
            await f.page.locator("#booking-result-heading").innerText(),
            f.t.pendingTitle,
          );
        if (signedIn)
          assert.ok(f.control.posts[0].authorization?.startsWith("Bearer "));
        flows++;
      }
      await f.context.close();
    }
    {
      const f = await setup();
      await toCalendar(f);
      await toContact(f);
      await fill(f, { account: true, mismatch: true });
      assert.equal(
        await f.page.locator("#booking-repeat").getAttribute("aria-invalid"),
        "true",
      );
      assert.equal(f.control.signup.length, 0);
      await f.page.locator("#booking-repeat").fill("long-password");
      await f.page.locator(".booking-next").click();
      await submit(f);
      assert.equal(f.control.signup.length, 1);
      assert.ok(f.control.posts[0].authorization?.startsWith("Bearer "));
      await f.context.close();
    }
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    JSON.stringify({
      mode: DEMO ? "isolated-demo" : "mocked-api",
      layoutChecks,
      flows,
      errors,
      screenshots: OUT,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
