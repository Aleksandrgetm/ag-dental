import { legalDocuments } from "./legalDocuments.ts";

export const privacyAndContact = {
  lv: {
    legalDocuments: legalDocuments.lv,
    contact: {
      parking: "Autostāvvieta",
      openMap: "Atvērt Google Maps",
      mapTitle: "AG Zobārstniecība — Ūnijas iela 25, Rīga",
      mapConsent: "Kartei nepieciešama piekrišana papildu sīkdatnēm.",
      googlePrivacy: "Google privātuma politika",
      formUnavailable:
        "Nosūtīšana tiešsaistē vēl nav pieejama. Laukus var pārbaudīt pārlūkā; pieteikums netiek nosūtīts. Lai pieteiktos, zvaniet vai rakstiet klīnikai.",
    },
    legal: {
      privacyTitle: "Privātuma politika",
      cookieTitle: "Sīkdatņu politika",
      settings: "Sīkdatņu iestatījumi",
      updated: "Atjaunināts",
      contents: "Šajā lapā",
    },
    request: {
      title: "Pieteikt vizīti",
      headline: "Sāksim ar sarunu.",
      intro:
        "Atstājiet kontaktinformāciju saziņai par vizīti. Vizītes laiku apstiprina klīnika.",
      unavailable:
        "Pieteikumu nosūtīšana tiešsaistē vēl nav pieejama. Šobrīd varat pārbaudīt aizpildītos laukus tikai savā pārlūkā; dati klīnikai netiek nosūtīti. Lai pieteiktu vizīti, lūdzu, zvaniet vai rakstiet e-pastu.",
      firstName: "Vārds",
      lastName: "Uzvārds",
      phone: "Tālrunis",
      email: "E-pasts",
      service: "Pakalpojums",
      message: "Ziņa / papildu informācija",
      optional: "nav obligāti",
      requiredHint: "Ar * atzīmētie lauki ir obligāti.",
      select: "Izvēlieties pakalpojumu",
      unsure: "Neesmu pārliecināts / nepieciešama konsultācija",
      messageHint:
        "Lūdzu, neievadiet diagnozi, personas kodu vai citu detalizētu veselības informāciju. Līdz 1000 rakstzīmēm.",
      consent:
        "Piekrītu manu personas datu apstrādei, lai AG Zobārstniecība varētu sazināties ar mani saistībā ar vizītes pieteikumu.",
      check: "Pārbaudīt pieteikumu",
      send: "Nosūtīt pieteikumu",
      loading: "Lūdzu, uzgaidiet…",
      notSent:
        "Lauki ir aizpildīti pareizi. Pieteikums nav nosūtīts. Lai vienotos par vizīti, lūdzu, sazinieties ar klīniku pa tālruni vai e-pastu.",
      failed:
        "Pieteikumu neizdevās nosūtīt. Lūdzu, mēģiniet vēlreiz vai sazinieties ar klīniku.",
      thanks: "Paldies!",
      success:
        "Jūsu pieteikums ir saņemts. Mēs ar jums sazināsimies, lai vienotos par vizītes laiku.",
      errors: {
        summary: "Lūdzu, pārbaudiet atzīmētos laukus.",
        required: "Lūdzu, aizpildiet šo lauku.",
        tooLong: "Teksts pārsniedz atļauto garumu.",
        emailInvalid: "Lūdzu, ievadiet derīgu e-pasta adresi.",
        phoneInvalid: "Lūdzu, ievadiet derīgu tālruņa numuru (7–15 cipari).",
        consentRequired:
          "Lai turpinātu, nepieciešama piekrišana datu apstrādei.",
        serviceInvalid: "Lūdzu, izvēlieties pakalpojumu no saraksta.",
      },
    },
    cookie: {
      maps: "Google Maps",
      mapsText:
        "Atļauj ielādēt Google karti Kontaktu lapā. Google saņems tehniskus datus, piemēram, IP adresi, un var izmantot sīkdatnes. Izvēli varat atsaukt jebkurā laikā.",
      title: "Sīkdatnes un jūsu izvēle",
      description:
        "Saglabājam jūsu sīkdatņu izvēli. Ar atļauju atcerēsimies valodu un Kontaktu lapā ielādēsim Google Maps. Analītikas un mārketinga rīki pašlaik netiek izmantoti.",
      accept: "Pieņemt visas",
      reject: "Noraidīt papildu",
      settings: "Iestatījumi",
      save: "Saglabāt izvēli",
      close: "Aizvērt",
      settingsTitle: "Sīkdatņu iestatījumi",
      settingsIntro:
        "Izvēlieties, ko atļaut saglabāt šajā pārlūkā. Izvēli varat mainīt jebkurā laikā vietnes kājenē.",
      necessary: "Nepieciešamās",
      necessaryText:
        "Saglabā jūsu piekrišanas izvēli šajā pārlūkā, lai tā nebūtu jānorāda katrā lapā.",
      required: "Vienmēr ieslēgtas",
      preferences: "Preferences",
      preferencesText:
        "Atceras izvēlēto valodu nākamajai vizītei. Bez piekrišanas valodu var mainīt, taču pēc pārlādes tā netiek saglabāta.",
      analytics: "Analītikas",
      analyticsText: "Apmeklējuma analīzes rīki pašlaik nav ieviesti.",
      marketing: "Mārketinga",
      marketingText: "Reklāmas izsekošanas rīki pašlaik nav ieviesti.",
      inactive: "Nav aktīvas",
      storageFailed:
        "Pārlūks neļauj saglabāt izvēli. Tā būs spēkā līdz lapas pārlādei.",
      dismiss: "Aizvērt paziņojumu",
    },
  },
  en: {
    legalDocuments: legalDocuments.en,
    contact: {
      parking: "Parking",
      openMap: "Open Google Maps",
      mapTitle: "AG Zobārstniecība — Ūnijas iela 25, Riga",
      mapConsent: "The map requires consent to optional cookies.",
      googlePrivacy: "Google privacy policy",
      formUnavailable:
        "Online sending is not yet available. You can check the fields in your browser; no request is sent. Please call or email the clinic to book.",
    },
    legal: {
      privacyTitle: "Privacy Policy",
      cookieTitle: "Cookie Policy",
      settings: "Cookie settings",
      updated: "Updated",
      contents: "On this page",
    },
    request: {
      title: "Request an appointment",
      headline: "Let’s start with a conversation.",
      intro:
        "Leave your contact details to discuss a visit. The clinic will confirm the appointment time.",
      unavailable:
        "Online requests are not yet available. You can check these fields in your browser; no data is sent to the clinic. Please call or email to request a visit.",
      firstName: "First name",
      lastName: "Last name",
      phone: "Phone",
      email: "Email",
      service: "Service",
      message: "Message / additional information",
      optional: "optional",
      requiredHint: "Fields marked * are required.",
      select: "Select a service",
      unsure: "I am unsure / need a consultation",
      messageHint:
        "Please do not enter a diagnosis, personal identity number or detailed health information. Maximum 1000 characters.",
      consent:
        "I agree to the processing of my personal data so that AG Zobārstniecība can contact me about my appointment request.",
      check: "Check request",
      send: "Send request",
      loading: "Please wait…",
      notSent:
        "The fields are valid. Your request has not been sent. Please call or email the clinic to arrange a visit.",
      failed:
        "The request could not be sent. Please try again or contact the clinic.",
      thanks: "Thank you!",
      success:
        "Your request has been received. We will contact you to agree on an appointment time.",
      errors: {
        summary: "Please check the highlighted fields.",
        required: "Please complete this field.",
        tooLong: "This text exceeds the length limit.",
        emailInvalid: "Please enter a valid email address.",
        phoneInvalid: "Please enter a valid phone number (7–15 digits).",
        consentRequired: "Consent to data processing is required to continue.",
        serviceInvalid: "Please select a service from the list.",
      },
    },
    cookie: {
      maps: "Google Maps",
      mapsText:
        "Allows Google Maps to load on Contacts. Google will receive technical data such as your IP address and may use cookies. You can withdraw this choice at any time.",
      title: "Cookies and your choice",
      description:
        "We store your cookie choice. With permission, we remember your language and load Google Maps on Contacts. Analytics and marketing tools are not currently used.",
      accept: "Accept all",
      reject: "Reject optional",
      settings: "Settings",
      save: "Save choice",
      close: "Close",
      settingsTitle: "Cookie settings",
      settingsIntro:
        "Choose what this browser may store. You can change your choice at any time in the footer.",
      necessary: "Necessary",
      necessaryText:
        "Remembers your consent choice in this browser so you do not have to repeat it on every page.",
      required: "Always enabled",
      preferences: "Preferences",
      preferencesText:
        "Remembers your language for your next visit. Without consent, you can change language, but it is not saved after a reload.",
      analytics: "Analytics",
      analyticsText: "Visitor analytics tools have not been implemented.",
      marketing: "Marketing",
      marketingText: "Advertising tracking tools have not been implemented.",
      inactive: "Inactive",
      storageFailed:
        "Your browser cannot save this choice. It will apply until the page reloads.",
      dismiss: "Dismiss notice",
    },
  },
  ru: {
    legalDocuments: legalDocuments.ru,
    contact: {
      parking: "Парковка",
      openMap: "Открыть Google Maps",
      mapTitle: "AG Zobārstniecība — Ūnijas iela 25, Рига",
      mapConsent: "Для карты нужно согласие на дополнительные cookie.",
      googlePrivacy: "Политика конфиденциальности Google",
      formUnavailable:
        "Отправка онлайн пока недоступна. Поля можно проверить в браузере; заявка не отправляется. Для записи позвоните или напишите в клинику.",
    },
    legal: {
      privacyTitle: "Политика конфиденциальности",
      cookieTitle: "Политика файлов cookie",
      settings: "Настройки cookie",
      updated: "Обновлено",
      contents: "На этой странице",
    },
    request: {
      title: "Заявка на приём",
      headline: "Начнём с разговора.",
      intro:
        "Оставьте контакты для обсуждения визита. Время приёма подтверждает клиника.",
      unavailable:
        "Отправка заявок онлайн пока недоступна. Можно проверить заполненные поля в браузере; данные не отправляются в клинику. Для записи позвоните или напишите нам.",
      firstName: "Имя",
      lastName: "Фамилия",
      phone: "Телефон",
      email: "Эл. почта",
      service: "Услуга",
      message: "Сообщение / дополнительная информация",
      optional: "необязательно",
      requiredHint: "Поля со знаком * обязательны.",
      select: "Выберите услугу",
      unsure: "Не уверен / нужна консультация",
      messageHint:
        "Не указывайте диагноз, персональный код или подробные сведения о здоровье. До 1000 символов.",
      consent:
        "Я согласен на обработку моих персональных данных, чтобы AG Zobārstniecība могла связаться со мной по поводу заявки на приём.",
      check: "Проверить заявку",
      send: "Отправить заявку",
      loading: "Подождите…",
      notSent:
        "Поля заполнены верно. Заявка не отправлена. Для записи позвоните или напишите в клинику.",
      failed:
        "Не удалось отправить заявку. Повторите попытку или свяжитесь с клиникой.",
      thanks: "Спасибо!",
      success:
        "Ваша заявка получена. Мы свяжемся с вами, чтобы согласовать время приёма.",
      errors: {
        summary: "Проверьте отмеченные поля.",
        required: "Заполните это поле.",
        tooLong: "Превышена допустимая длина текста.",
        emailInvalid: "Укажите действительный адрес эл. почты.",
        phoneInvalid: "Укажите действительный номер телефона (7–15 цифр).",
        consentRequired:
          "Для продолжения необходимо согласие на обработку данных.",
        serviceInvalid: "Выберите услугу из списка.",
      },
    },
    cookie: {
      maps: "Google Maps",
      mapsText:
        "Разрешает загрузить карту Google на странице контактов. Google получит технические данные, например IP-адрес, и может использовать cookie. Согласие можно отозвать в любое время.",
      title: "Cookie и ваш выбор",
      description:
        "Мы сохраняем ваш выбор cookie. С вашего разрешения мы запомним язык и загрузим Google Maps на странице контактов. Инструменты аналитики и маркетинга сейчас не используются.",
      accept: "Принять все",
      reject: "Отклонить дополнительные",
      settings: "Настройки",
      save: "Сохранить выбор",
      close: "Закрыть",
      settingsTitle: "Настройки cookie",
      settingsIntro:
        "Выберите, что можно сохранять в этом браузере. Изменить выбор можно в любой момент внизу сайта.",
      necessary: "Необходимые",
      necessaryText:
        "Сохраняют ваш выбор в этом браузере, чтобы не повторять его на каждой странице.",
      required: "Всегда включены",
      preferences: "Предпочтения",
      preferencesText:
        "Сохраняют язык для следующего посещения. Без согласия язык можно менять, но после перезагрузки он не сохраняется.",
      analytics: "Аналитические",
      analyticsText: "Инструменты аналитики посещений пока не подключены.",
      marketing: "Маркетинговые",
      marketingText: "Рекламные инструменты отслеживания пока не подключены.",
      inactive: "Неактивны",
      storageFailed:
        "Браузер не позволяет сохранить выбор. Он будет действовать до перезагрузки страницы.",
      dismiss: "Закрыть уведомление",
    },
  },
};
