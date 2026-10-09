import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAPIBase } from "../src/services/apiConfig.ts";
import { createBookingAPI } from "../src/services/booking/api.ts";
import { createAuthority, readIdentity } from "../src/services/admin/access.ts";
import { createAdminReader } from "../src/services/admin/dashboard.ts";
import {
  createBookingFlow,
  initialBookingState,
} from "../src/services/booking/flow.ts";

test("missing API configuration is unavailable without a fallback or import-time exception", async () => {
  for (const value of [undefined, null, "", "   "]) {
    assert.equal(resolveAPIBase(value, "https://preview.example/"), null);
  }
  // Native Node has no Vite env: importing the real bootstrap dependency must be safe.
  const { API_URL, getHealth } = await import("../src/services/api.ts");
  assert.equal(API_URL, null);
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error("Unexpected request");
  };
  try {
    await assert.rejects(getHealth(), /api_unavailable/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previous;
  }
});

test("explicit API addresses normalize safely; deployed pages cannot call loopback or malformed URLs", () => {
  const page = "https://preview.example/pieraksts";
  assert.equal(
    resolveAPIBase(" https://api.example/api/ ", page),
    "https://api.example/api",
  );
  assert.equal(resolveAPIBase("/api", page), "https://preview.example/api");
  for (const value of [
    "undefined",
    "api",
    "//localhost/api",
    "javascript:alert(1)",
    "https://user:password@api.example/api",
    "https://api.example/api?key=value",
    "https://api.example/api#fragment",
    "http://api.example/api",
  ]) {
    assert.equal(resolveAPIBase(value, page), null, value);
  }
  for (const host of [
    "localhost",
    "localhost.",
    "api.localhost",
    "127.0.0.1",
    "127.1",
    "[::1]",
    "[::ffff:127.0.0.1]",
    "0.0.0.0",
  ]) {
    assert.equal(resolveAPIBase(`https://${host}/api`, page), null, host);
  }
  assert.equal(
    resolveAPIBase("http://127.0.0.1:8080/api", "http://localhost:5173"),
    "http://127.0.0.1:8080/api",
  );
});

test("missing API blocks every booking operation and produces the existing unavailable flow", async () => {
  let calls = 0;
  const api = createBookingAPI("", async () => {
    calls++;
    throw Error("Unexpected request");
  });
  for (const operation of [
    () => api.services(),
    () => api.doctors("test"),
    () => api.availability("test", null, "2026-10-09"),
    () => api.create({}, "test", "untrusted-token"),
  ]) {
    await assert.rejects(
      operation(),
      (error) => error.code === "api_unavailable",
    );
  }
  const state = initialBookingState();
  const flow = createBookingFlow(state, {
    api,
    auth: {
      userID: () => null,
      register: async () => {
        throw Error("No signup");
      },
      token: async () => {
        throw Error("No token");
      },
    },
    storage: { read: () => null, write: () => {}, clear: () => {} },
  });
  await flow.loadServices();
  assert.equal(state.error, "api_unavailable");
  assert.deepEqual(state.services, []);
  assert.equal(state.receipt, null);
  assert.equal(state.step, 0);
  assert.equal(calls, 0);
});

test("unusable API configuration blocks admin identity and dashboard requests without granting a role", async () => {
  const identity = { id: "test-user", token: "untrusted-token" };
  let calls = 0;
  const transport = async () => {
    calls++;
    throw Error("Unexpected request");
  };
  for (const value of [
    undefined,
    "",
    "invalid",
    "//localhost/api",
    "http://localhost:8080/api",
    "https://127.0.0.1/api",
  ]) {
    const base = resolveAPIBase(value, "https://preview.example/admin") || "";
    let role = null;
    const authority = createAuthority(
      () => identity,
      (credentials, signal) => readIdentity(base, credentials, signal, transport),
      (state) => {
        role = state === "admin" || state === "user" ? state : null;
      },
    );
    assert.equal(await authority.verify(), "unavailable");
    assert.equal(role, null);
    assert.equal(authority.isAdmin(), false);
    const get = createAdminReader(
      base,
      {
        credentials: () => identity,
        reject: () => assert.fail("Missing configuration is not a rejected session"),
      },
      transport,
    );
    for (const path of [
      "/admin/booking/appointments",
      "/admin/booking/settings",
      "/booking/services",
    ]) {
      await assert.rejects(
        get(path, new AbortController().signal),
        (error) => error.kind === "unavailable",
      );
    }
  }
  assert.equal(calls, 0);
});
