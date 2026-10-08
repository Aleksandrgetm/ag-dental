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
  title: "Privacy Policy",
  intro:
    "This policy describes how the AG Zobārstniecība website currently works and how to raise questions about your personal data.",
  notice:
    "Online request submission is not yet available. Before it is introduced, the clinic will clarify the information about the data controller, service providers and request retention.",
  sections: [
    {
      title: "1. General information",
      paragraphs: [
        "This policy covers the clinic’s public website, contact options and choices stored in your browser. It does not replace information about the processing of patients’ medical records during treatment.",
        "The website has no patient accounts or appointment calendar. Contact form fields are currently checked only in your browser; they are not sent to the clinic’s server or an email service.",
      ],
    },
    {
      title: "2. Data controller",
      paragraphs: [
        "The website presents AG Zobārstniecība, located at Ūnijas iela 25, Riga, LV-1039. The published contact details are +371 28229925 and ag@inbox.lv.",
        "AG Zobārstniecība is the clinic name used on this website. The legal entity’s full name, registration number and controller details are still being confirmed with the clinic. They will be added before request submission is enabled.",
      ],
    },
    {
      title: "3. Personal data processed",
      paragraphs: [
        "The form provides fields for first name, last name, phone number, email address, selected service and an optional message. Once submission is enabled, the request is intended to include a record of consent to data processing, its timestamp and the policy version.",
        "Information entered in the current form remains in the open page’s memory. The website code does not write it to localStorage or cookies. Your browser’s own autofill behavior is controlled by your browser settings.",
        "When you contact the clinic by phone or email, you provide your contact details and any information you choose to share or send. The processing and retention conditions for this correspondence must be clarified with the clinic.",
      ],
    },
    {
      title: "4. Purposes of processing",
      paragraphs: [
        "The intended purpose of the request is to receive and respond to a request for contact and arrange the requested visit. The form is not intended for advertising, profiling or creating medical records.",
        "Saving your language and remembering your consent choices are separate website features described in the Cookie Policy.",
      ],
    },
    {
      title: "5. Legal basis for processing",
      paragraphs: [
        "The contact form requires a separate, initially unchecked consent to contact you about your request before you can continue. This is not marketing consent. At present, checking the consent box does not send data to the clinic.",
        "Before the form is activated, the clinic must confirm the applicable legal basis for each processing purpose and contact channel. Depending on the specific purpose, this may be consent or steps taken at a person’s request before entering into a contract; the choice of legal basis still needs to be clarified.",
        "Where processing is based on consent, you may withdraw it. Withdrawal does not affect the lawfulness of processing based on consent before its withdrawal. Optional language storage can be disabled in cookie settings.",
      ],
    },
    {
      title: "6. Appointment request data",
      paragraphs: [
        "First name, last name, phone number, email address and consent to contact you about the request are required. The service and message are optional. If needed, you can select a consultation without providing detailed health information.",
        "Please do not enter diagnoses, medical history, a personal identity number, medications, insurance information or other detailed health data. Discuss treatment matters directly with a specialist.",
        "The “Check request” button validates fields locally and sends nothing. To request a visit at present, please call or email the clinic. Even after submission is introduced, a request will not itself confirm an appointment: the time will need to be agreed with the clinic.",
      ],
    },
    {
      title: "7. Cookies and browser storage",
      paragraphs: [
        "The website uses localStorage to remember your cookie choices. With your permission, it also stores your selected language. Analytics and marketing tools have not currently been implemented.",
        "You can change your choices through “Cookie settings” in the footer. Further information, including the names of stored entries, is available in the Cookie Policy.",
      ],
    },
    {
      title: "8. Data recipients and service providers",
      paragraphs: [
        "The contact form is not currently connected to a request API, database writes or email delivery. Website user accounts have not been implemented either.",
        "To load a page, your browser communicates with the website’s infrastructure, and the website checks API availability. The clinic must confirm information about hosting, technical logs, email and other service providers, as well as any transfers outside the European Economic Area.",
        "Google Maps on the Contacts page loads only after separate consent to the “Google Maps” category. Google receives technical data, including your IP address, and may use cookies in accordance with its own privacy policy. Social media links and the “Open Google Maps” link lead to external websites.",
      ],
    },
    {
      title: "9. Data retention",
      paragraphs: [
        "Persistent storage of contact form entries has not been implemented in the website code. After the page is closed or reloaded, the form does not restore them from the website’s storage.",
        "Consent choices and the permitted language preference in your browser’s localStorage do not expire automatically. They remain until you change your choice, delete the website’s data or your browser clears it. If the consent version changes, the website will ask you to choose again.",
        "The clinic still needs to determine and confirm retention periods, or the criteria for determining them, for future requests, consent records, email correspondence and technical logs.",
      ],
    },
    {
      title: "10. Data security",
      paragraphs: [
        "Contact form data is not added to website URLs or stored in the cookie preference record. Browser validation helps identify input errors but does not replace server-side security measures.",
        "Before submission is introduced, server validation, input-size and request-rate limits, spam protection and appropriate access controls must be implemented. This policy does not provide an absolute guarantee of security.",
      ],
    },
    {
      title: "11. Your rights",
      paragraphs: [
        "Subject to the applicable conditions, you have the right to request access to your data, its rectification or erasure, or restriction of processing. In certain circumstances, you also have rights to data portability and to object to processing. These rights are not absolute and depend on the legal basis for processing and applicable legal requirements.",
        "Where processing is based on consent, you may withdraw it. Contact the clinic to exercise your rights; proportionate additional information may be required to verify your identity.",
        "You have the right to lodge a complaint with Latvia’s supervisory authority, the Data State Inspectorate (www.dvi.gov.lv).",
      ],
    },
    {
      title: "12. Contact about personal data",
      paragraphs: [
        "For questions about this website, you can contact the clinic using the published phone number +371 28229925 or email address ag@inbox.lv. Please do not send copies of identity documents or detailed health information in your initial message.",
        "A dedicated privacy contact or data protection officer has not currently been confirmed in the website content. The clinic needs to clarify how requests to exercise rights will be received and who will be the responsible contact.",
      ],
    },
    {
      title: "13. Changes to this policy",
      paragraphs: [
        "This policy will be reviewed when website features or data processing change. The information identified here as requiring clarification must be completed before request submission is enabled. The date this text was updated is shown at the beginning of the page.",
      ],
    },
  ],
});

