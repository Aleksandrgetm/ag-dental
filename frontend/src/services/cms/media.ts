import { mediaPreviews } from "./mediaPreviewCache";
export { mediaPreviews, previewURL } from "./mediaPreviewCache";
import { API_URL } from "../api";
import { useAuthStore } from "../../stores/auth";
import type { MediaAsset } from "./mediaModel";
export type { MediaAsset } from "./mediaModel";
export { selectableMedia, filterMedia, checkFile } from "./mediaModel";
// Private preview URLs are blob URLs fetched with verified authorization, never signed bearer links.

let previewUser: string | null = null;
const active = new Set<AbortController>();
export function clearMediaPreviews() {
  for (const c of active) c.abort();
  active.clear();
  for (const key of Object.keys(mediaPreviews)) {
    URL.revokeObjectURL(mediaPreviews[key]!);
    delete mediaPreviews[key];
  }
  previewUser = null;
}
function credentials() {
  const a = useAuthStore();
  if (!API_URL || !a.verifiedAdmin || !a.session)
    throw Error("media_unavailable");
  return { id: a.user!.id, token: a.session.access_token };
}
export async function mediaRequest(
  path = "",
  method = "GET",
  signal?: AbortSignal,
) {
  const initial = credentials(),
    auth = useAuthStore();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/admin/cms/media${path}`, {
      method,
      headers: { Authorization: `Bearer ${initial.token}` },
      cache: "no-store",
      credentials: "omit",
      signal: signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw Error("media_unavailable");
  }
  if (auth.user?.id !== initial.id || !auth.verifiedAdmin)
    throw Error("media_unavailable");
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (
      response.status === 401 ||
      (response.status === 403 && data.error === "forbidden")
    )
      auth.rejectAdminAccess(
        response.status === 401 ? "unauthorized" : "forbidden",
      );
    throw Error(safeMediaError(data.error));
  }
  return response.status === 204 ? null : response.json();
}
const codes = [
  "invalid_file",
  "media_unavailable",
  "media_busy",
  "media_protected",
  "media_referenced",
  "media_conflict",
  "media_missing",
  "cancelled",
];
export const safeMediaError = (v: unknown) =>
  typeof v === "string" && codes.includes(v) ? v : "media_unavailable";
export async function loadMediaPreview(
  asset: MediaAsset,
  variant = "thumb.webp",
) {
  if (asset.protected || asset.origin !== "upload" || asset.state !== "ready")
    return;
  const initial = credentials();
  if (previewUser !== initial.id) {
    clearMediaPreviews();
    previewUser = initial.id;
  }
  const key = `${asset.url}/${variant}`;
  if (mediaPreviews[key]) return mediaPreviews[key];
  const controller = new AbortController();
  active.add(controller);
  try {
    const r = await fetch(`${API_URL}/admin/cms/media/${asset.id}/${variant}`, {
      headers: { Authorization: `Bearer ${initial.token}` },
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403)
        useAuthStore().rejectAdminAccess(
          r.status === 401 ? "unauthorized" : "forbidden",
        );
      throw Error("media_unavailable");
    }
    const b = await r.blob();
    const auth = useAuthStore();
    if (
      auth.user?.id !== initial.id ||
      !auth.verifiedAdmin ||
      controller.signal.aborted
    )
      throw Error("media_unavailable");
    const url = URL.createObjectURL(b);
    if (mediaPreviews[key]) URL.revokeObjectURL(mediaPreviews[key]!);
    mediaPreviews[key] = url;
    if (variant === "display.webp") mediaPreviews[asset.url] = url;
    return url;
  } finally {
    active.delete(controller);
  }
}
export function uploadMedia(
  file: File,
  alt: Record<string, string>,
  key: string,
  progress: (n: number) => void,
  signal: AbortSignal,
): Promise<{ asset: MediaAsset; duplicate: boolean }> {
  const initial = credentials();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("POST", `${API_URL}/admin/cms/media`);
    xhr.setRequestHeader("Authorization", `Bearer ${initial.token}`);
    xhr.setRequestHeader("Idempotency-Key", key);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = xhr.ontimeout = () => reject(Error("media_unavailable"));
    xhr.onabort = () => reject(Error("cancelled"));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    xhr.onload = () => {
      const auth = useAuthStore();
      if (!auth.verifiedAdmin || auth.user?.id !== initial.id) {
        reject(Error("media_unavailable"));
        return;
      }
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(Error("media_unavailable"));
        return;
      }
      if (
        xhr.status === 401 ||
        (xhr.status === 403 && data.error === "forbidden")
      )
        auth.rejectAdminAccess(
          xhr.status === 401 ? "unauthorized" : "forbidden",
        );
      if (xhr.status !== 200 || !data.asset?.id) {
        reject(Error(safeMediaError(data.error)));
        return;
      }
      resolve(data);
    };
    const body = new FormData();
    body.append("file", file);
    body.append("alt", JSON.stringify(alt));
    if (signal.aborted) {
      reject(Error("cancelled"));
      return;
    }
    xhr.send(body);
  });
}
