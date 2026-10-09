const accessMessages = {
  lv: {
    title: "Administrācijas panelis",
    overview: "Pārskats",
    checking: "Pārbaudām piekļuvi…",
    checkingText: "Lūdzu, uzgaidiet. Droši pārbaudām jūsu konta tiesības.",
    denied: "Piekļuve nav pieejama",
    deniedText:
      "Šī sadaļa ir pieejama tikai klīnikas administratoriem. Ja jums nepieciešama piekļuve, sazinieties ar klīnikas atbildīgo personu.",
    unavailable: "Piekļuvi neizdevās pārbaudīt",
    unavailableText: "Lūdzu, mēģiniet vēlreiz. Dati nav ielādēti.",
    expired: "Lūdzu, piesakieties vēlreiz",
    expiredText:
      "Jūsu sesija vairs nav derīga. Lai turpinātu, piesakieties savā kontā.",
    retry: "Mēģināt vēlreiz",
    website: "Atvērt vietni",
    foundation: "Administrācijas pamats tiek sagatavots.",
  },
  ru: {
    title: "Админ-панель",
    overview: "Обзор",
    checking: "Проверяем доступ…",
    checkingText: "Подождите. Мы проверяем права вашего аккаунта.",
    denied: "Доступ запрещён",
    deniedText:
      "Этот раздел доступен только администраторам клиники. Для получения доступа обратитесь к ответственному сотруднику.",
    unavailable: "Не удалось проверить доступ",
    unavailableText: "Попробуйте ещё раз. Данные не загружены.",
    expired: "Войдите ещё раз",
    expiredText:
      "Сессия больше не действительна. Войдите в аккаунт, чтобы продолжить.",
    retry: "Повторить",
    website: "Открыть сайт",
    foundation: "Подготавливаем основу панели управления.",
  },
  en: {
    title: "Admin Panel",
    overview: "Overview",
    checking: "Checking access…",
    checkingText:
      "Please wait while we securely verify your account permissions.",
    denied: "Access unavailable",
    deniedText:
      "This area is for clinic administrators. Contact the person responsible at the clinic if you need access.",
    unavailable: "Unable to verify access",
    unavailableText: "Please try again. No data has been loaded.",
    expired: "Please sign in again",
    expiredText: "Your session is no longer valid. Sign in to continue.",
    retry: "Try again",
    website: "View website",
    foundation: "The administration foundation is being prepared.",
  },
};