const cookieEn = completeDocument(cookiePolicy, {
  title: "Cookie Policy",
  intro:
    "You can choose what this website remembers in your browser. Analytics and marketing tools are currently inactive.",
  sections: [
    {
      title: "1. What cookies and localStorage are",
      paragraphs: [
        "Cookies are small pieces of data that websites can store in your browser. localStorage, a website’s local browser storage, is used for similar purposes. Unlike cookies, its contents are not automatically attached to every server request.",
        "In this version of the website frontend, cookie choices and the permitted language preference are stored in localStorage. Any additional cookies or technical logs introduced by deployment infrastructure must be checked with the clinic and hosting provider before publication.",
      ],
    },
    {
      title: "2. Necessary storage",
      paragraphs: [
        "The ag-cookie-consent entry stores only the choice version, the necessary-storage status, choices for preferences, Google Maps, analytics and marketing categories, and a timestamp. It does not contain a name, phone number, email address or contact form content.",
        "This entry is created when you accept or reject choices. It is needed to respect your decision without asking on every page. Its storage cannot be disabled in the category settings, but you can delete the entry in your browser.",
      ],
    },
    {
      title: "3. Preferences",
      paragraphs: [
        "With permission for the “Preferences” category, ag-language stores the selected website language (LV, RU or EN). Without permission, you can change the language on the open website, but it is not restored from storage after a reload.",
        "Disabling preferences deletes the ag-language entry. The language of the currently open page does not change, but Latvian, the default language, is used on the next reload.",
      ],
    },
    {
      title: "4. Analytics cookies",
      paragraphs: [
        "Visitor analytics tools have not currently been implemented on this website. The category is marked inactive in settings and its choice is off. Google Analytics and similar analytics scripts are not loaded.",
      ],
    },
    {
      title: "5. Marketing cookies",
      paragraphs: [
        "Advertising tracking tools have not currently been implemented. The marketing category is inactive. The website does not load Meta Pixel or similar advertising scripts.",
        "Social media links and the “Open Google Maps” link lead to external websites. The Google map embedded on the Contacts page has a separate, optional “Google Maps” consent category. No iframe is created before permission is given. Withdrawal removes the map and stops it from loading further on this website; it does not reverse data transfers that have already occurred or delete cookies stored by Google. You can manage those in your browser and Google settings. Google’s privacy policy: policies.google.com/privacy.",
      ],
    },
    {
      title: "6. How consent works",
      paragraphs: [
        "Optional storage is not permitted before a choice is made. “Accept all” enables language preferences and the Google Maps category. It does not enable inactive analytics or marketing.",
        "“Reject optional” keeps only the necessary choice record. “Settings” lets you choose language storage and Google Maps loading separately. Closing settings or continuing to use the website does not constitute consent.",
        "If new optional tools are introduced, this policy and the technical consent version must be updated and appropriate consent obtained before those tools are activated.",
      ],
    },
    {
      title: "7. Changing or withdrawing your choice",
      paragraphs: [
        "Open “Cookie settings” in the footer at any time, or use the settings button on this page. Disable preferences or Google Maps and save your choice, or select “Reject optional”. Changes apply to this browser.",
        "Your choice is saved with a version and timestamp. When a valid choice is stored, the initial banner is not shown again on every page.",
      ],
    },
    {
      title: "8. Retention and browser controls",
      paragraphs: [
        "localStorage entries do not expire automatically. They remain until you change them, delete the website’s data or your browser clears them. A change to the consent version may require you to choose again.",
        "You can delete or block website data in your browser’s privacy settings. After deletion, this website may show the choice banner again. If storage is blocked, your choice applies only until the page reloads; the website displays a notice explaining this.",
      ],
    },
    {
      title: "9. Policy updates and contact",
      paragraphs: [
        "We will review this policy when the website’s use of storage or external tools changes. The update date is shown at the beginning of the page. You can ask the clinic questions by phone on +371 28229925 or by email at ag@inbox.lv. Further information about personal data is available in the Privacy Policy.",
      ],
    },
  ],
});

