// Missing or unusable configuration means unavailable; never choose a fallback API.
export function resolveAPIBase(
  value: unknown,
  pageURL?: string,
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const page = pageURL ? new URL(pageURL) : undefined;
    const input = value.trim();
    // A same-origin path is supported only when explicitly configured.
    if (!/^https?:\/\//i.test(input) && !/^\/(?!\/)/.test(input)) return null;
    const url = new URL(input, page);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const local = (host: string) => {
      const name = host.replace(/\.$/, "");
      return (
        name === "localhost" ||
        name.endsWith(".localhost") ||
        /^127\./.test(name) ||
        ["[::1]", "0.0.0.0"].includes(name) ||
        /^\[::ffff:7f[0-9a-f]{2}:/.test(name)
      );
    };
    // A hosted frontend must never call the visitor's local machine.
    if (local(url.hostname) && (!page || !local(page.hostname))) return null;
    if (page?.protocol === "https:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}
