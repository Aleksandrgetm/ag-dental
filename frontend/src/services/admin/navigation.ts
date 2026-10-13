// The clinic-facing interface intentionally exposes only these four sections.
// Backend capabilities and stored CMS content remain available to trusted maintenance tools.
export const adminGroups = [{ key: "clinic", items: ["appointments", "doctors", "services", "news"] }] as const;
export type AdminSection = (typeof adminGroups)[number]["items"][number];
export const adminPath = (section: AdminSection) => `/admin/${section}`;
