import { validateAuth } from "../authValidation.ts";
import { clinicDate, monthDates, shiftMonth, slotKey } from "./calendar.ts";
import {
  BookingError,
  type BookingAPI,
  type BookingAuth,
  type BookingStorage,
  type Contact,
  type Doctor,
  type Intent,
  type Receipt,
  type Service,
  type Slot,
  type Availability,
} from "./types.ts";
export interface DayState {
  status: "loading" | "ready" | "error";
  slots: Slot[];
}
export const blankContact = (): Contact => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
});
export function initialBookingState(now = new Date()) {
  return {
    step: 0,
    today: clinicDate(now),
    month: clinicDate(now).slice(0, 7),
    services: [] as Service[],
    doctors: [] as Doctor[],
    serviceID: "",
    doctorChoice: "",
    date: "",
    slot: null as Slot | null,
    days: {} as Record<string, DayState>,
    noticeVersion: null as string | null,
    privacy: false,
    contact: blankContact(),
    createAccount: false,
    password: "",
    repeat: "",
    accountState: "idle" as
      "idle" | "created" | "failed" | "incomplete" | "guest",
    accountError: "",
    catalogLoading: false,
    doctorsLoading: false,
    monthLoading: false,
    dayLoading: false,
    submitting: false,
    error: "",
    notice: "",
    errors: {} as Record<string, string>,
    retryAt: 0,
    intent: null as Intent | null,
    receipt: null as Receipt | null,
    resultService: null as Service | null,
    resultDoctor: null as Doctor | null,
    storageBlocked: false,
  };
}
export type BookingState = ReturnType<typeof initialBookingState>;
export function validateContact(
  contact: Contact,
  consent: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of ["first_name", "last_name"] as const) {
    const text = contact[field].trim();
    if (
      !text ||
      [...text].length > 100 ||
      /[\u0000-\u001f\u007f-\u009f]/.test(text)
    )
      errors[field] = "name";
  }
  if (
    contact.email.trim().length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact.email.trim())
  )
    errors.email = "email";
  const digits = contact.phone.replace(/\D/g, "").length;
  if (
    !/^\+?[0-9 ()-]{7,30}$/.test(contact.phone.trim()) ||
    digits < 7 ||
    digits > 15
  )
    errors.phone = "phone";
  if (!consent) errors.privacy = "privacy";
  return errors;
}
export function createBookingFlow(
  state: BookingState,
  deps: {
    api: BookingAPI;
    auth: BookingAuth;
    storage: BookingStorage;
    now?: () => number;
    uuid?: () => string;
    allowAnyWithSingleDoctor?: boolean;
  },
) {
  const { api, auth, storage } = deps,
    now = deps.now || Date.now,
    uuid = deps.uuid || (() => crypto.randomUUID());
  let monthController: AbortController | undefined,
    doctorController: AbortController | undefined,
    dayController: AbortController | undefined;
  let monthRevision = 0,
    doctorRevision = 0,
    dayRevision = 0;
  const cache = new Map<string, { value: Availability; at: number }>();
  const locked = () =>
    state.submitting ||
    !!state.intent ||
    !!state.receipt ||
    state.storageBlocked;
  const service = () =>
    state.services.find((s) => s.id === state.serviceID) || null;
  const chosenDoctor = () =>
    state.doctors.find((d) => d.id === state.slot?.doctor_id) || null;
  function saved() {
    return {
      version: 1 as const,
      intent: state.intent,
      receipt: state.receipt,
      service: state.resultService,
      doctor: state.resultDoctor,
    };
  }
  function persist() {
    try {
      storage.write(saved());
      return true;
    } catch {
      state.error = "storage";
      return false;
    }
  }
  function clearIntent() {
    state.intent = null;
    try {
      storage.clear();
    } catch {
      state.storageBlocked = true;
      state.error = "storage";
    }
  }
  function cancelAvailability() {
    monthRevision++;
    dayRevision++;
    monthController?.abort();
    dayController?.abort();
    state.monthLoading = false;
    state.dayLoading = false;
  }
  function resetTime() {
    cancelAvailability();
    cache.clear();
    state.days = {};
    state.date = "";
    state.slot = null;
    state.privacy = false;
    state.month = clinicDate(new Date(now())).slice(0, 7);
  }
  function acceptNotice(version: string | null) {
    if (state.noticeVersion !== version) {
      if (state.privacy) state.notice = "privacyChanged";
      state.privacy = false;
    }
    state.noticeVersion = version;
  }
  function restore() {
    try {
      const previous = storage.read();
      if (!previous) return;
      state.intent = previous.intent;
      state.receipt = previous.receipt;
      state.resultService = previous.service;
      state.resultDoctor = previous.doctor;
      if (state.intent) {
        const i = state.intent;
        state.services = [i.service];
        state.doctors = [i.doctor];
        state.serviceID = i.request.service_id;
        state.slot = { ...i.slot };
        state.doctorChoice = i.request.doctor_id;
        state.date = clinicDate(new Date(i.request.starts_at));
        state.step = 4;
        state.contact = {
          first_name: i.request.first_name,
          last_name: i.request.last_name,
          email: i.request.email,
          phone: i.request.phone,
        };
        state.noticeVersion = i.request.privacy_notice_version;
        state.privacy = i.request.privacy_acknowledged;
        state.notice = "resumed";
      }
    } catch {
      state.storageBlocked = true;
      state.error = "saved_intent_invalid";
    }
  }
  async function loadServices() {
    if (
      state.intent ||
      state.receipt ||
      state.storageBlocked ||
      state.catalogLoading
    )
      return;
    state.catalogLoading = true;
    state.error = "";
    try {
      const result = await api.services();
      state.services = result.services;
      acceptNotice(result.privacy_notice_version);
    } catch {
      state.error = "api_unavailable";
    } finally {
      state.catalogLoading = false;
    }
  }
  async function loadDoctors() {
    if (!state.serviceID || locked()) return;
    doctorController?.abort();
    doctorController = new AbortController();
    const revision = ++doctorRevision;
    const id = state.serviceID;
    state.doctorsLoading = true;
    state.error = "";
    try {
      const result = await api.doctors(id, doctorController.signal);
      if (revision !== doctorRevision) return;
      state.doctors = result;
      state.doctorChoice =
        result.length === 1 && !deps.allowAnyWithSingleDoctor
          ? result[0]!.id
          : result.length
            ? "any"
            : "";
    } catch (error) {
      if (
        revision === doctorRevision &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        state.error = "doctors";
    } finally {
      if (revision === doctorRevision) state.doctorsLoading = false;
    }
  }
  async function selectService(id: string) {
    if (
      locked() ||
      id === state.serviceID ||
      !state.services.some((s) => s.id === id)
    )
      return;
    state.serviceID = id;
    state.doctorChoice = "";
    state.doctors = [];
    resetTime();
    state.error = "";
    state.notice = "";
    await loadDoctors();
  }
  function selectDoctor(id: string) {
    if (
      locked() ||
      id === state.doctorChoice ||
      (id !== "any" && !state.doctors.some((d) => d.id === id))
    )
      return;
    state.doctorChoice = id;
    resetTime();
    state.error = "";
    state.notice = "";
  }
  async function loadMonth(force = false) {
    if (!state.serviceID || !state.doctorChoice || locked()) return;
    monthController?.abort();
    monthController = new AbortController();
    const signal = monthController.signal,
      revision = ++monthRevision;
    state.today = clinicDate(new Date(now()));
    state.monthLoading = true;
    state.error = "";
    const serviceID = state.serviceID,
      doctorID = state.doctorChoice === "any" ? "" : state.doctorChoice;
    const dates = monthDates(state.month).filter((d) => d >= state.today);
    const previous = state.days;
    state.days = Object.fromEntries(
      dates.map((d) => [d, previous[d] || { status: "loading", slots: [] }]),
    );
    let index = 0,
      fatal = false;
    async function worker() {
      while (index < dates.length && !signal.aborted && !fatal) {
        const date = dates[index++]!,
          key = `${serviceID}/${doctorID}/${date}`,
          cached = cache.get(key);
        try {
          const result =
            !force && cached && now() - cached.at < 30000
              ? cached.value
              : await api.availability(serviceID, doctorID, date, signal);
          if (revision !== monthRevision || signal.aborted) return;
          cache.set(key, { value: result, at: now() });
          while (cache.size > 93) cache.delete(cache.keys().next().value!);
          state.days[date] = { status: "ready", slots: result.slots };
          if (
            date === state.date &&
            state.slot &&
            !result.slots.some((s) => slotKey(s) === slotKey(state.slot!))
          ) {
            state.slot = null;
            state.notice = "slotChanged";
          }
          if (!result.privacy_notice_version) {
            fatal = true;
            state.error = "booking_not_configured";
          }
        } catch (error) {
          if (revision !== monthRevision || signal.aborted) return;
          state.days[date] = { status: "error", slots: [] };
          state.error =
            error instanceof BookingError &&
            error.code === "booking_not_configured"
              ? error.code
              : "availability";
          // Fail fast on an outage, rather than issuing a whole month of failing requests.
          fatal = true;
        }
      }
    }
    // At most two daily requests in flight; no background scan of later months.
    await Promise.all([worker(), worker()]);
    if (revision === monthRevision) {
      state.monthLoading = false;
      if (fatal)
        for (const d of dates)
          if (state.days[d]?.status === "loading")
            state.days[d] = { status: "error", slots: [] };
    }
  }
  async function changeMonth(offset: number) {
    if (locked()) return;
    const month = shiftMonth(state.month, offset);
    if (month < clinicDate(new Date(now())).slice(0, 7)) return;
    cancelAvailability();
    state.month = month;
    state.date = "";
    state.slot = null;
    state.days = {};
    await loadMonth();
  }
  async function selectDate(date: string) {
    if (
      locked() ||
      date < clinicDate(new Date(now())) ||
      !state.days[date]?.slots.length
    )
      return;
    dayController?.abort();
    dayController = new AbortController();
    const revision = ++dayRevision;
    if (date !== state.date) state.slot = null;
    state.date = date;
    state.dayLoading = true;
    state.error = "";
    try {
      const result = await api.availability(
        state.serviceID,
        state.doctorChoice === "any" ? "" : state.doctorChoice,
        date,
        dayController.signal,
      );
      if (revision !== dayRevision) return;
      state.days[date] = { status: "ready", slots: result.slots };
      acceptNotice(result.privacy_notice_version);
      if (!result.privacy_notice_version) {
        state.slot = null;
        state.error = "booking_not_configured";
      }
      if (
        state.slot &&
        !result.slots.some((s) => slotKey(s) === slotKey(state.slot!))
      ) {
        state.slot = null;
        state.notice = "slotChanged";
      }
    } catch {
      if (revision === dayRevision) {
        state.slot = null;
        state.days[date] = { status: "error", slots: [] };
        state.error = "availability";
      }
    } finally {
      if (revision === dayRevision) state.dayLoading = false;
    }
  }
  function selectSlot(slot: Slot) {
    if (
      locked() ||
      state.dayLoading ||
      !state.noticeVersion ||
      !state.days[state.date]?.slots.some((s) => slotKey(s) === slotKey(slot))
    )
      return;
    state.slot = { ...slot };
    state.notice = "";
  }
  function validate() {
    state.errors = validateContact(state.contact, state.privacy);
    if (
      state.createAccount &&
      !auth.userID() &&
      state.accountState !== "guest"
    ) {
      const errors = validateAuth(
        "register",
        state.contact.email,
        state.password,
        state.repeat,
        state.privacy,
      );
      for (const field of ["password", "repeat"])
        if (errors[field]) state.errors[field] = errors[field]!;
    }
    return Object.keys(state.errors).length === 0;
  }
  async function next() {
    if (locked()) return;
    if (state.step === 0 && service() && state.noticeVersion) {
      state.step = 1;
      if (!state.doctors.length && !state.doctorsLoading) await loadDoctors();
    } else if (
      state.step === 1 &&
      state.doctorChoice &&
      state.doctors.length &&
      !state.doctorsLoading
    ) {
      state.step = 2;
      await loadMonth();
    } else if (state.step === 2 && state.slot && !state.dayLoading)
      state.step = 3;
    else if (state.step === 3 && validate()) state.step = 4;
  }
  function edit(step: number) {
    if (!locked() && step >= 0 && step < state.step) {
      state.step = step;
      state.error = "";
    }
  }
  function chooseGuest() {
    if (locked()) return;
    state.createAccount = false;
    state.password = "";
    state.repeat = "";
    state.accountState = "guest";
    state.accountError = "";
    state.error = "";
  }
  function retryAccount() {
    if (locked()) return;
    state.accountState = "idle";
    state.accountError = "";
    state.step = 3;
  }
  async function submit() {
    if (
      state.submitting ||
      state.receipt ||
      state.storageBlocked ||
      now() < state.retryAt
    )
      return;
    if (
      !state.intent &&
      (!validate() ||
        !state.slot ||
        !service() ||
        !chosenDoctor() ||
        !state.noticeVersion)
    ) {
      state.step = 3;
      return;
    }
    state.submitting = true;
    state.error = "";
    try {
      if (!state.intent) {
        if (
          state.createAccount &&
          !auth.userID() &&
          state.accountState !== "guest"
        ) {
          if (
            state.accountState === "failed" ||
            state.accountState === "incomplete"
          )
            return;
          const error = await auth.register(
            state.contact.email.trim(),
            state.password,
            state.repeat,
            state.privacy,
          );
          if (error) {
            state.accountError = error;
            state.accountState =
              error === "registrationUnavailable" ? "incomplete" : "failed";
            return;
          }
          state.accountState = "created";
          state.password = "";
          state.repeat = "";
        }
        const s = service()!,
          d = chosenDoctor()!,
          slot = state.slot!;
        state.intent = {
          key: uuid(),
          userID: auth.userID(),
          createdAt: new Date(now()).toISOString(),
          service: { ...s },
          doctor: { ...d },
          slot: { ...slot },
          request: {
            service_id: s.id,
            doctor_id: slot.doctor_id,
            starts_at: slot.starts_at,
            ...(Object.fromEntries(
              Object.entries(state.contact).map(([k, v]) => [k, v.trim()]),
            ) as unknown as Contact),
            privacy_acknowledged: true,
            privacy_notice_version: state.noticeVersion!,
          },
        };
        // Write BEFORE the POST. If tab storage is unavailable, do not risk an unrecoverable retry.
        if (!persist()) {
          state.intent = null;
          return;
        }
      }
      const intent = state.intent!;
      let token = await auth.token(intent.userID),
        receipt: Receipt;
      try {
        receipt = await api.create(intent.request, intent.key, token);
      } catch (error) {
        if (
          !(error instanceof BookingError) ||
          error.status !== 401 ||
          !intent.userID
        )
          throw error;
        token = await auth.token(intent.userID, true);
        receipt = await api.create(intent.request, intent.key, token);
      }
      state.receipt = receipt;
      state.resultService =
        state.services.find((s) => s.id === receipt.service_id) ||
        (intent.service.id === receipt.service_id ? intent.service : null);
      state.resultDoctor =
        state.doctors.find((d) => d.id === receipt.doctor_id) ||
        (intent.doctor.id === receipt.doctor_id ? intent.doctor : null);
      state.intent = null;
      state.contact = blankContact();
      state.password = "";
      state.repeat = "";
      state.notice = "";
      // Receipt metadata replaces patient details; a failed write leaves the original same-key intent recoverable.
      persist();
    } catch (error) {
      const e =
        error instanceof BookingError ? error : new BookingError(0, "network");
      if (e.status === 409 && e.code === "slot_unavailable") {
        clearIntent();
        state.slot = null;
        state.step = 2;
        state.notice = "slotChanged";
        cache.clear();
      } else if (e.status === 400 || e.status === 404) {
        clearIntent();
        state.privacy = false;
        state.step = e.status === 404 ? 0 : 3;
        state.error = e.status === 404 ? "serviceChanged" : "invalid_request";
      } else {
        state.error =
          e.code === "idempotency_conflict"
            ? "idempotency_conflict"
            : e.code === "session_changed" || e.status === 401
              ? "session_changed"
              : e.status === 429
                ? "rate_limited"
                : e.code === "booking_not_configured"
                  ? "booking_not_configured"
                  : "uncertain";
        if (e.status === 429) state.retryAt = now() + e.retryAfter * 1000;
      }
    } finally {
      state.submitting = false;
    }
    if (
      !state.intent &&
      !state.receipt &&
      state.notice === "slotChanged" &&
      !state.storageBlocked
    )
      await loadMonth(true);
    if (
      !state.intent &&
      !state.receipt &&
      ["serviceChanged", "invalid_request"].includes(state.error)
    ) {
      const error = state.error;
      await loadServices();
      state.error = error;
    }
  }
  function dispose() {
    cancelAvailability();
    doctorRevision++;
    doctorController?.abort();
    state.password = "";
    state.repeat = "";
  }
  return {
    restore,
    loadServices,
    loadDoctors,
    selectService,
    selectDoctor,
    loadMonth,
    changeMonth,
    selectDate,
    selectSlot,
    next,
    edit,
    submit,
    chooseGuest,
    retryAccount,
    validate,
    dispose,
  };
}
