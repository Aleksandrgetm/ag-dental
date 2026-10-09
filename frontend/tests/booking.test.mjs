import { test } from "node:test";
import assert from "node:assert/strict";
import { createBookingAPI } from "../src/services/booking/api.ts";
import {
  createBookingFlow,
  initialBookingState,
  validateContact,
} from "../src/services/booking/flow.ts";
import { bookingStorage } from "../src/services/booking/storage.ts";
import {
  calendarCells,
  monthDates,
  shiftMonth,
  clinicDate,
  timeLabel,
  slotKey,
  duration,
  weekdays,
  localized,
} from "../src/services/booking/calendar.ts";
import { BookingError } from "../src/services/booking/types.ts";
import { bookingMessages } from "../src/i18n/booking.ts";
import { createDemoClients } from "../src/services/booking/demo.ts";
import { services as websiteServices } from "../src/content/clinic.ts";
import { localizedPrices } from "../src/content/pricing.ts";
const s1 = "11111111-1111-4111-8111-111111111111",
  s2 = "11111111-1111-4111-8111-111111111112",
  d1 = "22222222-2222-4222-8222-222222222221",
  d2 = "22222222-2222-4222-8222-222222222222";
const services = [s1, s2].map((id, i) => ({
  id,
  slug: `test-${i}`,
  name_lv: "Tests",
  name_ru: "Тест",
  name_en: "Test",
  duration_minutes: 30,
  provenance: "development_fixture",
}));
const doctors = [d1, d2].map((id) => ({
  id,
  name: "TEST",
  provenance: "development_fixture",
}));
const slot = {
  doctor_id: d1,
  starts_at: "2026-10-12T09:00:00Z",
  ends_at: "2026-10-12T09:30:00Z",
};
const receipt = {
  ...slot,
  id: s2,
  service_id: s1,
  booking_reference: "TEST-ONLY",
  status: "confirmed",
};
const contact = {
  first_name: " Test ",
  last_name: "Person",
  email: "test@example.invalid",
  phone: "+371 20000000",
};
function fixture(overrides = {}, options = {}) {
  let clock = Date.parse("2026-10-08T06:00:00Z"),
    user = null,
    saved = null,
    posts = [],
    registrations = 0;
  const state = initialBookingState(new Date(clock));
  const api = {
    services: async () => ({ services, privacy_notice_version: "test-v1" }),
    doctors: async () => doctors,
    availability: async (s, d, date) => ({
      slots: date === "2026-10-12" ? [{ ...slot, doctor_id: d || d1 }] : [],
      timezone: "Europe/Riga",
      privacy_notice_version: "test-v1",
    }),
    create: async (request, key, token) => {
      posts.push({ request, key, token });
      return receipt;
    },
    ...overrides,
  };
  const auth = {
    userID: () => user,
    token: async (expected) => {
      if (!expected) return undefined;
      if (expected !== user) throw new BookingError(401, "session_changed");
      return user ? "test-token" : undefined;
    },
    register: async () => {
      registrations++;
      user = s2;
      return null;
    },
  };
  const storage = {
    read: () => saved,
    write: (v) => {
      saved = structuredClone(v);
    },
    clear: () => {
      saved = null;
    },
  };
  const flow = createBookingFlow(state, {
    api,
    auth,
    storage,
    now: () => clock,
    uuid: () => crypto.randomUUID(),
    ...options,
  });
  const ready = async () => {
    await flow.loadServices();
    await flow.selectService(s1);
    await flow.next();
    await flow.next();
    await flow.selectDate("2026-10-12");
    flow.selectSlot(state.days["2026-10-12"].slots[0]);
    await flow.next();
    state.contact = { ...contact };
    state.privacy = true;
    await flow.next();
    assert.equal(state.step, 4);
  };
  return {
    state,
    api,
    auth,
    storage,
    flow,
    ready,
    posts,
    setUser: (v) => {
      user = v;
    },
    tick: (ms) => {
      clock += ms;
    },
    saved: () => saved,
    registrations: () => registrations,
  };
}
test("loads real catalog contract, eligible doctors, bounded daily availability, selection and review without posting", async () => {
  const f = fixture();
  await f.ready();
  assert.equal(f.state.doctorChoice, "any");
  assert.equal(f.state.slot.doctor_id, d1);
  assert.equal(f.posts.length, 0);
  assert.equal(f.state.noticeVersion, "test-v1");
});
test("service and doctor changes invalidate dependent selections, consent and calendar cache", async () => {
  const f = fixture();
  await f.ready();
  f.flow.edit(1);
  f.flow.selectDoctor(d2);
  assert.equal(f.state.slot, null);
  assert.equal(f.state.date, "");
  assert.equal(f.state.privacy, false);
  f.flow.edit(0);
  await f.flow.selectService(s2);
  assert.equal(f.state.serviceID, s2);
  assert.equal(f.state.doctorChoice, "any");
  assert.deepEqual(f.state.days, {});
});
test("one eligible doctor is selected automatically; empty catalog and no eligible doctors cannot advance", async () => {
  const f = fixture({ doctors: async () => [doctors[0]] });
  await f.ready();
  assert.equal(f.state.doctorChoice, d1);
  const g = fixture({
    services: async () => ({ services: [], privacy_notice_version: null }),
  });
  await g.flow.loadServices();
  await g.flow.next();
  assert.equal(g.state.step, 0);
  const h = fixture({ doctors: async () => [] });
  await h.flow.loadServices();
  await h.flow.selectService(s1);
  await h.flow.next();
  await h.flow.next();
  assert.equal(h.state.step, 1);
});
test("demo preserves any-specialist choice with one named doctor without changing production defaults", async () => {
  const f = fixture(
    { doctors: async () => [{ ...doctors[0], name: "Dr. Anda Gutovska" }] },
    { allowAnyWithSingleDoctor: true },
  );
  await f.ready();
  assert.equal(f.state.doctorChoice, "any");
  f.flow.edit(1);
  f.flow.selectDoctor(d1);
  assert.equal(f.state.doctorChoice, d1);
  f.flow.selectDoctor("any");
  assert.equal(f.state.doctorChoice, "any");
});
test("calendar handles Monday weeks, leap years, month/year boundaries and Riga DST repeated hours", () => {
  assert.equal(monthDates("2028-02").length, 29);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(calendarCells("2026-10")[3], "2026-10-01");
  assert.equal(clinicDate(new Date("2026-01-01T22:30:00Z")), "2026-01-02");
  for (const locale of ["lv", "ru", "en"]) {
    assert.equal(timeLabel("2026-03-29T00:30:00Z", locale), "02:30");
    assert.equal(timeLabel("2026-03-29T01:00:00Z", locale), "04:00");
    assert.equal(timeLabel("2026-01-15T09:00:00Z", locale), "11:00");
    assert.equal(timeLabel("2026-07-15T09:00:00Z", locale), "12:00");
    assert.equal(timeLabel("2026-10-25T00:30:00Z", locale), "03:30");
    assert.equal(timeLabel("2026-10-25T01:30:00Z", locale), "03:30");
  }
  // Repeated local hours remain distinct instants/selection keys, even without offsets in labels.
  assert.notEqual(
    slotKey({ ...slot, starts_at: "2026-10-25T00:30:00Z" }),
    slotKey({ ...slot, starts_at: "2026-10-25T01:30:00Z" }),
  );
  assert.equal(duration(slot), 30);
  assert.equal(weekdays("lv").length, 7);
});
test("month requests are bounded to two, cached, and stop on outage", async () => {
  let active = 0,
    max = 0,
    count = 0;
  const f = fixture({
    availability: async () => {
      count++;
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return {
        slots: [],
        timezone: "Europe/Riga",
        privacy_notice_version: "v1",
      };
    },
  });
  await f.flow.loadServices();
  await f.flow.selectService(s1);
  await f.flow.loadMonth();
  assert.equal(max, 2);
  assert.equal(count, 24);
  await f.flow.loadMonth();
  assert.equal(count, 24);
  await f.flow.changeMonth(1);
  assert.equal(count, 54);
  assert.equal(f.state.month, "2026-11");
  f.api.availability = async () => {
    count++;
    throw new BookingError(503, "booking_unavailable");
  };
  await f.flow.loadMonth(true);
  assert.equal(count, 56);
  assert.equal(f.state.error, "availability");
});
test("late doctor responses cannot overwrite a newer service selection", async () => {
  let finish;
  const f = fixture({
    doctors: async (id) =>
      id === s1 ? await new Promise((r) => (finish = r)) : [doctors[1]],
  });
  await f.flow.loadServices();
  const old = f.flow.selectService(s1);
  await f.flow.selectService(s2);
  finish([doctors[0]]);
  await old;
  assert.equal(f.state.doctorChoice, d2);
});
test("late availability responses cannot repopulate a reset doctor/calendar", async () => {
  let finish = [];
  const f = fixture({
    availability: async () => await new Promise((r) => finish.push(r)),
  });
  await f.flow.loadServices();
  await f.flow.selectService(s1);
  const old = f.flow.loadMonth();
  f.flow.selectDoctor(d2);
  finish.forEach((r) =>
    r({ slots: [slot], timezone: "Europe/Riga", privacy_notice_version: "v1" }),
  );
  await old;
  assert.deepEqual(f.state.days, {});
  assert.equal(f.state.monthLoading, false);
});
test("refresh removes disappeared slots and resets consent on privacy-version changes", async () => {
  const f = fixture();
  await f.ready();
  f.flow.edit(2);
  f.api.availability = async () => ({
    slots: [],
    timezone: "Europe/Riga",
    privacy_notice_version: "new",
  });
  await f.flow.selectDate("2026-10-12");
  assert.equal(f.state.slot, null);
  assert.equal(f.state.privacy, false);
  assert.equal(f.state.notice, "slotChanged");
});
test("contact validation and password mismatch prevent review and submission", async () => {
  assert.deepEqual(validateContact(contact, true), {});
  for (const [field, value] of [
    ["phone", "+1abc1234567"],
    ["email", "invalid"],
    ["first_name", "a".repeat(101)],
  ])
    assert.ok(validateContact({ ...contact, [field]: value }, true)[field]);
  assert.equal(validateContact(contact, false).privacy, "privacy");
  const f = fixture();
  await f.ready();
  f.flow.edit(3);
  f.state.createAccount = true;
  f.state.password = "password123";
  f.state.repeat = "mismatch";
  await f.flow.next();
  assert.equal(f.state.step, 3);
  assert.equal(f.state.errors.repeat, "passwordMismatch");
  assert.equal(f.posts.length, 0);
});
test("guest create sends exact API fields, persists intent first, records real receipt and purges contact data", async () => {
  const f = fixture();
  await f.ready();
  f.api.create = async (req, key, token) => {
    assert.equal(f.saved().intent.key, key);
    assert.equal(token, undefined);
    assert.deepEqual(
      Object.keys(req).sort(),
      [
        "service_id",
        "doctor_id",
        "starts_at",
        "first_name",
        "last_name",
        "email",
        "phone",
        "privacy_acknowledged",
        "privacy_notice_version",
      ].sort(),
    );
    assert.equal(req.first_name, "Test");
    return receipt;
  };
  await f.flow.submit();
  assert.equal(f.state.receipt.status, "confirmed");
  assert.equal(f.saved().intent, null);
  assert.equal(f.state.contact.email, "");
  assert.ok(!JSON.stringify(f.saved()).includes(contact.email));
});
test("authenticated booking uses the same user and bearer token, no registration", async () => {
  const f = fixture();
  f.setUser(s2);
  await f.ready();
  await f.flow.submit();
  assert.equal(f.posts[0].token, "test-token");
  assert.equal(f.registrations(), 0);
});
test("optional registration happens once before booking and survives an uncertain booking result", async () => {
  const f = fixture();
  await f.ready();
  f.state.createAccount = true;
  f.state.password = f.state.repeat = "long-password";
  let attempts = 0;
  f.api.create = async () => {
    if (!attempts++) throw new BookingError(0, "network");
    return receipt;
  };
  await f.flow.submit();
  assert.equal(f.state.accountState, "created");
  assert.equal(f.state.receipt, null);
  assert.equal(f.state.password, "");
  await f.flow.submit();
  assert.equal(f.registrations(), 1);
  assert.equal(f.state.receipt.status, "confirmed");
});
test("failed or confirmation-required registration never creates a booking until explicit guest choice", async () => {
  for (const error of ["emailInUse", "registrationUnavailable"]) {
    const f = fixture();
    await f.ready();
    f.state.createAccount = true;
    f.state.password = f.state.repeat = "long-password";
    f.auth.register = async () => error;
    await f.flow.submit();
    assert.equal(f.posts.length, 0);
    await f.flow.submit();
    assert.equal(f.posts.length, 0);
    f.flow.chooseGuest();
    await f.flow.submit();
    assert.equal(f.posts.length, 1);
    assert.equal(f.state.accountState, "guest");
    assert.equal(f.state.receipt.status, "confirmed");
  }
});
test("slot conflict returns to times, preserves contacts and releases only rejected intent", async () => {
  const f = fixture({
    create: async () => {
      throw new BookingError(409, "slot_unavailable");
    },
  });
  await f.ready();
  await f.flow.submit();
  assert.equal(f.state.step, 2);
  assert.equal(f.state.slot, null);
  assert.equal(f.state.contact.email, contact.email);
  assert.equal(f.saved(), null);
  assert.equal(f.state.notice, "slotChanged");
});
test("timeout retry after reload uses identical payload/key/identity and restored slot; terminal statuses remain truthful", async () => {
  const f = fixture({
    create: async () => {
      throw new BookingError(0, "network");
    },
  });
  await f.ready();
  await f.flow.submit();
  const pending = structuredClone(f.saved());
  f.flow.edit(0);
  assert.equal(f.state.step, 4);
  const fresh = initialBookingState();
  let received;
  const api = {
    ...f.api,
    create: async (...args) => {
      received = args;
      return { ...receipt, status: "cancelled" };
    },
  };
  const flow = createBookingFlow(fresh, {
    api,
    auth: f.auth,
    storage: f.storage,
  });
  flow.restore();
  assert.deepEqual(fresh.slot, slot);
  assert.equal(fresh.password, "");
  await flow.submit();
  assert.deepEqual(received.slice(0, 2), [
    pending.intent.request,
    pending.intent.key,
  ]);
  assert.equal(fresh.receipt.status, "cancelled");
});
test("duplicate clicks result in one create; pending status is never presented as confirmed", async () => {
  let finish,
    count = 0;
  const f = fixture({
    create: async () => {
      count++;
      return await new Promise((r) => (finish = r));
    },
  });
  await f.ready();
  const first = f.flow.submit();
  await Promise.resolve();
  await f.flow.submit();
  assert.equal(count, 1);
  finish({ ...receipt, status: "pending" });
  await first;
  assert.equal(f.state.receipt.status, "pending");
});
test("idempotency conflict retains original intent, never rotates or edits payload", async () => {
  const f = fixture({
    create: async () => {
      throw new BookingError(409, "idempotency_conflict");
    },
  });
  await f.ready();
  await f.flow.submit();
  const key = f.state.intent.key;
  await f.flow.submit();
  assert.equal(f.state.intent.key, key);
  assert.equal(f.state.error, "idempotency_conflict");
  assert.equal(f.state.receipt, null);
});
test("401 refresh retries once with same key and 429 respects retry time", async () => {
  const f = fixture();
  f.setUser(s2);
  await f.ready();
  let tries = 0,
    keys = [],
    refresh = false;
  f.auth.token = async (id, force) => {
    assert.equal(id, s2);
    refresh = force || false;
    return force ? "new" : "old";
  };
  f.api.create = async (req, key, token) => {
    keys.push(key);
    if (!tries++) throw new BookingError(401, "unauthorized");
    assert.equal(token, "new");
    return receipt;
  };
  await f.flow.submit();
  assert.equal(refresh, true);
  assert.equal(new Set(keys).size, 1);
  const g = fixture();
  await g.ready();
  let count = 0;
  g.api.create = async () => {
    count++;
    throw new BookingError(429, "rate_limited", 60);
  };
  await g.flow.submit();
  await g.flow.submit();
  assert.equal(count, 1);
  g.tick(60001);
  await g.flow.submit();
  assert.equal(count, 2);
});
test("changed authenticated identity never downgrades to guest; guest retries stay guests after login", async () => {
  const f = fixture({
    create: async () => {
      throw new BookingError(0, "network");
    },
  });
  f.setUser(s2);
  await f.ready();
  await f.flow.submit();
  f.setUser(null);
  await f.flow.submit();
  assert.equal(f.state.error, "session_changed");
  assert.equal(f.state.intent.userID, s2);
  const guest = fixture({
    create: async () => {
      throw new BookingError(0, "network");
    },
  });
  await guest.ready();
  await guest.flow.submit();
  const originalKey = guest.state.intent.key;
  guest.setUser(s2);
  guest.api.create = async (_request, key, token) => {
    assert.equal(key, originalKey);
    assert.equal(token, undefined);
    return receipt;
  };
  await guest.flow.submit();
  assert.equal(guest.state.receipt.status, "confirmed");
});
test("storage blocked or corrupt fails closed; storage excludes credentials and preserves full request", async () => {
  const f = fixture();
  await f.ready();
  f.storage.write = () => {
    throw Error("blocked");
  };
  await f.flow.submit();
  assert.equal(f.posts.length, 0);
  assert.equal(f.state.error, "storage");
  let raw = "{";
  const store = bookingStorage({
    getItem: () => raw,
    setItem: (k, v) => {
      raw = v;
    },
    removeItem: () => {
      raw = null;
    },
  });
  assert.throws(() => store.read(), /saved_intent_invalid/);
  const g = fixture({
    create: async () => {
      throw Error("network");
    },
  });
  await g.ready();
  await g.flow.submit();
  store.write(g.saved());
  assert.equal(store.read().intent.key, g.saved().intent.key);
  assert.ok(!raw.includes("password"));
  const invalid = JSON.parse(raw);
  invalid.intent.request.price = 1;
  raw = JSON.stringify(invalid);
  assert.throws(() => store.read(), /saved_intent_invalid/);
});
test("API contract: any-doctor omitted, headers exact, malformed success uncertain, errors sanitized, abort respected", async () => {
  const requests = [];
  let data = {
      slots: [slot],
      timezone: "Europe/Riga",
      privacy_notice_version: "v1",
    },
    status = 200;
  const api = createBookingAPI("/api", async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Retry-After": "12" },
    });
  });
  await api.availability(s1, "", "2026-10-12");
  assert.ok(!requests[0].url.includes("doctor_id"));
  data = { ...receipt, email: "unexpected@example.invalid" };
  const publicReceipt = await api.create(
    {
      ...contact,
      service_id: s1,
      doctor_id: d1,
      starts_at: slot.starts_at,
      privacy_acknowledged: true,
      privacy_notice_version: "v1",
    },
    "key",
    "token",
  );
  assert.equal(requests[1].init.headers.Authorization, "Bearer token");
  assert.deepEqual(publicReceipt, receipt);
  assert.equal(requests[1].init.headers["Idempotency-Key"], "key");
  data = { unexpected: "private" };
  await assert.rejects(
    () => api.create({}, "key"),
    (e) => e.status === 0 && e.code === "invalid_response",
  );
  status = 409;
  data = { error: "slot_unavailable", detail: "private" };
  await assert.rejects(
    () => api.create({}, "key"),
    (e) => e.status === 409 && e.message === "slot_unavailable",
  );
  const abort = new AbortController();
  abort.abort();
  const failing = createBookingAPI("/api", async () => {
    throw Error();
  });
  await assert.rejects(
    () => failing.services(abort.signal),
    (e) => e.name === "AbortError",
  );
});
test("all locales have complete booking strings and service labels never fall back to Latvian", () => {
  for (const language of ["lv", "ru", "en"]) {
    assert.deepEqual(
      Object.keys(bookingMessages[language]).sort(),
      Object.keys(bookingMessages.en).sort(),
    );
    assert.ok(
      Object.values(bookingMessages[language]).every(
        (v) => typeof v === "string" && v.length,
      ),
    );
  }
  assert.equal(localized(services[0], "name", "ru"), "Тест");
  assert.equal(localized({ ...services[0], name_ru: "" }, "name", "ru"), "");
});
test("demo executes all operations, including optional registration, without any network transport", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error("Demo must never fetch");
  };
  try {
    const { api, auth } = createDemoClients();
    const catalog = await api.services();
    assert.equal(catalog.services.length, websiteServices.length);
    for (const service of catalog.services) {
      const source = websiteServices.find((item) => item.slug === service.slug);
      assert.ok(source);
      for (const locale of ["lv", "ru", "en"]) {
        assert.equal(service[`name_${locale}`], source.title[locale]);
        assert.equal(service[`description_${locale}`], source.short[locale]);
        assert.equal(
          service.category.title[locale],
          localizedPrices[source.category].title[locale],
        );
        assert.equal(service[`price_display_${locale}`], undefined);
      }
      assert.equal(service.category.id, String(source.category));
      assert.equal(service.duration_minutes, null);
      assert.deepEqual(
        (await api.doctors(service.id)).map((d) => d.name),
        ["Dr. Anda Gutovska"],
      );
    }
    const docs = await api.doctors(catalog.services[0].id);
    assert.equal(docs.length, 1);
    assert.deepEqual(await api.doctors("not-a-demo-service"), []);
    const dates = monthDates(clinicDate().slice(0, 7)).filter(
      (d) => d >= clinicDate(),
    );
    let available;
    for (const date of dates) {
      const result = await api.availability(catalog.services[0].id, "", date);
      if (result.slots.length) {
        available = result.slots[0];
        break;
      }
    }
    if (!available) {
      const next = monthDates(shiftMonth(clinicDate().slice(0, 7), 1));
      for (const date of next) {
        const result = await api.availability(catalog.services[0].id, "", date);
        if (result.slots.length) {
          available = result.slots[0];
          break;
        }
      }
    }
    assert.ok(available);
    const selectedDate = clinicDate(new Date(available.starts_at));
    const any = await api.availability(
      catalog.services[0].id,
      "",
      selectedDate,
    );
    const named = await api.availability(
      catalog.services[0].id,
      docs[0].id,
      selectedDate,
    );
    assert.deepEqual(named, any);
    assert.deepEqual(
      (
        await api.availability(
          catalog.services[0].id,
          "unknown-doctor",
          selectedDate,
        )
      ).slots,
      [],
    );
    assert.equal(
      await auth.register("test@example.invalid", "test", "test", true),
      null,
    );
    const request = {
      ...contact,
      ...available,
      service_id: catalog.services[0].id,
    };
    const result = await api.create(request, "demo-key");
    assert.match(result.booking_reference, /^DEMO-/);
    assert.deepEqual(await api.create(request, "demo-key"), result);
  } finally {
    globalThis.fetch = previous;
  }
});
