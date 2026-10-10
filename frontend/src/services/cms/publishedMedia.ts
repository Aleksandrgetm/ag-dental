import { reactive } from "vue";
import { API_URL } from "../api";
import { publicMediaURL } from "./mediaReference";
export const publishedMedia = reactive<
  Record<string, { alt: Record<string, string>; srcset: string }>
>({});
export function acceptMediaMetadata(rows: any[]) {
  for (const row of rows) {
    const ref = "cms-media:" + row.id;
    const url = publicMediaURL(API_URL, ref);
    if (!url) continue;
    const widths = new Set<number>();
    const srcset = (row.variants || [])
      .filter(
        (v: any) =>
          ["medium.webp", "display.webp"].includes(v.name) &&
          Number.isSafeInteger(v.width) &&
          v.width > 0,
      )
      .filter((v: any) => {
        if (widths.has(v.width)) return false;
        widths.add(v.width);
        return true;
      })
      .map((v: any) => `${publicMediaURL(API_URL, ref, v.name)} ${v.width}w`)
      .join(", ");
    publishedMedia[ref] = publishedMedia[url] = { alt: row.alt || {}, srcset };
  }
}
export function cmsMediaAlt(value: string, locale: string, fallback: string) {
  return publishedMedia[value]?.alt[locale] || fallback;
}
export function cmsMediaSrcset(value: string) {
  return publishedMedia[value]?.srcset || undefined;
}
