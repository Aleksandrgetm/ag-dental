// Local-only contract tests; intercepted Auth/CMS, no Supabase writes or external requests.
const assert = require("node:assert/strict");
const manifest = require("../../../backend/internal/cms/content.json");
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
module.exports.createCMSFixture = async function (
  browser,
  locale = "en",
  width = 1440,
  errors = [],
  signedIn = true,
) {
  const { cmsMessages } = await import("../../src/i18n/cms.ts");
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(15000);
  const state = {
    role: "admin",
    identityStatus: 200,
    cmsOutage: false,
    session: clone(session),
    deleted: new Set(),
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
      if (session && !localStorage.getItem("sb-integration-test-auth-token"))
        localStorage.setItem(
          "sb-integration-test-auth-token",
          JSON.stringify(session),
        );
    },
    { locale, session: signedIn ? session : null },
  );
  await context.route("**/*", async (route) => {
    const req = route.request(),
      u = new URL(req.url());
    if (u.origin === new URL(BASE).origin && !u.pathname.startsWith("/api/"))
      return route.continue();
    if (u.hostname === "integration-test.supabase.co")
      return route.fulfill({
        json: u.pathname.endsWith("/user") ? user : state.session,
      });
    assert.equal(u.origin, new URL(BASE).origin, "unexpected external request");
    if (u.pathname === "/api/health")
      return route.fulfill({ json: { status: "ok" } });
    if (u.pathname === "/api/auth/me") {
      if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
      return route.fulfill({
        status: state.identityStatus,
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
    if (u.pathname.startsWith("/api/admin/cms/documents")) {
      assert.ok(
        req.headers().authorization?.startsWith("Bearer "),
        "missing verified session",
      );
      if (state.cmsOutage)
        return route.fulfill({
          status: 503,
          json: { error: "content_unavailable" },
        });
      if (state.role !== "admin")
        return route.fulfill({ status: 403, json: { error: "forbidden" } });
      const parts = u.pathname.split("/").filter(Boolean),
        key = decodeURIComponent(parts[4] || ""),
        action = parts[5];
      if (!key)
        return route.fulfill({
          json: {
            documents: [...state.rows.values()]
              .filter((r) => !state.deleted.has(r.document.key))
              .filter(
                (r) =>
                  !manifest.documents.find((d) => d.key === r.document.key)
                    .system_managed,
              )
              .map((r) => r.document),
          },
        });
      const row = state.rows.get(key);
      if (!row || state.deleted.has(key))
        return route.fulfill({
          status: 404,
          json: { error: "content_not_imported" },
        });
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
  async function rotate(sender) {
    state.session = {
      ...state.session,
      access_token: `${b64({ alg: "ES256" })}.${b64({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 7200 })}.${b64(crypto.randomUUID())}`,
    };
    await sender.evaluate((next) => {
      const key = "sb-integration-test-auth-token";
      localStorage.setItem(key, JSON.stringify(next));
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "TOKEN_REFRESHED", session: next });
      channel.close();
    }, state.session);
  }
  return { context, page, state, t: cmsMessages[locale], locale, rotate };
};
