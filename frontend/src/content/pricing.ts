import source from "./prices.json" with { type: "json" };
import type { Localized } from "./clinic";

// Text only: prices, order and review flags remain in the verified source file.
const translations: Record<string, Pick<Localized, "ru" | "en">> = {
  "Konsultācija un diagnostika": {
    ru: "Консультация и диагностика",
    en: "Consultation and diagnostics",
  },
  "Konsultācija pie vispārējā zobārsta ar diagnozes izskaidrojumu": {
    ru: "Консультация стоматолога общей практики с разъяснением диагноза",
    en: "General dentist consultation with diagnosis explanation",
  },
  "Zobu rentgens (viens rentgens)": {
    ru: "Рентгеновский снимок зуба (один снимок)",
    en: "Dental X-ray (one image)",
  },
  "Zobu higiēna": {
    ru: "Гигиена полости рта",
    en: "Dental hygiene",
  },
  "Pilna mutes dobuma higiēna ar sodas strūklu": {
    ru: "Полная гигиена полости рта с содоструйной обработкой",
    en: "Full oral hygiene with bicarbonate air polishing",
  },
  "Mutes dobuma higiēna, vairākos seansos (katrs nākamais seanss)": {
    ru: "Гигиена полости рта в несколько сеансов (каждый последующий сеанс)",
    en: "Oral hygiene over multiple sessions (each subsequent session)",
  },
  "Pilna mutes dobuma higiēna bērniem – piena zobiem": {
    ru: "Полная гигиена полости рта у детей — молочные зубы",
    en: "Full oral hygiene for children — primary teeth",
  },
  "Pilna mutes dobuma higiēna bērniem pastāvīgiem zobiem": {
    ru: "Полная гигиена полости рта у детей — постоянные зубы",
    en: "Full oral hygiene for children — permanent teeth",
  },
  "Pilna mutes dobuma higiēna ar sodas strūklu (ar ortodontisko aparatūru)": {
    ru: "Полная гигиена полости рта с содоструйной обработкой (при наличии ортодонтических аппаратов)",
    en: "Full oral hygiene with bicarbonate air polishing (with orthodontic appliances)",
  },
  "Medikamentoza smaganu kabatu apstrāde": {
    ru: "Медикаментозная обработка пародонтальных карманов",
    en: "Treatment of periodontal pockets with medication",
  },
  "Tiefenfluorīda uzklāšana 1 zobam": {
    ru: "Нанесение Tiefenfluorid на один зуб",
    en: "Tiefenfluorid application to one tooth",
  },
  "Tiefenfluorīda uzklāšana visiem zobiem": {
    ru: "Нанесение Tiefenfluorid на все зубы",
    en: "Tiefenfluorid application to all teeth",
  },
  "Zobu balināšana kabinetā ar Philips ZOOM": {
    ru: "Кабинетное отбеливание зубов Philips ZOOM",
    en: "In-office teeth whitening with Philips ZOOM",
  },
  "Instruktāža pareizai mutes dobuma higiēnai": {
    ru: "Обучение правильной гигиене полости рта",
    en: "Oral hygiene instruction",
  },
  "Zobu ārstēšana": {
    ru: "Лечение зубов",
    en: "Dental treatment",
  },
  "Vienas virsmas plombēšana ar kompozītmateriālu (anestēzija iekļauta cenā)": {
    ru: "Пломбирование одной поверхности композитным материалом (анестезия включена в стоимость)",
    en: "Single-surface composite filling (anaesthesia included)",
  },
  "Divu virsmu plombēšana ar kompozītmateriālu (anestēzija iekļauta cenā)": {
    ru: "Пломбирование двух поверхностей композитным материалом (анестезия включена в стоимость)",
    en: "Two-surface composite filling (anaesthesia included)",
  },
  "Trīs virsmu plombēšana ar kompozītmateriālu (anestēzija iekļauta cenā)": {
    ru: "Пломбирование трёх поверхностей композитным материалом (анестезия включена в стоимость)",
    en: "Three-surface composite filling (anaesthesia included)",
  },
  "Četru virsmu plombēšana ar kompozītmateriālu (anestēzija iekļauta cenā)": {
    ru: "Пломбирование четырёх поверхностей композитным материалом (анестезия включена в стоимость)",
    en: "Four-surface composite filling (anaesthesia included)",
  },
  "Zoba kroņa atjaunošana (anestēzija iekļauta cenā; tapas ievietošana iekļauta cenā)":
    {
      ru: "Восстановление коронковой части зуба (анестезия и установка штифта включены в стоимость)",
      en: "Restoration of the tooth crown (anaesthesia and post placement included)",
    },
  "Estētiska zoba pārklāšana ar kompozītmateriālu": {
    ru: "Эстетическое покрытие зуба композитным материалом",
    en: "Aesthetic composite veneering of a tooth",
  },
  "Vienkanāla zoba saknes ārstēšana 1. un 2. seanss (anestēzija, tīrīšana/ pildīšana iekļauta cenā)":
    {
      ru: "Лечение зуба с одним корневым каналом, 1-й и 2-й сеансы (анестезия, очистка / пломбирование канала включены в стоимость)",
      en: "Root canal treatment of a tooth with one canal, 1st and 2nd sessions (anaesthesia, cleaning / filling included)",
    },
  "Divkanāla zoba saknes ārstēšana 1. un 2.seanss (anestēzija, tīrīšana/ pildīšana iekļauta cenā)":
    {
      ru: "Лечение зуба с двумя корневыми каналами, 1-й и 2-й сеансы (анестезия, очистка / пломбирование каналов включены в стоимость)",
      en: "Root canal treatment of a tooth with two canals, 1st and 2nd sessions (anaesthesia, cleaning / filling included)",
    },
  "Trīskanāla zoba saknes ārstēšana 1. un 2. seanss (anestēzija, tīrīšana/ pildīšana iekļauta cenā)":
    {
      ru: "Лечение зуба с тремя корневыми каналами, 1-й и 2-й сеансы (анестезия, очистка / пломбирование каналов включены в стоимость)",
      en: "Root canal treatment of a tooth with three canals, 1st and 2nd sessions (anaesthesia, cleaning / filling included)",
    },
  "Pulpas devitalizācija (anestēzija iekļauta cenā)": {
    ru: "Девитализация пульпы (анестезия включена в стоимость)",
    en: "Pulp devitalisation (anaesthesia included)",
  },
  "Zobu ķirurģija": {
    ru: "Хирургическая стоматология",
    en: "Dental surgery",
  },
  "Viensakņu zoba ekstrakcija (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление однокорневого зуба (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a single-rooted tooth (including anaesthesia and treatment with medication)",
    },
  "Divsakņu zoba ekstrakcija (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление двухкорневого зуба (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a two-rooted tooth (including anaesthesia and treatment with medication)",
    },
  "Trīssakņu zoba ekstrakcija (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление трёхкорневого зуба (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a three-rooted tooth (including anaesthesia and treatment with medication)",
    },
  "Viensakņu ekstrakcija ar osteotomiju (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление однокорневого зуба с остеотомией (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a single-rooted tooth with osteotomy (including anaesthesia and treatment with medication)",
    },
  "Divsakņu zoba ekstrakcija ar osteotomiju (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление двухкорневого зуба с остеотомией (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a two-rooted tooth with osteotomy (including anaesthesia and treatment with medication)",
    },
  "Trīssakņu zoba ekstrakcija ar osteotomiju (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление трёхкорневого зуба с остеотомией (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a three-rooted tooth with osteotomy (including anaesthesia and treatment with medication)",
    },
  "Kustīga zoba ekstrakcija (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление подвижного зуба (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Extraction of a mobile tooth (including anaesthesia and treatment with medication)",
    },
  "Astotā zoba ekstrakcija (anestēzija, medikamentoza apstrāde iekļauta cenā)":
    {
      ru: "Удаление зуба мудрости (анестезия и медикаментозная обработка включены в стоимость)",
      en: "Wisdom tooth extraction (including anaesthesia and treatment with medication)",
    },
  "Intra-orālā incīzija (anestēzija, medikamentoza apstrāde iekļauta cenā)": {
    ru: "Внутриротовой разрез (анестезия и медикаментозная обработка включены в стоимость)",
    en: "Intraoral incision (including anaesthesia and treatment with medication)",
  },
  "Šuves uzlikšana pēc ekstrakcijas": {
    ru: "Наложение шва после удаления зуба",
    en: "Placement of a suture after tooth extraction",
  },
  "Alveolīta ārstēšana": {
    ru: "Лечение альвеолита",
    en: "Treatment of alveolitis",
  },
  "Bērnu zobārstniecība": {
    ru: "Детская стоматология",
    en: "Children’s dentistry",
  },
  Konsultācija: {
    ru: "Консультация",
    en: "Consultation",
  },
  "Piena zobu plombēšana 1 virsma (anestēzija iekļauta cenā)": {
    ru: "Пломбирование молочного зуба — одна поверхность (анестезия включена в стоимость)",
    en: "Primary tooth filling — one surface (anaesthesia included)",
  },
  "Piena zobu plombēšana 2 virsmām (anestēzija iekļauta cenā)": {
    ru: "Пломбирование молочного зуба — две поверхности (анестезия включена в стоимость)",
    en: "Primary tooth filling — two surfaces (anaesthesia included)",
  },
  "Piena zobu plombēšana 3 virsmām (anestēzija iekļauta cenā)": {
    ru: "Пломбирование молочного зуба — три поверхности (анестезия включена в стоимость)",
    en: "Primary tooth filling — three surfaces (anaesthesia included)",
  },
  "Viensakņu piena zoba ekstrakcija (anestēzija iekļauta cenā)": {
    ru: "Удаление однокорневого молочного зуба (анестезия включена в стоимость)",
    en: "Extraction of a single-rooted primary tooth (anaesthesia included)",
  },
  "Daudzsakņu piena zoba ekstrakcija (anestēzija iekļauta cenā)": {
    ru: "Удаление многокорневого молочного зуба (анестезия включена в стоимость)",
    en: "Extraction of a multi-rooted primary tooth (anaesthesia included)",
  },
  "Kustīga piena zoba ekstrakcija (anestēzija iekļauta cenā)": {
    ru: "Удаление подвижного молочного зуба (анестезия включена в стоимость)",
    en: "Extraction of a mobile primary tooth (anaesthesia included)",
  },
  "Zobu protezēšana": {
    ru: "Протезирование зубов",
    en: "Dental prosthetics",
  },
  "Metālkeramikas kronis": {
    ru: "Металлокерамическая коронка",
    en: "Metal-ceramic crown",
  },
  "Cirkonija keramikas kronis": {
    ru: "Циркониевая керамическая коронка",
    en: "Zirconia ceramic crown",
  },
  "Plastmasas kronis": {
    ru: "Пластмассовая коронка",
    en: "Resin crown",
  },
  "Lieta metāla sakņu inleja": {
    ru: "Литая металлическая культевая вкладка",
    en: "Cast metal post and core",
  },
  "Kroņa vai inlejas cementēšana": {
    ru: "Фиксация коронки или вкладки на цемент",
    en: "Cementation of a crown or inlay",
  },
  "Kroņa noņemšana": {
    ru: "Снятие коронки",
    en: "Crown removal",
  },
  "Nospiedums 1 žoklim": {
    ru: "Снятие оттиска одной челюсти",
    en: "Impression of one jaw",
  },
  "Mīkstā nakts kape": {
    ru: "Мягкая ночная капа",
    en: "Soft night guard",
  },
  "Cietā nakts kape": {
    ru: "Жёсткая ночная капа",
    en: "Hard night guard",
  },
  "Boksera šina (bezkrāsaina/ krāsaina)": {
    ru: "Боксёрская капа (бесцветная / цветная)",
    en: "Boxing mouthguard (clear / coloured)",
  },
  "Balināšanas kape": {
    ru: "Капа для отбеливания",
    en: "Whitening tray",
  },
  "Metāla lokveida protēze augšžoklim": {
    ru: "Бюгельный протез с металлическим каркасом на верхнюю челюсть",
    en: "Metal-framework partial denture for the upper jaw",
  },
  "Metāla lokveida protēze apakšžoklim": {
    ru: "Бюгельный протез с металлическим каркасом на нижнюю челюсть",
    en: "Metal-framework partial denture for the lower jaw",
  },
  "Metāla lokveida protēze ar elastīgo bāzi augšžoklim": {
    ru: "Бюгельный протез с металлическим каркасом и эластичным базисом на верхнюю челюсть",
    en: "Metal-framework partial denture with a flexible base for the upper jaw",
  },
  "Metāla lokveida protēze ar elastīgo bāzi apakšžoklim": {
    ru: "Бюгельный протез с металлическим каркасом и эластичным базисом на нижнюю челюсть",
    en: "Metal-framework partial denture with a flexible base for the lower jaw",
  },
  "Elastīgā bez-metāla lokveida protēze": {
    ru: "Эластичный частичный протез без металлического каркаса",
    en: "Flexible metal-free partial denture",
  },
  "Izņemamā protēze daļēja (līdz 8 zobiem)": {
    ru: "Частичный съёмный протез (до 8 зубов)",
    en: "Partial removable denture (up to 8 teeth)",
  },
  "Izņemamā protēze - daļēja (līdz 13 zobiem)": {
    ru: "Частичный съёмный протез (до 13 зубов)",
    en: "Partial removable denture (up to 13 teeth)",
  },
  "Totālā izņemamā protēze": {
    ru: "Полный съёмный протез",
    en: "Complete removable denture",
  },
  "Totālā izņemamā protēze ar mīksto bāzi": {
    ru: "Полный съёмный протез с мягким базисом",
    en: "Complete removable denture with a soft base",
  },
  "Platītes reparatūra (1-2 zobi)": {
    ru: "Ремонт съёмного протеза (1–2 зуба)",
    en: "Denture repair (1–2 teeth)",
  },
  "Platītes reparatūra (3 un vairāki zobi)": {
    ru: "Ремонт съёмного протеза (3 и более зубов)",
    en: "Denture repair (3 or more teeth)",
  },
  "Elastīgā izņemamā viena zoba platīte": {
    ru: "Эластичный съёмный протез на один зуб",
    en: "Flexible removable single-tooth denture",
  },
  "Elastīgā izņemamā vienpusēja zobu platīte": {
    ru: "Эластичный съёмный односторонний протез",
    en: "Flexible removable unilateral denture",
  },
  "Elastīgā izņemamā parciālā zobu platīte": {
    ru: "Эластичный съёмный частичный протез",
    en: "Flexible removable partial denture",
  },
  "Elastīgā izņemamā totālā zobu platīte": {
    ru: "Эластичный съёмный полный протез",
    en: "Flexible removable complete denture",
  },
  "Elastīgās platītes reparatūra": {
    ru: "Ремонт эластичного съёмного протеза",
    en: "Flexible denture repair",
  },
  "Zobu garnitūras cena platītēs": {
    ru: "Стоимость набора искусственных зубов для съёмного протеза",
    en: "Cost of a set of denture teeth",
  },
  "Zobu protēzes korekcija": {
    ru: "Коррекция зубного протеза",
    en: "Denture adjustment",
  },
};

function translated(lv: string): Localized {
  const text = translations[lv];
  if (!text) throw new Error(`Missing pricing translation: ${lv}`);
  return { lv, ...text };
}

export const localizedPrices = source.map((category) => ({
  title: translated(category.title),
  concession: category.title === "Zobu protezēšana",
  items: category.items.map((item) => ({
    ...item,
    name: translated(item.name),
  })),
}));
