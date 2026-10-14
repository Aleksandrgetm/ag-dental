// Editorial draft for the implemented website, not a legal compliance certification.
export const legalReview = {
  status: "CLIENT_CONFIRMATION_REQUIRED",
  controller:
    "Confirmed: SIA \"Andas Gutovskas privātprakse\", 40103915017; registered Rīga, Ūnijas iela 21, LV-1039; clinic Ūnijas iela 25, Rīga.",
  privacyContact:
    "Confirm whether the published general contact ag@inbox.lv handles rights requests.",
  lawfulBasis:
    "Confirm purpose-specific bases for accounts, appointments, security and correspondence, including special-category conditions; acknowledgement is not blanket consent.",
  recipients:
    "Confirm hosting, infrastructure logs, providers, processor agreements and international transfers.",
  retention:
    "Confirm account, appointment, event history, correspondence, acknowledgement, backup and infrastructure log retention with the clinic.",
  rights:
    "Confirm the rights request procedure and whether a DPO is required/appointed; do not invent one.",
  activation:
    "Clinic/legal approval required for accounts, booking, providers, retention and rights procedures before publication or booking activation.",
} as const;
export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
}
export interface LegalDocument {
  title: string;
  intro: string;
  notice?: string;
  sections: LegalSection[];
}
export const POLICY_UPDATED = "2026-10-13";
export const privacyPolicy: LegalDocument = {
  "title": "Privātuma politika",
  "intro": "Šeit aprakstīts, kā šobrīd darbojas AG Zobārstniecības vietne un kā rīkoties ar jautājumiem par jūsu personas datiem.",
  "notice": "Pārskatīts projekts: pārziņa rekvizīti ir apstiprināti; tiesiskie pamati, glabāšana, pakalpojumu sniedzēji un privātuma pieprasījumu kārtība vēl jāapstiprina klīnikai un juristam. Publiska tiešsaistes rezervēšana nav aktivizēta.",
  "sections": [
    {
      "id": "vispariga-informacija",
      "title": "1. Vispārīga informācija",
      "paragraphs": [
        "Politika aptver vietnes kontus, sagatavoto rezervēšanas funkciju, vispārīgus jautājumus un pārlūka krātuvi. Tā neaizstāj informāciju par medicīniskās dokumentācijas apstrādi ārstniecībā.",
        "Reģistrācija un pieteikšanās ir ieviesta. Publiska rezervēšana vēl nav aktivizēta. Jautājumu forma tikai pārbauda ievadi pārlūkā un pašlaik nenosūta ziņas."
      ]
    },
    {
      "id": "parzinis",
      "title": "2. Personas datu pārzinis",
      "paragraphs": [
        "Pārzinis: SIA \"Andas Gutovskas privātprakse\", reģistrācijas numurs 40103915017. Juridiskā adrese: Rīga, Ūnijas iela 21, LV-1039.",
        "Klīnikas apmeklējuma vieta: Ūnijas iela 25, Rīga. Tā atšķiras no juridiskās adreses. Vispārīgā saziņa: +371 28229925, ag@inbox.lv."
      ]
    },
    {
      "id": "dati",
      "title": "3. Kādi personas dati tiek apstrādāti",
      "paragraphs": [
        "Kontam izmanto e-pastu un paroli; Supabase Auth apstrādā autentifikāciju, lietotāja identifikatoru un sesiju. Reģistrācija nodod apliecinājumu par privātuma politikas izlasīšanu un tās ceļu. Lietotnes kods paroli nepersistē.",
        "Jautājumu formā obligāts ir vārds, e-pasts, jautājums (līdz 1000 rakstzīmēm) un privātuma apliecinājums; tālrunis nav obligāts. Ievade paliek lapas atmiņā, netiek nosūtīta vai atjaunota no vietnes krātuves. Pārlūka automātiskā aizpilde ir atkarīga no tā iestatījumiem.",
        "Sazinoties pa e-pastu vai tālruni, jūs nododat paša izvēlēto informāciju. Rezervēšanas datu lauki aprakstīti 6. sadaļā."
      ]
    },
    {
      "id": "merki",
      "title": "4. Kāpēc dati tiek apstrādāti",
      "paragraphs": [
        "Kontu dati nodrošina pieteikšanos un piekļuves kontroli. Rezervēšanas dati paredzēti vizītes organizēšanai, administratora lēmumam, izmaiņām un dubultas rezervēšanas novēršanai.",
        "Sistēma saglabā vizītes statusu, izmaiņu laiku un zināmo darbības veicēju. Tā nav mārketinga piekrišana. Valodas un citas pārlūka izvēles aprakstītas Sīkdatņu politikā."
      ]
    },
    {
      "id": "tiesiskais-pamats",
      "title": "5. Datu apstrādes tiesiskais pamats",
      "paragraphs": [
        "Privātuma apliecinājums nav automātiski tiesiskais pamats visai apstrādei. Klīnikai ar juristu jāapstiprina pamats katram mērķim, tostarp kontiem, vizītēm, drošībai un saziņai.",
        "Izvērtējami pasākumi pēc personas pieprasījuma pirms līguma noslēgšanas, piemērojamie pienākumi un, kur atbilstoši, piekrišana. Izvēlēts pakalpojums var atklāt veselības informāciju; jāizvērtē arī īpašu kategoriju datu apstrādes nosacījumi. Apstiprināts pamats šeit netiek pieņemts.",
        "Ja apstrāde balstās uz piekrišanu, to var atsaukt, neietekmējot iepriekšējās apstrādes likumību. Papildu krātuves izvēles var mainīt sīkdatņu iestatījumos."
      ]
    },
    {
      "id": "pieteikums",
      "title": "6. Vizītes pieteikuma dati",
      "paragraphs": [
        "Sagatavotajā rezervēšanā obligāti ir vārds, uzvārds, tālrunis, e-pasts, pakalpojums, pieejams speciālists un laiks, kā arī privātuma apliecinājums. Konts nav obligāts. Serveris glabā arī vizītes beigas, atsauci, statusu, politikas versiju, apliecinājuma laiku un, ja piemērojams, konta identifikatoru.",
        "Netiek prasīts personas kods, diagnoze vai slimību vēsture. Nesūtiet detalizētus veselības datus jautājumu formā. Plānota administratora manuāla apstiprināšana: gaidošs pieteikums rezervē laiku, bet nav apstiprināta vizīte; tas netiek klusām automātiski dzēsts.",
        "Publiska rezervēšana vēl jāaktivizē atsevišķi. Automātiski vizīšu e-pasti, atgādinājumi un WhatsApp ziņas nav ieviestas. Supabase konta atjaunošanas vai apstiprināšanas e-pasti ir atsevišķa autentifikācijas funkcija, nevis vizītes apstiprinājums."
      ]
    },
    {
      "id": "sikdatnes",
      "title": "7. Sīkdatnes un pārlūka krātuve",
      "paragraphs": [
        "Vietne izmanto localStorage, lai atcerētos sīkdatņu izvēli. Ar jūsu atļauju tajā saglabā arī izvēlēto valodu. Analītikas un mārketinga rīki šobrīd nav ieviesti.",
        "Izvēli iespējams mainīt vietnes kājenē sadaļā “Sīkdatņu iestatījumi”. Plašāka informācija, tostarp saglabāto ierakstu nosaukumi, pieejama Sīkdatņu politikā."
      ]
    },
    {
      "id": "sanemeji",
      "title": "8. Datu saņēmēji un pakalpojumu sniedzēji",
      "paragraphs": [
        "Supabase tiek izmantots autentifikācijai, PostgreSQL datubāzei un privātai attēlu krātuvei. Pilnvaroti administratori izmanto Go API; publiskās atbildes neatklāj pacientu kontaktus.",
        "Lapas ielādei pārlūks sazinās ar vietnes infrastruktūru, un vietne pārbauda API pieejamību. Hostinga, tehnisko žurnālu, e-pasta un citu pakalpojumu sniedzēju informācija, kā arī iespējamā datu nodošana ārpus Eiropas Ekonomikas zonas jāapstiprina klīnikai.",
        "Kontaktu lapā Google Maps karte tiek ielādēta tikai pēc atsevišķas piekrišanas kategorijai “Google Maps”. Google saņem tehniskus datus, tostarp IP adresi, un var izmantot sīkdatnes atbilstoši savai privātuma politikai. Sociālo tīklu saites un saite “Atvērt Google Maps” ved uz ārējām vietnēm."
      ]
    },
    {
      "id": "glabasana",
      "title": "9. Datu glabāšanas termiņi",
      "paragraphs": [
        "Jautājumu formas ievade netiek pastāvīgi glabāta lietotnē. Kontu un vizīšu servera ierakstiem nav šeit apstiprinātu dzēšanas termiņu.",
        "Rezervēšanas nosūtītais pieprasījums, tostarp kontaktinformācija, uz laiku tiek glabāts sessionStorage drošai atkārtošanai pēc neskaidras atbildes. Pēc sekmīgas atbildes to aizstāj kvīts; neskaidram rezultātam nav automātiska termiņa. Pārlūka sesijas atjaunošana var saglabāt šos datus.",
        "Klīnikai jāapstiprina kontu, vizīšu, vēstures, piekrišanas pierādījumu, saziņas, rezerves kopiju un žurnālu termiņi vai kritēriji. Pārlūka krātuves apraksts pieejams Sīkdatņu politikā."
      ]
    },
    {
      "id": "drosiba",
      "title": "10. Datu drošība",
      "paragraphs": [
        "Administratora piekļuve tiek pārbaudīta serverī ar autentifikācijas marķieri un lomu. Rezervēšanas API pārbauda laukus un ierobežo pieprasījumu biežumu; datubāze novērš laiku pārklāšanos.",
        "Sesijas marķieri pārlūkā ļauj palikt kontā. Koplietotā ierīcē izrakstieties un pēc vajadzības notīriet vietnes datus. Infrastruktūras konfigurācija, piekļuves pārskatīšana un glabāšanas prakse vēl juridiski jāizvērtē; absolūta drošība netiek garantēta."
      ]
    },
    {
      "id": "tiesibas",
      "title": "11. Jūsu tiesības",
      "paragraphs": [
        "Atbilstoši piemērojamajiem nosacījumiem jums ir tiesības pieprasīt piekļuvi saviem datiem, to labošanu, dzēšanu vai apstrādes ierobežošanu. Noteiktos gadījumos ir tiesības uz datu pārnesamību un iebilst pret apstrādi. Šīs tiesības nav absolūtas un ir atkarīgas no apstrādes pamata un tiesību aktu prasībām.",
        "Ja apstrāde balstās uz piekrišanu, varat to atsaukt. Par savu tiesību īstenošanu sazinieties ar klīniku; identitātes pārbaudei var būt vajadzīga samērīga papildu informācija.",
        "Jums ir tiesības iesniegt sūdzību Latvijas uzraudzības iestādei — Datu valsts inspekcijai (www.dvi.gov.lv)."
      ]
    },
    {
      "id": "sazina",
      "title": "12. Saziņa par personas datiem",
      "paragraphs": [
        "Par jautājumiem, kas saistīti ar šo vietni, varat sazināties ar klīniku, izmantojot publicēto tālruni +371 28229925 vai e-pastu ag@inbox.lv. Lūdzu, sākotnējā vēstulē nenosūtiet personas dokumentu kopijas vai detalizētus veselības datus.",
        "Specializēts privātuma kontaktpunkts vai datu aizsardzības speciālists pašlaik vietnes saturā nav apstiprināts. Klīnikai jāprecizē tiesību pieprasījumu saņemšanas kārtība un atbildīgā kontaktpersona."
      ]
    },
    {
      "id": "izmainas",
      "title": "13. Politikas izmaiņas",
      "paragraphs": [
        "Politika tiks pārskatīta, mainoties vietnes funkcijām vai datu apstrādei. Pirms pieteikumu nosūtīšanas aktivizēšanas jāpapildina šeit norādītā precizējamā informācija. Lapas sākumā norādīts šī teksta atjaunināšanas datums."
      ]
    }
  ]
};
export const cookiePolicy: LegalDocument = {
  "title": "Sīkdatņu politika",
  "intro": "Jūs varat izvēlēties, ko šī vietne atceras jūsu pārlūkā. Analītikas un mārketinga rīki šobrīd nav aktīvi.",
  "sections": [
    {
      "id": "kas-ir-sikdatnes",
      "title": "1. Kas ir sīkdatnes un localStorage",
      "paragraphs": [
        "Sīkdatnes ir nelieli dati, ko vietnes var saglabāt pārlūkā. Līdzīgām vajadzībām izmanto arī localStorage — vietnes lokālo krātuvi pārlūkā. Atšķirībā no sīkdatnēm tās saturs netiek automātiski pievienots katram servera pieprasījumam.",
        "Šajā vietnes frontend versijā sīkdatņu izvēle un atļautā valodas preference tiek glabāta localStorage. Izvietošanas infrastruktūras iespējamās papildu sīkdatnes vai tehniskie žurnāli pirms publicēšanas jāpārbauda ar klīniku un hostinga pakalpojuma sniedzēju."
      ]
    },
    {
      "id": "nepieciesamas",
      "title": "2. Nepieciešamā krātuve",
      "paragraphs": [
        "Ieraksts ag-cookie-consent saglabā tikai izvēles versiju, nepieciešamās krātuves statusu, preferenču, Google Maps, analītikas un mārketinga kategoriju izvēli un laika atzīmi. Tas nesatur vārdu, tālruni, e-pastu vai kontaktformas saturu.",
        "Šis ieraksts tiek izveidots, kad apstiprināt vai noraidāt izvēles. Tas ir vajadzīgs, lai ievērotu jūsu lēmumu un nelūgtu to katrā lapā. Tā saglabāšanu nevar atslēgt kategoriju iestatījumos, bet ierakstu var izdzēst pārlūkā.",
        "Autentifikācija izmanto Supabase sesijas localStorage (sb-…-auth-token); tās ilgumu nosaka autentifikācijas konfigurācija. ag-booking-intent-v1 sessionStorage var saturēt nosūtītā rezervēšanas pieprasījuma kontaktus un atkārtošanas atslēgu, vēlāk kvīti. ag-welcome-seen sessionStorage atceras ievada parādīšanu. Pārlūks var atjaunot sesijas krātuvi. ag-hero-preferences-v1 localStorage saglabā jūsu tieši izvēlētos animācijas un video iestatījumus bez automātiska termiņa. Šīs funkciju izvēles ir atsevišķas no papildu valodas piekrišanas; sīkdatņu iestatījumu atsaukšana neizraksta no konta un nenodzēš rezervēšanas vai animācijas izvēles."
      ]
    },
    {
      "id": "preferences",
      "title": "3. Preferences",
      "paragraphs": [
        "Ar atļauju kategorijai “Preferences” ierakstā ag-language tiek saglabāta izvēlētā vietnes valoda (LV, RU vai EN). Bez atļaujas valodu var mainīt atvērtajā vietnē, taču pēc pārlādes tā netiek atjaunota no krātuves.",
        "Izslēdzot preferences, vietne dzēš ag-language ierakstu. Pašreizējās atvērtās lapas valoda nemainās, valoda vairs netiek atjaunota no šī ieraksta."
      ]
    },
    {
      "id": "analitika",
      "title": "4. Analītikas sīkdatnes",
      "paragraphs": [
        "Apmeklējuma analīzes rīki šajā vietnē pašlaik nav ieviesti. Kategorija iestatījumos ir atzīmēta kā neaktīva, un tās izvēle ir izslēgta. Netiek ielādēti Google Analytics vai līdzīgi analītikas skripti."
      ]
    },
    {
      "id": "marketings",
      "title": "5. Mārketinga sīkdatnes",
      "paragraphs": [
        "Reklāmas izsekošanas rīki pašlaik nav ieviesti. Mārketinga kategorija ir neaktīva. Vietne neielādē Meta Pixel vai līdzīgus reklāmas skriptus.",
        "Saites uz sociālajiem tīkliem un saite “Atvērt Google Maps” ved uz ārējām vietnēm. Kontaktu lapas iegultajai Google kartei ir atsevišķa, brīvprātīga piekrišanas kategorija “Google Maps”. Pirms atļaujas iframe netiek izveidots. Atsaukšana noņem karti un aptur turpmāku tās ielādi šajā vietnē; tā neatceļ jau notikušu datu nodošanu un nedzēš Google saglabātās sīkdatnes. Tās var pārvaldīt pārlūkā un Google iestatījumos. Google privātuma politika: policies.google.com/privacy."
      ]
    },
    {
      "id": "piekritisana",
      "title": "6. Kā darbojas piekrišana",
      "paragraphs": [
        "Pirms izvēles papildu krātuve nav atļauta. “Pieņemt visas” ieslēdz valodas preferences un Google Maps kategoriju. Tas neieslēdz neaktīvo analītiku vai mārketingu.",
        "“Noraidīt papildu” izslēdz valodas saglabāšanu un Google Maps; tas nedzēš citu pieprasīto funkciju krātuvi. “Iestatījumi” ļauj atsevišķi izvēlēties valodas saglabāšanu un Google Maps ielādi. Iestatījumu aizvēršana vai turpināta vietnes lietošana nenozīmē piekrišanu.",
        "Ja tiks ieviesti jauni papildu rīki, pirms to aktivizēšanas jāatjaunina šī politika, tehniskā izvēles versija un jāsaņem atbilstoša piekrišana."
      ]
    },
    {
      "id": "mainit",
      "title": "7. Izvēles maiņa un atsaukšana",
      "paragraphs": [
        "Jebkurā laikā atveriet “Sīkdatņu iestatījumi” vietnes kājenē vai izmantojiet šīs lapas iestatījumu pogu. Izslēdziet preferences vai Google Maps un saglabājiet izvēli vai nospiediet “Noraidīt papildu”. Izmaiņas attiecas uz šo pārlūku.",
        "Izvēle tiek saglabāta ar versiju un laika atzīmi. Derīgas saglabātas izvēles gadījumā sākotnējais paziņojums netiek rādīts atkārtoti katrā lapā."
      ]
    },
    {
      "id": "glabasana",
      "title": "8. Glabāšana un pārlūka kontrole",
      "paragraphs": [
        "localStorage ierakstiem nav automātiska derīguma termiņa. Tie saglabājas, līdz tos maināt, izdzēšat vietnes datus vai pārlūks tos notīra. Piekrišanas versijas maiņa var prasīt atkārtotu izvēli.",
        "Pārlūka privātuma iestatījumos var dzēst vai bloķēt vietņu datus. Pēc dzēšanas šī vietne var atkārtoti parādīt izvēles paziņojumu. Ja krātuve ir bloķēta, izvēle darbojas tikai līdz lapas pārlādei; vietne par to parāda paziņojumu."
      ]
    },
    {
      "id": "atjauninajumi",
      "title": "9. Politikas atjauninājumi un saziņa",
      "paragraphs": [
        "Politiku pārskatīsim, mainoties vietnes krātuves vai ārējo rīku lietojumam. Atjaunināšanas datums norādīts lapas sākumā. Jautājumus varat uzdot klīnikai pa tālruni +371 28229925 vai e-pastā ag@inbox.lv. Plašāka informācija par personas datiem ir Privātuma politikā."
      ]
    }
  ],
  "notice": "Pārskatīts projekts: pārziņa rekvizīti ir apstiprināti; tiesiskie pamati, glabāšana, pakalpojumu sniedzēji un privātuma pieprasījumu kārtība vēl jāapstiprina klīnikai un juristam. Publiska tiešsaistes rezervēšana nav aktivizēta."
};
