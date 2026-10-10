import { mediaID } from "./mediaReference.ts";
export interface MediaAsset {
  id: string;
  url: string;
  protected: boolean;
  origin: "registered" | "upload";
  state: string;
  created_at?: string;
  published_at?: string;
  references?: number;
  usages: {
    document: string;
    path: string;
    draft: boolean;
    published: boolean;
  }[];
  metadata: {
    filename: string;
    kind: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
    alt?: Record<string, string>;
    usages?: string[];
    usage_groups?: string[];
    variants?: {
      name: string;
      mime: string;
      width: number;
      height: number;
      bytes: number;
    }[];
  };
}
export function selectableMedia(a: MediaAsset) {
  return (
    !a.protected &&
    a.state === "ready" &&
    a.metadata.kind === "image" &&
    (!!mediaID(a.url) ||
      (a.url.startsWith("/media/") && !a.url.endsWith(".svg")))
  );
}
export function filterMedia(
  assets: MediaAsset[],
  search: string,
  kind: string,
  use: string,
  origin: string,
) {
  return assets.filter(
    (a) =>
      a.metadata.filename
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (!kind || a.metadata.kind === kind) &&
      (!origin || a.origin === origin) &&
      (!use ||
        (use === "used"
          ? !!(a.usages.length || a.metadata.usages?.length)
          : !(a.usages.length || a.metadata.usages?.length))),
  );
}
export function checkFile(file: { name: string; size: number }) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    !["jpg", "jpeg", "png", "webp", "avif", "mp4", "webm"].includes(ext) ||
    file.size <= 0 ||
    file.size > (["mp4", "webm"].includes(ext) ? 32 : 12) * 1024 * 1024
  )
    return "invalid_file";
  return null;
}
