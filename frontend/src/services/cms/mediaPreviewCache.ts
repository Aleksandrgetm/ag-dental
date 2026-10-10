import { reactive } from "vue";
export const mediaPreviews = reactive<Record<string, string>>({});
export const previewURL = (value: unknown) =>
  typeof value === "string" ? mediaPreviews[value] : undefined;
