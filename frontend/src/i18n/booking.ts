const en = {
  eyebrow: "ONLINE APPOINTMENTS",
  title: "Time for your smile.",
  intro: "Choose your treatment, specialist and a time that suits you.",
  step0: "Service",
  step1: "Specialist",
  step2: "Date & time",
  step3: "Your details",
  step4: "Review",
  progress: "Booking progress",
  stepCount: "Step {current} of {total}",
  serviceTitle: "How can we help?",
  serviceText: "Select a service available for online booking.",
  doctorTitle: "Choose your specialist.",
  doctorText: "See all eligible specialists, or choose the one you prefer.",
  timeTitle: "Find a moment for you.",
  timeText:
    "All times are shown in Riga time. A time is reserved only after you confirm your booking.",
  contactTitle: "Let’s get to know you.",
  contactText:
    "We only need your contact details. You can book without an account.",
  reviewTitle: "Everything at a glance.",
  reviewText: "Check your details before confirming your appointment.",
  summary: "Your appointment",
  noSelection: "Not selected yet",
  service: "Service",
  doctor: "Specialist",
  date: "Date",
  time: "Time",
  duration: "Duration",
  price: "Price",
  minutes: "{count} min",
  anyDoctor: "Any available specialist",
  anyDoctorText: "See the available times of all eligible specialists.",
  oneDoctor: "This specialist provides your selected service.",
  loading: "Loading…",
  loadingCalendar: "Checking available dates…",
  checkingTimes: "Refreshing available times…",
  emptyTitle: "Online booking is being prepared.",
  emptyText:
    "Please call the clinic to arrange your visit. We will publish online appointments when services and schedules are ready.",
  noDoctors: "No specialists are currently available online for this service.",
  noDates:
    "No appointments are available in this month. Try another month or contact the clinic.",
  noTimes:
    "There are no available times for this date. Please choose another date.",
  chooseDate: "Select an available date to see the times.",
  available: "Available",
  unavailable: "Unavailable",
  selected: "Selected",
  unknown: "Not yet checked",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  calendar: "Appointment calendar",
  times: "Available times",
  timezone: "Riga time · Europe/Riga",
  refresh: "Refresh availability",
  next: "Continue",
  back: "Back",
  edit: "Edit",
  retry: "Try again",
  confirm: "Confirm appointment",
  submitting: "Processing…",
  call: "Call the clinic",
  questions: "Contact the clinic",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  required: "All contact fields are required.",
  createAccount: "I want to create an account",
  accountHint: "Optional. Booking is also available as a guest.",
  password: "Password",
  repeat: "Confirm password",
  passwordHint: "At least 8 characters.",
  privacy:
    "I have read the Privacy Policy and acknowledge the processing of my contact details to arrange this appointment.",
  privacyLink: "Privacy Policy",
  validation_name: "Enter a name of 1–100 characters.",
  validation_email: "Enter a valid email address.",
  validation_phone: "Enter a phone number containing 7–15 digits.",
  validation_privacy: "Please acknowledge the Privacy Policy to continue.",
  checkFields: "Please check the highlighted fields.",
  accountCreated:
    "Your account is ready. Your appointment still needs to be booked.",
  accountFailed:
    "Account registration could not be completed. No appointment request has been sent.",
  accountIncomplete:
    "Registration did not provide a signed-in session. You can sign in separately or explicitly continue booking as a guest.",
  guest: "Continue as a guest",
  retryAccount: "Review account details",
  signIn: "Sign in to your account",
  accountSeparate:
    "Your account and appointment are created separately. An account alone does not reserve a time.",
  guestResult:
    "Account registration was not completed in this flow. Your booking result is shown above.",
  api_unavailable:
    "Online booking could not be loaded. Please try again or call the clinic.",
  doctors: "We could not load specialists. Please try again.",
  availability: "We could not check all dates. Please refresh availability.",
  booking_not_configured:
    "Online booking is not yet configured. Please call the clinic.",
  slotChanged:
    "That time is no longer available. Please select another time. Your contact details have been kept.",
  privacyChanged:
    "The privacy notice has changed. Please read it and acknowledge it again.",
  serviceChanged:
    "The selected service is no longer available. Please choose again; your contact details have been kept.",
  invalid_request:
    "Please review your details and acknowledge the current Privacy Policy before trying again.",
  uncertain:
    "We could not verify the result. Your appointment may already exist. Retry this same request to retrieve its result; do not start another booking.",
  resumed:
    "An earlier booking request has an unresolved result. Retry it here with the same details to avoid a duplicate appointment.",
  idempotency_conflict:
    "This request is linked to different details or an account. Do not submit another booking. Please contact the clinic to check the result.",
  session_changed:
    "Please sign in again with the account used for this request, then retry here. We will keep the same booking request.",
  rate_limited: "Please wait before retrying the same request.",
  wait: "Retry available in {seconds}s",
  storage:
    "This browser cannot safely retain your booking request. Please enable tab storage or call the clinic. Do not start another request if a result is still unknown.",
  saved_intent_invalid:
    "An earlier request could not be read safely. Please contact the clinic before making another booking.",
  confirmedTitle: "Your appointment is confirmed.",
  confirmedText: "We look forward to welcoming you at the clinic.",
  pendingTitle: "Your request is reserved.",
  pendingText:
    "The clinic still needs to approve this appointment. Your selected time is reserved while it is pending.",
  otherTitle: "Your booking details.",
  otherText:
    "This is the current status returned by the clinic. Contact us if you need help.",
  reference: "Booking reference",
  status: "Status",
  confirmed: "Confirmed",
  pending: "Awaiting approval",
  cancelled: "Cancelled",
  rejected: "Declined",
  completed: "Completed",
  no_show: "Not attended",
  address: "Clinic address",
  updatedService: "Service updated — please contact the clinic",
  updatedDoctor: "Specialist updated — please contact the clinic",
  receiptNote:
    "Keep your booking reference. Contact the clinic if you need to change your visit.",
  demoLabel: "DEMO · DEVELOPMENT ONLY",
  demoText:
    "Service names come from the website; times and availability are simulated. No real appointment or account is created. Use test contact details only.",
  demoResultTitle: "Demo completed.",
  demoResultText:
    "This is a simulated result. No real appointment or Supabase account was created.",
};
const lv: Record<keyof typeof en, string> = {
  eyebrow: "PIERAKSTS TIEŠSAISTĒ",
  title: "Laiks jūsu smaidam.",
  intro: "Izvēlieties pakalpojumu, speciālistu un sev piemērotu laiku.",
  step0: "Pakalpojums",
  step1: "Speciālists",
  step2: "Datums un laiks",
  step3: "Jūsu dati",
  step4: "Pārskats",
  progress: "Pieraksta soļi",
  stepCount: "{current}. solis no {total}",
  serviceTitle: "Kā varam palīdzēt?",
  serviceText: "Izvēlieties tiešsaistes pierakstam pieejamu pakalpojumu.",
  doctorTitle: "Izvēlieties speciālistu.",
  doctorText:
    "Apskatiet pieejamos speciālistus vai izvēlieties savu vēlamo ārstu.",
  timeTitle: "Atrodiet laiku sev.",
  timeText:
    "Visi laiki norādīti pēc Rīgas laika. Laiks tiek rezervēts tikai pēc pieraksta apstiprināšanas.",
  contactTitle: "Iepazīsimies.",
  contactText:
    "Nepieciešama tikai jūsu kontaktinformācija. Pierakstīties var arī bez konta.",
  reviewTitle: "Viss vienuviet.",
  reviewText: "Pirms pieraksta apstiprināšanas pārbaudiet savu informāciju.",
  summary: "Jūsu vizīte",
  noSelection: "Vēl nav izvēlēts",
  service: "Pakalpojums",
  doctor: "Speciālists",
  date: "Datums",
  time: "Laiks",
  duration: "Ilgums",
  price: "Cena",
  minutes: "{count} min",
  anyDoctor: "Jebkurš pieejamais speciālists",
  anyDoctorText: "Skatiet visu atbilstošo speciālistu pieejamos laikus.",
  oneDoctor: "Šis speciālists sniedz jūsu izvēlēto pakalpojumu.",
  loading: "Ielādējam…",
  loadingCalendar: "Pārbaudām pieejamos datumus…",
  checkingTimes: "Atjaunojam pieejamos laikus…",
  emptyTitle: "Pieraksts tiešsaistē vēl tiek sagatavots.",
  emptyText:
    "Lūdzu, zvaniet klīnikai, lai vienotos par vizīti. Tiešsaistes pieraksts būs pieejams, kad būs sagatavoti pakalpojumi un darba grafiki.",
  noDoctors: "Šim pakalpojumam pašlaik nav tiešsaistē pieejamu speciālistu.",
  noDates:
    "Šajā mēnesī nav pieejamu vizīšu. Izvēlieties citu mēnesi vai sazinieties ar klīniku.",
  noTimes: "Šajā datumā nav pieejamu laiku. Lūdzu, izvēlieties citu datumu.",
  chooseDate: "Izvēlieties pieejamu datumu, lai apskatītu laikus.",
  available: "Pieejams",
  unavailable: "Nav pieejams",
  selected: "Izvēlēts",
  unknown: "Vēl nav pārbaudīts",
  previousMonth: "Iepriekšējais mēnesis",
  nextMonth: "Nākamais mēnesis",
  calendar: "Vizītes kalendārs",
  times: "Pieejamie laiki",
  timezone: "Rīgas laiks · Europe/Riga",
  refresh: "Atjaunot pieejamību",
  next: "Turpināt",
  back: "Atpakaļ",
  edit: "Labot",
  retry: "Mēģināt vēlreiz",
  confirm: "Apstiprināt pierakstu",
  submitting: "Apstrādājam…",
  call: "Zvanīt klīnikai",
  questions: "Sazināties ar klīniku",
  first_name: "Vārds",
  last_name: "Uzvārds",
  email: "E-pasts",
  phone: "Tālrunis",
  required: "Visi kontaktinformācijas lauki ir obligāti.",
  createAccount: "Vēlos izveidot kontu",
  accountHint: "Nav obligāti. Pierakstīties var arī bez konta.",
  password: "Parole",
  repeat: "Atkārtota parole",
  passwordHint: "Vismaz 8 rakstzīmes.",
  privacy:
    "Esmu izlasījis privātuma politiku un apliecinu, ka esmu informēts par savu kontaktinformācijas datu apstrādi šīs vizītes organizēšanai.",
  privacyLink: "Privātuma politika",
  validation_name: "Ievadiet vārdu vai uzvārdu, izmantojot 1–100 rakstzīmes.",
  validation_email: "Ievadiet derīgu e-pasta adresi.",
  validation_phone: "Ievadiet tālruņa numuru ar 7–15 cipariem.",
  validation_privacy:
    "Lai turpinātu, lūdzu, aplieciniet iepazīšanos ar privātuma politiku.",
  checkFields: "Lūdzu, pārbaudiet atzīmētos laukus.",
  accountCreated: "Jūsu konts ir izveidots. Vizīte vēl jārezervē.",
  accountFailed:
    "Konta reģistrāciju neizdevās pabeigt. Vizītes pieprasījums nav nosūtīts.",
  accountIncomplete:
    "Pēc reģistrācijas netika izveidota pierakstīta lietotāja sesija. Varat atsevišķi pieteikties kontā vai izvēlēties turpināt pierakstu kā viesis.",
  guest: "Turpināt kā viesim",
  retryAccount: "Pārskatīt konta datus",
  signIn: "Pieteikties kontā",
  accountSeparate:
    "Konta izveide un vizītes pieraksts ir atsevišķas darbības. Konta izveide vēl nerezervē vizītes laiku.",
  guestResult:
    "Konta reģistrācija šajā plūsmā netika pabeigta. Vizītes pieraksta rezultāts ir redzams augstāk.",
  api_unavailable:
    "Neizdevās ielādēt tiešsaistes pierakstu. Mēģiniet vēlreiz vai zvaniet klīnikai.",
  doctors: "Neizdevās ielādēt speciālistus. Lūdzu, mēģiniet vēlreiz.",
  availability:
    "Neizdevās pārbaudīt visus datumus. Lūdzu, atjaunojiet pieejamību.",
  booking_not_configured:
    "Tiešsaistes pieraksts vēl nav sagatavots. Lūdzu, zvaniet klīnikai.",
  slotChanged:
    "Šis laiks vairs nav pieejams. Lūdzu, izvēlieties citu laiku. Jūsu kontaktinformācija ir saglabāta.",
  privacyChanged:
    "Privātuma paziņojums ir mainījies. Lūdzu, izlasiet to un atkārtoti aplieciniet iepazīšanos.",
  serviceChanged:
    "Izvēlētais pakalpojums vairs nav pieejams. Izvēlieties vēlreiz; jūsu kontaktinformācija ir saglabāta.",
  invalid_request:
    "Pārbaudiet datus un aplieciniet iepazīšanos ar aktuālo privātuma politiku, pirms mēģināt vēlreiz.",
  uncertain:
    "Neizdevās pārbaudīt rezultātu. Jūsu vizīte, iespējams, jau ir rezervēta. Atkārtojiet šo pašu pieprasījumu, lai saņemtu rezultātu; neveidojiet citu pierakstu.",
  resumed:
    "Iepriekšējā pieraksta pieprasījuma rezultāts vēl nav zināms. Atkārtojiet to ar tiem pašiem datiem, lai neradītu dubultu pierakstu.",
  idempotency_conflict:
    "Šis pieprasījums ir saistīts ar citiem datiem vai kontu. Neveidojiet jaunu pierakstu. Lūdzu, sazinieties ar klīniku, lai pārbaudītu rezultātu.",
  session_changed:
    "Piesakieties kontā, ar kuru izveidojāt šo pieprasījumu, un mēģiniet vēlreiz šeit. Saglabāsim to pašu pieprasījumu.",
  rate_limited: "Pirms atkārtota pieprasījuma, lūdzu, uzgaidiet.",
  wait: "Varēsiet mēģināt pēc {seconds} s",
  storage:
    "Pārlūks nevar droši saglabāt pieraksta pieprasījumu. Atļaujiet cilnes datu glabāšanu vai zvaniet klīnikai. Ja rezultāts vēl nav zināms, neveidojiet citu pieprasījumu.",
  saved_intent_invalid:
    "Iepriekšējo pieprasījumu neizdevās droši nolasīt. Pirms cita pieraksta, lūdzu, sazinieties ar klīniku.",
  confirmedTitle: "Jūsu pieraksts ir apstiprināts.",
  confirmedText: "Gaidīsim jūs klīnikā.",
  pendingTitle: "Jūsu pieprasījums ir rezervēts.",
  pendingText:
    "Vizīte vēl jāapstiprina klīnikai. Izvēlētais laiks gaidīšanas laikā ir rezervēts.",
  otherTitle: "Jūsu pieraksta informācija.",
  otherText:
    "Šis ir klīnikas atgrieztais pašreizējais statuss. Ja nepieciešama palīdzība, sazinieties ar mums.",
  reference: "Pieraksta numurs",
  status: "Statuss",
  confirmed: "Apstiprināts",
  pending: "Gaida apstiprinājumu",
  cancelled: "Atcelts",
  rejected: "Noraidīts",
  completed: "Pabeigts",
  no_show: "Neapmeklēts",
  address: "Klīnikas adrese",
  updatedService: "Pakalpojums mainīts — sazinieties ar klīniku",
  updatedDoctor: "Speciālists mainīts — sazinieties ar klīniku",
  receiptNote:
    "Saglabājiet pieraksta numuru. Ja vēlaties mainīt vizīti, sazinieties ar klīniku.",
  demoLabel: "DEMO · TIKAI IZSTRĀDEI",
  demoText:
    "Pakalpojumu nosaukumi ir no vietnes; laiki un pieejamība ir simulēti. Netiek izveidota īsta vizīte vai konts. Izmantojiet tikai testa kontaktinformāciju.",
  demoResultTitle: "Demonstrācija pabeigta.",
  demoResultText:
    "Šis ir simulēts rezultāts. Īsta vizīte vai Supabase konts nav izveidots.",
};
const ru: Record<keyof typeof en, string> = {
  eyebrow: "ОНЛАЙН-ЗАПИСЬ",
  title: "Время для вашей улыбки.",
  intro: "Выберите услугу, специалиста и удобное время.",
  step0: "Услуга",
  step1: "Специалист",
  step2: "Дата и время",
  step3: "Ваши данные",
  step4: "Проверка",
  progress: "Этапы записи",
  stepCount: "Шаг {current} из {total}",
  serviceTitle: "Чем мы можем помочь?",
  serviceText: "Выберите услугу, доступную для онлайн-записи.",
  doctorTitle: "Выберите специалиста.",
  doctorText:
    "Посмотрите доступных специалистов или выберите предпочтительного врача.",
  timeTitle: "Найдите время для себя.",
  timeText:
    "Всё время указано по Риге. Время резервируется только после подтверждения записи.",
  contactTitle: "Давайте познакомимся.",
  contactText:
    "Нужны только ваши контактные данные. Можно записаться без аккаунта.",
  reviewTitle: "Всё перед вами.",
  reviewText: "Проверьте данные перед подтверждением записи.",
  summary: "Ваш визит",
  noSelection: "Пока не выбрано",
  service: "Услуга",
  doctor: "Специалист",
  date: "Дата",
  time: "Время",
  duration: "Продолжительность",
  price: "Стоимость",
  minutes: "{count} мин",
  anyDoctor: "Любой доступный специалист",
  anyDoctorText: "Посмотрите свободное время всех подходящих специалистов.",
  oneDoctor: "Этот специалист оказывает выбранную услугу.",
  loading: "Загрузка…",
  loadingCalendar: "Проверяем доступные даты…",
  checkingTimes: "Обновляем доступное время…",
  emptyTitle: "Онлайн-запись готовится к запуску.",
  emptyText:
    "Пожалуйста, позвоните в клинику, чтобы записаться. Онлайн-запись появится после настройки услуг и расписаний.",
  noDoctors:
    "Сейчас для этой услуги нет специалистов, доступных для онлайн-записи.",
  noDates:
    "В этом месяце нет свободных визитов. Выберите другой месяц или свяжитесь с клиникой.",
  noTimes: "На эту дату нет свободного времени. Выберите другую дату.",
  chooseDate: "Выберите доступную дату, чтобы посмотреть время.",
  available: "Доступно",
  unavailable: "Недоступно",
  selected: "Выбрано",
  unknown: "Ещё не проверено",
  previousMonth: "Предыдущий месяц",
  nextMonth: "Следующий месяц",
  calendar: "Календарь записи",
  times: "Доступное время",
  timezone: "Время Риги · Europe/Riga",
  refresh: "Обновить доступность",
  next: "Продолжить",
  back: "Назад",
  edit: "Изменить",
  retry: "Повторить",
  confirm: "Подтвердить запись",
  submitting: "Обработка…",
  call: "Позвонить в клинику",
  questions: "Связаться с клиникой",
  first_name: "Имя",
  last_name: "Фамилия",
  email: "Эл. почта",
  phone: "Телефон",
  required: "Все контактные поля обязательны.",
  createAccount: "Хочу создать аккаунт",
  accountHint: "Необязательно. Можно записаться и без аккаунта.",
  password: "Пароль",
  repeat: "Повторите пароль",
  passwordHint: "Не менее 8 символов.",
  privacy:
    "Я прочитал(а) политику конфиденциальности и ознакомлен(а) с обработкой моих контактных данных для организации этого визита.",
  privacyLink: "Политика конфиденциальности",
  validation_name: "Введите имя или фамилию длиной 1–100 символов.",
  validation_email: "Введите действительный адрес эл. почты.",
  validation_phone: "Введите номер телефона, содержащий 7–15 цифр.",
  validation_privacy:
    "Для продолжения подтвердите ознакомление с политикой конфиденциальности.",
  checkFields: "Проверьте отмеченные поля.",
  accountCreated: "Ваш аккаунт создан. Визит ещё нужно забронировать.",
  accountFailed:
    "Не удалось завершить регистрацию аккаунта. Запрос на запись не отправлен.",
  accountIncomplete:
    "После регистрации сеанс входа не был создан. Вы можете отдельно войти в аккаунт или явно выбрать запись в качестве гостя.",
  guest: "Продолжить как гость",
  retryAccount: "Проверить данные аккаунта",
  signIn: "Войти в аккаунт",
  accountSeparate:
    "Аккаунт и запись создаются отдельно. Само создание аккаунта не резервирует время.",
  guestResult:
    "Регистрация аккаунта в этой форме не была завершена. Результат записи показан выше.",
  api_unavailable:
    "Не удалось загрузить онлайн-запись. Повторите попытку или позвоните в клинику.",
  doctors: "Не удалось загрузить специалистов. Повторите попытку.",
  availability: "Не удалось проверить все даты. Обновите доступность.",
  booking_not_configured:
    "Онлайн-запись ещё не настроена. Пожалуйста, позвоните в клинику.",
  slotChanged:
    "Это время больше недоступно. Выберите другое время. Контактные данные сохранены.",
  privacyChanged:
    "Уведомление о конфиденциальности изменилось. Прочитайте его и подтвердите ознакомление ещё раз.",
  serviceChanged:
    "Выбранная услуга больше недоступна. Выберите заново; контактные данные сохранены.",
  invalid_request:
    "Проверьте данные и подтвердите ознакомление с актуальной политикой конфиденциальности перед повторной попыткой.",
  uncertain:
    "Не удалось проверить результат. Возможно, визит уже забронирован. Повторите тот же запрос, чтобы получить результат; не создавайте новую запись.",
  resumed:
    "Результат предыдущего запроса пока неизвестен. Повторите его здесь с теми же данными, чтобы избежать повторной записи.",
  idempotency_conflict:
    "Этот запрос связан с другими данными или аккаунтом. Не создавайте новую запись. Свяжитесь с клиникой для проверки результата.",
  session_changed:
    "Войдите снова в аккаунт, с которым создали этот запрос, и повторите его здесь. Мы сохраним тот же запрос.",
  rate_limited: "Подождите перед повторной отправкой того же запроса.",
  wait: "Повторная попытка через {seconds} с",
  storage:
    "Браузер не может надёжно сохранить запрос. Разрешите хранение данных вкладки или позвоните в клинику. Если результат ещё неизвестен, не создавайте новый запрос.",
  saved_intent_invalid:
    "Не удалось безопасно прочитать предыдущий запрос. Свяжитесь с клиникой перед созданием новой записи.",
  confirmedTitle: "Ваша запись подтверждена.",
  confirmedText: "Будем рады видеть вас в клинике.",
  pendingTitle: "Ваш запрос зарезервирован.",
  pendingText:
    "Клинике ещё нужно одобрить визит. На время ожидания выбранное время зарезервировано.",
  otherTitle: "Информация о вашей записи.",
  otherText:
    "Это текущий статус, полученный от клиники. Если нужна помощь, свяжитесь с нами.",
  reference: "Номер записи",
  status: "Статус",
  confirmed: "Подтверждено",
  pending: "Ожидает одобрения",
  cancelled: "Отменено",
  rejected: "Отклонено",
  completed: "Завершено",
  no_show: "Неявка",
  address: "Адрес клиники",
  updatedService: "Услуга изменена — свяжитесь с клиникой",
  updatedDoctor: "Специалист изменён — свяжитесь с клиникой",
  receiptNote:
    "Сохраните номер записи. Если нужно изменить визит, свяжитесь с клиникой.",
  demoLabel: "ДЕМО · ТОЛЬКО ДЛЯ РАЗРАБОТКИ",
  demoText:
    "Названия услуг взяты с сайта; время и доступность смоделированы. Настоящий визит или аккаунт не создаётся. Используйте только тестовые контактные данные.",
  demoResultTitle: "Демонстрация завершена.",
  demoResultText:
    "Это смоделированный результат. Настоящий визит или аккаунт Supabase не создан.",
};
export const bookingMessages = { lv, ru, en };
