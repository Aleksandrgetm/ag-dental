// Local-only contract tests; intercepted Auth/CMS, no Supabase writes or external requests.
const assert = require("node:assert/strict");
const manifest = require("../../../backend/internal/cms/content.json");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5185";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname))
  throw Error("Local preview required");
const dimensions = require("../../../backend/internal/media/registered_dimensions.json");
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
    uploadEnabled: false,
    uploadStatus: 200,
    uploadDelay: 200,
    uploadKeys: [],
    mediaRows: manifest.media.map((a) => ({
      id: a.id,
      url: a.url,
      protected: a.protected,
      origin: "registered",
      state: "ready",
      usages: [],
      metadata: { ...a, ...dimensions[a.id] },
    })),
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
          media: state.mediaRows
            .filter((a) => a.published_at)
            .map((a) => ({
              id: a.id,
              alt: a.metadata.alt,
              variants: a.metadata.variants,
            })),
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
    if (
      u.pathname.startsWith("/api/admin/cms/media") ||
      u.pathname.startsWith("/api/cms/media/")
    ) {
      const pub = u.pathname.startsWith("/api/cms/media/");
      if (!pub) {
        assert.ok(req.headers().authorization?.startsWith("Bearer "));
        if (state.role !== "admin")
          return route.fulfill({ status: 403, json: { error: "forbidden" } });
      }
      if (state.cmsOutage)
        return route.fulfill({
          status: 503,
          json: { error: "media_unavailable" },
        });
      const suffix = u.pathname.split("/media")[1].split("/").filter(Boolean),
        id = suffix[0],
        variant = suffix[1];
      if (!id && req.method() === "GET")
        return route.fulfill({
          json: {
            assets: state.mediaRows,
            upload_enabled: state.uploadEnabled,
            video_slots: false,
          },
        });
      if (!id && req.method() === "POST") {
        state.uploadKeys.push(req.headers()["idempotency-key"]);
        await new Promise((r) => setTimeout(r, state.uploadDelay));
        if (state.uploadStatus !== 200)
          return route.fulfill({
            status: state.uploadStatus,
            json: {
              error:
                state.uploadStatus === 422
                  ? "invalid_file"
                  : "media_unavailable",
            },
          });
        const id = "upload." + crypto.randomUUID().replaceAll("-", "");
        const body = req.postDataBuffer().toString();
        const name = body.match(/filename="([^"\r\n]+)"/)?.[1] || "test.png";
        const alt = JSON.parse(body.match(/name="alt"\r\n\r\n([^\r]+)/)[1]);
        const asset = {
          id,
          url: "cms-media:" + id,
          protected: false,
          origin: "upload",
          state: "ready",
          usages: [],
          created_at: new Date().toISOString(),
          metadata: {
            filename: name,
            kind: "image",
            bytes: 100,
            width: 64,
            height: 48,
            alt,
            variants: [
              {
                name: "display.webp",
                mime: "image/webp",
                width: 64,
                height: 48,
                bytes: 100,
              },
              {
                name: "medium.webp",
                mime: "image/webp",
                width: 64,
                height: 48,
                bytes: 100,
              },
              {
                name: "thumb.webp",
                mime: "image/webp",
                width: 64,
                height: 48,
                bytes: 100,
              },
            ],
          },
        };
        state.mediaRows.push(asset);
        return route.fulfill({ json: { asset, duplicate: false } });
      }
      const asset = state.mediaRows.find((a) => a.id === id);
      if (!asset || asset.protected || (pub && !asset.published_at))
        return route.fulfill({ status: 404, json: { error: "media_missing" } });
      if (req.method() === "POST" || req.method() === "DELETE") {
        const used = [...state.rows.values()].some((r) =>
          r.revisions.some((v) =>
            JSON.stringify(v.payload).includes(asset.url),
          ),
        );
        if (used)
          return route.fulfill({
            status: 409,
            json: { error: "media_referenced" },
          });
        if (req.method() === "DELETE")
          state.mediaRows = state.mediaRows.filter((a) => a.id !== id);
        else asset.state = "archived";
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9sAAAAASUVORK5CYII=",
          "base64",
        ),
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
        for (const asset of state.mediaRows) {
          if (JSON.stringify(rev.payload).includes(asset.url))
            asset.published_at = rev.published_at;
        }
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
