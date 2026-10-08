import type { Language } from "./clinic";
import type { articles } from "./articles";

type Article = (typeof articles)[number];
type ArticleText = Pick<
  Article,
  "title" | "category" | "excerpt" | "paragraphs"
>;

// Latvian remains in articles.ts alongside the shared URLs, dates and media.
// These complete translations contain text only; no duplicate route/media data.
export const articleTranslations: Record<
  string,
  Record<Exclude<Language, "lv">, ArticleText>
> = {
  "zobu-higiena-kas-pieejama-ikvienam": {
    ru: {
      title: "Профессиональная гигиена зубов, доступная каждому",
      category: "Здоровье зубов",
      excerpt:
        "Полная профессиональная гигиена полости рта за 80 € — обработка содовой струёй уже включена в стоимость.",
      paragraphs: [
        "В нашей клинике полная гигиена полости рта теперь доступна по постоянной цене — 80 €, включая обработку содовой струёй.",
        "Профессиональная гигиена зубов — один из важнейших шагов на пути к здоровой и красивой улыбке. Она помогает уменьшить количество зубного налёта и камня, предотвратить воспаление и кровоточивость дёсен, снизить риск кариеса, поддерживать зубы более светлыми и чистыми и уменьшить потребность в более сложном лечении в будущем.",
        "Регулярный уход за полостью рта влияет не только на здоровье зубов, но и на общее состояние организма, поскольку длительные воспалительные процессы в полости рта могут влиять и на другие процессы в организме.",
        "Здоровая полость рта — основа здоровой и уверенной улыбки.",
      ],
    },
    en: {
      title: "Professional dental hygiene for everyone",
      category: "Dental health",
      excerpt:
        "Complete professional oral hygiene for €80 — bicarbonate air polishing is already included in the price.",
      paragraphs: [
        "Our clinic now offers complete oral hygiene at a regular price of €80, including bicarbonate air polishing.",
        "Professional dental hygiene is one of the most important steps towards a healthy, beautiful smile. It helps reduce plaque and tartar, prevent gum inflammation and bleeding, lower the risk of tooth decay, keep teeth brighter and cleaner, and reduce the need for more complex treatment in the future.",
        "Regular oral care affects not only dental health but also overall health, as persistent inflammation in the mouth can affect other processes in the body.",
        "A healthy mouth is the foundation of a healthy, confident smile.",
      ],
    },
  },
  "zobu-protezes-un-protezesana": {
    ru: {
      title: "Зубные протезы и протезирование",
      category: "Лечение",
      excerpt:
        "Индивидуальные решения для восстановления улыбки, жевательной функции и повседневного комфорта.",
      paragraphs: [
        "При словах «зубные протезы» у многих до сих пор возникают старые стереотипы — «зубы в стакане». Однако современное протезирование зубов полностью изменилось.",
        "Сегодня протезирование — эстетичное, комфортное и современное направление стоматологии, предназначенное не только для пожилых людей, но и для более молодых пациентов в разных жизненных ситуациях.",
        "Протезирование зубов помогает заместить отсутствующие зубы, восстановить жевательную функцию и речь, улучшить эстетику улыбки, поддержать черты лица и предотвратить их изменения со временем, а также защитить остальные зубы от смещения и перегрузки.",
        "Если финансовые возможности пока не позволяют установить имплантат, протез на один зуб тоже может стать отличным временным или долгосрочным решением. Он помогает сохранить место для будущего имплантата и предотвратить изменения прикуса.",
        "В нашей клинике для каждого пациента подбираем индивидуальное и наиболее подходящее решение. Пенсионерам предоставляем скидку 10% на протезирование зубов.",
      ],
    },
    en: {
      title: "Dental prostheses and prosthodontics",
      category: "Treatment",
      excerpt:
        "Individual solutions to restore your smile, chewing function and everyday comfort.",
      paragraphs: [
        "For many people, the words “dental prostheses” still bring to mind old stereotypes — “teeth in a glass”. Yet modern prosthodontics has changed completely.",
        "Today, prosthodontics is an aesthetic, comfortable and modern field of dentistry, intended not only for older people but also for younger patients in a variety of life situations.",
        "Dental prostheses help replace missing teeth, restore chewing function and speech, improve the appearance of the smile, support facial features and prevent them from changing over time, and protect the remaining teeth from shifting and excessive strain.",
        "If your finances do not currently allow for an implant, a single-tooth prosthesis can also be an excellent temporary or long-term solution. It helps preserve space for a future implant and prevent changes to the bite.",
        "At our clinic, we choose an individually tailored solution best suited to each patient. Pensioners receive a 10% discount on dental prosthetics.",
      ],
    },
  },
  "zobu-higiena": {
    ru: {
      title: "Гигиена зубов",
      category: "Здоровье зубов",
      excerpt:
        "Почему профессиональная гигиена полости рта — важная часть повседневной заботы о себе?",
      paragraphs: [
        "Когда вы в последний раз устраивали SPA-процедуру для своих зубов? Зубы тоже заслуживают более тщательной чистки, которую может провести профессиональный гигиенист.",
        "Вы заметили, что десна припухла и кровоточит при чистке зубов щёткой или нитью? Зубы уже не кажутся такими гладкими на ощупь? Последний визит к гигиенисту был более шести месяцев назад?",
        "Регулярная гигиена зубов — это не просто более тщательная чистка, а ценный вклад в своё здоровье. Она снижает риск кариеса и распространение заболеваний дёсен.",
        "Во время процедуры с зубов удаляют отложения, которые со временем образуются из-за повседневной пищи, напитков и других факторов. Удаляют и зубной камень — твёрдый налёт на зубах. Даже если чистить зубы дважды в день по две минуты, удалить зубной камень можно только профессиональными инструментами.",
        "Обретите более свежее дыхание, ощущение гладкости зубов и уверенность в своей улыбке. В AG Zobārstniecība о гигиене вашей полости рта позаботится профессиональный специалист. После процедуры вы получите рекомендации, которые помогут дольше сохранять улыбку здоровой и чистой.",
        "Запишитесь к нам в AG Zobārstniecība в Риге, в Тейке — рядом с кварталом VEF. +371 28229925.",
      ],
    },
    en: {
      title: "Dental hygiene",
      category: "Dental health",
      excerpt:
        "Why is professional oral hygiene an important part of everyday care?",
      paragraphs: [
        "When did you last treat your teeth to a spa session? Teeth also deserve a more thorough cleaning, which a professional dental hygienist can provide.",
        "Have you noticed that your gums are swollen and bleed when you brush or floss? Do your teeth no longer feel as smooth? Was your last visit to the dental hygienist more than six months ago?",
        "Regular dental hygiene is more than a thorough cleaning — it is a valuable investment in your health. It reduces the risk of tooth decay and the spread of gum disease.",
        "During the procedure, deposits that have built up on the teeth over time from everyday food, drinks and other factors are removed. Tartar — hardened plaque on the teeth — is also removed. Even if you brush twice a day for two minutes, tartar can only be removed with professional instruments.",
        "Enjoy fresher breath, smoother-feeling teeth and confidence in your smile. At AG Zobārstniecība, a qualified professional will take care of your oral hygiene. After the procedure, you will receive recommendations to help keep your smile healthy and clean for longer.",
        "Book an appointment with us at AG Zobārstniecība in Teika, Riga — next to the VEF quarter. +371 28229925.",
      ],
    },
  },
  aktualitates: {
    ru: {
      title: "Новости",
      category: "Новости клиники",
      excerpt:
        "Новости клиники, актуальная информация и предложения в одном месте.",
      paragraphs: [
        "Здесь будет размещаться информация о нашей компании, а также различные новости и предложения.",
      ],
    },
    en: {
      title: "News and updates",
      category: "Clinic news",
      excerpt: "Clinic news, updates and offers in one place.",
      paragraphs: [
        "Information about our company, along with news and offers, will be published here.",
      ],
    },
  },
};

export function localizeArticle(article: Article, locale: string): Article {
  if (locale === "lv") return article;
  if (locale !== "ru" && locale !== "en")
    throw new Error(`Unsupported article locale: ${locale}`);
  const text = articleTranslations[article.slug]?.[locale];
  // A newly published article must supply both translations; never disguise
  // missing content by rendering Latvian inside a Russian or English document.
  if (!text)
    throw new Error(`Missing ${locale} article translation: ${article.slug}`);
  return { ...article, ...text };
}
