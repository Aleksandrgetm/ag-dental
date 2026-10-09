import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "../auth";
import { API_URL } from "../../services/api";
import { clinicDate } from "../../services/booking/calendar";
import {
  createAdminReader,
  visits,
  settings as parseSettings,
  serviceCount,
  PAGE_LIMIT,
  type Visit,
  type BookingSettings,
} from "../../services/admin/dashboard";
export const useAdminDashboard = defineStore("admin-dashboard", () => {
  const auth = useAuthStore();
  const today = ref<Visit[] | null>(null),
    pending = ref<Visit[] | null>(null),
    settings = ref<BookingSettings | null>(null),
    services = ref<number | null>(null);
  const date = ref(clinicDate()),
    loading = ref(false),
    failed = ref(false),
    checkedAt = ref<string | null>(null);
  let revision = 0,
    controller: AbortController | undefined;
  const get = createAdminReader(API_URL || "", {
    credentials: () =>
      auth.session
        ? { id: auth.session.user.id, token: auth.session.access_token }
        : null,
    reject: (reason) => auth.rejectAdminAccess(reason),
  });
  function clear() {
    revision++;
    controller?.abort();
    today.value = null;
    pending.value = null;
    settings.value = null;
    services.value = null;
    failed.value = false;
    loading.value = false;
    checkedAt.value = null;
  }
  async function load() {
    clear();
    if (!auth.verifiedAdmin) return;
    loading.value = true;
    date.value = clinicDate();
    controller = new AbortController();
    const signal = controller.signal,
      current = revision;
    const results = await Promise.allSettled([
      get(
        `/admin/booking/appointments?date=${date.value}&limit=${PAGE_LIMIT}&offset=0`,
        signal,
      ).then(visits),
      get(
        `/admin/booking/appointments?status=pending&limit=${PAGE_LIMIT}&offset=0`,
        signal,
      ).then(visits),
      get("/admin/booking/settings", signal).then(parseSettings),
      get("/booking/services", signal).then(serviceCount),
    ] as const);
    if (current !== revision || signal.aborted || !auth.verifiedAdmin) return;
    const [a, b, c, d] = results;
    today.value = a.status === "fulfilled" ? a.value : null;
    pending.value = b.status === "fulfilled" ? b.value : null;
    settings.value = c.status === "fulfilled" ? c.value : null;
    services.value = d.status === "fulfilled" ? d.value : null;
    failed.value = results.some((r) => r.status === "rejected");
    loading.value = false;
    checkedAt.value = new Date().toISOString();
  }
  watch(
    () => auth.verifiedAdmin,
    (allowed) => {
      if (!allowed) clear();
    },
    { flush: "sync" },
  );
  watch(
    () => auth.user?.id,
    () => clear(),
    { flush: "sync" },
  );
  return {
    today,
    pending,
    settings,
    services,
    date,
    loading,
    failed,
    checkedAt,
    load,
    clear,
  };
});
