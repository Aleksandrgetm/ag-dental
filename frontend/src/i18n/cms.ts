import { cmsUx } from "./cmsUx.ts";
const en = {
  editorMissing: 'This item is unavailable or no longer exists.',
  title: "Website content",
  priceSource:
    "Published price preview. Change the canonical amount in Services & prices → the relevant price category.",
  bookingSource: "Booking configuration (read only)",
  noBookingLink:
    "No verified booking procedure is linked to this public service. No duration or doctor assignment has been assumed.",
  bookingEnabled: "Enabled in the booking catalog — times depend on schedules",
  bookingDisabled: "Disabled in the booking catalog",
  duration: "Duration in minutes",
  eligible: "Configured eligible specialists",
  unconfirmed: "Not confirmed",
  usage: "Used on",
  section: "Homepage section",
  allSections: "All sections",
  other: "Other pages",
  allMedia: "All media",
  intro:
    "The clinic’s existing content is already here. Edit a language, save a draft, preview, then publish.",
  search: "Find content",
  page: "Public page",
  all: "All pages",
  shared: "Shared content",
  language: "Editing language",
  baseline:
    "Showing the approved website content. Database setup and import are required before saving or publishing.",
  loading: "Loading saved content…",
  retry: "Try again",
  edit: "Edit",
  back: "All content",
  locked:
    "Protected content. Changes to this item require a separately reviewed implementation.",
  missing:
    "This source has no separate translation in the selected language. Existing shared content is shown below; no translation has been invented.",
  save: "Save draft",
  publish: "Publish saved draft",
  preview: "Preview content",
  previewNote:
    "Private content preview. The public layout stays unchanged. Nothing is published by opening this preview.",
  history: "Revision history",
  published: "Published",
  draft: "Draft",
  restore: "Republish this revision",
  saved: "Draft saved. The public website has not changed.",
  done: "Publication saved. Public pages will receive it on their next content refresh.",
  conflict:
    "Someone saved a newer revision. Reload the saved content before trying again; your local text has not been discarded.",
  invalid:
    "Check the fields. Keep required translations, valid links and the existing content structure.",
  unavailable:
    "Saved content is unavailable. Your changes have not been confirmed. Reload to check the current version before retrying.",
  confirmPublish:
    "Publish this saved revision in all languages? It will update the public website.",
  confirmRestore:
    "Republish this earlier revision? The current published content and saved draft will be replaced, while history is retained.",
  leave: "You have unsaved changes. Leave this editor and discard them?",
  dirty: "Unsaved changes",
  clean: "No unsaved changes",
  noResults: "No matching content",
  source: "Existing website content",
  catalogNote:
    "These are public services and prices. No booking durations, doctors or availability are created by this import. Real booking remains controlled by the Booking API.",
  mediaNote:
    "Existing files keep their current URLs. Uploads and Storage migration require a separately approved rollout; no files have been uploaded.",
  protectedMedia: "Protected Hero asset",
  unused: "Source asset; not currently used by a public page",
  uses: "Used by",
  media: "Media Library",
  choose: "Choose an existing image",
  phoneNote: "The telephone link is updated with the phone number.",
  review:
    "Some legal information still requires clinic confirmation. Existing review flags are preserved.",
  seo: "SEO",
  field: "Text",
  reload: "Reload saved content",
  readOnly: "Read only",
  saving: "Saving…",
  publishedVersion: "Current publication",
  revisionPreview: "Preview this revision",
};
const lv: Record<keyof typeof en, string> = {
  editorMissing: 'Šis materiāls nav pieejams vai vairs nepastāv.',
  title: "Vietnes saturs",
  priceSource:
    "Publicētās cenas ieskats. Mainiet cenu sadaļā Pakalpojumi un cenas → attiecīgajā cenu kategorijā.",
  bookingSource: "Pieraksta iestatījumi (tikai lasīšanai)",
  noBookingLink:
    "Šim publiskajam pakalpojumam nav piesaistīta apstiprināta pieraksta procedūra. Ilgums un speciālists nav pieņemts pēc noklusējuma.",
  bookingEnabled: "Iespējots pieraksta katalogā — laiki atkarīgi no grafika",
  bookingDisabled: "Atspējots pieraksta katalogā",
  duration: "Ilgums minūtēs",
  eligible: "Piesaistītie speciālisti",
  unconfirmed: "Nav apstiprināts",
  usage: "Izmantošana",
  section: "Sākumlapas sadaļa",
  allSections: "Visas sadaļas",
  other: "Citas lapas",
  allMedia: "Visi faili",
  intro:
    "Klīnikas esošais saturs jau ir pieejams. Rediģējiet valodu, saglabājiet melnrakstu, priekšskatiet un publicējiet.",
  search: "Meklēt saturu",
  page: "Publiskā lapa",
  all: "Visas lapas",
  shared: "Kopīgs saturs",
  language: "Rediģēšanas valoda",
  baseline:
    "Tiek rādīts apstiprinātais vietnes saturs. Pirms saglabāšanas un publicēšanas jāsagatavo datubāze un jāimportē saturs.",
  loading: "Ielādējam saglabāto saturu…",
  retry: "Mēģināt vēlreiz",
  edit: "Rediģēt",
  back: "Viss saturs",
  locked:
    "Aizsargāts saturs. Šīs vienības izmaiņām vajadzīga atsevišķi pārskatīta ieviešana.",
  missing:
    "Avotā nav atsevišķa tulkojuma izvēlētajā valodā. Zemāk redzams esošais kopīgais saturs; jauns tulkojums nav izveidots.",
  save: "Saglabāt melnrakstu",
  publish: "Publicēt saglabāto melnrakstu",
  preview: "Satura priekšskatījums",
  previewNote:
    "Privāts satura priekšskatījums. Publiskās lapas izkārtojums nemainās. Priekšskatījuma atvēršana neko nepublicē.",
  history: "Versiju vēsture",
  published: "Publicēts",
  draft: "Melnraksts",
  restore: "Publicēt šo versiju atkārtoti",
  saved: "Melnraksts saglabāts. Publiskā vietne nav mainīta.",
  done: "Publikācija saglabāta. Publiskās lapas to saņems nākamajā satura atjaunošanā.",
  conflict:
    "Kāds ir saglabājis jaunāku versiju. Pirms atkārtota mēģinājuma ielādējiet saglabāto saturu; jūsu teksts nav dzēsts.",
  invalid:
    "Pārbaudiet laukus. Saglabājiet obligātos tulkojumus, derīgas saites un esošo satura struktūru.",
  unavailable:
    "Saglabātais saturs nav pieejams. Izmaiņas nav apstiprinātas. Pirms atkārtota mēģinājuma ielādējiet jaunāko versiju.",
  confirmPublish:
    "Publicēt šo saglabāto versiju visās valodās? Tā atjaunos publisko vietni.",
  confirmRestore:
    "Publicēt šo agrāko versiju? Pašreizējā publikācija un melnraksts tiks aizstāti, saglabājot vēsturi.",
  leave: "Ir nesaglabātas izmaiņas. Atstāt redaktoru un tās atmest?",
  dirty: "Nesaglabātas izmaiņas",
  clean: "Nav nesaglabātu izmaiņu",
  noResults: "Saturs nav atrasts",
  source: "Esošais vietnes saturs",
  catalogNote:
    "Šie ir publiskie pakalpojumi un cenas. Imports neveido procedūru ilgumus, ārstus vai pieejamību. Īsto pierakstu joprojām pārvalda pieraksta sistēma.",
  mediaNote:
    "Esošie faili saglabā pašreizējās adreses. Augšupielādei un pārejai uz Storage vajadzīga atsevišķi apstiprināta ieviešana; faili nav augšupielādēti.",
  protectedMedia: "Aizsargāts Hero fails",
  unused: "Avota fails; publiskajā lapā pašlaik netiek izmantots",
  uses: "Izmantots",
  media: "Multivides bibliotēka",
  choose: "Izvēlēties esošu attēlu",
  phoneNote: "Tālruņa saite tiek atjaunota kopā ar numuru.",
  review:
    "Daļa juridiskās informācijas vēl jāapstiprina klīnikai. Esošās pārskatīšanas norādes ir saglabātas.",
  seo: "SEO",
  field: "Teksts",
  reload: "Ielādēt saglabāto saturu",
  readOnly: "Tikai lasīšanai",
  saving: "Saglabājam…",
  publishedVersion: "Pašreizējā publikācija",
  revisionPreview: "Priekšskatīt šo versiju",
};
const ru: Record<keyof typeof en, string> = {
  editorMissing: 'Этот материал недоступен или больше не существует.',
  title: "Содержание сайта",
  priceSource:
    "Обзор опубликованной цены. Измените сумму в разделе Услуги и цены → соответствующая категория цен.",
  bookingSource: "Настройки записи (только чтение)",
  noBookingLink:
    "К этой публичной услуге не привязана подтверждённая процедура записи. Длительность и врач не назначались автоматически.",
  bookingEnabled: "Включено в каталоге записи — время зависит от расписания",
  bookingDisabled: "Отключено в каталоге записи",
  duration: "Длительность в минутах",
  eligible: "Назначенные специалисты",
  unconfirmed: "Не подтверждено",
  usage: "Использование",
  section: "Раздел главной страницы",
  allSections: "Все разделы",
  other: "Другие страницы",
  allMedia: "Все файлы",
  intro:
    "Существующие материалы клиники уже здесь. Отредактируйте язык, сохраните черновик, проверьте и опубликуйте.",
  search: "Найти материал",
  page: "Страница сайта",
  all: "Все страницы",
  shared: "Общее содержание",
  language: "Язык редактирования",
  baseline:
    "Показано утверждённое содержание сайта. Сохранение и публикация станут доступны после настройки базы и импорта.",
  loading: "Загружаем сохранённый материал…",
  retry: "Повторить",
  edit: "Редактировать",
  back: "Все материалы",
  locked:
    "Защищённый материал. Его изменение требует отдельной проверки реализации.",
  missing:
    "В источнике нет отдельного перевода на выбранный язык. Ниже показан существующий общий текст; новый перевод не придуман.",
  save: "Сохранить черновик",
  publish: "Опубликовать сохранённый черновик",
  preview: "Предпросмотр материала",
  previewNote:
    "Закрытый предпросмотр содержания. Оформление сайта остаётся прежним. Открытие предпросмотра ничего не публикует.",
  history: "История версий",
  published: "Опубликовано",
  draft: "Черновик",
  restore: "Опубликовать эту версию снова",
  saved: "Черновик сохранён. Сайт не изменился.",
  done: "Публикация сохранена. Страницы получат её при следующем обновлении содержания.",
  conflict:
    "Уже сохранена более новая версия. Загрузите её перед повторной попыткой; ваш текст не удалён.",
  invalid:
    "Проверьте поля. Сохраните обязательные переводы, действительные ссылки и существующую структуру.",
  unavailable:
    "Сохранённый материал недоступен. Изменения не подтверждены. Загрузите актуальную версию перед повторной попыткой.",
  confirmPublish:
    "Опубликовать эту сохранённую версию на всех языках? Она обновит сайт.",
  confirmRestore:
    "Опубликовать прежнюю версию? Текущая публикация и черновик будут заменены, история сохранится.",
  leave: "Есть несохранённые изменения. Покинуть редактор и отменить их?",
  dirty: "Несохранённые изменения",
  clean: "Нет несохранённых изменений",
  noResults: "Материалы не найдены",
  source: "Существующее содержание сайта",
  catalogNote:
    "Это публичные услуги и цены. Импорт не создаёт длительность процедур, врачей или доступность. Реальная запись по-прежнему управляется системой записи.",
  mediaNote:
    "Существующие файлы сохраняют адреса. Загрузка и перенос в Storage требуют отдельно согласованного внедрения; файлы не загружались.",
  protectedMedia: "Защищённый файл Hero",
  unused: "Исходный файл; сейчас не используется на странице сайта",
  uses: "Используется",
  media: "Медиатека",
  choose: "Выбрать существующее изображение",
  phoneNote: "Телефонная ссылка обновляется вместе с номером.",
  review:
    "Часть юридической информации ещё требует подтверждения клиники. Существующие отметки о проверке сохранены.",
  seo: "SEO",
  field: "Текст",
  reload: "Загрузить сохранённое содержание",
  readOnly: "Только чтение",
  saving: "Сохраняем…",
  publishedVersion: "Текущая публикация",
  revisionPreview: "Посмотреть эту версию",
};
export const cmsMessages = {
  lv: { ...lv, ...cmsUx.lv },
  ru: { ...ru, ...cmsUx.ru },
  en: { ...en, ...cmsUx.en },
};
