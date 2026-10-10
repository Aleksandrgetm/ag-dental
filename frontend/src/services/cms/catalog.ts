import { previewURL } from "./mediaPreviewCache.ts";
// Presentation only: document keys and field scopes refer to the existing CMS registry.
// No content is stored here and no public component is mounted in an admin preview.
import manifest from "../../../../backend/internal/cms/content.json" with { type: "json" };
export type Localized = Record<string, string>;
export type Field = {
  path: string[];
  label: Localized;
  locale: string;
  type: string;
  locked: boolean;
  system_managed?: boolean;
};
export type Doc = {
  key: string;
  group: string;
  title: Localized;
  target: string;
  path: string[];
  routes: string[];
  source: string;
  locked: boolean;
  system_managed?: boolean;
  fields: Field[];
  data: any;
  price_reference?: number[];
};
export type Part = { key: string; prefixes?: string[] };
export type Section = {
  id: string;
  title: Localized;
  parts: Part[];
  image?: string;
  description?: Localized;
};
export const L = (lv: string, ru: string, en: string): Localized => ({
  lv,
  ru,
  en,
});
export const documents: Doc[] = (manifest.documents as Doc[])
  .filter((d) => !d.system_managed && d.group !== "source-only")
  .map((d) => ({ ...d }));
// Friendly labels for the existing shared content fragments; payloads stay untouched.
const fragmentLabels = [
  L("Sadaļas etiķete", "Метка раздела", "Section label"),
  L("Virsraksts — sākums", "Заголовок — начало", "Headline — opening"),
  L("Virsraksts — pieredze", "Заголовок — опыт", "Headline — experience"),
  L("Virsraksts — noslēgums", "Заголовок — окончание", "Headline — closing"),
  L("Attēla apraksts", "Описание изображения", "Image description"),
  L("Klīnikas apraksts", "Описание клиники", "Clinic description"),
  L("Mūsu pieeja", "Наш подход", "Our approach"),
  L("Saites teksts", "Текст ссылки", "Link label"),
  L("Pieredzes skaitlis", "Число лет опыта", "Experience figure"),
  L("Pieredzes apraksts", "Описание опыта", "Experience caption"),
  L("Speciālists", "Специалист", "Specialist"),
  L("Atrašanās vieta", "Расположение", "Location"),
  L("Adrese", "Адрес", "Address"),
];
const friendlyTitles: Record<string, Localized> = {
  "clinic.philosophy": L("Mūsu filozofija", "Наша философия", "Our philosophy"),
  "clinic.about": L("Par klīniku", "О клинике", "About the clinic"),
  "literal.dceb04b2.0": L("Sadaļas numurs", "Номер раздела", "Section number"),
  "literal.dceb04b2.1": L(
    "Klīnikas nosaukums",
    "Название клиники",
    "Clinic name",
  ),
  "literal.dceb04b2.2": L("Adrese", "Адрес", "Address"),
  "literal.dceb04b2.3": L(
    "Attēla paraksts",
    "Подпись к изображению",
    "Image caption",
  ),
  "literal.dceb04b2.4": L("Sadaļas numurs", "Номер раздела", "Section number"),
  "literal.dceb04b2.5": L("Sadaļas numurs", "Номер раздела", "Section number"),
  "literal.dceb04b2.6": L(
    "Speciālista vārds",
    "Имя специалиста",
    "Specialist name",
  ),
  "literal.dceb04b2.7": L(
    "Speciālista uzvārds",
    "Фамилия специалиста",
    "Specialist surname",
  ),
  "literal.dceb04b2.8": L(
    "Attēla apraksts",
    "Описание изображения",
    "Image description",
  ),
  "literal.dceb04b2.9": L(
    "Pieredzes skaitlis",
    "Число лет опыта",
    "Experience figure",
  ),
};
for (const doc of documents) {
  if (friendlyTitles[doc.key]) doc.title = friendlyTitles[doc.key]!;
  if (doc.source.endsWith("ClinicGallery.vue")) {
    const title = fragmentLabels[Number(doc.key.split(".").at(-1))];
    if (title) doc.title = title;
  }
}
export const findDoc = (key: string) => documents.find((d) => d.key === key);
export const mediaAssets = manifest.media;
export const valueAt = (data: any, path: string[]): any =>
  path.reduce((v, key) => v?.[key], data);
