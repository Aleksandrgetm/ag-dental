// Stable content value; neither a Storage path nor a privileged URL.
export const mediaID = (value: unknown): string | null =>
  typeof value === "string" && /^cms-media:upload\.[a-f0-9]{32}$/.test(value)
    ? value.slice(10)
    : null;
export function publicMediaURL(
  base: string | null | undefined,
  value: unknown,
  variant = "display.webp",
): string | undefined {
  const id = mediaID(value);
  return id &&
    base &&
    [
      "display.webp",
      "medium.webp",
      "thumb.webp",
      "video.mp4",
      "video.webm",
    ].includes(variant)
    ? `${base}/cms/media/${id}/${variant}`
    : undefined;
}
