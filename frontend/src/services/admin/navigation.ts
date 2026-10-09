export const adminGroups = [
  { key: "overview", items: ["overview"] },
  {
    key: "clinic",
    items: ["appointments", "services", "doctors", "schedules"],
  },
  { key: "website", items: ["pages", "news", "media", "seo"] },
  { key: "communication", items: ["messages"] },
  { key: "system", items: ["settings"] },
] as const;
export type AdminSection = (typeof adminGroups)[number]["items"][number];
export const adminPath = (section: AdminSection) =>
  section === "overview" ? "/admin" : `/admin/${section}`;
