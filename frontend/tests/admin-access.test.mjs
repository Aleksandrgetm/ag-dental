import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAuthority,
  readIdentity,
  safeAdminReturn,
  AdminError,
} from "../src/services/admin/access.ts";
const id = "11111111-1111-4111-8111-111111111111";
const identity = { id, token: "opaque-test-token" };
test("admin return destinations are an exact internal allowlist", () => {
  for (const value of [
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/admin?url=https://evil.invalid",
    "/admin/../login",
    "/login",
    [" /admin"],
    "/%61dmin",
    "/admin\n",
  ])
    assert.equal(safeAdminReturn(value), null);
  assert.equal(safeAdminReturn("/admin/media"), "/admin/media");
});
test("identity verification trusts only the same server-verified subject and role, with safe failures", async () => {
  for (const [status, body, expected] of [
    [200, { id, role: "admin" }, "admin"],
    [200, { id, role: "user" }, "user"],
    [200, { id: "another", role: "admin" }, "unavailable"],
    [200, { id, role: "owner" }, "unavailable"],
    [401, {}, "unauthorized"],
    [403, {}, "forbidden"],
    [503, { error: "SQL private details" }, "unavailable"],
  ]) {
    const request = readIdentity(
      "https://api.invalid/api",
      identity,
      new AbortController().signal,
      async (url, options) => {
        assert.equal(url, "https://api.invalid/api/auth/me");
        assert.equal(options.headers.Authorization, "Bearer opaque-test-token");
        assert.equal(options.cache, "no-store");
        return new Response(JSON.stringify(body), { status });
      },
    );
    if (["admin", "user"].includes(expected))
      assert.equal(await request, expected);
    else
      await assert.rejects(
        request,
        (error) => error instanceof AdminError && error.message === expected,
      );
  }
});
test("guest/user denied, server admin admitted, pending/outage and revoked roles clear proof", async () => {
  let session = null,
    serverRole = "user",
    state;
  const auth = createAuthority(
    () => session,
    async () => {
      if (serverRole === "outage") throw Error("private");
      return serverRole;
    },
    (s) => (state = s),
  );
  assert.equal(await auth.verify(), "guest");
  assert.equal(auth.isAdmin(), false);
  session = { ...identity };
  assert.equal(await auth.verify(), "user");
  assert.equal(auth.isAdmin(), false);
  session.role = "admin";
  assert.equal(auth.isAdmin(), false);
  serverRole = "admin";
  const pending = auth.verify();
  assert.equal(state, "checking");
  assert.equal(auth.isAdmin(), false);
  await pending;
  assert.equal(auth.isAdmin(), true);
  serverRole = "user";
  await auth.verify();
  assert.equal(auth.isAdmin(), false);
  serverRole = "admin";
  await auth.verify();
  serverRole = "outage";
  await auth.verify();
  assert.equal(state, "unavailable");
  assert.equal(auth.isAdmin(), false);
});
test("late verification cannot restore access after logout, token change or rejection", async () => {
  let session = { ...identity },
    resolve;
  const auth = createAuthority(
    () => session,
    () => new Promise((r) => (resolve = r)),
    () => {},
  );
  let pending = auth.verify();
  session = null;
  auth.invalidate("guest");
  resolve("admin");
  await pending;
  assert.equal(auth.isAdmin(), false);
  session = { ...identity };
  pending = auth.verify();
  auth.invalidate("forbidden");
  resolve("admin");
  await pending;
  assert.equal(auth.isAdmin(), false);
  pending = auth.verify();
  session = { ...identity, token: "replacement" };
  resolve("admin");
  await pending;
  assert.equal(auth.isAdmin(), false);
});
