# AG Zobārstniecība — source content audit

Audited 27 September 2026. Primary source: https://www.zobarstnieciba-ag.lv/.

## Repository inspection

The existing Vue 3 / TypeScript / Vite frontend registered Vue Router, Pinia, Vuetify and vue-i18n. It contained one home view displaying `/api/health` status, one unused starter component, starter artwork, and `public/media/clinic/clinic-tour.mp4` (1280×720, approximately 25 seconds, 35 MB). There were no existing application stores, booking views or public-page designs. The API service reads `VITE_API_URL`; the Go/Gin service reads `DATABASE_URL` and `PORT` using godotenv and connects through GORM. The environment files are ignored. No secret values were copied. Backend, environment files, dependency versions and Vite configuration are unchanged.

## Public content inventory

| Source | Findings | New location |
| --- | --- | --- |
| `/` | Clinic purpose, affordability and comfort philosophy, family care, services, manager's name, phone, Facebook and Instagram | Home, service directory and eight service pages |
| `/par-mums/` | Patient comfort, dental anxiety, natural-tooth preservation, Dr. Anda Gutovska, more than 15 years' experience, portrait | About and specialists |
| `/pakalpojumi/` | Price list, six categories, 69 rows, pensioner concession | `/cenas`, service-page price sections and three-item home preview |
| `/kontakti/` | Phone, public email, street address, hours, prior appointment, free courtyard parking, location image | Contact, appointment and footer |
| `/jaunumi/` | Four complete posts, dates and article links | Journal and four article pages |

The public navigation is Home / Services (actually prices) / News / About / Contact. No separate doctor directory, service-detail pages, legal page, privacy policy, registration number or additional staff profiles were linked. The new specialists page only presents the verified dentist. No additional clinicians, qualifications, reviews, awards or technologies have been invented. Philips ZOOM is named because it appears in the source price list.

Individual articles were fetched and read, in addition to the archive:

- https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5259478/zobu-higiena-kas-pieejama-ikvienam — 27 May 2026.
- https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5259473/zobu-protezes-un-protezesana — 27 May 2026.
- https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5159831/zobu-higiena — 28 November 2025.
- https://www.zobarstnieciba-ag.lv/jaunumi/params/post/4689080/aktualitates — 5 November 2024.

Article copy has been retained with formatting, punctuation and readability edits. Dates remain original publication dates. Source links appear on article pages. Former article paths redirect within the Vue router. The old `/pakalpojumi` URL now opens the service directory, which prominently links to prices.

## Verified contact information

- AG Zobārstniecība, Ūnijas iela 25, Rīga–Teika, LV-1039, Latvia.
- +371 28229925; ag@inbox.lv (decoded from the public site's email-protection markup).
- Monday–Friday, 09:00–18:00. By prior appointment.
- Free courtyard parking for visitors.
- Facebook: https://www.facebook.com/p/AG-zob%C4%81rstniec%C4%ABba-100028253269391/
- Instagram: https://www.instagram.com/zobarstniecibaag/

## Media provenance and replacement

The original supplied MP4 is unchanged. `tour-poster.jpg`, `tour-room.jpg` and `tour-detail.jpg` were extracted from that file at 0.1, 5 and 10 seconds. These are temporary AI development visuals, not evidence of the real clinic's facilities. They should be replaced with approved professional media before public launch. Media paths are centralized in `frontend/src/content/clinic.ts`.

Real source images:

- `anda-gutovska.jpg`: https://site-2329116.mozfiles.com/files/2329116/medium/IMG_9028.jpeg — inspected: portrait of Dr. Anda Gutovska.
- `clinic-original.jpg`: https://site-2329116.mozfiles.com/files/2329116/inlinepicturesbox/medium/435752507_120209085890170516_2865399601569849202_n.jpg — inspected: clinic branding inside the surgery.
- `location.jpg`: https://site-2329116.mozfiles.com/files/2329116/thumbnail.jpg — original contact-page image.

No remote stock media or new generated video was used. Fonts are locally hosted Cormorant Garamond and Manrope, with OFL licenses included.

## Language scope

Navigation, common controls, homepage, clinic content, appointment/contact pages and service summaries support LV/RU/EN, with language selection persisted locally. The source clinical price-item names and articles remain in Latvian with `lang="lv"` and an explicit notice when RU/EN is selected. This intentionally avoids presenting unfinished clinical translations as complete. Translations of the remaining source material should be clinically reviewed before multilingual publication.
