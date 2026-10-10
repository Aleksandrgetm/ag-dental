// Run against a local frontend with synthetic Auth configuration. All APIs are blocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { tmpdir } = require("node:os");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5184";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local test server required");
const OUT = process.env.TEST_SCREENSHOT_DIR || `${tmpdir()}/ag-contact-browser`;
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { privacyAndContact } =
    await import("../src/i18n/privacyAndContact.ts");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const failures = [];
  let layouts = 0,
    flows = 0;
  try {
    for (const locale of ["lv", "ru", "en"]) {
      for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: width === 1440 ? "no-preference" : "reduce",
        });
        const requests = [];
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
          const req = route.request(),
            url = new URL(req.url());
          if (
            url.origin !== new URL(BASE).origin ||
            url.pathname.startsWith("/api/") ||
            req.method() !== "GET"
          ) {
            if (url.pathname === "/api/cms/published" && req.method() === "GET")
              return route.fulfill({
                json: { schema_version: 1, documents: [] },
              });
            if (url.pathname === "/api/health" && req.method() === "GET")
              return route.fulfill({ json: { status: "ok" } });
            requests.push(`${req.method()} ${url.origin}${url.pathname}`);
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => failures.push(error.message));
        page.on("console", (message) => {
          if (["warning", "error"].includes(message.type()))
            failures.push(message.text());
        });
        await page.goto(`${BASE}/kontakti`);
        const form = page.locator(".contact-question-form");
        await form.waitFor();
        await page.evaluate(() => document.fonts.ready);
        const copy = privacyAndContact[locale].request;
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.equal(await form.locator("select").count(), 0);
        assert.deepEqual(
          await form
            .locator("input, textarea")
            .evaluateAll((fields) => fields.map((f) => [f.name, f.required])),
          [
            ["name", true],
            ["email", true],
            ["phone", false],
            ["question", true],
            ["privacy", true],
          ],
        );
        for (const key of ["name", "email", "phone", "question"]) {
          assert.ok(
            (
              await form.locator(`label[for='contact-${key}']`).textContent()
            ).includes(copy[key]),
          );
          assert.ok(
            await form
              .locator(`#contact-${key}`)
              .getAttribute("aria-describedby"),
          );
        }
        assert.equal(
          await form.locator("textarea").getAttribute("maxlength"),
          "1000",
        );
        assert.equal(
          await form.locator("textarea").getAttribute("placeholder"),
          copy.questionPlaceholder,
        );
        assert.equal(await form.locator("#contact-privacy").isChecked(), false);
        assert.equal(
          (await form.locator(".delivery-status").textContent()).trim(),
          copy.unavailable,
        );
        assert.equal(
          (await form.locator("button").textContent()).trim(),
          copy.check,
        );
        const layout = await form.evaluate((el) => {
          const box = (id) => {
            const r = el
              .querySelector(`#contact-${id}`)
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          const button = el.querySelector("button").getBoundingClientRect();
          return {
            name: box("name"),
            email: box("email"),
            phone: box("phone"),
            question: box("question"),
            height: el.getBoundingClientRect().height,
            buttonY: button.y + scrollY,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
        });
        assert.equal(layout.overflow, false, `${locale}/${width}: overflow`);
        if (width >= 1024) {
          assert.ok(Math.abs(layout.name.y - layout.email.y) < 1);
          assert.ok(layout.email.x > layout.name.x + layout.name.width);
          assert.ok(layout.question.width > layout.name.width * 1.8);
          const info = await page
            .locator(".contacts-information")
            .boundingBox();
          assert.ok(info.x + info.width < layout.name.x);
        } else assert.ok(layout.email.y >= layout.name.y + layout.name.height);
        assert.ok(layout.phone.y >= layout.email.y + layout.email.height);
        assert.ok(layout.question.y >= layout.phone.y + layout.phone.height);
        assert.ok(layout.name.height >= 44);
        assert.ok(layout.question.height >= 140);
        assert.ok(
          await page.locator(".contacts-map .map-placeholder").isVisible(),
        );
        assert.ok(
          await page.locator(".contacts-map a[href^='https://']").count(),
        );
        assert.ok(await page.locator(".contacts-faq details").count());
        assert.equal(await page.locator("iframe").count(), 0);
        layouts++;

        await form.locator("button").click();
        assert.equal(
          await page.locator(":focus").getAttribute("id"),
          "contact-name",
        );
        for (const key of ["name", "email", "question", "privacy"]) {
          assert.equal(
            await form.locator(`#contact-${key}`).getAttribute("aria-invalid"),
            "true",
          );
          assert.equal(
            (await form.locator(`#contact-error-${key}`).textContent()).trim(),
            copy.errors[key === "privacy" ? "privacyRequired" : "required"],
          );
        }
        assert.equal(
          await form.locator("#contact-phone").getAttribute("aria-invalid"),
          "false",
        );
        const invalidLayout = await form.evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          buttonY:
            el.querySelector("button").getBoundingClientRect().y + scrollY,
        }));
        assert.ok(
          Math.abs(invalidLayout.height - layout.height) < 1,
          `${locale}/${width}: error height shifted ${invalidLayout.height - layout.height}`,
        );
        assert.ok(
          Math.abs(invalidLayout.buttonY - layout.buttonY) < 1,
          `${locale}/${width}: error button shifted`,
        );
        assert.notEqual(
          await form
            .locator("#contact-name")
            .evaluate((el) => getComputedStyle(el).outlineStyle),
          "none",
        );

        await form.locator("#contact-name").fill("Contact Browser Test");
        await form.locator("#contact-email").fill("not-an-email");
        await form.locator("#contact-phone").fill("123");
        await form
          .locator("#contact-question")
          .fill("Does the clinic have parking? Browser-only test.");
        await form.locator("button").click();
        assert.equal(
          await page.locator(":focus").getAttribute("id"),
          "contact-email",
        );
        assert.equal(
          (await form.locator("#contact-error-email").textContent()).trim(),
          copy.errors.emailInvalid,
        );
        assert.equal(
          (await form.locator("#contact-error-phone").textContent()).trim(),
          copy.errors.phoneInvalid,
        );
        await form
          .locator("#contact-email")
          .fill("question-test@example.invalid");
        await form.locator("#contact-phone").fill("");
        await form.locator("button").click();
        assert.equal(
          await page.locator(":focus").getAttribute("id"),
          "contact-privacy",
        );
        await form.locator("#contact-privacy").check();
        await form.locator("button").click();
        assert.equal(
          (await form.locator(".delivery-status").textContent()).trim(),
          copy.notSent,
        );
        assert.equal(await form.locator("[aria-invalid=true]").count(), 0);
        assert.equal(
          await form.locator("#contact-question").inputValue(),
          "Does the clinic have parking? Browser-only test.",
        );
        assert.ok(await form.locator("a[href^='tel:']").count());
        assert.ok(await form.locator("a[href^='mailto:']").count());
        assert.equal(
          await form.locator("a[href*='mailto:']").getAttribute("href"),
          "mailto:ag@inbox.lv",
        );
        const validHeight = await form.evaluate(
          (el) => el.getBoundingClientRect().height,
        );
        assert.ok(
          Math.abs(validHeight - layout.height) < 1,
          `${locale}/${width}: status height shifted`,
        );

        // HTML limit and independent validation remain effective after later edits.
        await form.locator("#contact-question").fill("a".repeat(1001));
        assert.equal(
          (await form.locator("#contact-question").inputValue()).length,
          1000,
        );
        assert.equal(
          (await form.locator(".question-count").textContent()).trim(),
          "1000 / 1000",
        );
        assert.equal(
          (await form.locator(".delivery-status").textContent()).trim(),
          copy.unavailable,
        );
        await form
          .locator("#contact-question")
          .fill("Does the clinic have parking? Browser-only test.");

        if ([390, 1440].includes(width)) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: `${OUT}/${locale}-${width}.png`,
            fullPage: true,
          });
        }
        if (width === 1440) {
          // Live locale changes preserve entered fields and retranslate feedback.
          for (const lang of ["lv", "ru", "en"]) {
            await page
              .locator(
                `.header-actions .language-switch button[lang='${lang}']`,
              )
              .click();
            assert.equal(
              (await form.locator("button").textContent()).trim(),
              privacyAndContact[lang].request.check,
            );
            assert.equal(
              await form.locator("#contact-name").inputValue(),
              "Contact Browser Test",
            );
            assert.equal(
              await form.locator("#contact-privacy").isChecked(),
              true,
            );
          }
          await page
            .locator(
              `.header-actions .language-switch button[lang='${locale}']`,
            )
            .click();
          const popupReady = context.waitForEvent("page");
          await form.locator("a[href='/privatuma-politika']").click();
          const popup = await popupReady;
          await popup.waitForURL("**/privatuma-politika");
          await popup.locator("h1").waitFor();
          assert.equal(
            (await popup.locator("h1").textContent()).trim(),
            privacyAndContact[locale].legal.privacyTitle,
          );
          await popup.close();
          assert.equal(
            await form.locator("#contact-name").inputValue(),
            "Contact Browser Test",
          );
        }
        const saved = await page.evaluate(() =>
          JSON.stringify({
            local: { ...localStorage },
            session: { ...sessionStorage },
          }),
        );
        assert.doesNotMatch(
          saved,
          /question-test|Contact Browser Test|Browser-only test/,
        );
        assert.equal(new URL(page.url()).search, "");
        assert.deepEqual(
          requests,
          [],
          `${locale}/${width}: unexpected API or external request`,
        );
        flows++;
        await context.close();
      }
    }
    assert.deepEqual(failures, []);
    console.log(
      `Contact checks passed: ${layouts} responsive/locale layouts, ${flows} validation/no-delivery flows; no API writes or external requests. Screenshots: ${OUT}`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
