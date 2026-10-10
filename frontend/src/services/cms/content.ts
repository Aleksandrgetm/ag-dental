import { mediaID, publicMediaURL } from "./mediaReference";
import { acceptMediaMetadata } from "./publishedMedia";
export { cmsMediaAlt, cmsMediaSrcset } from "./publishedMedia";
import { reactive, ref } from "vue";
import * as original from "../../content/clinic";
import { refinement as originalRefinement } from "../../content/refinement";
import { localizedPrices as originalPrices } from "../../content/pricing";
import { articles as originalArticles } from "../../content/articles";
import { localizeArticle as originalArticle } from "../../content/articleTranslations";
import i18n from "../../i18n";
import { API_URL } from "../api";
import rawBindings from "./bindings.json";
export { l } from "../../content/clinic";
export type { Language, Localized } from "../../content/clinic";
type Tree = any;
interface Binding {
  key: string;
  target: string;
  path: string[];
  locked: boolean;
  locks: string[][];
  data?: Tree;
  price_reference?: number[];
}
const bindings = rawBindings as Binding[];
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const clinicState = reactive(
  copy({
    clinic: original.clinic,
    media: original.media,
    philosophy: original.philosophy,
    about: original.about,
    doctorBio: original.doctorBio,
    services: original.services,
  }),
);
export const { clinic, media, philosophy, about, doctorBio, services } =
  clinicState;
export const refinement = reactive(copy(originalRefinement));
export const localizedPrices = reactive(copy(originalPrices));
export const articles = reactive(copy(originalArticles));
const translations = reactive(
  originalArticles.map((a) =>
    Object.fromEntries(
      ["lv", "ru", "en"].map((l) => [l, copy(originalArticle(a, l))]),
    ),
  ),
);
export function localizeArticle(
  article: (typeof originalArticles)[number],
  locale: string,
) {
  return (
    translations[originalArticles.findIndex((a) => a.slug === article.slug)]?.[
      locale
    ] || originalArticle(article, locale)
  );
}
const messages = Object.fromEntries(
  ["lv", "ru", "en"].map((l) => [l, copy(i18n.global.getLocaleMessage(l))]),
);
const literalState = reactive<Record<string, any>>({});
export const cmsSEO = reactive<
  Record<string, Record<string, { title: string; description: string }>>
