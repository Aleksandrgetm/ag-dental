import { resolveAPIBase } from "./apiConfig.ts";

export const API_URL = resolveAPIBase(
  import.meta.env?.VITE_API_URL,
  typeof window === "undefined" ? undefined : window.location.href,
);

export interface HealthResponse {
  status: string;
  service: string;
  database: string;
}

export async function getHealth(): Promise<HealthResponse> {
  // Reject only the requested operation, so the public application can still mount.
  if (!API_URL) throw new Error("api_unavailable");
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}