const privacyRu = completeDocument(privacyPolicy, {
  title: "Политика конфиденциальности",
  intro:
    "Здесь описано, как сейчас работает сайт AG Zobārstniecība и куда обращаться с вопросами о ваших персональных данных.",
  notice:
    "Отправка заявок онлайн пока недоступна. До её внедрения клиника уточнит сведения об операторе персональных данных, поставщиках услуг и хранении заявок.",
  sections: [
    {
      title: "1. Общая информация",
      paragraphs: [
        "Эта политика распространяется на публичный сайт клиники, способы связи и настройки, сохраняемые в браузере. Она не заменяет информацию об обработке медицинской документации пациентов во время лечения.",
        "На сайте нет личных кабинетов пациентов и календаря записи. Поля контактной формы сейчас проверяются только в вашем браузере; они не отправляются на сервер клиники или в почтовый сервис.",
      ],
    },
    {
      title: "2. Оператор персональных данных",
      paragraphs: [
        "Сайт представляет клинику AG Zobārstniecība по адресу Ūnijas iela 25, Рига, LV-1039. Опубликованные контакты: +371 28229925 и ag@inbox.lv.",
        "AG Zobārstniecība — название клиники, используемое на сайте. Полное наименование юридического лица, регистрационный номер и реквизиты оператора данных ещё уточняются у клиники. Они будут дополнены до включения отправки заявок.",
      ],
    },
    {
      title: "3. Какие персональные данные обрабатываются",
      paragraphs: [
        "В форме предусмотрены имя, фамилия, номер телефона, адрес электронной почты, выбранная услуга и необязательное сообщение. После включения отправки к заявке планируется добавлять запись о согласии на обработку данных, время его предоставления и версию политики.",
        "Введённые в текущую форму сведения остаются в памяти открытой страницы. Код сайта не записывает их в localStorage или файлы cookie. Работа собственной функции автозаполнения браузера определяется настройками вашего браузера.",
        "При обращении по телефону или электронной почте вы передаёте клинике свои контакты и сведения, которые решаете сообщить или отправить. Условия обработки и хранения такой переписки и обращений необходимо уточнить у клиники.",
      ],
    },
    {
      title: "4. Цели обработки данных",
      paragraphs: [
        "Предполагаемая цель заявки — получить обращение, ответить на него и договориться о запрошенном визите. Форма не предназначена для рекламных рассылок, профилирования или создания медицинской документации.",
        "Сохранение языка и запоминание выбора в отношении согласия — отдельные функции сайта, описанные в Политике файлов cookie.",
      ],
    },
    {
      title: "5. Правовое основание обработки",
      paragraphs: [
        "Для продолжения работы с контактной формой предусмотрено отдельное согласие на связь по поводу заявки; соответствующий флажок изначально не установлен. Это не согласие на маркетинг. Сейчас установка флажка не отправляет данные в клинику.",
        "До активации формы клиника должна подтвердить применимое правовое основание для каждой цели обработки и каждого канала связи. В зависимости от конкретной цели это может быть согласие или действия по запросу человека до заключения договора; выбор основания ещё необходимо уточнить.",
        "Если обработка основана на согласии, его можно отозвать. Отзыв не влияет на законность обработки, выполненной на основании согласия до его отзыва. Необязательное сохранение языка можно отключить в настройках cookie.",
      ],
    },
    {
      title: "6. Данные заявки на приём",
      paragraphs: [
        "Обязательны имя, фамилия, телефон, электронная почта и согласие на связь по поводу заявки. Услуга и сообщение необязательны. При необходимости можно выбрать консультацию, не указывая подробные сведения о здоровье.",
        "Не вводите диагнозы, историю болезни, персональный код, сведения о лекарствах, страховании или другие подробные данные о здоровье. Вопросы лечения обсуждайте непосредственно со специалистом.",
        "Кнопка «Проверить заявку» проверяет поля локально и ничего не отправляет. Чтобы записаться сейчас, позвоните или напишите в клинику. Даже после внедрения отправки сама заявка не будет подтверждать запись: время необходимо согласовать с клиникой.",
      ],
    },
    {
      title: "7. Файлы cookie и хранилище браузера",
      paragraphs: [
        "Сайт использует localStorage, чтобы запоминать ваш выбор cookie. С вашего разрешения там также сохраняется выбранный язык. Инструменты аналитики и маркетинга сейчас не внедрены.",
        "Изменить выбор можно через «Настройки cookie» внизу сайта. Дополнительная информация, в том числе названия сохраняемых записей, приведена в Политике файлов cookie.",
      ],
    },
    {
      title: "8. Получатели данных и поставщики услуг",
      paragraphs: [
        "Контактная форма сейчас не подключена к API заявок, записи в базу данных или отправке электронной почты. Личный кабинет пользователя сайта также не внедрён.",
        "Для загрузки страницы браузер обращается к инфраструктуре сайта, а сайт проверяет доступность API. Клиника должна подтвердить сведения о хостинге, технических журналах, почтовых и других поставщиках услуг, а также о возможной передаче данных за пределы Европейской экономической зоны.",
        "Карта Google Maps на странице контактов загружается только после отдельного согласия на категорию «Google Maps». Google получает технические данные, включая IP-адрес, и может использовать файлы cookie в соответствии со своей политикой конфиденциальности. Ссылки на социальные сети и ссылка «Открыть Google Maps» ведут на внешние сайты.",
      ],
    },
    {
      title: "9. Сроки хранения данных",
      paragraphs: [
        "Постоянное сохранение введённых в контактную форму данных в коде сайта не реализовано. После закрытия или перезагрузки страницы форма не восстанавливает их из хранилища сайта.",
        "Выбор согласия и разрешённая языковая настройка в localStorage браузера не имеют автоматического срока действия. Они остаются до изменения выбора, удаления данных сайта или очистки браузером. При изменении версии согласия сайт попросит сделать выбор повторно.",
        "Клиника ещё должна определить и подтвердить сроки хранения будущих заявок, подтверждений согласия, переписки по электронной почте и технических журналов либо критерии определения этих сроков.",
      ],
    },
    {
      title: "10. Безопасность данных",
      paragraphs: [
        "Данные контактной формы не добавляются в адреса страниц сайта и не сохраняются в записи выбора cookie. Проверка полей в браузере помогает обнаружить ошибки ввода, но не заменяет меры безопасности на сервере.",
        "До внедрения отправки необходимо обеспечить серверную проверку, ограничения объёма ввода и частоты запросов, защиту от спама и надлежащий контроль доступа. Эта политика не предоставляет абсолютной гарантии безопасности.",
      ],
    },
    {
      title: "11. Ваши права",
      paragraphs: [
        "При соблюдении применимых условий вы вправе запросить доступ к своим данным, их исправление, удаление или ограничение обработки. В определённых случаях также действуют права на переносимость данных и возражение против обработки. Эти права не абсолютны и зависят от основания обработки и требований законодательства.",
        "Если обработка основана на согласии, его можно отозвать. Для осуществления своих прав свяжитесь с клиникой; для проверки личности может потребоваться соразмерная дополнительная информация.",
        "Вы вправе подать жалобу в надзорный орган Латвии — Государственную инспекцию данных (www.dvi.gov.lv).",
      ],
    },
    {
      title: "12. Связь по вопросам персональных данных",
      paragraphs: [
        "По вопросам, связанным с этим сайтом, можно обратиться в клинику по опубликованному телефону +371 28229925 или электронной почте ag@inbox.lv. Не отправляйте копии удостоверяющих личность документов или подробные сведения о здоровье в первом сообщении.",
        "Специальный контакт по вопросам конфиденциальности или специалист по защите данных сейчас не подтверждены в содержимом сайта. Клиника должна уточнить порядок получения запросов об осуществлении прав и ответственное контактное лицо.",
      ],
    },
    {
      title: "13. Изменения политики",
      paragraphs: [
        "Политика будет пересматриваться при изменении функций сайта или обработки данных. До включения отправки заявок необходимо дополнить сведения, отмеченные здесь как требующие уточнения. Дата обновления этого текста указана в начале страницы.",
      ],
    },
  ],
});