export function visibleFields(doc: Doc, language: string, part?: Part) {
  return doc.fields.filter(
    (f) =>
      !f.system_managed &&
      (f.locale === language || f.locale === "shared") &&
      !["tel", "id", "source", "review", "concession", "slug"].includes(
        f.path.at(-1) || "",
      ) &&
      (!part?.prefixes ||
        part.prefixes.some((prefix) => {
          const path = f.path
            .filter((p) => !["lv", "ru", "en"].includes(p))
            .join(".");
          return (
            path === prefix ||
            path.startsWith(prefix + ".") ||
            (!prefix.includes(".") && path.startsWith(prefix))
          );
        })),
  );
}
export function imageURL(
  value: unknown,
  images: Record<string, string> = findDoc("clinic.media")!.data,
): string | undefined {
  if (typeof value !== "string") return;
  const url = images[value] || value;
  if (previewURL(url)) return previewURL(url);
  const asset = mediaAssets.find(
    (a) =>
      a.url === url &&
      a.kind === "image" &&
      !a.protected &&
      a.url.startsWith("/"),
  );
  return asset?.url;
}
export function docImage(
  doc: Doc,
  data = doc.data,
  language = "lv",
  images?: Record<string, string>,
) {
  if (doc.key === "clinic.media") return undefined;
  return imageURL(data[language]?.image || data.image, images);
}
const part = (key: string, prefixes?: string[]): Part => ({ key, prefixes });
const parts = (...keys: string[]) =>
  keys.filter((k) => !!findDoc(k)).map((k) => part(k));
const fromSource = (name: string) =>
  documents
    .filter((d) => d.source.endsWith(name) && !d.locked)
    .map((d) => part(d.key));
const section = (
  id: string,
  title: Localized,
  entries: Part[],
  image?: string,
): Section => ({
  id,
  title,
  parts: entries.filter((p) => findDoc(p.key)),
  image: imageURL(image),
});
const imagePart = (key: string) => part("clinic.media", [key]);
const media = findDoc("clinic.media")!.data;
const homeLiterals: Record<string, number[]> = {
  intro: [0, 1, 2],
  about: [3, 4],
  doctor: [5, 6, 7, 8, 9],
  prices: [11, 12, 13],
  news: [15, 16],
};
const homeImages: Record<string, string> = {
  about: "room",
  doctor: "doctor",
  clinic: "detail",
  news: "original",
};
export const homeSections: Section[] = manifest.home_sections.map((s) => {
  const entries = s.keys
    .filter(
      (key) =>
        s.id !== "prices" ||
        !key.startsWith("prices.") ||
        ["prices.0", "prices.1", "prices.4"].includes(key),
    )
    .map((key) =>
      part(
        key,
        key === "messages.home"
          ? s.prefixes
          : s.id === "prices" && key.startsWith("prices.")
            ? ["items.0"]
            : undefined,
      ),
    );
  for (const n of homeLiterals[s.id] || [])
    entries.push(part(`literal.dceb04b2.${n}`));
  if (s.id === "services") entries.push(...fromSource("ServiceIndex.vue"));
  if (s.id === "journey") entries.push(...fromSource("PatientJourney.vue"));
  if (homeImages[s.id]) entries.push(imagePart(homeImages[s.id]!));
  return section(s.id, s.title, entries, media[homeImages[s.id] || ""]);
});
const contact = () =>
  section("contact", L("Kontakti", "Контакты", "Contact details"), [
    ...parts("clinic.clinic", "settings.hours"),
    part("messages.home", ["contact"]),
    ...fromSource("ContactBand.vue"),
  ]);
const seo = (path: string) =>
  section(
    "seo",
    L("Meklēšanas rezultātos", "В поисковой выдаче", "Search appearance"),
    documents
      .filter((d) => d.target === "seo" && d.routes[0] === path)
      .map((d) => part(d.key)),
  );
const heading = (key: string) =>
  section(
    "heading",
    L("Lapas virsraksts", "Заголовок страницы", "Page heading"),
    [part("messages.nav", [key])],
  );
