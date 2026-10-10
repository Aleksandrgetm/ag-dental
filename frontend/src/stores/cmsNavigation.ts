import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useAuthStore } from "./auth";
import { cmsDestination } from "../services/cms/navigation";
// Navigation only, in memory. No JWT, content, patient data or browser-storage draft cache.
export const useCmsNavigationStore = defineStore("cmsNavigation", () => {
  const auth = useAuthStore();
  const last = ref<Record<string, string>>({});
  watch(
    () => auth.user?.id,
    () => {
      last.value = {};
    },
    { flush: "sync" },
  );
  watch(
    () => auth.adminStatus,
    (state) => {
      if (["guest", "user", "forbidden"].includes(state)) last.value = {};
    },
    { flush: "sync" },
  );
  function remember(path: string, fullPath: string) {
    const entry = cmsDestination(path);
    if (auth.verifiedAdmin && entry) last.value[entry.group] = fullPath;
  }
  return { last, remember };
});