const cookieRu = completeDocument(cookiePolicy, {
  title: "Политика файлов cookie",
  intro:
    "Вы можете выбрать, что этот сайт запоминает в вашем браузере. Инструменты аналитики и маркетинга сейчас неактивны.",
  sections: [
    {
      title: "1. Что такое файлы cookie и localStorage",
      paragraphs: [
        "Файлы cookie — небольшие данные, которые сайты могут сохранять в браузере. Для похожих задач используется localStorage — локальное хранилище сайта в браузере. В отличие от cookie, его содержимое не добавляется автоматически к каждому запросу на сервер.",
        "В этой версии клиентской части сайта выбор cookie и разрешённая языковая настройка сохраняются в localStorage. Возможные дополнительные cookie или технические журналы инфраструктуры размещения необходимо проверить с клиникой и хостинг-провайдером до публикации.",
      ],
    },
    {
      title: "2. Необходимое хранилище",
      paragraphs: [
        "Запись ag-cookie-consent хранит только версию выбора, статус необходимого хранилища, выбор категорий предпочтений, Google Maps, аналитики и маркетинга, а также отметку времени. Она не содержит имени, телефона, электронной почты или содержимого контактной формы.",
        "Эта запись создаётся, когда вы принимаете или отклоняете настройки. Она нужна, чтобы соблюдать ваше решение и не запрашивать его на каждой странице. Её сохранение нельзя отключить в настройках категорий, но запись можно удалить в браузере.",
      ],
    },
    {
      title: "3. Предпочтения",
      paragraphs: [
        "При разрешении категории «Предпочтения» в записи ag-language сохраняется выбранный язык сайта (LV, RU или EN). Без разрешения язык можно менять на открытом сайте, но после перезагрузки он не восстанавливается из хранилища.",
        "При отключении предпочтений сайт удаляет запись ag-language. Язык текущей открытой страницы не меняется, но при следующей перезагрузке используется латышский язык по умолчанию.",
      ],
    },
    {
      title: "4. Аналитические файлы cookie",
      paragraphs: [
        "Инструменты анализа посещаемости на этом сайте пока не внедрены. В настройках категория отмечена как неактивная и выключена. Google Analytics и подобные аналитические скрипты не загружаются.",
      ],
    },
    {
      title: "5. Маркетинговые файлы cookie",
      paragraphs: [
        "Инструменты рекламного отслеживания сейчас не внедрены. Маркетинговая категория неактивна. Сайт не загружает Meta Pixel или подобные рекламные скрипты.",
        "Ссылки на социальные сети и ссылка «Открыть Google Maps» ведут на внешние сайты. Для встроенной карты Google на странице контактов предусмотрена отдельная необязательная категория согласия «Google Maps». До разрешения iframe не создаётся. Отзыв согласия удаляет карту и прекращает её дальнейшую загрузку на этом сайте; он не отменяет уже состоявшуюся передачу данных и не удаляет сохранённые Google файлы cookie. Управлять ими можно в браузере и настройках Google. Политика конфиденциальности Google: policies.google.com/privacy.",
      ],
    },
    {
      title: "6. Как работает согласие",
      paragraphs: [
        "До выбора дополнительное хранилище не разрешено. «Принять все» включает языковые предпочтения и категорию Google Maps. Неактивные аналитика и маркетинг при этом не включаются.",
        "«Отклонить дополнительные» оставляет только необходимую запись выбора. «Настройки» позволяют отдельно разрешить сохранение языка и загрузку Google Maps. Закрытие настроек или продолжение использования сайта не означает согласия.",
        "Если будут внедрены новые дополнительные инструменты, до их активации необходимо обновить эту политику, техническую версию согласия и получить соответствующее согласие.",
      ],
    },
    {
      title: "7. Изменение и отзыв выбора",
      paragraphs: [
        "В любой момент откройте «Настройки cookie» внизу сайта или воспользуйтесь кнопкой настроек на этой странице. Отключите предпочтения или Google Maps и сохраните выбор либо нажмите «Отклонить дополнительные». Изменения относятся к этому браузеру.",
        "Выбор сохраняется с версией и отметкой времени. При наличии действительного сохранённого выбора первоначальное уведомление не показывается повторно на каждой странице.",
      ],
    },
    {
      title: "8. Хранение и управление в браузере",
      paragraphs: [
        "Записи localStorage не имеют автоматического срока действия. Они сохраняются до изменения, удаления данных сайта или очистки браузером. Изменение версии согласия может потребовать повторного выбора.",
        "В настройках конфиденциальности браузера можно удалять или блокировать данные сайтов. После удаления этот сайт может снова показать уведомление с выбором. Если хранилище заблокировано, выбор действует только до перезагрузки страницы; сайт показывает об этом уведомление.",
      ],
    },
    {
      title: "9. Обновления политики и связь",
      paragraphs: [
        "Мы пересмотрим политику при изменении использования хранилища или внешних инструментов сайта. Дата обновления указана в начале страницы. Задать вопросы клинике можно по телефону +371 28229925 или электронной почте ag@inbox.lv. Дополнительные сведения о персональных данных приведены в Политике конфиденциальности.",
      ],
    },
  ],
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
