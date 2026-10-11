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
  if (!API_URL || !auth.verifiedAdmin || !initial || !/^(?:\/[a-zA-Z0-9._-]+(?:\/(?:draft|publish|rollback|unpublish))?)?$/.test(path)) throw Error("unavailable");
  const current=()=>!signal.aborted&&auth.user?.id===initial.user.id&&auth.session?.access_token===initial.access_token&&auth.verifiedAdmin;
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
    !current()
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
    const result=await response.json();
    if(!current())throw Error("unavailable");
    return result;
  } catch {
    throw Error("unavailable");
  }
}
