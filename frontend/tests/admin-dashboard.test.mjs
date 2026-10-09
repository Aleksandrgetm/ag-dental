import { test } from "node:test";
import assert from "node:assert/strict";
import {
  visits,
  settings,
  serviceCount,
  countLabel,
  createAdminReader,
  PAGE_LIMIT,
} from "../src/services/admin/dashboard.ts";
import { AdminError } from "../src/services/admin/access.ts";
const visit = {
  id: "test-record",
  first_name: "Test",
  last_name: "Patient",
  phone: "unneeded",
  email: "unneeded",
  auth_user_id: "unneeded",
  starts_at: "2026-10-09T09:00:00Z",
  status: "confirmed",
};
test("dashboard reads minimize patient data and keep empty, capped and unknown counts distinct", () => {
  const rows = visits({ appointments: [visit] });
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    "id",
    "name",
    "starts_at",
    "status",
  ]);
  assert.equal(countLabel(null), null);
  assert.equal(countLabel([]), "0");
  assert.equal(countLabel(Array(PAGE_LIMIT).fill(rows[0])), "50+");
  assert.throws(
    () => visits({ appointments: [{ ...visit, status: "invented" }] }),
    AdminError,
  );
  assert.throws(
    () => visits({ appointments: Array(51).fill(visit) }),
    AdminError,
  );
  assert.throws(() => visits({ error: "SQL" }), AdminError);
});
test("configuration and bookable catalog are validated instead of fabricating readiness or zero values", () => {
  const config = {
    confirmation_mode: "automatic",
    booking_horizon_days: 60,
    minimum_advance_minutes: 120,
    slot_interval_minutes: 15,
    timezone: "Europe/Riga",
    privacy_notice_version: null,
  };
  assert.equal(settings(config).privacy_notice_version, null);
  assert.equal(
    settings({ ...config, confirmation_mode: "manual" }).confirmation_mode,
    "manual",
  );
  for (const change of [
    { timezone: "UTC" },
    { confirmation_mode: "fake" },
    { slot_interval_minutes: 0 },
    { booking_horizon_days: -1 },
    { privacy_notice_version: 5 },
  ])
    assert.throws(() => settings({ ...config, ...change }), AdminError);
  assert.equal(serviceCount({ services: [] }), 0);
  assert.throws(() => serviceCount({ services: null }), AdminError);
});
test("privileged reads send bearer credentials, never writes, and propagate safe rejection", async () => {
  const rejected = [];
  const auth = {
    credentials: () => ({ id: "subject", token: "token" }),
    reject: (kind) => rejected.push(kind),
  };
  for (const [status, kind] of [
    [401, "unauthorized"],
    [403, "forbidden"],
    [500, "unavailable"],
  ]) {
    const reader = createAdminReader(
      "https://api.invalid/api",
      auth,
      async (url, init) => {
        assert.equal(init.method, "GET");
        assert.equal(init.headers.Authorization, "Bearer token");
        assert.equal(init.cache, "no-store");
        return new Response("private SQL details", { status });
      },
    );
    await assert.rejects(
      reader("/admin/booking/settings", new AbortController().signal),
      (e) => e.message === kind,
    );
  }
  assert.deepEqual(rejected, ["unauthorized", "forbidden"]);
  await assert.rejects(
    createAdminReader("https://api.invalid/api", auth)(
      "https://evil.invalid",
      new AbortController().signal,
    ),
    AdminError,
  );
});
test("in-flight response from a previous account or cancelled view cannot reach the dashboard", async () => {
  let identity = { id: "first", token: "token" },
    resolve;
  const read = createAdminReader(
    "https://api.invalid/api",
    { credentials: () => identity, reject: () => {} },
    () => new Promise((r) => (resolve = r)),
  );
  const task = read("/admin/booking/settings", new AbortController().signal);
  identity = { id: "second", token: "token" };
  resolve(new Response("{}"));
  await assert.rejects(task, (e) => e.name === "AbortError");
  const controller = new AbortController(),
    next = read("/admin/booking/settings", controller.signal);
  controller.abort();
  resolve(new Response("{}"));
  await assert.rejects(next, (e) => e.name === "AbortError");
});
