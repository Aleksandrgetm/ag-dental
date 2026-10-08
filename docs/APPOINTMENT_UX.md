# Appointment UX refinement — 29 September 2026

All general appointment CTAs now lead to `/kontakti`, without a hash or form auto-scroll. The brief contained conflicting anchor examples; the explicit `/kontakti ONLY` instruction was followed. The user separately approved changing only the Hero CTA destination. Its appearance, copy, video and motion remain unchanged.

The duplicate `/pieraksts` route and conditional booking-only branch in ContactView were removed. No public link targets the removed route. This supersedes the separate-booking-page description in the preceding PRIVACY_AND_CONTACT report.

Contacts now flows through the appointment page heading, verified contact information, the editorial request section, and location/additional contact content. The request section uses a serif introduction and bounded form column, understated uppercase labels, bottom borders, 56px input controls, a native keyboard-accessible service select, a shorter message field and integrated required consent. Mobile fields stack in their original order.

The existing development-safe behavior is preserved. While submission is disabled the visible action remains “Pārbaudīt pieteikumu”, with a clear not-sent explanation. “Nosūtīt pieteikumu” remains the configured live-submission label; it will become active only when real sending is enabled. No fake receipt, API request, medical-data field or scheduling control was introduced.

## Files changed in this refinement

- `frontend/src/components/AppointmentRequestForm.vue` — editorial layout and field/focus/consent styling, shorter textarea; preserve validation and safe submission.
- `frontend/src/views/ContactView.vue` — contact-first page flow, form as the second section, location after form; remove duplicate booking branch.
- `frontend/src/i18n/privacyAndContact.ts` — new LV/RU/EN editorial headline and refined Latvian future-receipt copy.
- `frontend/src/router/index.ts` — remove duplicate appointment route.
- `frontend/src/components/layout/SiteHeader.vue` — desktop and mobile CTA destinations only.
- `frontend/src/components/layout/SiteFooter.vue` — appointment destination only.
- `frontend/src/components/ContactBand.vue` — appointment destination only.
- `frontend/src/components/home/PatientJourney.vue` — appointment destination only.
- `frontend/src/components/home/ScrollClinicHero.vue` — user-approved CTA destination only.
- `frontend/src/views/AboutView.vue` — appointment destination only.
- `frontend/src/views/ServiceView.vue` — appointment destination only.
- `frontend/src/views/ArticleView.vue` — appointment destination only; news content unchanged.
- `docs/HERO_LOCK.json` — refresh only the Hero component hash after the approved destination change; other protected hashes unchanged.
- `docs/APPOINTMENT_UX.md` — this report (created).

Files still modified from the previous privacy/contact implementation are not additional changes from this refinement.

## Verification

- Header CTA from `/`, `/cenas`, `/par-mums` and `/kontakti` reaches exactly `/kontakti` at the top, including when already scrolled on Contacts.
- Hero CTA href checked; mobile navigation CTA checked.
- No `/pieraksts` or `#pieraksts` links remain in frontend source.
- Desktop screenshot at 1440px and mobile form screenshot at 390px visually inspected; overflow checks at 320, 390 and 768px pass.
- Keyboard field order, required fields, invalid email, initially unchecked consent and consent requirement verified.
- Valid local checks show “not sent”; no POST request or fake success.
- Six existing privacy/contact unit tests pass.
- Production TypeScript/build, whitespace and Hero-lock checks pass.
