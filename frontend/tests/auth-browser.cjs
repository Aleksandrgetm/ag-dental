const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const BASE = process.env.TEST_BASE_URL || "http://localhost:5173";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const { authMessages } = await import("../src/i18n/auth.ts");
  const errors = [],
    requests = [];
  const id = "11111111-1111-4111-8111-111111111111";
  const b64 = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const token =
    b64({ alg: "ES256", typ: "JWT" }) +
    "." +
    b64({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }) +
    "." +
    b64("test-signature");
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.invalid",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: token,
    refresh_token: "test-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => {
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
  });
  let expectedPassword = "long-password";
  let signUpConfirmation = false,
    duplicate = false,
    recoveryFailure = false,
    requestDelay = 0;
  await context.route("https://*.supabase.co/auth/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    requests.push({
      path: url.pathname,
      method: req.method(),
      body: req.postDataJSON(),
    });
    if (requestDelay)
      await new Promise((resolve) => setTimeout(resolve, requestDelay));
    let data = {},
      status = 200;
    if (url.pathname.endsWith("/token")) {
      if (
        req.postDataJSON()?.password &&
        req.postDataJSON().password !== expectedPassword
      ) {
        status = 400;
        data = {
          code: "invalid_credentials",
          msg: "Raw private provider detail",
        };
      } else data = session;
    } else if (url.pathname.endsWith("/signup"))
      data = signUpConfirmation ? { ...user } : session;
    else if (url.pathname.endsWith("/user")) {
      data = user;
      if (req.method() === "PUT")
        expectedPassword = req.postDataJSON().password;
    }
    if (url.pathname.endsWith("/signup") && duplicate) {
      status = 422;
      data = { code: "user_already_exists", msg: "Raw private detail" };
    }
    if (url.pathname.endsWith("/recover") && recoveryFailure) {
      status = 400;
      data = { code: "captcha_failed", msg: "Raw captcha detail" };
    }
    await route.fulfill({
      status,
      headers: {
        "X-Supabase-Api-Version": "2024-01-01",
        "Access-Control-Expose-Headers": "X-Supabase-Api-Version",
      },
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await context.route("**/api/auth/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id, email: user.email, role: "user" }),
    }),
  );
  await context.route("**/api/cms/published", (r) =>
    r.fulfill({ json: { schema_version: 1, documents: [] } }),
  );
  await context.route("**/api/health", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"status":"ok","service":"ag-dental-api","database":"connected"}',
    }),
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const go = async (path) => {
    await page.goto(BASE + path);
    await page.locator(".site-header").waitFor();
    await page.waitForTimeout(200);
  };
  const lang = async (l) => {
    if (await page.locator(`.site-header button[lang="${l}"]`).isVisible())
      await page.locator(`.site-header button[lang="${l}"]`).click();
    else {
      await page.locator(".menu-toggle").click();
      await page
        .locator(".mobile-menu .language-switch button")
        .filter({ hasText: l.toUpperCase() })
        .click();
      await page.locator(".menu-toggle").click();
    }
  };
  let checks = 0;
  for (const width of process.argv.includes("--flows-only")
    ? []
    : [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ]) {
      await go(path);
      for (const l of ["lv", "ru", "en"]) {
        await lang(l);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        const mode = {
          "/login": "login",
          "/register": "register",
          "/forgot-password": "forgot",
          "/reset-password": "reset",
        }[path];
        assert.equal(
          await page.locator("h1").innerText(),
          authMessages[l][mode + "Title"],
        );
        if (await page.locator("#auth-password").count()) {
          const eye = page.locator(".auth-visibility").first();
          assert.equal(
            await eye.getAttribute("aria-label"),
            authMessages[l].showPassword,
          );
          await eye.focus();
          await page.keyboard.press("Enter");
          assert.equal(
            await page.locator("#auth-password").getAttribute("type"),
            "text",
          );
          assert.equal(
            await eye.getAttribute("aria-label"),
            authMessages[l].hidePassword,
          );
          await page.keyboard.press("Space");
          assert.equal(
            await page.locator("#auth-password").getAttribute("type"),
            "password",
          );
        }
        const formBox = await page.locator(".auth-content").boundingBox();
        if (width >= 1024)
          assert.ok(formBox.width <= 560 && formBox.width >= 400);
        if (width <= 430) {
          const b = await page.locator(".auth-submit").boundingBox();
          assert.ok(Math.abs(b.width - formBox.width) < 2);
        }
        if ([390, 768, 1440].includes(width) && l === "ru") {
          await page.waitForTimeout(350);
          await page.screenshot({
            path: `/tmp/ag-auth-refined-${width}-${mode}-ru.png`,
            fullPage: true,
          });
        }
        assert.equal(
          await page
            .locator(".auth-page")
            .innerText()
            .then((x) => x.includes("auth.")),
          false,
        );
        checks++;
      }
      if (path === "/register") {
        await page.waitForTimeout(700);
        await page.screenshot({
          path: `/tmp/ag-auth-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("/register");
  await lang("en");
  await page.locator(".auth-submit").click();
  assert.equal(await page.locator("[aria-invalid=true]").count(), 3);
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill("long-password");
  await page.locator("#auth-repeat").fill("different-password");
  await page.locator(".auth-submit").click();
  assert.equal(
    await page.locator("#auth-repeat-help").innerText(),
    authMessages.en.passwordMismatch,
  );
  await page.locator("#auth-repeat").fill("long-password");
  await page.locator(".auth-consent input").check();
  requestDelay = 700;
  const buttonBefore = await page.locator(".auth-submit").boundingBox();
  await page.locator(".auth-submit").click();
  assert.equal(await page.locator("#auth-email").isDisabled(), true);
  const buttonLoading = await page.locator(".auth-submit").boundingBox();
  assert.equal(buttonBefore.width, buttonLoading.width);
  assert.equal(buttonBefore.height, buttonLoading.height);
  requestDelay = 0;
  await page.waitForURL(BASE + "/");
  const signup = requests.find((r) => r.path.endsWith("/signup"));
  assert.equal(signup.body.data.role, undefined);
  assert.equal(signup.body.data.privacy_accepted, true);
  await page.locator(".site-header .auth-control button").click();
  assert.equal(await page.locator(".account-email").innerText(), user.email);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/ag-auth-hero-account.png" });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".account-panel").count(), 0);
  assert.equal(
    await page
      .locator(".site-header .auth-control button")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.reload();
  await page.locator(".site-header .auth-control button").waitFor();
  assert.equal(await page.locator(".site-header .auth-control a").count(), 0);
  await go("/cenas");
  await page.locator(".site-header .auth-control button").click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/ag-auth-normal-account.png" });
  await page.locator(".account-panel button").click();
  await page.locator(".site-header .auth-control a").waitFor();
  assert.ok(page.url().endsWith("/cenas"));
  await go("/login");
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill("wrong-password");
  await page.locator(".auth-submit").click();
  await page.locator("[role=alert]").waitFor();
  assert.ok(
    !(await page.locator(".auth-page").innerText()).includes("Raw private"),
  );
  assert.equal(
    await page.locator("[role=alert]").innerText(),
    authMessages.en.credentials,
  );
  await page.locator("#auth-password").fill("long-password");
  await page.locator(".auth-submit").click();
  await page.waitForURL(BASE + "/");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator(".menu-toggle").click();
  await page.locator(".auth-mobile button").click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/ag-auth-mobile-account.png" });
  await page.locator(".auth-mobile .account-panel button").click();
  await page.locator(".mobile-menu").waitFor({ state: "hidden" });
  await go("/forgot-password");
  await page.locator("#auth-email").fill("unknown@example.invalid");
  await page.locator(".auth-submit").click();
  await page.locator(".auth-status").waitFor();
  assert.ok(
    (await page.locator(".auth-status").innerText()).includes(
      "If an account exists",
    ),
  );
  const recover = requests.find((r) => r.path.endsWith("/recover"));
  assert.ok(recover);
  await go(
    "/reset-password#access_token=" +
      token +
      "&refresh_token=test-refresh&token_type=bearer&expires_in=3600&type=recovery",
  );
  await page.locator("#auth-password").waitFor();
  assert.ok(!page.url().includes("access_token"));
  await page.locator("#auth-password").fill("new-long-password");
  await page.locator("#auth-repeat").fill("different");
  await page.locator(".auth-submit").click();
  assert.equal(
    await page.locator("#auth-repeat-help").innerText(),
    authMessages.en.passwordMismatch,
  );
  await page.locator("#auth-repeat").fill("new-long-password");
  await page.locator(".auth-submit").click();
  await page.locator(".auth-status").waitFor();
  assert.ok(
    (await page.locator(".auth-status").innerText()).includes(
      "new password has been saved",
    ),
  );
  await page.locator(".auth-status .auth-submit").click();
  await page.waitForURL(BASE + "/login");
  await page.waitForTimeout(380);
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill("new-long-password");
  await page.locator(".auth-submit").click();
  await page.waitForURL(BASE + "/");
  await page.locator(".menu-toggle").click();
  await page.locator(".auth-mobile button").click();
  await page.locator(".auth-mobile .account-panel button").click();
  await go("/reset-password#error=access_denied&error_code=otp_expired");
  assert.equal(await page.locator("#auth-password").count(), 0);
  assert.ok(!page.url().includes("error="));
  await go("/forgot-password");
  recoveryFailure = true;
  await page.locator("#auth-email").fill(user.email);
  await page.locator(".auth-submit").click();
  await page.locator("[role=alert]").waitFor();
  assert.equal(await page.locator(".auth-status[role=status]").count(), 0);
  recoveryFailure = false;
  duplicate = true;
  await go("/register");
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill("long-password");
  await page.locator("#auth-repeat").fill("long-password");
  await page.locator(".auth-consent input").check();
  await page.locator(".auth-submit").click();
  await page.locator("[role=alert]").waitFor();
  assert.equal(
    await page.locator("[role=alert]").innerText(),
    authMessages.en.duplicate,
  );
  duplicate = false;
  signUpConfirmation = true;
  await go("/register");
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill("long-password");
  await page.locator("#auth-repeat").fill("long-password");
  await page.locator(".auth-consent input").check();
  await page.locator(".auth-submit").click();
  await page.locator("[role=alert]").waitFor();
  assert.equal(
    await page.locator("[role=alert]").innerText(),
    authMessages.en.registrationUnavailable,
  );
  assert.equal(await page.locator(".auth-status[role=status]").count(), 0);
  assert.equal(
    await page
      .locator(".auth-page")
      .innerText()
      .then((x) => /confirm.*email/i.test(x)),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      layoutChecks: checks,
      flows: "register/login/persistence/logout/recovery/confirmation",
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
