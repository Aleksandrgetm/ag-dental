import {
  privacyPolicy,
  cookiePolicy,
  type LegalDocument,
} from "../content/legal.ts";

// IDs are stable navigation anchors, not translated copy. Every section and
// paragraph must have an explicit translation; never fall back to Latvian prose.
type DocumentTranslation = Omit<LegalDocument, "sections"> & {
  sections: { title: string; paragraphs: string[] }[];
};
function completeDocument(
  source: LegalDocument,
  translation: DocumentTranslation,
): LegalDocument {
  if (
    source.sections.length !== translation.sections.length ||
    source.sections.some(
      (section, index) =>
        section.paragraphs.length !==
        translation.sections[index]?.paragraphs.length,
    )
  ) {
    throw new Error(`Incomplete legal translation: ${translation.title}`);
  }
  return {
    ...translation,
    sections: translation.sections.map((section, index) => ({
      ...section,
      id: source.sections[index]!.id,
    })),
  };
}

const privacyEn = completeDocument(privacyPolicy, {
  "title": "Privacy Policy",
  "intro": "This policy describes how the AG Zobārstniecība website currently works and how to raise questions about your personal data.",
  "notice": "Draft for review: controller details are confirmed; legal bases, retention, providers and privacy-request procedures still require clinic and legal approval. Public online booking is not activated.",
  "sections": [
    {
      "title": "1. General information",
      "paragraphs": [
        "This policy covers website accounts, the prepared booking feature, general questions and browser storage. It does not replace information about medical records processed during treatment.",
        "Registration and login are implemented. Public booking is not yet activated. The questions form only validates input in the browser and currently sends no messages."
      ]
    },
    {
      "title": "2. Data controller",
      "paragraphs": [
        "Data controller: SIA \"Andas Gutovskas privātprakse\", registration number 40103915017. Registered address: Rīga, Ūnijas iela 21, LV-1039.",
        "Clinic visiting address: Ūnijas iela 25, Rīga. This differs from the registered address. General contact: +371 28229925, ag@inbox.lv."
      ]
    },
    {
      "title": "3. Personal data processed",
      "paragraphs": [
        "Accounts use an email address and password; Supabase Auth processes authentication, the user identifier and session. Registration submits a privacy-policy acknowledgement and its path. Application code does not persist passwords.",
        "The questions form requires a name, email, question (up to 1000 characters) and privacy acknowledgement; phone is optional. Input stays in page memory, is not sent and is not restored from website storage. Browser autofill depends on browser settings.",
        "When contacting the clinic by phone or email you provide information of your choosing. Booking fields are described in section 6."
      ]
    },
    {
      "title": "4. Purposes of processing",
      "paragraphs": [
        "Account data supports login and access control. Booking data is intended for arranging appointments, administrator decisions, changes and preventing double booking.",
        "The system records appointment status, change times and the actor where known. This is not marketing consent. Language and other browser preferences are described in the Cookie Policy."
      ]
    },
    {
      "title": "5. Legal basis for processing",
      "paragraphs": [
        "A privacy acknowledgement does not automatically provide a legal basis for all processing. The clinic and legal adviser must confirm a basis for each purpose, including accounts, appointments, security and contact.",
        "Steps requested before entering a contract, applicable obligations and, where appropriate, consent require assessment. A selected service may reveal health information, so conditions for special-category processing also require review. No approved basis is assumed here.",
        "Where processing relies on consent, it can be withdrawn without affecting the lawfulness of earlier processing. Optional storage choices can be changed in cookie settings."
      ]
    },
    {
      "title": "6. Appointment request data",
      "paragraphs": [
        "The prepared booking flow requires first name, last name, phone, email, service, an available specialist and time, and privacy acknowledgement. An account is optional. The server also stores the appointment end, reference, status, policy version, acknowledgement time and account identifier where applicable.",
        "No national identity number, diagnosis or medical history is requested. Do not send detailed health information through the questions form. Manual administrator confirmation is planned: a pending request reserves its slot but is not a confirmed visit; it does not silently expire.",
        "Public booking still requires separate activation. Automatic appointment emails, reminders and WhatsApp messages are not implemented. Supabase account recovery or confirmation emails are a separate authentication function, not appointment confirmation."
      ]
    },
    {
      "title": "7. Cookies and browser storage",
      "paragraphs": [
        "The website uses localStorage to remember your cookie choices. With your permission, it also stores your selected language. Analytics and marketing tools have not currently been implemented.",
        "You can change your choices through “Cookie settings” in the footer. Further information, including the names of stored entries, is available in the Cookie Policy."
      ]
    },
    {
      "title": "8. Data recipients and service providers",
      "paragraphs": [
        "Supabase is used for authentication, PostgreSQL and private image storage. Authorized administrators use the Go API; public responses do not disclose patient contact details.",
        "To load a page, your browser communicates with the website’s infrastructure, and the website checks API availability. The clinic must confirm information about hosting, technical logs, email and other service providers, as well as any transfers outside the European Economic Area.",
        "Google Maps on the Contacts page loads only after separate consent to the “Google Maps” category. Google receives technical data, including your IP address, and may use cookies in accordance with its own privacy policy. Social media links and the “Open Google Maps” link lead to external websites."
      ]
    },
    {
      "title": "9. Data retention",
      "paragraphs": [
        "Questions-form input is not persistently stored by the application. No server-side account or appointment deletion periods are approved here.",
        "A submitted booking request, including contact details, is temporarily stored in sessionStorage for safe retries after an uncertain response. A successful response replaces it with a receipt; uncertain results have no automatic expiry. Browser session restoration may retain this data.",
        "The clinic must approve periods or criteria for accounts, appointments, history, acknowledgements, correspondence, backups and logs. Browser storage is described in the Cookie Policy."
      ]
    },
    {
      "title": "10. Data security",
      "paragraphs": [
        "Administrator access is verified server-side using authentication tokens and roles. The booking API validates fields and limits request frequency; the database prevents overlapping appointments.",
        "Browser session tokens keep you signed in. Sign out on shared devices and clear site data where needed. Infrastructure configuration, access review and retention practices still require legal assessment; absolute security is not guaranteed."
      ]
    },
    {
      "title": "11. Your rights",
      "paragraphs": [
        "Subject to the applicable conditions, you have the right to request access to your data, its rectification or erasure, or restriction of processing. In certain circumstances, you also have rights to data portability and to object to processing. These rights are not absolute and depend on the legal basis for processing and applicable legal requirements.",
        "Where processing is based on consent, you may withdraw it. Contact the clinic to exercise your rights; proportionate additional information may be required to verify your identity.",
        "You have the right to lodge a complaint with Latvia’s supervisory authority, the Data State Inspectorate (www.dvi.gov.lv)."
      ]
    },
    {
      "title": "12. Contact about personal data",
      "paragraphs": [
        "For questions about this website, you can contact the clinic using the published phone number +371 28229925 or email address ag@inbox.lv. Please do not send copies of identity documents or detailed health information in your initial message.",
        "A dedicated privacy contact or data protection officer has not currently been confirmed in the website content. The clinic needs to clarify how requests to exercise rights will be received and who will be the responsible contact."
      ]
    },
    {
      "title": "13. Changes to this policy",
      "paragraphs": [
        "This policy will be reviewed when website features or data processing change. The information identified here as requiring clarification must be completed before request submission is enabled. The date this text was updated is shown at the beginning of the page."
      ]
    }
  ]
});
const cookieEn = completeDocument(cookiePolicy, {
  "title": "Cookie Policy",
  "intro": "You can choose what this website remembers in your browser. Analytics and marketing tools are currently inactive.",
  "sections": [
    {
      "title": "1. What cookies and localStorage are",
      "paragraphs": [
        "Cookies are small pieces of data that websites can store in your browser. localStorage, a website’s local browser storage, is used for similar purposes. Unlike cookies, its contents are not automatically attached to every server request.",
        "In this version of the website frontend, cookie choices and the permitted language preference are stored in localStorage. Any additional cookies or technical logs introduced by deployment infrastructure must be checked with the clinic and hosting provider before publication."
      ]
    },
    {
      "title": "2. Necessary storage",
      "paragraphs": [
        "The ag-cookie-consent entry stores only the choice version, the necessary-storage status, choices for preferences, Google Maps, analytics and marketing categories, and a timestamp. It does not contain a name, phone number, email address or contact form content.",
        "This entry is created when you accept or reject choices. It is needed to respect your decision without asking on every page. Its storage cannot be disabled in the category settings, but you can delete the entry in your browser.",
        "Authentication uses a Supabase session in localStorage (sb-…-auth-token); its lifetime depends on authentication configuration. ag-booking-intent-v1 in sessionStorage may contain submitted booking contacts and a retry key, later a receipt. ag-welcome-seen in sessionStorage remembers the introduction. Browsers may restore session storage. ag-hero-preferences-v1 in localStorage stores explicitly chosen animation and video preferences without automatic expiry. These functions are separate from optional language consent; withdrawing cookie settings does not sign you out or erase booking data or motion preferences."
      ]
    },
    {
      "title": "3. Preferences",
      "paragraphs": [
        "With permission for the “Preferences” category, ag-language stores the selected website language (LV, RU or EN). Without permission, you can change the language on the open website, but it is not restored from storage after a reload.",
        "Disabling preferences deletes the ag-language entry. The language of the currently open page does not change, the language is no longer restored from this entry."
      ]
    },
    {
      "title": "4. Analytics cookies",
      "paragraphs": [
        "Visitor analytics tools have not currently been implemented on this website. The category is marked inactive in settings and its choice is off. Google Analytics and similar analytics scripts are not loaded."
      ]
    },
    {
      "title": "5. Marketing cookies",
      "paragraphs": [
        "Advertising tracking tools have not currently been implemented. The marketing category is inactive. The website does not load Meta Pixel or similar advertising scripts.",
        "Social media links and the “Open Google Maps” link lead to external websites. The Google map embedded on the Contacts page has a separate, optional “Google Maps” consent category. No iframe is created before permission is given. Withdrawal removes the map and stops it from loading further on this website; it does not reverse data transfers that have already occurred or delete cookies stored by Google. You can manage those in your browser and Google settings. Google’s privacy policy: policies.google.com/privacy."
      ]
    },
    {
      "title": "6. How consent works",
      "paragraphs": [
        "Optional storage is not permitted before a choice is made. “Accept all” enables language preferences and the Google Maps category. It does not enable inactive analytics or marketing.",
        "“Reject optional” disables language persistence and Google Maps; it does not erase storage for other requested functions. “Settings” lets you choose language storage and Google Maps loading separately. Closing settings or continuing to use the website does not constitute consent.",
        "If new optional tools are introduced, this policy and the technical consent version must be updated and appropriate consent obtained before those tools are activated."
      ]
    },
    {
      "title": "7. Changing or withdrawing your choice",
      "paragraphs": [
        "Open “Cookie settings” in the footer at any time, or use the settings button on this page. Disable preferences or Google Maps and save your choice, or select “Reject optional”. Changes apply to this browser.",
        "Your choice is saved with a version and timestamp. When a valid choice is stored, the initial banner is not shown again on every page."
      ]
    },
    {
      "title": "8. Retention and browser controls",
      "paragraphs": [
        "localStorage entries do not expire automatically. They remain until you change them, delete the website’s data or your browser clears them. A change to the consent version may require you to choose again.",
        "You can delete or block website data in your browser’s privacy settings. After deletion, this website may show the choice banner again. If storage is blocked, your choice applies only until the page reloads; the website displays a notice explaining this."
      ]
    },
    {
      "title": "9. Policy updates and contact",
      "paragraphs": [
        "We will review this policy when the website’s use of storage or external tools changes. The update date is shown at the beginning of the page. You can ask the clinic questions by phone on +371 28229925 or by email at ag@inbox.lv. Further information about personal data is available in the Privacy Policy."
      ]
    }
  ],
  "notice": "Draft for review: controller details are confirmed; legal bases, retention, providers and privacy-request procedures still require clinic and legal approval. Public online booking is not activated."
});
const privacyRu = completeDocument(privacyPolicy, {
  "title": "Политика конфиденциальности",
  "intro": "Здесь описано, как сейчас работает сайт AG Zobārstniecība и куда обращаться с вопросами о ваших персональных данных.",
  "notice": "Проект на согласование: реквизиты оператора подтверждены; правовые основания, хранение, поставщики услуг и порядок обращений о данных требуют согласования клиники и юриста. Публичная онлайн-запись не активирована.",
  "sections": [
    {
      "title": "1. Общая информация",
      "paragraphs": [
        "Политика охватывает учётные записи, подготовленную функцию записи, общие вопросы и хранилище браузера. Она не заменяет информацию об обработке медицинской документации при лечении.",
        "Регистрация и вход реализованы. Публичная запись ещё не активирована. Форма вопросов только проверяет ввод в браузере и пока не отправляет сообщения."
      ]
    },
    {
      "title": "2. Оператор персональных данных",
      "paragraphs": [
        "Оператор данных: SIA \"Andas Gutovskas privātprakse\", регистрационный номер 40103915017. Юридический адрес: Rīga, Ūnijas iela 21, LV-1039.",
        "Адрес посещения клиники: Ūnijas iela 25, Rīga. Он отличается от юридического адреса. Общие контакты: +371 28229925, ag@inbox.lv."
      ]
    },
    {
      "title": "3. Какие персональные данные обрабатываются",
      "paragraphs": [
        "Для учётной записи используются электронная почта и пароль; Supabase Auth обрабатывает аутентификацию, идентификатор пользователя и сессию. При регистрации передаются подтверждение ознакомления с политикой и её путь. Код приложения не сохраняет пароль.",
        "В форме вопросов обязательны имя, электронная почта, вопрос (до 1000 символов) и подтверждение ознакомления с политикой; телефон необязателен. Ввод остаётся в памяти страницы, не отправляется и не восстанавливается из хранилища сайта. Автозаполнение зависит от настроек браузера.",
        "При обращении по телефону или почте вы передаёте выбранную вами информацию. Поля записи описаны в разделе 6."
      ]
    },
    {
      "title": "4. Цели обработки данных",
      "paragraphs": [
        "Данные учётной записи обеспечивают вход и контроль доступа. Данные записи предназначены для организации визита, решения администратора, изменений и предотвращения двойного бронирования.",
        "Система хранит статус визита, время изменений и известного исполнителя действия. Это не согласие на маркетинг. Языковые и другие настройки браузера описаны в Политике файлов cookie."
      ]
    },
    {
      "title": "5. Правовое основание обработки",
      "paragraphs": [
        "Подтверждение ознакомления не является автоматически правовым основанием всей обработки. Клиника с юристом должна подтвердить основание для каждой цели, включая учётные записи, визиты, безопасность и связь.",
        "Следует оценить действия по запросу человека до заключения договора, применимые обязанности и, где уместно, согласие. Выбранная услуга может раскрывать сведения о здоровье; необходима оценка условий обработки особых категорий данных. Подтверждённое основание здесь не предполагается.",
        "Если обработка основана на согласии, его можно отозвать без изменения законности предыдущей обработки. Дополнительные настройки хранилища можно изменить в настройках cookie."
      ]
    },
    {
      "title": "6. Данные заявки на приём",
      "paragraphs": [
        "Подготовленная запись требует имя, фамилию, телефон, электронную почту, услугу, доступного специалиста и время, а также подтверждение ознакомления с политикой. Учётная запись необязательна. Сервер также хранит окончание визита, номер записи, статус, версию политики, время подтверждения ознакомления и при наличии идентификатор аккаунта.",
        "Персональный код, диагноз и история болезни не запрашиваются. Не отправляйте подробные сведения о здоровье через форму вопросов. Планируется ручное подтверждение администратором: ожидающая заявка резервирует время, но ещё не является подтверждённым визитом; она не удаляется автоматически без уведомления.",
        "Публичная запись требует отдельной активации. Автоматические письма о визитах, напоминания и сообщения WhatsApp не реализованы. Письма Supabase для восстановления или подтверждения аккаунта — отдельная функция аутентификации, а не подтверждение визита."
      ]
    },
    {
      "title": "7. Файлы cookie и хранилище браузера",
      "paragraphs": [
        "Сайт использует localStorage, чтобы запоминать ваш выбор cookie. С вашего разрешения там также сохраняется выбранный язык. Инструменты аналитики и маркетинга сейчас не внедрены.",
        "Изменить выбор можно через «Настройки cookie» внизу сайта. Дополнительная информация, в том числе названия сохраняемых записей, приведена в Политике файлов cookie."
      ]
    },
    {
      "title": "8. Получатели данных и поставщики услуг",
      "paragraphs": [
        "Supabase используется для аутентификации, базы PostgreSQL и частного хранилища изображений. Уполномоченные администраторы используют Go API; публичные ответы не раскрывают контакты пациентов.",
        "Для загрузки страницы браузер обращается к инфраструктуре сайта, а сайт проверяет доступность API. Клиника должна подтвердить сведения о хостинге, технических журналах, почтовых и других поставщиках услуг, а также о возможной передаче данных за пределы Европейской экономической зоны.",
        "Карта Google Maps на странице контактов загружается только после отдельного согласия на категорию «Google Maps». Google получает технические данные, включая IP-адрес, и может использовать файлы cookie в соответствии со своей политикой конфиденциальности. Ссылки на социальные сети и ссылка «Открыть Google Maps» ведут на внешние сайты."
      ]
    },
    {
      "title": "9. Сроки хранения данных",
      "paragraphs": [
        "Ввод формы вопросов не сохраняется приложением постоянно. Для серверных записей аккаунтов и визитов здесь не утверждены сроки удаления.",
        "Отправленный запрос записи, включая контакты, временно хранится в sessionStorage для безопасного повтора при неопределённом ответе. После успешного ответа его заменяет квитанция; при неопределённом результате автоматического срока нет. Восстановление сессии браузера может сохранить эти данные.",
        "Клиника должна утвердить сроки или критерии для аккаунтов, визитов, истории, подтверждений ознакомления, переписки, резервных копий и журналов. Хранилище браузера описано в Политике файлов cookie."
      ]
    },
    {
      "title": "10. Безопасность данных",
      "paragraphs": [
        "Доступ администратора проверяется сервером по токену аутентификации и роли. API записи проверяет поля и ограничивает частоту запросов; база предотвращает пересечение времени.",
        "Токены сессии в браузере позволяют оставаться в аккаунте. На общем устройстве выйдите из аккаунта и при необходимости очистите данные сайта. Конфигурация инфраструктуры, пересмотр доступа и хранение ещё требуют правовой оценки; абсолютная безопасность не гарантируется."
      ]
    },
    {
      "title": "11. Ваши права",
      "paragraphs": [
        "При соблюдении применимых условий вы вправе запросить доступ к своим данным, их исправление, удаление или ограничение обработки. В определённых случаях также действуют права на переносимость данных и возражение против обработки. Эти права не абсолютны и зависят от основания обработки и требований законодательства.",
        "Если обработка основана на согласии, его можно отозвать. Для осуществления своих прав свяжитесь с клиникой; для проверки личности может потребоваться соразмерная дополнительная информация.",
        "Вы вправе подать жалобу в надзорный орган Латвии — Государственную инспекцию данных (www.dvi.gov.lv)."
      ]
    },
    {
      "title": "12. Связь по вопросам персональных данных",
      "paragraphs": [
        "По вопросам, связанным с этим сайтом, можно обратиться в клинику по опубликованному телефону +371 28229925 или электронной почте ag@inbox.lv. Не отправляйте копии удостоверяющих личность документов или подробные сведения о здоровье в первом сообщении.",
        "Специальный контакт по вопросам конфиденциальности или специалист по защите данных сейчас не подтверждены в содержимом сайта. Клиника должна уточнить порядок получения запросов об осуществлении прав и ответственное контактное лицо."
      ]
    },
    {
      "title": "13. Изменения политики",
      "paragraphs": [
        "Политика будет пересматриваться при изменении функций сайта или обработки данных. До включения отправки заявок необходимо дополнить сведения, отмеченные здесь как требующие уточнения. Дата обновления этого текста указана в начале страницы."
      ]
    }
  ]
});
const cookieRu = completeDocument(cookiePolicy, {
  "title": "Политика файлов cookie",
  "intro": "Вы можете выбрать, что этот сайт запоминает в вашем браузере. Инструменты аналитики и маркетинга сейчас неактивны.",
  "sections": [
    {
      "title": "1. Что такое файлы cookie и localStorage",
      "paragraphs": [
        "Файлы cookie — небольшие данные, которые сайты могут сохранять в браузере. Для похожих задач используется localStorage — локальное хранилище сайта в браузере. В отличие от cookie, его содержимое не добавляется автоматически к каждому запросу на сервер.",
        "В этой версии клиентской части сайта выбор cookie и разрешённая языковая настройка сохраняются в localStorage. Возможные дополнительные cookie или технические журналы инфраструктуры размещения необходимо проверить с клиникой и хостинг-провайдером до публикации."
      ]
    },
    {
      "title": "2. Необходимое хранилище",
      "paragraphs": [
        "Запись ag-cookie-consent хранит только версию выбора, статус необходимого хранилища, выбор категорий предпочтений, Google Maps, аналитики и маркетинга, а также отметку времени. Она не содержит имени, телефона, электронной почты или содержимого контактной формы.",
        "Эта запись создаётся, когда вы принимаете или отклоняете настройки. Она нужна, чтобы соблюдать ваше решение и не запрашивать его на каждой странице. Её сохранение нельзя отключить в настройках категорий, но запись можно удалить в браузере.",
        "Аутентификация использует сессию Supabase в localStorage (sb-…-auth-token); её срок определяется настройками аутентификации. ag-booking-intent-v1 в sessionStorage может содержать контакты отправленного запроса записи и ключ повтора, затем квитанцию. ag-welcome-seen в sessionStorage запоминает показ вступления. Браузер может восстанавливать хранилище сессии. ag-hero-preferences-v1 в localStorage хранит явно выбранные настройки анимации и видео без автоматического срока. Эти функции отделены от дополнительного согласия на сохранение языка; отзыв настроек cookie не завершает вход и не удаляет данные записи или настройки анимации."
      ]
    },
    {
      "title": "3. Предпочтения",
      "paragraphs": [
        "При разрешении категории «Предпочтения» в записи ag-language сохраняется выбранный язык сайта (LV, RU или EN). Без разрешения язык можно менять на открытом сайте, но после перезагрузки он не восстанавливается из хранилища.",
        "При отключении предпочтений сайт удаляет запись ag-language. Язык текущей открытой страницы не меняется, язык больше не восстанавливается из этой записи."
      ]
    },
    {
      "title": "4. Аналитические файлы cookie",
      "paragraphs": [
        "Инструменты анализа посещаемости на этом сайте пока не внедрены. В настройках категория отмечена как неактивная и выключена. Google Analytics и подобные аналитические скрипты не загружаются."
      ]
    },
    {
      "title": "5. Маркетинговые файлы cookie",
      "paragraphs": [
        "Инструменты рекламного отслеживания сейчас не внедрены. Маркетинговая категория неактивна. Сайт не загружает Meta Pixel или подобные рекламные скрипты.",
        "Ссылки на социальные сети и ссылка «Открыть Google Maps» ведут на внешние сайты. Для встроенной карты Google на странице контактов предусмотрена отдельная необязательная категория согласия «Google Maps». До разрешения iframe не создаётся. Отзыв согласия удаляет карту и прекращает её дальнейшую загрузку на этом сайте; он не отменяет уже состоявшуюся передачу данных и не удаляет сохранённые Google файлы cookie. Управлять ими можно в браузере и настройках Google. Политика конфиденциальности Google: policies.google.com/privacy."
      ]
    },
    {
      "title": "6. Как работает согласие",
      "paragraphs": [
        "До выбора дополнительное хранилище не разрешено. «Принять все» включает языковые предпочтения и категорию Google Maps. Неактивные аналитика и маркетинг при этом не включаются.",
        "«Отклонить дополнительные» отключает сохранение языка и Google Maps; хранилище других запрошенных функций не удаляется. «Настройки» позволяют отдельно разрешить сохранение языка и загрузку Google Maps. Закрытие настроек или продолжение использования сайта не означает согласия.",
        "Если будут внедрены новые дополнительные инструменты, до их активации необходимо обновить эту политику, техническую версию согласия и получить соответствующее согласие."
      ]
    },
    {
      "title": "7. Изменение и отзыв выбора",
      "paragraphs": [
        "В любой момент откройте «Настройки cookie» внизу сайта или воспользуйтесь кнопкой настроек на этой странице. Отключите предпочтения или Google Maps и сохраните выбор либо нажмите «Отклонить дополнительные». Изменения относятся к этому браузеру.",
        "Выбор сохраняется с версией и отметкой времени. При наличии действительного сохранённого выбора первоначальное уведомление не показывается повторно на каждой странице."
      ]
    },
    {
      "title": "8. Хранение и управление в браузере",
      "paragraphs": [
        "Записи localStorage не имеют автоматического срока действия. Они сохраняются до изменения, удаления данных сайта или очистки браузером. Изменение версии согласия может потребовать повторного выбора.",
        "В настройках конфиденциальности браузера можно удалять или блокировать данные сайтов. После удаления этот сайт может снова показать уведомление с выбором. Если хранилище заблокировано, выбор действует только до перезагрузки страницы; сайт показывает об этом уведомление."
      ]
    },
    {
      "title": "9. Обновления политики и связь",
      "paragraphs": [
        "Мы пересмотрим политику при изменении использования хранилища или внешних инструментов сайта. Дата обновления указана в начале страницы. Задать вопросы клинике можно по телефону +371 28229925 или электронной почте ag@inbox.lv. Дополнительные сведения о персональных данных приведены в Политике конфиденциальности."
      ]
    }
  ],
  "notice": "Проект на согласование: реквизиты оператора подтверждены; правовые основания, хранение, поставщики услуг и порядок обращений о данных требуют согласования клиники и юриста. Публичная онлайн-запись не активирована."
});
// vue-i18n treats @ as linked-message syntax. Escape literal email addresses
// when registering messages; rt() renders them as ordinary, unchanged text.
function messages(document: LegalDocument): LegalDocument {
  const literal = (text: string) => text.replaceAll("@", "{'@'}");
  return {
    ...document,
    title: literal(document.title),
    intro: literal(document.intro),
    ...(document.notice ? { notice: literal(document.notice) } : {}),
    sections: document.sections.map((section) => ({
      ...section,
      title: literal(section.title),
      paragraphs: section.paragraphs.map(literal),
    })),
  };
}
export const legalDocuments = {
  lv: { privacy: messages(privacyPolicy), cookies: messages(cookiePolicy) },
  ru: { privacy: messages(privacyRu), cookies: messages(cookieRu) },
  en: { privacy: messages(privacyEn), cookies: messages(cookieEn) },
};