>({});
export const cmsState = ref<"fallback" | "published" | "stale">("fallback");
const snapshots = new Map<string, Tree>();
export function valueAt(v: Tree, path: string[]): Tree {
  return path.reduce((value, k) => value?.[k], v);
}
export function writeAt(v: Tree, path: string[], value: Tree) {
  const target = valueAt(v, path.slice(0, -1));
  target[path.at(-1)!] = value;
}
function patch(target: Tree, next: Tree) {
  for (const [key, value] of Object.entries(next)) {
    if (value !== null && typeof value === "object") patch(target[key], value);
    else target[key] = value;
  }
}
function equal(a: Tree, b: Tree): boolean {
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return a === b;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]))
  );
}
function sameShape(a: Tree, b: Tree): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return true;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (k) =>
        Object.hasOwn(b, k) &&
        !["__proto__", "constructor", "prototype"].includes(k) &&
        sameShape(a[k], b[k]),
    )
  );
}
const roots: Record<string, Tree> = {
  clinic: clinicState,
  refinement,
  prices: localizedPrices,
  articles: translations,
};
for (const b of bindings) {
  let data;
  if (b.target === "messages")
    data = Object.fromEntries(
      ["lv", "ru", "en"].map((l) => [l, valueAt(messages[l], b.path)]),
    );
  else if (["literal", "inline"].includes(b.target)) {
    data = b.data;
    literalState[b.key] = copy(data);
  } else if (b.target === "seo") data = b.data;
  else if (roots[b.target]) data = valueAt(roots[b.target], b.path);
  if (data !== undefined) snapshots.set(b.key, copy(data));
}
export function cmsInline(key: string): original.Localized {
  return literalState[key];
}
export function cmsLiteral(key: string) {
  return literalState[key]?.text || "";
}
// Only server-published, known, shape-compatible content may replace the approved fallback.
export function acceptPublished(response: unknown): boolean {
  const body = response as {
    schema_version?: number;
    documents?: { key: string; payload: Tree; revision: string }[];
    media?: { id: string; alt: Record<string, string>; variants: any[] }[];
  };
  if (body?.schema_version !== 1 || !Array.isArray(body.documents))
    return false;
  const seen = new Set<string>();
  const updates: { binding: Binding; data: Tree }[] = [];
  for (const row of body.documents) {
    if (!row || typeof row.key !== "string" || seen.has(row.key)) return false;
    seen.add(row.key);
    const binding = bindings.find((b) => b.key === row.key);
    if (!binding || !snapshots.has(row.key)) continue;
    const baseline = snapshots.get(row.key);
    if (!sameShape(baseline, row.payload)) return false;
    if (binding.locked && !equal(baseline, row.payload)) return false;
    for (const path of binding.locks)
      if (!equal(valueAt(baseline, path), valueAt(row.payload, path)))
        return false;
    updates.push({ binding, data: row.payload });
  }
  const available = new Set((body.media || []).map((a) => "cms-media:" + a.id));
  for (const { data } of updates) {
    const refs =
      JSON.stringify(data).match(/cms-media:upload\.[a-f0-9]{32}/g) || [];
    if (
      refs.some((ref) => !available.has(ref) || !publicMediaURL(API_URL, ref))
    )
      return false;
  }
  acceptMediaMetadata(body.media || []);
  const mapping = media as Record<string, string>;
  for (const ref of available) {
    const url = publicMediaURL(API_URL, ref);
    if (url) mapping[ref] = url;
  }
  // Individual service/article references may point directly to existing approved images.
  for (const url of Object.values(original.media))
    if (
      url.startsWith("/media/") &&
      !["video", "poster"].some(
        (key) => original.media[key as keyof typeof original.media] === url,
      )
    )
      mapping[url] = url;
  for (const { binding: b, data } of updates) {
    if (b.target === "messages") {
      for (const l of ["lv", "ru", "en"] as const)
        i18n.global.mergeLocaleMessage(l, {
          [b.path[0]!]: escapeMessages(data[l]),
        });
    } else if (["literal", "inline"].includes(b.target))
      patch(literalState[b.key], data);
    else if (b.target === "seo") cmsSEO[b.path[0]!] = copy(data);
    else {
      const rendered =
        b.key === "clinic.media"
          ? Object.fromEntries(
              Object.entries(data).map(([key, value]) => [
                key,
                mediaID(value) ? publicMediaURL(API_URL, value) : value,
              ]),
            )
          : data;
      patch(valueAt(roots[b.target], b.path), rendered);
      if (b.target === "articles") patch(articles[Number(b.path[0])], data.lv);
    }
  }
  const hours = literalState["settings.hours"]?.text;
  if (seen.has("settings.hours") && hours) {
    for (const b of bindings.filter(
      (b) => b.target === "literal" && b.key !== "settings.hours",
    )) {
      const old = snapshots.get(b.key)?.text;
      if (typeof old === "string" && old.includes("09:00–18:00"))
        literalState[b.key].text = old.replace("09:00–18:00", hours);
    }
  }
  // Teaser amounts derive from the same published price rows as the price list.
  for (const b of bindings.filter((b) => b.price_reference)) {
    const [category, item] = b.price_reference!;
    if (!seen.has(`prices.${category}`)) continue;
    const amount = localizedPrices[category!]?.items[item!]?.price;
    const service = services[Number(b.path[1])];
    if (service && amount !== null && amount !== undefined)
      service.price = String(amount).replace(/\.00(?=\/|$)/g, "");
  }
  if (updates.length) cmsState.value = "published";
  return true;
}
function escapeMessages(v: Tree): Tree {
  if (typeof v === "string") return v.replace(/(?<!\{')@(?!'\})/g, "{'@'}");
  if (Array.isArray(v)) return v.map(escapeMessages);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, escapeMessages(x)]),
    );
  return v;
}
let pending: Promise<void> | undefined,
  etag = "";
export function refreshPublished() {
  if (!API_URL) return Promise.resolve();
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(`${API_URL}/cms/published`, {
        cache: "no-cache",
        credentials: "omit",
        headers: etag ? { "If-None-Match": etag } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 304) return;
      if (!response.ok || !acceptPublished(await response.json()))
        throw Error();
      etag = response.headers.get("ETag") || "";
    } catch {
      if (cmsState.value === "published")
        cmsState.value =
          "stale"; /* Keep the last valid publication; never reset it to stale bundled copy. */
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
