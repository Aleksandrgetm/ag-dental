const en = {
  title: "Media library",
  more: "Show more media",
  intro: "Choose a photograph, see where it appears, or upload something new.",
  upload: "Upload from computer",
  drop: "Drop one file here, or choose a file",
  limits:
    "JPEG, PNG, WebP, AVIF up to 12 MB. MP4 (H.264/AAC), WebM (VP8/VP9) up to 32 MB and 90 seconds.",
  choose: "Choose file",
  search: "Search filenames",
  all: "All media",
  images: "Images",
  videos: "Videos",
  usage: "Usage",
  used: "Used",
  unused: "Unused",
  origin: "Source",
  registered: "Existing website assets",
  uploaded: "Uploaded assets",
  details: "Media details",
  close: "Close",
  type: "Type",
  dimensions: "Dimensions",
  size: "File size",
  date: "Added",
  duration: "Duration",
  alt: "Alternative text",
  altHelp:
    "Describe what is visible in each language. Do not include patient or medical information.",
  start: "Upload",
  processing: "Validating and preparing media…",
  cancel: "Cancel upload",
  retry: "Retry",
  ready: "Upload complete. Select a location, save a draft, then publish.",
  duplicate: "This file already exists. The existing asset was kept.",
  empty: "No matching media.",
  unavailable:
    "Uploads are not available yet. Existing website assets remain visible.",
  reload: "Try again",
  protected: "System-managed · read only",
  protectedNote:
    "This asset belongs to the approved website implementation. Preview, replacement and deletion are disabled.",
  registeredNote:
    "Existing files remain in the website repository. They cannot be deleted from this library.",
  copy: "Copy public URL",
  copied: "URL copied",
  private: "Private draft asset",
  published: "Published asset",
  preview: "Preview",
  select: "Use this image",
  replace: "Replace image",
  locations: "Choose where to use this image",
  locationHint:
    "Open the page or section and choose Replace image. Changes stay in the draft until you publish.",
  noVideoSlot:
    "Videos can be stored and previewed here. The current website has no editable video section. The Hero is protected.",
  archive: "Archive unused media",
  archiveConfirm:
    "Archive this unused upload? Media in drafts, publications or revision history cannot be archived.",
  archived: "Archived",
  history: "Retained by drafts or revision history",
  shared:
    "This is a shared image. Changing it updates every location using this image when the draft is published. Review its usage before continuing.",
  local:
    "Only this content field changes. Other pages keep their own image references.",
  confirmShared: "Use this image for the shared reference?",
  remove: "Permanently delete archived file",
  removeConfirm:
    "Permanently remove the archived Storage files? This cannot be undone.",
  unknown: "Not recorded",
  back: "All media",
  state: "Status",
  draft: "Draft",
  publishedUsage: "Published",
  historyUsage: "Revision history",
  noApi: "The media service is unavailable. Try again; nothing has been saved.",
  invalid_file:
    "Choose a supported, valid file within the size, duration and dimension limits. Complete all three descriptions.",
  media_unavailable:
    "The upload or media service is unavailable. You can retry with the same file.",
  media_busy: "Media processing is busy. Please retry shortly.",
  media_protected: "This action is not allowed for this asset or account.",
  media_referenced:
    "This file is needed by content or revision history and cannot be removed.",
  media_conflict:
    "This upload conflicts with an earlier attempt. Choose the file again.",
  media_missing: "This file is unavailable or no longer exists.",
  cancelled:
    "Upload cancelled. A completed server upload may appear after refreshing the library.",
  notReady: "File is not ready",
  saveFirst:
    "Uploading does not publish an image. Save and publish the section separately.",
};
const lv: Record<keyof typeof en, string> = {
  title: "Mediju bibliotēka",
  more: "Rādīt vairāk failu",
  intro:
    "Izvēlieties fotoattēlu, apskatiet tā lietojumu vai augšupielādējiet jaunu.",
  upload: "Augšupielādēt no datora",
  drop: "Ievelciet vienu failu šeit vai izvēlieties failu",
  limits:
    "JPEG, PNG, WebP, AVIF līdz 12 MB. MP4 (H.264/AAC), WebM (VP8/VP9) līdz 32 MB un 90 sekundēm.",
  choose: "Izvēlēties failu",
  search: "Meklēt pēc faila nosaukuma",
  all: "Visi mediji",
  images: "Attēli",
  videos: "Video",
  usage: "Lietojums",
  used: "Izmantotie",
  unused: "Neizmantotie",
  origin: "Avots",
  registered: "Esošie vietnes faili",
  uploaded: "Augšupielādētie faili",
  details: "Faila informācija",
  close: "Aizvērt",
  type: "Veids",
  dimensions: "Izmēri",
  size: "Faila apjoms",
  date: "Pievienots",
  duration: "Ilgums",
  alt: "Alternatīvais teksts",
  altHelp:
    "Katrā valodā aprakstiet redzamo. Neiekļaujiet pacientu vai medicīnisku informāciju.",
  start: "Augšupielādēt",
  processing: "Pārbaudām un sagatavojam failu…",
  cancel: "Atcelt augšupielādi",
  retry: "Mēģināt vēlreiz",
  ready:
    "Fails augšupielādēts. Izvēlieties vietu, saglabājiet melnrakstu un publicējiet.",
  duplicate: "Šis fails jau ir bibliotēkā. Saglabāts esošais fails.",
  empty: "Atbilstošu failu nav.",
  unavailable:
    "Augšupielāde vēl nav pieejama. Esošie vietnes faili ir redzami.",
  reload: "Mēģināt vēlreiz",
  protected: "Sistēmas pārvaldīts · tikai lasāms",
  protectedNote:
    "Šis fails ir daļa no apstiprinātās vietnes. Priekšskatīšana, aizstāšana un dzēšana ir atspējota.",
  registeredNote:
    "Esošie faili paliek vietnes repozitorijā. Šeit tos nevar dzēst.",
  copy: "Kopēt publisko saiti",
  copied: "Saite nokopēta",
  private: "Privāts melnraksta fails",
  published: "Publicēts fails",
  preview: "Priekšskatīt",
  select: "Izmantot šo attēlu",
  replace: "Aizstāt attēlu",
  locations: "Izvēlēties attēla lietojumu",
  locationHint:
    "Atveriet lapu vai sadaļu un izvēlieties Aizstāt attēlu. Izmaiņas paliek melnrakstā līdz publicēšanai.",
  noVideoSlot:
    "Video šeit var glabāt un priekšskatīt. Vietnē pašlaik nav rediģējamas video sadaļas. Hero ir aizsargāts.",
  archive: "Arhivēt neizmantoto failu",
  archiveConfirm:
    "Arhivēt šo neizmantoto failu? Melnrakstos, publikācijās vai versiju vēsturē lietotus failus arhivēt nevar.",
  archived: "Arhivēts",
  history: "Saglabāts melnrakstiem vai versiju vēsturei",
  shared:
    "Šis attēls ir koplietots. Pēc melnraksta publicēšanas tas mainīsies visās vietās, kas izmanto šo atsauci. Pirms turpināt, pārskatiet lietojumu.",
  local:
    "Mainīsies tikai šis satura lauks. Citas lapas saglabās savas attēlu atsauces.",
  confirmShared: "Izmantot šo attēlu koplietotajai atsaucei?",
  remove: "Neatgriezeniski dzēst arhivēto failu",
  removeConfirm:
    "Neatgriezeniski dzēst arhivētos Storage failus? Šo darbību nevar atsaukt.",
  unknown: "Nav norādīts",
  back: "Visi mediji",
  state: "Statuss",
  draft: "Melnraksts",
  publishedUsage: "Publicēts",
  historyUsage: "Versiju vēsture",
  noApi:
    "Mediju pakalpojums nav pieejams. Mēģiniet vēlreiz; nekas nav saglabāts.",
  invalid_file:
    "Izvēlieties derīgu atbalstīta veida failu atļautajos apjoma, ilguma un izmēru ierobežojumos. Aizpildiet aprakstus visās trīs valodās.",
  media_unavailable:
    "Augšupielāde vai mediju pakalpojums nav pieejams. Varat atkārtot ar to pašu failu.",
  media_busy: "Failu apstrāde ir aizņemta. Pēc brīža mēģiniet vēlreiz.",
  media_protected: "Šim failam vai kontam šī darbība nav atļauta.",
  media_referenced:
    "Fails nepieciešams saturam vai versiju vēsturei, un to nevar noņemt.",
  media_conflict:
    "Augšupielāde konfliktē ar iepriekšējo mēģinājumu. Izvēlieties failu vēlreiz.",
  media_missing: "Fails nav pieejams vai vairs nepastāv.",
  cancelled:
    "Augšupielāde atcelta. Serverī jau pabeigts fails var parādīties pēc bibliotēkas atjaunošanas.",
  notReady: "Fails vēl nav gatavs",
  saveFirst:
    "Augšupielāde nepublicē attēlu. Saglabājiet un publicējiet sadaļu atsevišķi.",
};
const ru: Record<keyof typeof en, string> = {
  title: "Медиатека",
  more: "Показать ещё файлы",
  intro:
    "Выберите фотографию, проверьте, где она используется, или загрузите новую.",
  upload: "Загрузить с компьютера",
  drop: "Перетащите сюда один файл или выберите его",
  limits:
    "JPEG, PNG, WebP, AVIF до 12 МБ. MP4 (H.264/AAC), WebM (VP8/VP9) до 32 МБ и 90 секунд.",
  choose: "Выбрать файл",
  search: "Поиск по имени файла",
  all: "Все файлы",
  images: "Изображения",
  videos: "Видео",
  usage: "Использование",
  used: "Используемые",
  unused: "Неиспользуемые",
  origin: "Источник",
  registered: "Существующие файлы сайта",
  uploaded: "Загруженные файлы",
  details: "Информация о файле",
  close: "Закрыть",
  type: "Тип",
  dimensions: "Размеры",
  size: "Объём файла",
  date: "Добавлен",
  duration: "Длительность",
  alt: "Альтернативный текст",
  altHelp:
    "Опишите изображение на каждом языке. Не указывайте данные пациентов или медицинские сведения.",
  start: "Загрузить",
  processing: "Проверяем и подготавливаем файл…",
  cancel: "Отменить загрузку",
  retry: "Повторить",
  ready: "Файл загружен. Выберите место, сохраните черновик и опубликуйте.",
  duplicate: "Этот файл уже есть в медиатеке. Существующий файл сохранён.",
  empty: "Подходящих файлов нет.",
  unavailable:
    "Загрузка пока недоступна. Существующие файлы сайта доступны для просмотра.",
  reload: "Попробовать снова",
  protected: "Управляется системой · только чтение",
  protectedNote:
    "Этот файл относится к утверждённой версии сайта. Предпросмотр, замена и удаление отключены.",
  registeredNote:
    "Существующие файлы остаются в репозитории сайта. Здесь их удалить нельзя.",
  copy: "Скопировать публичную ссылку",
  copied: "Ссылка скопирована",
  private: "Приватный файл черновика",
  published: "Опубликованный файл",
  preview: "Предпросмотр",
  select: "Использовать изображение",
  replace: "Заменить изображение",
  locations: "Выбрать место для изображения",
  locationHint:
    "Откройте страницу или раздел и выберите «Заменить изображение». Изменения останутся в черновике до публикации.",
  noVideoSlot:
    "Видео можно хранить и просматривать здесь. На сайте пока нет редактируемого видеоблока. Hero защищён.",
  archive: "Архивировать неиспользуемый файл",
  archiveConfirm:
    "Архивировать этот неиспользуемый файл? Файлы из черновиков, публикаций и истории версий архивировать нельзя.",
  archived: "В архиве",
  history: "Сохранён для черновиков или истории версий",
  shared:
    "Это общее изображение. После публикации черновика оно изменится во всех местах, использующих эту ссылку. Проверьте использование перед продолжением.",
  local:
    "Изменится только это поле. Другие страницы сохранят свои ссылки на изображения.",
  confirmShared: "Использовать это изображение для общей ссылки?",
  remove: "Навсегда удалить архивный файл",
  removeConfirm:
    "Навсегда удалить архивные файлы из Storage? Это действие нельзя отменить.",
  unknown: "Не указано",
  back: "Все файлы",
  state: "Статус",
  draft: "Черновик",
  publishedUsage: "Опубликовано",
  historyUsage: "История версий",
  noApi: "Медиасервис недоступен. Попробуйте снова; ничего не сохранено.",
  invalid_file:
    "Выберите корректный файл поддерживаемого типа в пределах ограничений размера, длительности и разрешения. Заполните описания на трёх языках.",
  media_unavailable:
    "Загрузка или медиасервис недоступны. Можно повторить с тем же файлом.",
  media_busy: "Обработка файлов занята. Повторите попытку немного позже.",
  media_protected: "Это действие недоступно для данного файла или аккаунта.",
  media_referenced:
    "Файл нужен для контента или истории версий, его нельзя удалить.",
  media_conflict:
    "Загрузка конфликтует с предыдущей попыткой. Выберите файл заново.",
  media_missing: "Файл недоступен или больше не существует.",
  cancelled:
    "Загрузка отменена. Уже обработанный сервером файл может появиться после обновления медиатеки.",
  notReady: "Файл ещё не готов",
  saveFirst:
    "Загрузка не публикует изображение. Сохраните и опубликуйте раздел отдельно.",
};
export const mediaMessages = { lv, ru, en };
