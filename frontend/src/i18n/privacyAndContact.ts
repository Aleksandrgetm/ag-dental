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
    },
    legal: {
      privacyTitle: "Privātuma politika",
      cookieTitle: "Sīkdatņu politika",
      settings: "Sīkdatņu iestatījumi",
      updated: "Atjaunināts",
      contents: "Šajā lapā",
    },
    request: {
      title: "Uzdot jautājumu",
      headline: "Sāksim ar sarunu.",
      intro:
        "Jautājumi par klīniku vai mūsu pakalpojumiem? Sazinieties ar mums.",
      name: "Vārds",
      email: "E-pasts",
      phone: "Tālrunis",
      question: "Jūsu jautājums",
      optional: "nav obligāti",
      requiredHint: "Ar * atzīmētie lauki ir obligāti.",
      questionPlaceholder: "Kā varam jums palīdzēt?",
      questionHint:
        "Lūdzu, neievadiet diagnozi, personas kodu vai detalizētu veselības informāciju. Līdz 1000 rakstzīmēm.",
      characterCount: "{count} / {max}",
      privacy:
        "Esmu iepazinies ar privātuma politiku par manu datu izmantošanu, lai atbildētu uz jautājumu.",
      check: "Pārbaudīt jautājumu",
      unavailable:
        "Nosūtīšana tiešsaistē pašlaik nav pieejama. Šeit varat pārbaudīt laukus; jautājumu nosūtiet e-pastā vai zvaniet.",
      notSent:
        "Lauki ir aizpildīti pareizi. Jautājums nav nosūtīts. Lūdzu, rakstiet e-pastu vai zvaniet klīnikai.",
      errors: {
        summary: "Lūdzu, pārbaudiet atzīmētos laukus.",
        required: "Lūdzu, aizpildiet šo lauku.",
        tooLong: "Teksts pārsniedz atļauto garumu.",
        nameInvalid: "Lūdzu, ievadiet derīgu vārdu.",
        emailInvalid: "Lūdzu, ievadiet derīgu e-pasta adresi.",
        phoneInvalid: "Ievadiet derīgu numuru (7–15 cipari).",
        privacyRequired:
          "Lūdzu, aplieciniet iepazīšanos ar privātuma politiku.",
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
    },
    legal: {
      privacyTitle: "Privacy Policy",
      cookieTitle: "Cookie Policy",
      settings: "Cookie settings",
      updated: "Updated",
      contents: "On this page",
    },
    request: {
      title: "Ask a question",
      headline: "Let’s talk.",
      intro: "Have a question about the clinic or our services? Get in touch.",
      name: "Your name",
      email: "Email",
      phone: "Phone",
      question: "Your question",
      optional: "optional",
      requiredHint: "Fields marked * are required.",
      questionPlaceholder: "How can we help?",
      questionHint:
        "Please do not enter a diagnosis, personal identity number or detailed health information. Maximum 1000 characters.",
      characterCount: "{count} / {max}",
      privacy:
        "I have read the Privacy Policy about the use of my data to respond to my question.",
      check: "Check question",
      unavailable:
        "Online sending is currently unavailable. You can check the fields here; please email or call with your question.",
      notSent:
        "The fields are valid. Your question has not been sent. Please email or call the clinic.",
      errors: {
        summary: "Please check the highlighted fields.",
        required: "Please complete this field.",
        tooLong: "This text exceeds the length limit.",
        nameInvalid: "Please enter a valid name.",
        emailInvalid: "Please enter a valid email address.",
        phoneInvalid: "Enter a valid number (7–15 digits).",
        privacyRequired: "Please acknowledge the Privacy Policy.",
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
    },
    legal: {
      privacyTitle: "Политика конфиденциальности",
      cookieTitle: "Политика файлов cookie",
      settings: "Настройки cookie",
      updated: "Обновлено",
      contents: "На этой странице",
    },
    request: {
      title: "Задать вопрос",
      headline: "Начнём с разговора.",
      intro: "Есть вопросы о клинике или наших услугах? Свяжитесь с нами.",
      name: "Ваше имя",
      email: "Электронная почта",
      phone: "Телефон",
      question: "Ваш вопрос",
      optional: "необязательно",
      requiredHint: "Поля со знаком * обязательны.",
      questionPlaceholder: "Чем мы можем вам помочь?",
      questionHint:
        "Не указывайте диагноз, персональный код или подробные сведения о здоровье. До 1000 символов.",
      characterCount: "{count} / {max}",
      privacy:
        "Я ознакомился с политикой конфиденциальности об использовании моих данных для ответа на вопрос.",
      check: "Проверить вопрос",
      unavailable:
        "Отправка онлайн пока недоступна. Здесь можно проверить поля; задайте вопрос по телефону или электронной почте.",
      notSent:
        "Поля заполнены верно. Вопрос не отправлен. Пожалуйста, напишите в клинику или позвоните.",
      errors: {
        summary: "Проверьте отмеченные поля.",
        required: "Заполните это поле.",
        tooLong: "Превышена допустимая длина текста.",
        nameInvalid: "Укажите корректное имя.",
        emailInvalid: "Укажите корректный адрес электронной почты.",
        phoneInvalid: "Укажите верный номер (7–15 цифр).",
        privacyRequired:
          "Подтвердите ознакомление с политикой конфиденциальности.",
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
