// URL identities use existing registry keys, page paths, section IDs and price indices.
import {
  documents,
  pages,
  priceDocs,
  serviceDocs,
  newsDocs,
  settingsSections,
  mediaAssets,
  type Section,
} from "./catalog.ts";
export const cmsGroups = [
  "services",
  "doctors",
  "pages",
  "news",
  "media",
  "seo",
  "settings",
];
export type CmsDestination = {
  path: string;
  group: string;
  parent: string;
  section?: Section;
  pagePath?: string;
  categoryKey?: string;
  mediaID?: string;
};
const destinations = new Map<string, CmsDestination>();
const segment = encodeURIComponent;
const docSection = (d: (typeof documents)[number]): Section => ({
  id: d.key,
  title: d.title,
  parts: [{ key: d.key }],
});
function add(value: CmsDestination) {
  if (destinations.has(value.path))
    throw Error("Duplicate CMS navigation identity");
  if (value.section)
    value = {
      ...value,
      section: {
        ...value.section,
        parts: value.section.parts.filter(
          (part, i, parts) => parts.findIndex((p) => p.key === part.key) === i,
        ),
      },
    };
  destinations.set(value.path, value);
}
for (const group of cmsGroups)
  add({ path: "/admin/" + group, group, parent: "/admin/" + group });
for (const page of pages) {
  const slug =
    page.path === "/"
      ? "home"
      : page.path === "/* (404)"
        ? "not-found"
        : page.path.slice(1).split("/").map(segment).join("/");
  const path = "/admin/pages/" + slug;
  add({ path, group: "pages", parent: "/admin/pages", pagePath: page.path });
  for (const section of [...page.sections, page.metadata].filter(
    (s) => s.parts.length,
  ))
    add({
      path: path + "/" + segment(section.id),
      group: "pages",
      parent: path,
      pagePath: page.path,
      section,
    });
}
for (const doc of priceDocs) {
  const path = "/admin/services/" + segment(doc.key);
  add({
    path,
    group: "services",
    parent: "/admin/services",
    categoryKey: doc.key,
  });
  add({
    path: path + "/title",
    group: "services",
    parent: path,
    categoryKey: doc.key,
    section: {
      id: doc.key,
      title: doc.title,
      parts: [{ key: doc.key, prefixes: ["title"] }],
    },
  });
  doc.data.items.forEach((item: any, i: number) =>
    add({
      path: path + "/items/" + i,
      group: "services",
      parent: path,
      categoryKey: doc.key,
      section: {
        id: doc.key + "." + i,
        title: item.name,
        parts: [{ key: doc.key, prefixes: ["items." + i] }],
      },
    }),
  );
}
for (const doc of [
  ...serviceDocs,
  ...newsDocs,
  ...documents.filter((d) => ["doctors", "seo"].includes(d.group)),
]) {
  const group = serviceDocs.includes(doc)
    ? "services"
    : newsDocs.includes(doc)
      ? "news"
      : doc.group;
  add({
    path: "/admin/" + group + "/" + segment(doc.key),
    group,
    parent: "/admin/" + group,
    section: docSection(doc),
  });
}
for (const section of settingsSections.filter((s) => s.parts.length))
  add({
    path: "/admin/settings/" + segment(section.id),
    group: "settings",
    parent: "/admin/settings",
    section,
  });
for (const asset of mediaAssets)
  add({
    path: "/admin/media/" + segment(asset.id),
    group: "media",
    parent: "/admin/media",
    mediaID: asset.id,
  });
export const cmsDestinations = [...destinations.values()];
export function cmsDestination(path: string) {
  const registered = destinations.get(path);
  if (registered) return registered;
  const id = path.match(/^\/admin\/media\/(upload\.[a-f0-9]{32})$/)?.[1];
  return id
    ? { path, group: "media", parent: "/admin/media", mediaID: id }
    : undefined;
}
export function sectionDestination(
  group: string,
  section: Section,
  pagePath?: string | null,
) {
  return cmsDestinations.find(
    (d) =>
      d.group === group &&
      d.section?.id === section.id &&
      (group !== "pages" || d.pagePath === pagePath),
  );
}
export function cmsSelection(path: string, part: unknown) {
  const destination = cmsDestination(path);
  if (!destination) return null;
  if (
    part != null &&
    (typeof part !== "string" ||
      !destination.section?.parts.some((p) => p.key === part))
  )
    return null;
  return {
    ...destination,
    part:
      destination.section?.parts.find((p) => p.key === part) ||
      destination.section?.parts[0],
  };
}