export const serviceDocs = documents.filter((d) =>
  d.key.startsWith("service."),
);
export const priceDocs = documents.filter((d) => d.key.startsWith("prices."));
export const newsDocs = documents.filter((d) => d.key.startsWith("news."));
export function pageSections(path: string): Section[] {
  let result: Section[] = [];
  const service = serviceDocs.find(
    (d) => path === "/pakalpojumi/" + d.data.slug,
  );
  const article = newsDocs.find((d) => path === "/jaunumi/" + d.data.lv.slug);
  if (path === "/") result = homeSections;
  else if (path === "/pakalpojumi")
    result = [
      heading("services"),
      ...serviceDocs.map((d) =>
        section(d.key, d.title, parts(d.key), docImage(d)),
      ),
      contact(),
    ];
  else if (service)
    result = [
      section("service", service.title, parts(service.key), docImage(service)),
      section(
        "prices",
        L("Cenas", "Цены", "Prices"),
        parts("prices." + service.data.category),
      ),
      section(
        "related",
        L("Citi pakalpojumi", "Другие услуги", "Related services"),
        serviceDocs
          .filter((d) => d !== service)
          .slice(0, 3)
          .map((d) => part(d.key)),
      ),
      contact(),
    ];
  else if (path === "/cenas")
    result = [
      heading("prices"),
      section(
        "search",
        L("Cenu meklēšana", "Поиск цен", "Price search"),
        parts(
          "refinement.priceSearch",
          "refinement.pricePlaceholder",
          "refinement.clear",
          "refinement.results",
          "refinement.noResults",
        ),
      ),
      ...priceDocs.map((d) => section(d.key, d.title, parts(d.key))),
      contact(),
    ];
  else if (path === "/par-mums")
    result = [
      heading("about"),
      section(
        "about",
        L("Par klīniku", "О клинике", "About the clinic"),
        [
          part("messages.home", ["intro"]),
          ...parts("clinic.philosophy", "clinic.about"),
          imagePart("original"),
          ...fromSource("AboutView.vue").slice(0, 1),
        ],
        media.original,
      ),
      section(
        "doctor",
        L("Dr. Anda Gutovska", "Dr. Anda Gutovska", "Dr. Anda Gutovska"),
        [
          part("messages.home", ["doctor"]),
          ...parts("clinic.doctorBio", "clinic.about"),
          imagePart("doctor"),
          ...fromSource("AboutView.vue").slice(1),
        ],
        media.doctor,
      ),
      contact(),
    ];
  else if (path === "/jaunumi")
    result = [
      heading("news"),
      ...newsDocs.map((d) =>
        section(d.key, d.title, parts(d.key), docImage(d)),
      ),
      contact(),
    ];
  else if (article)
    result = [
      section("article", article.title, parts(article.key), docImage(article)),
      contact(),
    ];
  else if (path === "/kontakti")
    result = [
      section(
        "form",
        L(
          "Jautājumi un kontaktinformācija",
          "Вопросы и контакты",
          "Questions and contact details",
        ),
        [
          ...parts("messages.request", "clinic.clinic", "settings.hours"),
          part("messages.ui", ["phone", "hours", "address", "parking"]),
          part("messages.contact", ["parking"]),
          ...fromSource("ContactView.vue").slice(0, 2),
        ],
      ),
      section("map", L("Karte un adrese", "Карта и адрес", "Map and address"), [
        part("messages.contact", ["openMap", "mapTitle", "mapConsent"]),
        part("messages.cookie", ["mapsText"]),
        part("messages.common", ["directions"]),
        ...fromSource("ContactView.vue").slice(2),
      ]),
      section(
        "faq",
        L("Pirms apmeklējuma", "Перед посещением", "Before your visit"),
        parts("refinement.visit", "refinement.faq"),
      ),
    ];
  else if (path.includes("politika")) {
    const name = path.startsWith("/sikdatnu") ? "cookies" : "privacy";
    const doc = findDoc("messages.legalDocuments")!;
    result = [
      section(
        "intro",
        doc.data.lv[name].title
          ? L(
              doc.data.lv[name].title,
              doc.data.ru[name].title,
              doc.data.en[name].title,
            )
          : doc.title,
        [part(doc.key, [name + ".title", name + ".intro", name + ".notice"])],
      ),
      ...doc.data.lv[name].sections.map((s: any, i: number) =>
        section(
          "legal-" + i,
          L(
            s.title,
            doc.data.ru[name].sections[i].title,
            doc.data.en[name].sections[i].title,
          ),
          [part(doc.key, [name + ".sections." + i])],
        ),
      ),
    ];
  } else if (path === "/* (404)")
    result = [
      section(
        "missing",
        L("Lapa nav atrasta", "Страница не найдена", "Page not found"),
        [
          part("messages.ui", ["notFound", "backHome"]),
          ...fromSource("NotFoundView.vue"),
        ],
      ),
    ];
  // Auth / Booking content stays protected. Only supported search metadata is exposed.
  return result.filter((s) => s.parts.length);
}
export const pages = manifest.routes.map((path) => ({
  path,
  title:
    documents.find((d) => d.target === "seo" && d.routes[0] === path)?.title ||
    L("Lapa nav atrasta", "Страница не найдена", "Page not found"),
  sections: pageSections(path),
  metadata: seo(path),
}));
export const settingsSections = [
  section(
    "clinic",
    L("Klīnikas informācija", "Информация о клинике", "Clinic information"),
    [part("clinic.clinic", ["name"]), ...parts("settings.identity")],
  ),
  section(
    "contact",
    L("Kontaktinformācija", "Контактные данные", "Contact details"),
    [
      part("clinic.clinic", [
        "phone",
        "email",
        "address",
        "map",
        "instagram",
        "facebook",
      ]),
    ],
  ),
  section("hours", L("Darba laiks", "Часы работы", "Opening hours"), [
    part("settings.hours"),
    part("messages.ui", ["hours"]),
  ]),
  section(
    "booking",
    L("Pieraksta iestatījumi", "Настройки записи", "Booking settings"),
    [],
  ),
  section("notifications", L("Paziņojumi", "Уведомления", "Notifications"), []),
  section(
    "general",
    L("Vietnes iestatījumi", "Настройки сайта", "General website settings"),
    [
      ...parts(
        "messages.common",
        "messages.nav",
        "messages.cookie",
        "messages.legal",
        "system.legalMetadata",
      ),
      ...fromSource("SiteFooter.vue"),
    ],
  ),
];
