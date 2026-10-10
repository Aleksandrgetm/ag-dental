import { API_URL } from "../api";
import { useAuthStore } from "../../stores/auth";
export async function cmsRequest(
  path: string,
  signal: AbortSignal,
  body?: unknown,
  method = "GET",
) {
  const auth = useAuthStore(),
    initial = auth.session;
  if (!API_URL || !auth.verifiedAdmin || !initial) throw Error("unavailable");
  let response: Response;
  try {
    response = await fetch(`${API_URL}/admin/cms/documents${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${initial.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    });
  } catch {
    throw Error("unavailable");
  }
  if (
    signal.aborted ||
    auth.user?.id !== initial.user.id ||
    !auth.verifiedAdmin
  )
    throw Error("unavailable");
  if (response.status === 401 || response.status === 403) {
    auth.rejectAdminAccess(
      response.status === 401 ? "unauthorized" : "forbidden",
    );
    throw Error("unavailable");
  }
  if (!response.ok)
    throw Error(
      response.status === 409
        ? "conflict"
        : response.status === 422
          ? "invalid"
          : "unavailable",
    );
  try {
    return await response.json();
  } catch {
    throw Error("unavailable");
  }
}
