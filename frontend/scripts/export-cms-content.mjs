// Reproducible extraction of approved content, not a database import.
import ts from "typescript";
import { parse } from "@vue/compiler-dom";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const revision = "3a07279970f3bf24745baa40998d41e7ac6656ae";
const require = createRequire(resolve(root, "frontend/package.json"));
const hash = (s) => createHash("sha256").update(s).digest("hex");
const sourceCache = new Map();
const original = (p) => {
  if (sourceCache.has(p)) return sourceCache.get(p);
  const result = execFileSync("git", ["show", `${revision}:${p}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20e6,
  });
  sourceCache.set(p, result);
  return result;
};
const cache = new Map(),
  sources = {};
// Compile the existing data modules unchanged; browser storage is irrelevant to extraction.
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, removeItem() {} },
  configurable: true,
});
function load(file) {
  file = file.replaceAll("\\", "/");
  if (cache.has(file)) return cache.get(file);
  const text = original(file);
  sources[file] = hash(text);
  if (file.endsWith(".json")) return JSON.parse(text);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const code = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (!name.startsWith(".")) return require(name);
      let child = resolve(dirname(resolve(root, file)), name).slice(
        root.length + 1,
      );
      if (!/\.(ts|json)$/.test(child)) child += ".ts";
      return load(child);
    },
    module,
    module.exports,
  );
  return module.exports;
}
const clinic = load("frontend/src/content/clinic.ts");
const refinement = load("frontend/src/content/refinement.ts").refinement;
const prices = load("frontend/src/content/pricing.ts").localizedPrices;
const articles = load("frontend/src/content/articles.ts").articles;
const localize = load(
  "frontend/src/content/articleTranslations.ts",
).localizeArticle;
const i18n = load("frontend/src/i18n/index.ts").default;
const langs = ["lv", "ru", "en"];
const L = (lv, ru, en) => ({ lv, ru, en });
const documents = [],
  inventory = [],
  literals = [];
const priceReferences = {
  konsultacija: [0, 0],
  "zobu-arstesana": [2, 0],
  "saknu-kanalu-arstesana": [2, 6],
  "zobu-higiena": [1, 0],
  "zobu-balinasana": [1, 8],
  "bernu-zobarstnieciba": [4, 0],
};
const names = {
  home: L("Sākumlapa — sadaļas", "Главная — разделы", "Homepage — sections"),
  hero: L("Hero — aizsargāts", "Hero — защищено", "Hero — protected"),
  nav: L("Navigācijas teksti", "Тексты навигации", "Navigation labels"),
  common: L("Pogas un saites", "Кнопки и ссылки", "Buttons and links"),
  page: L("Lapu ievadi", "Вступления страниц", "Page introductions"),
  ui: L("Vietnes norādes", "Подсказки сайта", "Website labels"),
  footer: L("Kājene", "Подвал сайта", "Footer"),
  contact: L("Kontakti", "Контакты", "Contacts"),
  request: L("Jautājumu veidlapa", "Форма вопросов", "Question form"),
  cookie: L("Sīkdatņu izvēle", "Настройки cookie", "Cookie preferences"),
  legal: L("Juridiskās saites", "Юридические ссылки", "Legal links"),
  legalDocuments: L(
    "Privātuma un sīkdatņu politikas",
    "Политики конфиденциальности и cookie",
    "Privacy and cookie policies",
  ),
  prices: L("Cenu lapas teksti", "Тексты страницы цен", "Pricing page labels"),
  priceSearch: L("Cenu meklēšana", "Поиск цен", "Price search"),
  news: L("Jaunumu lapas teksti", "Тексты новостей", "News page labels"),
  faq: L(
    "Biežāk uzdotie jautājumi",
    "Частые вопросы",
    "Frequently asked questions",
  ),
  welcome: L("Ievads", "Вступление", "Introduction"),
  care: L("Mūsu pieeja", "Наш подход", "Our approach"),
  years: L("Pieredze", "Опыт", "Experience"),
  whyDescriptions: L("Kāpēc AG", "Почему AG", "Why AG"),
  journey: L("Pacienta ceļš", "Путь пациента", "Patient journey"),
  auth: L(
    "Autentifikācija — aizsargāta",
    "Вход — защищено",
    "Authentication — protected",
  ),
  booking: L(
    "Pieraksts — aizsargāts",
    "Запись — защищено",
    "Booking — protected",
  ),
};
const routes = [
  "/",
  "/pakalpojumi",
  ...clinic.services.map((s) => `/pakalpojumi/${s.slug}`),
  "/cenas",
  "/par-mums",
  "/jaunumi",
  ...articles.map((a) => `/jaunumi/${a.slug}`),
  "/kontakti",
  "/pieraksts",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privatuma-politika",
  "/sikdatnu-politika",
  "/* (404)",
];
const labelNames = {
  title: L("Virsraksts", "Заголовок", "Heading"),
  name: L("Nosaukums", "Название", "Name"),
  text: L("Apraksts", "Описание", "Description"),
  short: L("Īss apraksts", "Краткое описание", "Short description"),
  price: L("Cena", "Цена", "Price"),
  image: L("Attēls", "Изображение", "Image"),
  q: L("Jautājums", "Вопрос", "Question"),
  a: L("Atbilde", "Ответ", "Answer"),
  paragraphs: L("Rindkopa", "Абзац", "Paragraph"),
  date: L("Datums", "Дата", "Date"),
  category: L("Kategorija", "Категория", "Category"),
  excerpt: L("Ievads", "Вступление", "Introduction"),
  phone: L("Tālrunis", "Телефон", "Phone"),
  email: L("E-pasts", "Электронная почта", "Email"),
  address: L("Adrese", "Адрес", "Address"),
  map: L("Karte", "Карта", "Map"),
};
function add(
  key,
  group,
  title,
  target,
  path,
  data,
  source,
  route,
  locked = false,
) {
  const doc = {
    key,
    group,
    title,
    target,
    path,
    routes: route,
    source,
    locked,
    system_managed:
      key === "messages.hero" || source.includes("ScrollClinicHero"),
    fields: [],
    data,
  };
  function walk(value, at = []) {
    if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, [...at, k]);
      return;
    }
    const locale = at.find((k) => langs.includes(k)) || "shared";
    const name = at.filter((k) => !langs.includes(k)).at(-1) || "text";
    const structural =
      ["slug", "source", "id", "review", "concession", "category"].includes(
        name,
      ) &&
      (name !== "category" || typeof value === "number");
    const protectedCopy =
      key === "messages.hero" ||
      (key === "messages.common" && name === "bookAppointment");
    const fixed =
      locked ||
      structural ||
      protectedCopy ||
      (name === "price" && key.startsWith("service.")) ||
      (target === "clinic" &&
        path[0] === "media" &&
        ["video", "poster"].includes(name));
    const type =
      name === "price"
        ? "price"
        : name === "email" && key === "clinic.clinic"
          ? "email"
          : (name === "tel" || name === "phone") && key === "clinic.clinic"
            ? "phone"
            : name === "date" && target === "articles"
              ? "date"
              : name === "image"
                ? "image-key"
                : typeof value === "boolean"
                  ? "boolean"
                  : typeof value === "number"
                    ? "number"
                    : typeof value === "string" && value.startsWith("/media/")
                      ? "media"
                      : typeof value === "string" && /^https:\/\//.test(value)
                        ? "url"
                        : "text";
    const label =
      labelNames[name] ||
      (/^\d+$/.test(name)
        ? Object.fromEntries(
            langs.map((l) => [
              l,
              `${labelNames.paragraphs[l]} ${Number(name) + 1}`,
            ]),
          )
        : L("Teksts", "Текст", "Text"));
    const field = {
      path: at,
      label,
      locale,
      type,
      locked: fixed,
      system_managed:
        protectedCopy ||
        (key === "clinic.media" && ["video", "poster"].includes(name)) ||
        doc.system_managed,
    };
    doc.fields.push(field);
    inventory.push({
      source,
      routes: route,
      category: group,
      identifier: `${key}/${at.join("/")}`,
      value,
      language: locale,
      relatedMedia: type.includes("image") || type === "media" ? value : null,
      currentlyEditable: false,
      cmsDestination:
        doc.system_managed || field.system_managed
          ? null
          : `/admin/${group}/${key}`,
      system_managed: doc.system_managed || field.system_managed,
      editableAfterImport: !fixed,
    });
  }
  walk(data);
  if (key.startsWith("service.") && priceReferences[data.slug])
    doc.price_reference = priceReferences[data.slug];
  doc.source_hash = hash(JSON.stringify(data));
  documents.push(doc);
}
const title = (value) =>
  typeof value === "object" && value.lv
    ? value
    : L(String(value), String(value), String(value));
const allPublic = routes.filter(
  (r) =>
    !["/login", "/register", "/forgot-password", "/reset-password"].includes(r),
);
for (const [key, value] of Object.entries(clinic)) {
  if (typeof value === "function") continue;
  if (key === "services") {
    value.forEach((v, i) =>
      add(
        `service.${v.slug}`,
        "services",
        v.title,
        "clinic",
        [key, String(i)],
        v,
        "frontend/src/content/clinic.ts",
        ["/", "/pakalpojumi", `/pakalpojumi/${v.slug}`],
      ),
    );
  } else
    add(
      `clinic.${key}`,
      key === "doctorBio"
        ? "doctors"
        : key === "clinic"
          ? "settings"
          : key === "media"
            ? "media"
            : "pages",
      key === "doctorBio"
        ? title("Dr. Anda Gutovska")
        : title(
            key === "philosophy"
              ? "Filozofija / Philosophy"
              : key === "about"
                ? "Par mums / About"
                : key === "media"
                  ? "Media"
                  : "AG Zobārstniecība",
          ),
      "clinic",
      [key],
      value,
      "frontend/src/content/clinic.ts",
      allPublic,
    );
}
prices.forEach((p, i) =>
  add(
    `prices.${i}`,
    "services",
    p.title,
    "prices",
    [String(i)],
    p,
    "frontend/src/content/pricing.ts + frontend/src/content/prices.json",
    ["/cenas", "/pakalpojumi/:slug", "/"],
  ),
);
articles.forEach((a, i) =>
  add(
    `news.${a.slug}`,
    "news",
    Object.fromEntries(langs.map((l) => [l, localize(a, l).title])),
    "articles",
    [String(i)],
    Object.fromEntries(langs.map((l) => [l, localize(a, l)])),
    "frontend/src/content/articles.ts + frontend/src/content/articleTranslations.ts",
    ["/", "/jaunumi", `/jaunumi/${a.slug}`],
  ),
);
for (const [key, value] of Object.entries(refinement))
  add(
    `refinement.${key}`,
    "pages",
    names[key] ||
      title(typeof value?.lv === "string" ? value.lv.slice(0, 65) : key),
    "refinement",
    [key],
    value,
    "frontend/src/content/refinement.ts",
    allPublic,
  );
for (const key of Object.keys(i18n.global.getLocaleMessage("lv"))) {
  const data = Object.fromEntries(
    langs.map((l) => [l, i18n.global.getLocaleMessage(l)[key]]),
  );
  const route =
    key === "hero" || key === "home"
      ? ["/"]
      : key === "legalDocuments" || key === "legal"
        ? ["/privatuma-politika", "/sikdatnu-politika"]
        : key === "request" || key === "contact"
          ? ["/kontakti"]
          : allPublic;
  add(
    `messages.${key}`,
    "pages",
    names[key] || title(key),
    "messages",
    [key],
    data,
    key === "legalDocuments"
      ? "frontend/src/i18n/legalDocuments.ts + frontend/src/content/legal.ts"
      : ["contact", "legal", "request", "cookie"].includes(key)
        ? "frontend/src/i18n/privacyAndContact.ts"
        : "frontend/src/i18n/index.ts",
    route,
    key === "hero",
  );
}
// Transactional labels belong in the inventory but cannot change Auth/Booking promises via CMS.
for (const [key, file, exported] of [
  ["auth", "frontend/src/i18n/auth.ts", "authMessages"],
  ["booking", "frontend/src/i18n/booking.ts", "bookingMessages"],
])
  add(
    `system.${key}`,
    "pages",
    names[key],
    "system",
    [],
    load(file)[exported],
    file,
    key === "auth"
      ? ["/login", "/register", "/forgot-password", "/reset-password"]
      : ["/pieraksts"],
    true,
  );
const files = execFileSync(
  "git",
  ["ls-tree", "-r", "--name-only", revision, "frontend/src"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n");
const lockedFiles = new Set(
  Object.keys(JSON.parse(original("docs/HERO_LOCK.json"))),
);
const pageRoute = {
  Home: "/",
  About: "/par-mums",
  Contact: "/kontakti",
  Services: "/pakalpojumi",
  Service: "/pakalpojumi/:slug",
  News: "/jaunumi",
  Article: "/jaunumi/:slug",
  Prices: "/cenas",
  Legal: "/privatuma-politika",
  Auth: "/login",
  Booking: "/pieraksts",
  NotFound: "/* (404)",
};
for (const file of files.filter(
  (f) => f.endsWith(".vue") && !/\/admin\//.test(f),
)) {
  const code = original(file);
  sources[file] = hash(code);
  const start = code.indexOf("<template>");
  if (start < 0) continue;
  const end = code.lastIndexOf("</template>"),
    markup = code.slice(start + 10, end);
  const ast = parse(markup, { comments: false });
  const found = [];
  function visit(node) {
    if (
      node.type === 2 &&
      node.content.trim() &&
      /[\p{L}\p{N}]/u.test(node.content)
    )
      found.push({
        value: node.content,
        start: start + 10 + node.loc.start.offset,
        end: start + 10 + node.loc.end.offset,
        attribute: false,
      });
    if (node.type === 1)
      for (const p of node.props || [])
        if (
          p.type === 6 &&
          ["alt", "title", "aria-label", "placeholder"].includes(p.name) &&
          p.value?.content
        )
          found.push({
            value: p.value.content,
            start: start + 10 + p.loc.start.offset,
            end: start + 10 + p.loc.end.offset,
            attribute: p.name,
          });
    for (const child of node.children || []) visit(child);
  }
  visit(ast);
  const route = file.match(/\/([A-Za-z]+)View.vue$/)?.[1];
  const protectedFile =
    lockedFiles.has(file) ||
    /WelcomeIntro|SiteHeader|Booking|Auth|CookieConsent|ContactQuestionForm|HelloWorld/.test(
      file,
    );
  found.forEach((item, i) => {
    const key = `literal.${hash(file).slice(0, 8)}.${i}`;
    const editable = !protectedFile && item.value.trim().length > 2;
    add(
      key,
      "pages",
      title(item.value.trim().slice(0, 65)),
      "literal",
      [key],
      { text: item.value },
      file,
      pageRoute[route] ? [pageRoute[route]] : allPublic,
      !editable,
    );
    if (file.includes("HelloWorld")) {
      const d = documents.at(-1);
      d.group = "source-only";
      d.routes = [];
      for (const row of inventory.filter((v) =>
        v.identifier.startsWith(key + "/"),
      )) {
        row.routes = [];
        row.category = "source-only";
        row.cmsDestination = "Source inventory (unused component)";
      }
    }
    literals.push({ key, file, ...item, editable });
  });
}
const mediaFiles = execFileSync(
  "git",
  [
    "ls-tree",
    "-r",
    "--name-only",
    revision,
    "frontend/public",
    "frontend/src/assets",
  ],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n");
const media = mediaFiles
  .filter((p) => /\.(jpg|jpeg|png|webp|svg|mp4|webm|avif)$/i.test(p))
  .map((file) => {
    const bytes = execFileSync("git", ["show", `${revision}:${file}`], {
      cwd: root,
      maxBuffer: 100e6,
    });
    const url = file.startsWith("frontend/public/")
      ? file.slice("frontend/public".length)
      : file;
    const aliases = Object.entries(clinic.media)
      .filter(([, v]) => v === url)
      .map(([k]) => k);
    const usages = [...files, "frontend/index.html"].filter((f) => {
      const s = original(f);
      return (
        s.includes(url) ||
        aliases.some((a) => s.includes(`media.${a}`) || s.includes(`media[`))
      );
    });
    return {
      id: `media.${hash(file).slice(0, 16)}`,
      url,
      filename: file.split("/").at(-1),
      kind: /\.(mp4|webm)$/.test(file) ? "video" : "image",
      sha256: hash(bytes),
      bytes: bytes.length,
      protected: lockedFiles.has(file),
      usages,
      usage_groups: [
        ...new Set(
          usages
            .filter((f) => f.endsWith(".vue") && !f.includes("HelloWorld"))
            .map((f) =>
              /HomeView|\/home\//.test(f)
                ? "home"
                : /Services?View|ServiceIndex/.test(f)
                  ? "services"
                  : /AboutView/.test(f)
                    ? "about"
                    : /ArticleView|NewsView/.test(f)
                      ? "news"
                      : /Doctor/.test(f)
                        ? "doctors"
                        : "other",
            ),
        ),
      ],
      legacy: true,
    };
  });
// Existing inline translations are content too; preserve their exact strings.
const homeSource = original("frontend/src/views/HomeView.vue");
let inlineIndex = 0;
for (const match of homeSource.matchAll(
  /\bl\(\s*"([^"\n]*)",\s*"([^"\n]*)",\s*"([^"\n]*)",?\s*\)/g,
)) {
  const key = `inline.home.${inlineIndex++}`;
  add(
    key,
    "pages",
    title(match[1]),
    "inline",
    [key],
    L(match[1], match[2], match[3]),
    "frontend/src/views/HomeView.vue",
    ["/"],
  );
}
const hours = original("frontend/src/views/ContactView.vue").match(
  /09:00–18:00/,
)[0];
add(
  "settings.hours",
  "settings",
  L("Darba laiks", "Часы работы", "Opening hours"),
  "literal",
  ["settings.hours"],
  { text: hours },
  "frontend/src/views/ContactView.vue + components/layout/SiteFooter.vue + components/layout/SiteHeader.vue + components/ContactBand.vue",
  allPublic,
);
add(
  "settings.identity",
  "settings",
  L("Klīnikas identitāte", "Название клиники", "Clinic identity"),
  "system",
  [],
  { name: "AG Zobārstniecība" },
  "frontend/src/components/layout/SiteHeader.vue + components/common/WelcomeIntro.vue",
  allPublic,
  true,
);
// Keep duplicate legacy hour labels in the inventory, but edit one canonical value.
for (const d of documents.filter(
  (d) =>
    d.target === "literal" &&
    d.key !== "settings.hours" &&
    String(d.data.text).includes(hours),
)) {
  d.locked = true;
  for (const field of d.fields) field.locked = true;
  for (const row of inventory.filter((i) =>
    i.identifier.startsWith(d.key + "/"),
  ))
    row.editableAfterImport = false;
}
const index = original("frontend/index.html");
sources["frontend/index.html"] = hash(index);
add(
  "seo.site",
  "seo",
  title("SEO"),
  "system",
  [],
  {
    title: index.match(/<title>(.*?)<\/title>/s)[1],
    description: index.match(/name="description"\s+content="([^"]*)"/s)[1],
  },
  "frontend/index.html",
  allPublic,
  true,
);
const review = load("frontend/src/content/legal.ts").legalReview;
// Page metadata reflects the current App and page-specific title logic exactly.
const metas = {
  "/": "nav.home",
  "/pakalpojumi": "nav.services",
  "/cenas": "nav.prices",
  "/par-mums": "nav.about",
  "/jaunumi": "nav.news",
  "/kontakti": "nav.contact",
  "/pieraksts": "booking.title",
  "/login": "auth.login",
  "/register": "auth.register",
  "/forgot-password": "auth.forgot",
  "/reset-password": "auth.reset",
  "/privatuma-politika": "legal.privacyTitle",
  "/sikdatnu-politika": "legal.cookieTitle",
};
const nested = (obj, key) => key.split(".").reduce((v, k) => v?.[k], obj);
for (const route of routes.filter((r) => !r.includes("404"))) {
  const article = articles.find((a) => route === `/jaunumi/${a.slug}`),
    service = clinic.services.find((s) => route === `/pakalpojumi/${s.slug}`);
  const data = Object.fromEntries(
    langs.map((lang) => {
      const messages = i18n.global.getLocaleMessage(lang);
      const heading = article
        ? localize(article, lang).title
        : service
          ? service.title[lang]
          : metas[route]?.startsWith("auth.")
            ? load("frontend/src/i18n/auth.ts").authMessages[lang][
                metas[route].split(".")[1]
              ]
            : metas[route] === "booking.title"
              ? load("frontend/src/i18n/booking.ts").bookingMessages[lang].title
              : nested(messages, metas[route]);
      return [
        lang,
        {
          title: `${heading} · AG Zobārstniecība`,
          description:
            messages.page.servicesIntro +
            " " +
            messages.hero.location +
            ". +371 28229925.",
        },
      ];
    }),
  );
  add(
    `seo.page.${hash(route).slice(0, 12)}`,
    "seo",
    Object.fromEntries(langs.map((l) => [l, data[l].title])),
    "seo",
    [route],
    data,
    "frontend/src/App.vue + router/index.ts + views/ServiceView.vue + views/ArticleView.vue",
    [route],
  );
}
add(
  "system.legalMetadata",
  "settings",
  L(
    "Juridiskā satura versijas — aizsargātas",
    "Версии юридических материалов — защищено",
    "Legal content versions — protected",
  ),
  "system",
  [],
  {
    updated: load("frontend/src/content/legal.ts").POLICY_UPDATED,
    consentVersion: load("frontend/src/services/cookieConsent.ts")
      .CONSENT_VERSION,
    review,
  },
  "frontend/src/content/legal.ts + frontend/src/services/cookieConsent.ts",
  ["/privatuma-politika", "/sikdatnu-politika"],
  true,
);
add(
  "system.articleAttribution",
  "news",
  L(
    "Rakstu attēlu paraksti",
    "Подписи к изображениям статей",
    "Article image captions",
  ),
  "system",
  [],
  { doctor: "Dr. Anda Gutovska", clinic: "AG Zobārstniecība" },
  "frontend/src/views/ArticleView.vue",
  articles.map((a) => `/jaunumi/${a.slug}`),
  true,
);
// The section picker follows the actual homepage component order, not a new layout.
const homeSections = [
  ["hero", L("Hero", "Hero", "Hero"), ["messages.hero"], []],
  [
    "welcome",
    L("Ievada animācija", "Вступительная анимация", "Welcome Intro"),
    documents
      .filter((d) => d.source.includes("WelcomeIntro"))
      .map((d) => d.key),
    [],
  ],
  [
    "intro",
    L(
      "Ievads — mūsu pieeja",
      "Вступление — наш подход",
      "Introduction — our approach",
    ),
    [
      "messages.home",
      "clinic.philosophy",
      "refinement.welcome",
      "refinement.care",
    ],
    ["intro"],
  ],
  [
    "services",
    L("Pakalpojumi", "Услуги", "Services"),
    [
      "messages.home",
      "refinement.servicesNote",
      "refinement.servicesIndex",
      ...documents
        .filter((d) => d.key.startsWith("service."))
        .map((d) => d.key),
    ],
    ["services"],
  ],
  [
    "about",
    L("Par mums", "О клинике", "About"),
    ["messages.home", "clinic.about"],
    ["about"],
  ],
  [
    "doctor",
    L("Dr. Anda Gutovska", "Dr. Anda Gutovska", "Dr. Anda Gutovska"),
    ["messages.home", "clinic.doctorBio", "refinement.years"],
    ["doctor"],
  ],
  [
    "why",
    L("Kāpēc AG", "Почему AG", "Why AG"),
    ["messages.home", "refinement.whyDescriptions"],
    ["why"],
  ],
  [
    "journey",
    L("Pacienta ceļš", "Путь пациента", "Patient journey"),
    ["messages.home"],
    ["journey", "step"],
  ],
  [
    "prices",
    L("Cenu ieskats", "Обзор цен", "Prices preview"),
    [
      "messages.home",
      ...documents
        .filter(
          (d) =>
            d.key.startsWith("prices.") || d.key.startsWith("inline.home."),
        )
        .map((d) => d.key),
    ],
    ["prices"],
  ],
  [
    "clinic",
    L(
      "Par klīniku — redakcionālā sadaļa",
      "О клинике — раздел",
      "About the clinic — editorial section",
    ),
    documents
      .filter((d) => d.source.includes("ClinicGallery"))
      .map((d) => d.key),
    [],
  ],
  [
    "news",
    L("Jaunumi", "Новости", "News"),
    [
      "messages.home",
      ...documents.filter((d) => d.key.startsWith("news.")).map((d) => d.key),
    ],
    ["news"],
  ],
  [
    "contact",
    L("Kontaktu sadaļa", "Контактный раздел", "Contact section"),
    [
      "messages.home",
      "clinic.clinic",
      "settings.hours",
      ...documents
        .filter((d) => d.source.includes("ContactBand"))
        .map((d) => d.key),
    ],
    ["contact"],
  ],
].map(([id, title, keys, prefixes]) => ({
  id,
  title,
  keys: [...new Set(keys)],
  prefixes,
}));
const manifest = {
  version: 1,
  source_revision: revision,
  home_sections: homeSections.filter(
    (s) => !["hero", "welcome"].includes(s.id),
  ),
  system_sections: homeSections
    .filter((s) => ["hero", "welcome"].includes(s.id))
    .map((s) => ({ ...s, system_managed: true })),
  sources,
  routes,
  documents,
  media,
  legal_review: review,
  literals,
};
const bindings = documents.map((d) => ({
  key: d.key,
  target: d.target,
  path: d.path,
  locked: d.locked,
  ...(d.price_reference ? { price_reference: d.price_reference } : {}),
  locks: d.fields.filter((f) => f.locked).map((f) => f.path),
  ...(["literal", "inline", "seo"].includes(d.target) ? { data: d.data } : {}),
}));
const outputs = {
  "backend/internal/cms/content.json": JSON.stringify(manifest, null, 2) + "\n",
  "frontend/src/services/cms/bindings.json": JSON.stringify(bindings) + "\n",
  "docs/CMS_CONTENT_INVENTORY.json":
    JSON.stringify(
      {
        source_revision: revision,
        routes,
        items: inventory,
        media,
        legal_review: review,
      },
      null,
      2,
    ) + "\n",
};
for (const [file, text] of Object.entries(outputs)) {
  const path = resolve(root, file);
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== text)
      throw Error(`Content parity failed: ${file}`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}
console.log(
  JSON.stringify({
    documents: documents.length,
    fields: inventory.length,
    routes: routes.length,
    media: media.length,
    check: process.argv.includes("--check"),
  }),
);
