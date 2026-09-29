// Editorial draft for the implemented website, not a legal compliance certification.
export const legalReview = {
  status: "CLIENT_CONFIRMATION_REQUIRED",
  controller:
    "Confirm legal entity, registration number and registered address behind AG Zobārstniecība.",
  privacyContact:
    "Confirm whether the published general contact ag@inbox.lv handles rights requests.",
  lawfulBasis:
    "Review the required request consent, pre-contractual processing, and any accidentally supplied health data before enabling submission.",
  recipients:
    "Confirm hosting, infrastructure logs, providers, processor agreements and international transfers.",
  retention:
    "Confirm request, email, phone, consent evidence and infrastructure log retention with the clinic.",
  rights:
    "Confirm the rights request procedure and whether a DPO is required/appointed; do not invent one.",
  activation:
    "Review and publish complete controller/provider/retention details before connecting the form to the Go API.",
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
export const POLICY_UPDATED = "2026-09-29";
export const privacyPolicy: LegalDocument = {
  title: "Privātuma politika",
  intro:
    "Šeit aprakstīts, kā šobrīd darbojas AG Zobārstniecības vietne un kā rīkoties ar jautājumiem par jūsu personas datiem.",
  notice:
    "Tiešsaistes pieteikumu nosūtīšana vēl nav pieejama. Pirms tās ieviešanas klīnika precizēs informāciju par datu pārzini, pakalpojumu sniedzējiem un pieteikumu glabāšanu.",
  sections: [
    {
      id: "vispariga-informacija",
      title: "1. Vispārīga informācija",
      paragraphs: [
        "Šī politika attiecas uz klīnikas publisko vietni, saziņas iespējām un pārlūkā saglabātajām izvēlēm. Tā neaizstāj informāciju par pacientu medicīnisko dokumentu apstrādi ārstniecības laikā.",
        "Vietnē nav pacientu kontu un vizīšu kalendāra. Kontaktformas lauki pašlaik tiek pārbaudīti tikai jūsu pārlūkā; tie netiek nosūtīti klīnikas serverim vai e-pasta pakalpojumam.",
      ],
    },
    {
      id: "parzinis",
      title: "2. Personas datu pārzinis",
      paragraphs: [
        "Vietne iepazīstina ar AG Zobārstniecību, kas atrodas Ūnijas ielā 25, Rīgā, LV-1039. Publicētie saziņas kontakti: +371 28229925 un ag@inbox.lv.",
        "AG Zobārstniecība ir vietnē lietotais klīnikas nosaukums. Juridiskās personas pilnais nosaukums, reģistrācijas numurs un pārziņa rekvizīti vēl tiek precizēti ar klīniku. Tie tiks papildināti pirms pieteikumu nosūtīšanas aktivizēšanas.",
      ],
    },
    {
      id: "dati",
      title: "3. Kādi personas dati tiek apstrādāti",
      paragraphs: [
        "Formā paredzēts vārds, uzvārds, tālruņa numurs, e-pasta adrese, izvēlētais pakalpojums un brīvprātīgi ievadīta ziņa. Aktivizējot nosūtīšanu, pieteikumam paredzēts pievienot datu apstrādes piekrišanas faktu, laiku un politikas versiju.",
        "Pašreizējā formā ievadītais paliek atvērtās lapas atmiņā. Vietnes kods to neieraksta localStorage vai sīkdatnēs. Pārlūka paša automātiskās aizpildes darbību nosaka jūsu pārlūka iestatījumi.",
        "Sazinoties pa tālruni vai e-pastu, jūs nododat klīnikai kontaktinformāciju un to informāciju, kuru izvēlaties pateikt vai nosūtīt. Šīs saziņas apstrādes un glabāšanas nosacījumi jāprecizē ar klīniku.",
      ],
    },
    {
      id: "merki",
      title: "4. Kāpēc dati tiek apstrādāti",
      paragraphs: [
        "Pieteikuma paredzētais mērķis ir saņemt saziņas lūgumu, atbildēt uz to un vienoties par pieprasīto vizīti. Forma nav paredzēta reklāmas izsūtīšanai, profilēšanai vai medicīniskas dokumentācijas veidošanai.",
        "Valodas saglabāšana un piekrišanas izvēles atcerēšanās ir atsevišķas vietnes funkcijas, kas aprakstītas Sīkdatņu politikā.",
      ],
    },
    {
      id: "tiesiskais-pamats",
      title: "5. Datu apstrādes tiesiskais pamats",
      paragraphs: [
        "Pirms turpināt kontaktformā, ir paredzēta atsevišķa, iepriekš neatzīmēta piekrišana saziņai par pieteikumu. Tā nav piekrišana mārketingam. Šobrīd piekrišanas atzīmēšana nenosūta datus klīnikai.",
        "Pirms formas aktivizēšanas klīnikai jāapstiprina piemērojamais tiesiskais pamats katram apstrādes mērķim un saziņas kanālam. Atkarībā no konkrētā nolūka tas var būt piekrišana vai pasākumi pēc personas pieprasījuma pirms līguma noslēgšanas; šo pamatu izvēle vēl jāprecizē.",
        "Ja apstrāde balstās uz piekrišanu, to var atsaukt. Atsaukšana neietekmē uz piekrišanas pamata pirms atsaukšanas veiktās apstrādes likumību. Papildu valodas saglabāšanu var atslēgt sīkdatņu iestatījumos.",
      ],
    },
    {
      id: "pieteikums",
      title: "6. Vizītes pieteikuma dati",
      paragraphs: [
        "Obligātie lauki ir vārds, uzvārds, tālrunis, e-pasts un piekrišana saziņai par pieteikumu. Pakalpojums un ziņa nav obligāti. Ja nepieciešams, var izvēlēties konsultāciju, nenorādot detalizētu veselības informāciju.",
        "Lūdzu, neievadiet diagnozes, slimību vēsturi, personas kodu, medikamentus, apdrošināšanas informāciju vai citus detalizētus veselības datus. Ārstēšanas jautājumus pārrunājiet tieši ar speciālistu.",
        "Poga “Pārbaudīt pieteikumu” pārbauda laukus lokāli un neko nenosūta. Lai pašlaik pieteiktu vizīti, zvaniet vai rakstiet klīnikai. Arī pēc nosūtīšanas funkcijas ieviešanas pieteikums pats par sevi neapstiprinās vizīti: laiks būs jāsaskaņo ar klīniku.",
      ],
    },
    {
      id: "sikdatnes",
      title: "7. Sīkdatnes un pārlūka krātuve",
      paragraphs: [
        "Vietne izmanto localStorage, lai atcerētos sīkdatņu izvēli. Ar jūsu atļauju tajā saglabā arī izvēlēto valodu. Analītikas un mārketinga rīki šobrīd nav ieviesti.",
        "Izvēli iespējams mainīt vietnes kājenē sadaļā “Sīkdatņu iestatījumi”. Plašāka informācija, tostarp saglabāto ierakstu nosaukumi, pieejama Sīkdatņu politikā.",
      ],
    },
    {
      id: "sanemeji",
      title: "8. Datu saņēmēji un pakalpojumu sniedzēji",
      paragraphs: [
        "Kontaktforma pašlaik nav savienota ar pieteikumu API, datubāzes ierakstīšanu vai e-pasta nosūtīšanu. Nav ieviests arī vietnes lietotāja konts.",
        "Lapas ielādei pārlūks sazinās ar vietnes infrastruktūru, un vietne pārbauda API pieejamību. Hostinga, tehnisko žurnālu, e-pasta un citu pakalpojumu sniedzēju informācija, kā arī iespējamā datu nodošana ārpus Eiropas Ekonomikas zonas jāapstiprina klīnikai.",
        "Kontaktu lapā Google Maps karte tiek ielādēta tikai pēc atsevišķas piekrišanas kategorijai “Google Maps”. Google saņem tehniskus datus, tostarp IP adresi, un var izmantot sīkdatnes atbilstoši savai privātuma politikai. Sociālo tīklu saites un saite “Atvērt Google Maps” ved uz ārējām vietnēm.",
      ],
    },
    {
      id: "glabasana",
      title: "9. Datu glabāšanas termiņi",
      paragraphs: [
        "Kontaktformas ievadīto datu pastāvīga saglabāšana vietnes kodā nav ieviesta. Pēc lapas aizvēršanas vai pārlādes forma tos neatjauno no vietnes krātuves.",
        "Piekrišanas izvēle un atļautā valodas preference pārlūka localStorage automātiski nebeidzas. Tie paliek līdz izvēles maiņai, vietnes datu dzēšanai vai pārlūka veiktai tīrīšanai. Mainot piekrišanas versiju, vietne lūgs izvēli atkārtoti.",
        "Klīnikai vēl jānosaka un jāapstiprina topošo pieteikumu, piekrišanas pierādījumu, e-pasta saziņas un tehnisko žurnālu glabāšanas termiņi vai to noteikšanas kritēriji.",
      ],
    },
    {
      id: "drosiba",
      title: "10. Datu drošība",
      paragraphs: [
        "Kontaktformas dati netiek pievienoti vietnes adresēm vai saglabāti sīkdatņu izvēles ierakstā. Pārlūka lauku pārbaude palīdz pamanīt ievades kļūdas, taču neaizstāj servera drošības pasākumus.",
        "Pirms nosūtīšanas ieviešanas jānodrošina servera validācija, ievades apjoma un pieprasījumu biežuma ierobežojumi, aizsardzība pret surogātpastu un atbilstoša piekļuves kontrole. Šī politika nesniedz absolūtas drošības garantiju.",
      ],
    },
    {
      id: "tiesibas",
      title: "11. Jūsu tiesības",
      paragraphs: [
        "Atbilstoši piemērojamajiem nosacījumiem jums ir tiesības pieprasīt piekļuvi saviem datiem, to labošanu, dzēšanu vai apstrādes ierobežošanu. Noteiktos gadījumos ir tiesības uz datu pārnesamību un iebilst pret apstrādi. Šīs tiesības nav absolūtas un ir atkarīgas no apstrādes pamata un tiesību aktu prasībām.",
        "Ja apstrāde balstās uz piekrišanu, varat to atsaukt. Par savu tiesību īstenošanu sazinieties ar klīniku; identitātes pārbaudei var būt vajadzīga samērīga papildu informācija.",
        "Jums ir tiesības iesniegt sūdzību Latvijas uzraudzības iestādei — Datu valsts inspekcijai (www.dvi.gov.lv).",
      ],
    },
    {
      id: "sazina",
      title: "12. Saziņa par personas datiem",
      paragraphs: [
        "Par jautājumiem, kas saistīti ar šo vietni, varat sazināties ar klīniku, izmantojot publicēto tālruni +371 28229925 vai e-pastu ag@inbox.lv. Lūdzu, sākotnējā vēstulē nenosūtiet personas dokumentu kopijas vai detalizētus veselības datus.",
        "Specializēts privātuma kontaktpunkts vai datu aizsardzības speciālists pašlaik vietnes saturā nav apstiprināts. Klīnikai jāprecizē tiesību pieprasījumu saņemšanas kārtība un atbildīgā kontaktpersona.",
      ],
    },
    {
      id: "izmainas",
      title: "13. Politikas izmaiņas",
      paragraphs: [
        "Politika tiks pārskatīta, mainoties vietnes funkcijām vai datu apstrādei. Pirms pieteikumu nosūtīšanas aktivizēšanas jāpapildina šeit norādītā precizējamā informācija. Lapas sākumā norādīts šī teksta atjaunināšanas datums.",
      ],
    },
  ],
};
export const cookiePolicy: LegalDocument = {
  title: "Sīkdatņu politika",
  intro:
    "Jūs varat izvēlēties, ko šī vietne atceras jūsu pārlūkā. Analītikas un mārketinga rīki šobrīd nav aktīvi.",
  sections: [
    {
      id: "kas-ir-sikdatnes",
      title: "1. Kas ir sīkdatnes un localStorage",
      paragraphs: [
        "Sīkdatnes ir nelieli dati, ko vietnes var saglabāt pārlūkā. Līdzīgām vajadzībām izmanto arī localStorage — vietnes lokālo krātuvi pārlūkā. Atšķirībā no sīkdatnēm tās saturs netiek automātiski pievienots katram servera pieprasījumam.",
        "Šajā vietnes frontend versijā sīkdatņu izvēle un atļautā valodas preference tiek glabāta localStorage. Izvietošanas infrastruktūras iespējamās papildu sīkdatnes vai tehniskie žurnāli pirms publicēšanas jāpārbauda ar klīniku un hostinga pakalpojuma sniedzēju.",
      ],
    },
    {
      id: "nepieciesamas",
      title: "2. Nepieciešamā krātuve",
      paragraphs: [
        "Ieraksts ag-cookie-consent saglabā tikai izvēles versiju, nepieciešamās krātuves statusu, preferenču, Google Maps, analītikas un mārketinga kategoriju izvēli un laika atzīmi. Tas nesatur vārdu, tālruni, e-pastu vai kontaktformas saturu.",
        "Šis ieraksts tiek izveidots, kad apstiprināt vai noraidāt izvēles. Tas ir vajadzīgs, lai ievērotu jūsu lēmumu un nelūgtu to katrā lapā. Tā saglabāšanu nevar atslēgt kategoriju iestatījumos, bet ierakstu var izdzēst pārlūkā.",
      ],
    },
    {
      id: "preferences",
      title: "3. Preferences",
      paragraphs: [
        "Ar atļauju kategorijai “Preferences” ierakstā ag-language tiek saglabāta izvēlētā vietnes valoda (LV, RU vai EN). Bez atļaujas valodu var mainīt atvērtajā vietnē, taču pēc pārlādes tā netiek atjaunota no krātuves.",
        "Izslēdzot preferences, vietne dzēš ag-language ierakstu. Pašreizējās atvērtās lapas valoda nemainās, bet nākamajā pārlādē tiek lietota noklusējuma latviešu valoda.",
      ],
    },
    {
      id: "analitika",
      title: "4. Analītikas sīkdatnes",
      paragraphs: [
        "Apmeklējuma analīzes rīki šajā vietnē pašlaik nav ieviesti. Kategorija iestatījumos ir atzīmēta kā neaktīva, un tās izvēle ir izslēgta. Netiek ielādēti Google Analytics vai līdzīgi analītikas skripti.",
      ],
    },
    {
      id: "marketings",
      title: "5. Mārketinga sīkdatnes",
      paragraphs: [
        "Reklāmas izsekošanas rīki pašlaik nav ieviesti. Mārketinga kategorija ir neaktīva. Vietne neielādē Meta Pixel vai līdzīgus reklāmas skriptus.",
        "Saites uz sociālajiem tīkliem un saite “Atvērt Google Maps” ved uz ārējām vietnēm. Kontaktu lapas iegultajai Google kartei ir atsevišķa, brīvprātīga piekrišanas kategorija “Google Maps”. Pirms atļaujas iframe netiek izveidots. Atsaukšana noņem karti un aptur turpmāku tās ielādi šajā vietnē; tā neatceļ jau notikušu datu nodošanu un nedzēš Google saglabātās sīkdatnes. Tās var pārvaldīt pārlūkā un Google iestatījumos. Google privātuma politika: policies.google.com/privacy.",
      ],
    },
    {
      id: "piekritisana",
      title: "6. Kā darbojas piekrišana",
      paragraphs: [
        "Pirms izvēles papildu krātuve nav atļauta. “Pieņemt visas” ieslēdz valodas preferences un Google Maps kategoriju. Tas neieslēdz neaktīvo analītiku vai mārketingu.",
        "“Noraidīt papildu” atstāj tikai nepieciešamo izvēles ierakstu. “Iestatījumi” ļauj atsevišķi izvēlēties valodas saglabāšanu un Google Maps ielādi. Iestatījumu aizvēršana vai turpināta vietnes lietošana nenozīmē piekrišanu.",
        "Ja tiks ieviesti jauni papildu rīki, pirms to aktivizēšanas jāatjaunina šī politika, tehniskā izvēles versija un jāsaņem atbilstoša piekrišana.",
      ],
    },
    {
      id: "mainit",
      title: "7. Izvēles maiņa un atsaukšana",
      paragraphs: [
        "Jebkurā laikā atveriet “Sīkdatņu iestatījumi” vietnes kājenē vai izmantojiet šīs lapas iestatījumu pogu. Izslēdziet preferences vai Google Maps un saglabājiet izvēli vai nospiediet “Noraidīt papildu”. Izmaiņas attiecas uz šo pārlūku.",
        "Izvēle tiek saglabāta ar versiju un laika atzīmi. Derīgas saglabātas izvēles gadījumā sākotnējais paziņojums netiek rādīts atkārtoti katrā lapā.",
      ],
    },
    {
      id: "glabasana",
      title: "8. Glabāšana un pārlūka kontrole",
      paragraphs: [
        "localStorage ierakstiem nav automātiska derīguma termiņa. Tie saglabājas, līdz tos maināt, izdzēšat vietnes datus vai pārlūks tos notīra. Piekrišanas versijas maiņa var prasīt atkārtotu izvēli.",
        "Pārlūka privātuma iestatījumos var dzēst vai bloķēt vietņu datus. Pēc dzēšanas šī vietne var atkārtoti parādīt izvēles paziņojumu. Ja krātuve ir bloķēta, izvēle darbojas tikai līdz lapas pārlādei; vietne par to parāda paziņojumu.",
      ],
    },
    {
      id: "atjauninajumi",
      title: "9. Politikas atjauninājumi un saziņa",
      paragraphs: [
        "Politiku pārskatīsim, mainoties vietnes krātuves vai ārējo rīku lietojumam. Atjaunināšanas datums norādīts lapas sākumā. Jautājumus varat uzdot klīnikai pa tālruni +371 28229925 vai e-pastā ag@inbox.lv. Plašāka informācija par personas datiem ir Privātuma politikā.",
      ],
    },
  ],
};
