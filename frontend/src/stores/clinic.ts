import { defineStore } from "pinia";
import { ref } from "vue";
import { getHealth, type HealthResponse } from "../services/api";
// Shared integration boundary for future appointment features. No patient data is collected.
export const useClinicStore = defineStore("clinic", () => {
  const health = ref<HealthResponse | null>(null);
  const healthState = ref<"idle" | "loading" | "ready" | "unavailable">("idle");
  async function checkHealth() {
    if (healthState.value === "loading") return;
    healthState.value = "loading";
    try {
      health.value = await getHealth();
      healthState.value = "ready";
    } catch {
      healthState.value = "unavailable";
    }
  }
  return { health, healthState, checkHealth };
});
