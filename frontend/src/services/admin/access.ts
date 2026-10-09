export const adminPaths = [
  "/admin",
  "/admin/appointments",
  "/admin/services",
  "/admin/doctors",
  "/admin/schedules",
  "/admin/pages",
  "/admin/news",
  "/admin/media",
  "/admin/seo",
  "/admin/messages",
  "/admin/settings",
] as const;
export function safeAdminReturn(value: unknown): string | null {
  return typeof value === "string" &&
    (adminPaths as readonly string[]).includes(value)
    ? value
    : null;
}
export type AccessState =
  | "idle"
  | "checking"
  | "guest"
  | "admin"
  | "user"
  | "unauthorized"
  | "forbidden"
  | "unavailable";
export interface Credentials {
  id: string;
  token: string;
}
export class AdminError extends Error {
  readonly kind: "unauthorized" | "forbidden" | "unavailable";
  constructor(kind: AdminError["kind"]) {
    super(kind);
    this.kind = kind;
  }
}
export async function readIdentity(
  base: string,
  credentials: Credentials,
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<"user" | "admin"> {
  if (!base) throw new AdminError("unavailable");
  let response: Response;
  try {
    response = await transport(`${base.replace(/\/$/, "")}/auth/me`, {
      headers: { Authorization: `Bearer ${credentials.token}` },
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok)
      throw new AdminError(
        response.status === 401
          ? "unauthorized"
          : response.status === 403
            ? "forbidden"
            : "unavailable",
      );
    const data = await response.json();
    if (data.id !== credentials.id || !["user", "admin"].includes(data.role))
      throw new AdminError("unavailable");
    return data.role;
  } catch (error) {
    throw error instanceof AdminError ? error : new AdminError("unavailable");
  }
}
// This evidence lives in memory and can only originate from the verified Go identity response.
// It is never authorization for an API operation: every endpoint checks the JWT + DB role again.
export function createAuthority(
  credentials: () => Credentials | null,
  verifyIdentity: (
    identity: Credentials,
    signal: AbortSignal,
  ) => Promise<"user" | "admin">,
  changed: (state: AccessState) => void,
) {
  let version = 0,
    state: AccessState = "idle";
  let proof: Credentials | null = null,
    controller: AbortController | undefined;
  let pending:
    { identity: Credentials; promise: Promise<AccessState> } | undefined;
  const same = (a: Credentials | null, b: Credentials | null) =>
    !!a && !!b && a.id === b.id && a.token === b.token;
  function publish(next: AccessState) {
    state = next;
    changed(next);
  }
  function invalidate(next: AccessState = "idle") {
    version++;
    controller?.abort();
    proof = null;
    pending = undefined;
    publish(next);
  }
  async function verify(): Promise<AccessState> {
    const identity = credentials();
    if (!identity) {
      invalidate("guest");
      return "guest";
    }
    if (pending && same(identity, pending.identity)) return pending.promise;
    invalidate("checking");
    const current = version;
    controller = new AbortController();
    const signal = controller.signal;
    const promise = (async () => {
      let result: AccessState;
      try {
        result = await verifyIdentity(identity, signal);
      } catch (error) {
        result = error instanceof AdminError ? error.kind : "unavailable";
      }
      if (current !== version || !same(identity, credentials())) return state;
      proof = result === "admin" || result === "user" ? identity : null;
      pending = undefined;
      publish(result);
      return result;
    })();
    pending = { identity, promise };
    return promise;
  }
  return {
    verify,
    invalidate,
    isAdmin: () => state === "admin" && same(proof, credentials()),
  };
}