const workspaceMessages = {
  lv: {
    navigation: "Administrācijas izvēlne",
    skip: "Pāriet uz saturu",
    menu: "Izvēlne",
    close: "Aizvērt",
    notAvailable: "Vēl nav pieejams",
    plannedTitle: "Šeit varēsiet pārvaldīt",
    placeholderNote:
      "Šīs sadaļas rīki vēl nav ieviesti. Šeit pašlaik nevar izveidot, mainīt vai publicēt datus.",
    backOverview: "Atgriezties pārskatā",
    groups: {
      clinic: "Klīnika",
      website: "Vietne",
      communication: "Saziņa",
      system: "Sistēma",
    },
    nav: {
      overview: "Pārskats",
      appointments: "Vizītes",
      services: "Pakalpojumi un cenas",
      doctors: "Speciālisti",
      schedules: "Darba grafiki",
      pages: "Vietnes lapas",
      news: "Jaunumi",
      media: "Foto un video",
      seo: "Meklēšanas iestatījumi",
      messages: "Jautājumi no vietnes",
      settings: "Iestatījumi",
    },
    planned: {
      appointments:
        "Vizīšu kalendāru, apstiprināšanu, pārcelšanu un atcelšanu.",
      services:
        "Pakalpojumu aprakstus, cenas, ilgumu un pieejamību tiešsaistes pierakstam.",
      doctors: "Speciālistu informāciju, attēlus un sniegtos pakalpojumus.",
      schedules: "Darba laikus, pārtraukumus, brīvdienas un prombūtni.",
      pages:
        "Vietnes sadaļu tekstus un attēlus, melnrakstus, priekšskatījumu un publicēšanu.",
      news: "Rakstu melnrakstus, tulkojumus, attēlus un publicēšanu.",
      media:
        "Klīnikas foto un video augšupielādi, atlasi, aizstāšanu un izmantošanu vietnē.",
      seo: "Lapu nosaukumus, aprakstus, kopīgošanas attēlus un redzamību meklētājos.",
      messages:
        "Apmeklētāju vispārīgos jautājumus, kad būs ieviesta īsta ziņu saņemšana.",
      settings:
        "Klīnikas kontaktinformāciju, pieraksta noteikumus un paziņojumu preferences.",
    },
  },
  ru: {
    navigation: "Навигация панели управления",
    skip: "Перейти к содержимому",
    menu: "Меню",
    close: "Закрыть",
    notAvailable: "Пока недоступно",
    plannedTitle: "Здесь можно будет управлять",
    placeholderNote:
      "Инструменты этого раздела ещё не подключены. Создавать, изменять или публиковать данные здесь пока нельзя.",
    backOverview: "Вернуться к обзору",
    groups: {
      clinic: "Клиника",
      website: "Сайт",
      communication: "Общение",
      system: "Система",
    },
    nav: {
      overview: "Обзор",
      appointments: "Записи на приём",
      services: "Услуги и цены",
      doctors: "Специалисты",
      schedules: "Расписание",
      pages: "Страницы сайта",
      news: "Новости",
      media: "Фото и видео",
      seo: "Настройки поиска",
      messages: "Вопросы с сайта",
      settings: "Настройки",
    },
    planned: {
      appointments:
        "Календарём приёмов, подтверждением, переносом и отменой записей.",
      services:
        "Описаниями услуг, ценами, длительностью и доступностью онлайн-записи.",
      doctors: "Информацией о специалистах, фотографиями и перечнем услуг.",
      schedules:
        "Рабочими часами, перерывами, выходными и отсутствием специалистов.",
      pages:
        "Текстами и изображениями разделов сайта, черновиками, предпросмотром и публикацией.",
      news: "Черновиками статей, переводами, изображениями и публикацией.",
      media:
        "Загрузкой, выбором, заменой и использованием фото и видео клиники.",
      seo: "Заголовками, описаниями, изображениями для публикаций в соцсетях и видимостью страниц в поиске.",
      messages:
        "Общими вопросами посетителей после подключения настоящего приёма сообщений.",
      settings:
        "Контактами клиники, правилами записи и настройками уведомлений.",
    },
  },
  en: {
    navigation: "Administration navigation",
    skip: "Skip to content",
    menu: "Menu",
    close: "Close",
    notAvailable: "Not yet available",
    plannedTitle: "What this section will offer",
    placeholderNote:
      "These tools have not been implemented yet. You cannot create, change or publish data here at this stage.",
    backOverview: "Back to overview",
    groups: {
      clinic: "Clinic",
      website: "Website",
      communication: "Communication",
      system: "System",
    },
    nav: {
      overview: "Overview",
      appointments: "Appointments",
      services: "Services & prices",
      doctors: "Specialists",
      schedules: "Schedules",
      pages: "Website pages",
      news: "News",
      media: "Photos & videos",
      seo: "Search settings",
      messages: "Website questions",
      settings: "Settings",
    },
    planned: {
      appointments:
        "An appointment calendar with confirmation, rescheduling and cancellation.",
      services:
        "Service descriptions, prices, durations and eligibility for online booking.",
      doctors:
        "Specialist information, photographs and the services they provide.",
      schedules: "Working hours, breaks, holidays and time off.",
      pages: "Website text and images, drafts, previews and publishing.",
      news: "Article drafts, translations, images and publishing.",
      media:
        "Uploading, selecting, replacing and using clinic photos and videos.",
      seo: "Page titles, descriptions, sharing images and search visibility.",
      messages:
        "General questions from visitors once real message delivery is connected.",
      settings:
        "Clinic contact details, booking rules and notification preferences.",
    },
  },
};
const dashboardMessages = {
  lv: {
    dashboardIntro:
      "Šodienas vizītes un tiešsaistes pieraksta iestatījumi vienuviet.",
    refresh: "Atjaunināt",
    loadingData: "Ielādējam klīnikas pārskatu…",
    partialError: "Daļu informācijas neizdevās ielādēt",
    partialErrorText:
      "Nepieejamie dati nav aizstāti ar nullēm. Mēģiniet atjaunināt pārskatu.",
    todayVisits: "Šodienas vizītes",
    todayNote:
      "Visi statusi. Pirmie {limit} ieraksti; + nozīmē vismaz šo skaitu.",
    pendingVisits: "Gaida apstiprinājumu",
    pendingNote:
      "Visi datumi. Pirmie {limit} ieraksti; + nozīmē vismaz šo skaitu.",
    bookableServices: "Tiešsaistes pakalpojumi",
    bookableNote:
      "Ieslēgti pierakstam, ar norādītu ilgumu. Pieejamie laiki vēl jāpārbauda.",
    activeDoctors: "Aktīvie speciālisti",
    doctorsUnknown: "Kopējais speciālistu skaits šeit vēl nav pieejams.",
    todaySchedule: "Šodien klīnikā",
    rigaTime: "Rīgas laiks",
    visitsUnavailable:
      "Vizīšu sarakstu neizdevās pārbaudīt. Tas nenozīmē, ka vizīšu nav.",
    noVisits: "Šodien vizīšu nav",
    noVisitsText: "Pārbaudītajā šodienas sarakstā nav ierakstu.",
    visitListNote:
      "Pārskats rāda pirmās {limit} šodienas vizītes visos statusos. Pilnais kalendārs un vizīšu pārvaldība vēl nav pieejama.",
    bookingSetup: "Tiešsaistes pieraksts",
    settingsUnavailable: "Pieraksta iestatījumus pašlaik nevar pārbaudīt.",
    confirmation: "Vizīšu apstiprināšana",
    automatic: "Automātiska",
    manual: "Manuāla",
    horizon: "Pieraksts uz priekšu",
    advance: "Minimālais laiks līdz vizītei",
    intervals: "Laika izvēles intervāls",
    days: "{count} dienas",
    minutes: "{count} minūtes",
    needsAttention: "Jāpārbauda",
    privacyMissing: "Nav iestatīta pieraksta privātuma paziņojuma versija.",
    servicesMissing:
      "Nav pakalpojumu, kas ieslēgti tiešsaistes pierakstam ar norādītu ilgumu.",
    schedulesUnknown:
      "Šis pārskats vēl nepārbauda speciālistu darba grafikus un reāli pieejamos laikus.",
    readOnlySettings:
      "Iestatījumi ir tikai apskatei. Tos mainīt šeit vēl nevar.",
    recentActivity: "Pēdējās darbības",
    activityUnknown:
      "Darbību vēsture šajā pārskatā vēl nav pieejama. Tas nenozīmē, ka darbību nav bijis.",
    messagesUnknown:
      "Ziņu saņemšana no kontaktformas vēl nav pieslēgta. Vispārīgiem jautājumiem joprojām pieejams klīnikas tālrunis un e-pasts.",
    checkedAt: "Pārbaudīts plkst. {time} · Rīgas laiks",
  },
  ru: {
    dashboardIntro:
      "Сегодняшние приёмы и настройки онлайн-записи в одном месте.",
    refresh: "Обновить",
    loadingData: "Загружаем обзор клиники…",
    partialError: "Часть информации не загрузилась",
    partialErrorText:
      "Недоступные данные не заменены нулями. Попробуйте обновить обзор.",
    todayVisits: "Приёмы сегодня",
    todayNote:
      "Все статусы. Первые {limit} записей; + означает не меньше этого числа.",
    pendingVisits: "Ожидают подтверждения",
    pendingNote:
      "Все даты. Первые {limit} записей; + означает не меньше этого числа.",
    bookableServices: "Услуги онлайн-записи",
    bookableNote:
      "Включены для записи, длительность указана. Доступное время ещё нужно проверить.",
    activeDoctors: "Активные специалисты",
    doctorsUnknown: "Общее число специалистов здесь пока недоступно.",
    todaySchedule: "Сегодня в клинике",
    rigaTime: "Рижское время",
    visitsUnavailable:
      "Не удалось проверить список приёмов. Это не означает, что записей нет.",
    noVisits: "Сегодня записей нет",
    noVisitsText: "В проверенном списке на сегодня нет записей.",
    visitListNote:
      "Показаны первые {limit} записей на сегодня во всех статусах. Полный календарь и управление приёмами пока недоступны.",
    bookingSetup: "Онлайн-запись",
    settingsUnavailable: "Не удалось проверить настройки записи.",
    confirmation: "Подтверждение приёмов",
    automatic: "Автоматическое",
    manual: "Ручное",
    horizon: "Запись вперёд",
    advance: "Минимальное время до приёма",
    intervals: "Интервал выбора времени",
    days: "{count} дн.",
    minutes: "{count} мин.",
    needsAttention: "Нужно проверить",
    privacyMissing:
      "Не задана версия уведомления о конфиденциальности для записи.",
    servicesMissing:
      "Нет услуг с указанной длительностью, включённых для онлайн-записи.",
    schedulesUnknown:
      "Этот обзор пока не проверяет расписание специалистов и фактически доступное время.",
    readOnlySettings:
      "Настройки доступны только для просмотра. Изменить их здесь пока нельзя.",
    recentActivity: "Последние действия",
    activityUnknown:
      "История действий в этом обзоре пока недоступна. Это не означает, что действий не было.",
    messagesUnknown:
      "Приём сообщений из контактной формы ещё не подключён. Общие вопросы можно задать по телефону или электронной почте клиники.",
    checkedAt: "Проверено в {time} · Рижское время",
  },
  en: {
    dashboardIntro:
      "Today’s appointments and online booking settings, in one place.",
    refresh: "Refresh",
    loadingData: "Loading the clinic overview…",
    partialError: "Some information could not be loaded",
    partialErrorText:
      "Unavailable data has not been replaced with zeroes. Please refresh the overview.",
    todayVisits: "Appointments today",
    todayNote:
      "All statuses. First {limit} records; + means at least this many.",
    pendingVisits: "Awaiting confirmation",
    pendingNote:
      "All dates. First {limit} records; + means at least this many.",
    bookableServices: "Online booking services",
    bookableNote:
      "Enabled for booking, with a duration set. Available times still need checking.",
    activeDoctors: "Active specialists",
    doctorsUnknown:
      "The total number of specialists is not yet available here.",
    todaySchedule: "Today at the clinic",
    rigaTime: "Riga time",
    visitsUnavailable:
      "The appointment list could not be checked. This does not mean there are no appointments.",
    noVisits: "No appointments today",
    noVisitsText: "The verified list for today contains no appointments.",
    visitListNote:
      "Showing the first {limit} appointments today in all statuses. The full calendar and appointment management are not yet available.",
    bookingSetup: "Online booking",
    settingsUnavailable: "Booking settings could not be checked.",
    confirmation: "Appointment confirmation",
    automatic: "Automatic",
    manual: "Manual",
    horizon: "Booking window",
    advance: "Minimum advance notice",
    intervals: "Time selection interval",
    days: "{count} days",
    minutes: "{count} minutes",
    needsAttention: "Needs checking",
    privacyMissing:
      "The booking privacy notice version has not been configured.",
    servicesMissing:
      "No services with a duration set are enabled for online booking.",
    schedulesUnknown:
      "This overview does not yet verify specialist schedules or actual available times.",
    readOnlySettings:
      "These settings are read-only. They cannot be changed here yet.",
    recentActivity: "Recent activity",
    activityUnknown:
      "Activity history is not available in this overview yet. This does not mean no activity has occurred.",
    messagesUnknown:
      "Contact-form delivery is not connected yet. General questions can still be handled by the clinic’s phone and email.",
    checkedAt: "Checked at {time} · Riga time",
  },
};
export const adminMessages = {
  lv: {
    ...accessMessages.lv,
    ...workspaceMessages.lv,
    ...dashboardMessages.lv,
  },
  ru: {
    ...accessMessages.ru,
    ...workspaceMessages.ru,
    ...dashboardMessages.ru,
  },
  en: {
    ...accessMessages.en,
    ...workspaceMessages.en,
    ...dashboardMessages.en,
  },
};
