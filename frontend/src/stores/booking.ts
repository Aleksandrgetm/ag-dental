import { computed, reactive, toRefs } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import { supabase } from "../services/supabase";
import { createBookingAPI } from "../services/booking/api";
import { bookingStorage } from "../services/booking/storage";
import {
  createBookingFlow,
  initialBookingState,
} from "../services/booking/flow";
import {
  BookingError,
  type BookingAuth,
  type Slot,
} from "../services/booking/types";
export const useBookingStore = defineStore("booking", () => {
  // Vite removes this dynamic import entirely from production, even if the flag is set.
  const demo =
    import.meta.env.DEV && import.meta.env.VITE_BOOKING_DEMO === "true";
  const auth = useAuthStore();
  const state = reactive(initialBookingState());
  const realAuth: BookingAuth = {
    userID: () => auth.user?.id || null,
    register: (...args) => auth.register(...args),
    async token(expected, refresh = false) {
      if (!expected) return undefined; // A pending guest intent must remain a guest intent.
      if (!supabase || auth.user?.id !== expected)
        throw new BookingError(401, "session_changed");
      const initial = await supabase.auth.getSession();
      let session = initial.data.session;
      if (
        refresh ||
        !session ||
        (session.expires_at || 0) * 1000 < Date.now() + 60000
      ) {
        const result = await supabase.auth.refreshSession();
        if (result.error) throw new BookingError(401, "session_changed");
        session = result.data.session;
      }
      if (initial.error || !session || session.user.id !== expected)
        throw new BookingError(401, "session_changed");
      return session.access_token;
    },
  };
  // Demo and live intents cannot collide, even when switching development settings.
  const storage = bookingStorage({
    getItem: (key) =>
      window.sessionStorage.getItem(demo ? `demo-website-v2-${key}` : key),
    setItem: (key, value) =>
      window.sessionStorage.setItem(
        demo ? `demo-website-v2-${key}` : key,
        value,
      ),
    removeItem: (key) =>
      window.sessionStorage.removeItem(demo ? `demo-website-v2-${key}` : key),
  });
  const clients = demo
    ? import("../services/booking/demo").then((m) => m.createDemoClients())
    : Promise.resolve({
        api: createBookingAPI(import.meta.env.VITE_API_URL || ""),
        auth: realAuth,
      });
  const flow = clients.then(({ api, auth: identity }) =>
    createBookingFlow(state, {
      api,
      auth: identity,
      storage,
      allowAnyWithSingleDoctor: demo,
    }),
  );
  let initialized = false;
  async function initialize() {
    await auth.initialize();
    const controller = await flow;
    if (!initialized) {
      controller.restore();
      initialized = true;
    }
    if (!demo && !state.intent && !state.receipt) {
      const user = auth.user;
      if (user?.email_confirmed_at && !state.contact.email)
        state.contact.email = user.email || "";
      if (user?.phone_confirmed_at && !state.contact.phone)
        state.contact.phone = user.phone || "";
    }
    if (!state.services.length) await controller.loadServices();
  }
  return {
    ...toRefs(state),
    demo,
    initialize,
    signedIn: computed(() =>
      demo ? state.accountState === "created" : !!auth.user,
    ),
    locked: computed(
      () =>
        state.submitting ||
        !!state.intent ||
        !!state.receipt ||
        state.storageBlocked,
    ),
    loadServices: async () => (await flow).loadServices(),
    loadDoctors: async () => (await flow).loadDoctors(),
    selectService: async (id: string) => (await flow).selectService(id),
    selectDoctor: async (id: string) => (await flow).selectDoctor(id),
    loadMonth: async () => (await flow).loadMonth(true),
    changeMonth: async (offset: number) => (await flow).changeMonth(offset),
    selectDate: async (date: string) => (await flow).selectDate(date),
    selectSlot: async (slot: Slot) => (await flow).selectSlot(slot),
    next: async () => (await flow).next(),
    edit: async (step: number) => (await flow).edit(step),
    submit: async () => (await flow).submit(),
    chooseGuest: async () => (await flow).chooseGuest(),
    retryAccount: async () => (await flow).retryAccount(),
    dispose: async () => (await flow).dispose(),
  };
});
