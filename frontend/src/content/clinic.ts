export type Language = "lv" | "ru" | "en";
export type Localized = Record<Language, string>;
export const l = (lv: string, ru: string, en: string): Localized => ({
  lv,
  ru,
  en,
});
export const clinic = {
  phone: "+371 28229925",
  tel: "tel:+37128229925",
  email: "ag@inbox.lv",
  address: "Ūnijas iela 25, Rīga, LV-1039",
  map: "https://www.google.com/maps/search/?api=1&query=AG+Zob%C4%81rstniec%C4%ABba+%C5%AAnijas+iela+25+R%C4%ABga",
  instagram: "https://www.instagram.com/zobarstniecibaag/",
  facebook:
    "https://www.facebook.com/p/AG-zob%C4%81rstniec%C4%ABba-100028253269391/",
};
export const media = {
  video: "/media/clinic/clinic-tour.mp4",
  poster: "/media/clinic/tour-poster.jpg",
  room: "/media/clinic/tour-room.jpg",
  detail: "/media/clinic/tour-detail.jpg",
  doctor: "/media/clinic/anda-gutovska.jpg",
  original: "/media/clinic/clinic-original.jpg",
  location: "/media/clinic/location.jpg",
};
export const philosophy = l(
  "Mūsu klīnikas mērķis ir nodrošināt kvalitatīvu un mūsdienīgu zobārstniecību ikvienam pacientam, individuāli piemeklējot piemērotāko ārstēšanas risinājumu.",
  "Наша цель — качественная современная стоматология для каждого пациента с индивидуальным выбором подходящего лечения.",
  "Our aim is to provide quality, modern dentistry for every patient, finding the most suitable treatment for each individual.",
);
export const about = l(
  "Vispirms radām mierīgu un mājīgu atmosfēru, kur pacients var justies droši. Tad izrunājam problēmu un kopā meklējam labāko risinājumu. Mūsu darba filozofija balstās uz ilgtspējību — cenšamies saglabāt dabīgos zobus pēc iespējas ilgāk, individuāli pielāgojot ārstēšanu katrai situācijai.",
  "Сначала мы создаём спокойную, уютную атмосферу, в которой пациент чувствует себя уверенно. Затем обсуждаем проблему и вместе ищем решение. Мы стремимся как можно дольше сохранять естественные зубы, подбирая лечение индивидуально.",
  "We begin by creating a calm, welcoming atmosphere where patients can feel at ease. Then we discuss the problem and find a solution together. We aim to preserve natural teeth for as long as possible, adapting treatment to each situation.",
);
export const doctorBio = l(
  "Klīnikas vadītāja un zobārste Dr. Anda Gutovska ar vairāk nekā 15 gadu pieredzi ir palīdzējusi daudziem pacientiem pārvarēt bailes no zobārsta apmeklējuma. Viņai ir plaša pieredze darbā ar pacientiem, kuri izjūt trauksmi — soli pa solim, ar iejūtību un skaidru sarunu.",
  "Руководитель клиники и стоматолог д-р Анда Гутовска имеет более 15 лет опыта. Она помогла многим пациентам справиться со страхом посещения стоматолога и имеет большой опыт работы с тревожными пациентами.",
  "Clinic manager and dentist Dr. Anda Gutovska has more than 15 years of experience. She has helped many patients overcome their fear of dental visits and has extensive experience caring for patients who feel anxious.",
);
export const services = [
  {
    slug: "konsultacija",
    title: l(
      "Konsultācija un diagnostika",
      "Консультация и диагностика",
      "Consultation & diagnosis",
    ),
    short: l(
      "Pirmais solis — saruna.",
      "Первый шаг — разговор.",
      "It begins with a conversation.",
    ),
    text: l(
      "Konsultācijas laikā tiek veikta diagnostika, izskaidrota diagnoze un sastādīts ārstēšanas plāns. Kopā izrunājam jūsu situāciju un iespējamos ārstēšanas risinājumus.",
      "Во время консультации проводится диагностика, объясняется диагноз и составляется план лечения. Вместе обсуждаем вашу ситуацию и возможные решения.",
      "During your consultation, we carry out diagnostics, explain the diagnosis and prepare a treatment plan. We discuss your situation and the available treatment options together.",
    ),
    price: "50",
    category: 0,
    image: "doctor",
  },
  {
    slug: "zobu-arstesana",
    title: l("Zobu ārstēšana", "Лечение зубов", "Restorative dentistry"),
    short: l(
      "Saglabāt to, kas ir dabisks.",
      "Сохранить естественное.",
      "Preserving what is natural.",
    ),
    text: l(
      "Trūkstošos zoba audus aizvietojam ar plombējamo materiālu. Piedāvājam plombēšanu ar kompozītmateriālu, zoba kroņa atjaunošanu un estētisku zoba pārklāšanu. Ārstēšanu pielāgojam katrai situācijai.",
      "Восстанавливаем утраченные ткани зуба пломбировочным материалом. Предлагаем композитные пломбы, восстановление коронки зуба и эстетическое покрытие. Лечение подбирается индивидуально.",
      "We replace missing tooth tissue with filling material. Treatments include composite fillings, rebuilding a tooth crown and aesthetic composite covering, tailored to each situation.",
    ),
    price: "108",
    category: 2,
    image: "room",
  },
  {
    slug: "saknu-kanalu-arstesana",
    title: l(
      "Sakņu kanālu ārstēšana",
      "Лечение корневых каналов",
      "Root canal treatment",
    ),
    short: l(
      "Rūpes par zoba saglabāšanu.",
      "Забота о сохранении зуба.",
      "Care that supports tooth preservation.",
    ),
    text: l(
      "Klīnikā veicam viena, divu un trīs kanālu zobu sakņu ārstēšanu. Cenrādī norādīta ārstēšana 1. un 2. seansā, iekļaujot anestēziju, tīrīšanu un pildīšanu. Vizītē precizējam nepieciešamo ārstēšanas apjomu.",
      "В клинике лечат зубы с одним, двумя и тремя корневыми каналами. В прейскуранте указаны первый и второй сеансы с анестезией, очисткой и пломбированием. Объём лечения уточняется на приёме.",
      "We treat teeth with one, two or three root canals. The source price list describes the first and second sessions, including anaesthesia, cleaning and filling. The treatment scope is clarified at your visit.",
    ),
    price: "143",
    category: 2,
    image: "detail",
  },
  {
    slug: "zobu-higiena",
    title: l("Zobu higiēna", "Гигиена полости рта", "Dental hygiene"),
    short: l(
      "Tīra sajūta. Vesels smaids.",
      "Чистота. Здоровая улыбка.",
      "A fresh feeling. A healthy smile.",
    ),
    text: l(
      "Pilna mutes dobuma higiēna ar sodas strūklu pieejama par 80 €. Piedāvājam arī higiēnu bērniem un pacientiem ar ortodontisko aparatūru, kā arī instruktāžu pareizai ikdienas mutes dobuma kopšanai.",
      "Полная гигиена полости рта с содоструйной обработкой стоит 80 €. Также предлагаем гигиену детям и пациентам с ортодонтическими аппаратами и инструктаж по ежедневному уходу.",
      "Full dental hygiene including air polishing is available for €80. We also offer hygiene for children and patients with orthodontic appliances, and guidance on daily oral care.",
    ),
    price: "80",
    category: 1,
    image: "original",
  },
  {
    slug: "zobu-balinasana",
    title: l("Zobu balināšana", "Отбеливание зубов", "Teeth whitening"),
    short: l(
      "Jūsu smaida gaišākā puse.",
      "Светлая сторона вашей улыбки.",
      "The brighter side of your smile.",
    ),
    text: l(
      "Piedāvājam zobu balināšanu kabinetā ar Philips ZOOM. Cenrādī pieejama arī balināšanas kapes izgatavošana. Par piemērotāko risinājumu konsultējieties ar zobārstu.",
      "Предлагаем кабинетное отбеливание Philips ZOOM. В прейскуранте также есть изготовление капы для отбеливания. Подходящий вариант обсудите со стоматологом.",
      "We offer in-clinic Philips ZOOM whitening. Whitening trays are also listed in our price list. Discuss the most suitable option with your dentist.",
    ),
    price: "400",
    category: 1,
    image: "detail",
  },
  {
    slug: "zobu-kirurgija",
    title: l("Zobu ķirurģija", "Хирургическая стоматология", "Dental surgery"),
    short: l(
      "Saudzīga, individuāla pieeja.",
      "Бережный индивидуальный подход.",
      "A gentle, individual approach.",
    ),
    text: l(
      "Piedāvājam zobu ekstrakciju, tostarp viensakņu, daudzsakņu un astotā zoba ekstrakciju. Cenrādī ekstrakcijai norādīta iekļauta anestēzija un medikamentoza apstrāde. Nepieciešamo procedūru nosaka konsultācijā.",
      "Предлагаем удаление однокорневых, многокорневых зубов и зубов мудрости. В прейскуранте указано, что анестезия и медикаментозная обработка включены. Необходимая процедура определяется на консультации.",
      "We offer tooth extraction, including single-rooted, multi-rooted and wisdom teeth. The price list includes anaesthesia and medication treatment for extractions. The required procedure is determined at consultation.",
    ),
    price: null,
    category: 3,
    image: "room",
  },
  {
    slug: "zobu-protezesana",
    title: l("Zobu protezēšana", "Протезирование зубов", "Prosthodontics"),
    short: l(
      "Atjaunot smaidu. Atgūt komfortu.",
      "Восстановить улыбку и комфорт.",
      "Restore your smile and comfort.",
    ),
    text: l(
      "Sadarbojoties ar laboratoriju, tiek izgatavoti venīri, kroņi, onlejas, inlejas un zobu protēzes. Katram pacientam piemeklējam piemērotāko risinājumu. Cenrādī pieejami gan izņemamu protēžu, gan kroņu un kapju varianti.",
      "В сотрудничестве с лабораторией изготавливаем виниры, коронки, накладки, вкладки и зубные протезы. Подбираем решение для каждого пациента. В прейскуранте представлены съёмные протезы, коронки и капы.",
      "Working with a laboratory, we provide veneers, crowns, onlays, inlays and dentures. We find an appropriate solution for each patient. Our price list includes removable dentures, crowns and trays.",
    ),
    price: null,
    category: 5,
    image: "original",
  },
  {
    slug: "bernu-zobarstnieciba",
    title: l(
      "Bērnu zobārstniecība",
      "Детская стоматология",
      "Children’s dentistry",
    ),
    short: l(
      "Mazie smaidi. Liela uzmanība.",
      "Маленьким улыбкам — большое внимание.",
      "Little smiles. Thoughtful care.",
    ),
    text: l(
      "Konsultācijas, zobu ārstēšana un ķirurģija bērniem. Katram bērnam ir individuāla pieeja, un pēc apmeklējuma mazais pacients saņem pārsteiguma balvu par drosmi un izturību. Piedāvājam arī piena un pastāvīgo zobu higiēnu.",
      "Консультации, лечение и хирургия для детей. Каждому ребёнку — индивидуальный подход, а после посещения — небольшой сюрприз за смелость. Также предлагаем гигиену молочных и постоянных зубов.",
      "Consultations, treatment and dental surgery for children. Each child receives individual care and a surprise reward for their bravery after the visit. Hygiene is available for both baby and permanent teeth.",
    ),
    price: "35",
    category: 4,
    image: "doctor",
  },
];
