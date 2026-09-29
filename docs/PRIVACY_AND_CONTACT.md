# Contact requests and privacy infrastructure

Implemented 28 September 2026. This is frontend infrastructure and a policy draft based on the current code, not a legal compliance certification.

## Routes and behavior

- `/kontakti`: existing contact information and location photograph alongside an appointment request form; stacked on mobile.
- `/privatuma-politika`: Latvian privacy policy with 13 sections.
- `/sikdatnu-politika`: Latvian cookie/storage policy with settings access.
- Both policy routes are lazy-loaded. Footer links and a settings button appear throughout the public site. The request checkbox links to the privacy policy in a separate tab so entered fields are not lost.
- Form, consent and legal interface text has LV/RU/EN keys. Full policy documents remain Latvian, with an explicit language notice for RU/EN.
- `/pieraksts` retains its existing telephone/email booking presentation.

## Form boundary

`AppointmentRequestForm.vue` uses existing service data and the typed `appointmentRequests.ts` service. Required fields are first name, last name, phone, email and an initially unchecked operational consent. Service and message are optional. No marketing consent or medical questionnaire is added.

Validation accepts normal Latvian/international phone punctuation, Unicode names and a reasonable email format. Free-text limits are enforced in HTML and the validation function. Errors are associated with fields; invalid submission focuses the first invalid field. Inputs are disabled while pending. No input is logged, written to browser storage, put into URLs, or sent over the network.

`REQUEST_SUBMISSION_ENABLED` is deliberately false. The button is “Pārbaudīt pieteikumu”; a visible notice explains that this checks fields locally and that users must call or email. The adapter returns `unavailable`, never simulated receipt. The typed payload prepares trimmed fields and explicit consent evidence (timestamp and policy version). A real `received` result can display the prepared thank-you state, which says the clinic will contact the person to confirm a time. It never confirms an appointment automatically.

Before connecting `POST /api/appointment-requests`:

1. Resolve the client/legal confirmations below and update policy content and `REQUEST_POLICY_VERSION` together.
2. Implement Go validation/normalization, field limits, service allowlisting, rate limiting and spam controls. Client-side validation is only UX.
3. Review handling of unsolicited health information, access controls, retention/deletion, safe logging and safe email rendering. Do not log patient request bodies.
4. Define a verified response contract, timeout/error behavior and duplicate-request handling. Return `received` only after actual server acceptance.
5. Add server-side database/email delivery as separately authorized work. Keep Resend keys and privileged credentials server-side. There is no new Resend, Supabase Auth, scheduling, or database integration in this change.
6. Replace the inert adapter and enable submission only after the endpoint and operational workflow are tested. Remove the unavailable notice through the existing feature constant.

## Cookie architecture and inventory

- `services/cookieConsent.ts`: versioned schema, strict category validation, defensive storage reads, consent-aware initial language.
- `stores/cookieConsent.ts`: current choice, settings visibility, save/reject, storage-failure reporting and cross-tab synchronization.
- `components/privacy/CookieConsent.vue`: equal-weight accept/reject controls, settings, native modal dialog, explicit keyboard focus loop, Escape without consent, focus restoration and footer reopening.
- `ag-cookie-consent` in localStorage: version, necessary=true, preference permission, analytics=false, marketing=false, ISO timestamp. No personal details. Created only after a choice.
- `ag-language` in localStorage: LV/RU/EN only after preference consent. Rejection/revocation removes it. Language changes work in memory without consent. Legacy language entries without valid consent are removed.
- Analytics and marketing are absent and their settings disabled. Accept all enables only the available preference category. No optional third-party script or embed was found or introduced.
- No automatic expiry is implemented: records last until changed/cleared or browser cleanup. Invalid/obsolete consent fails closed; changing the version asks again. Future vendors/categories require an inventory/policy review, version bump and actual loading gates before activation.
- On blocked storage, the choice works in memory and the UI explains that it lasts until reload. No storage of request data is used as a workaround.

## Client confirmation required

Explicit `CLIENT_CONFIRMATION_REQUIRED` metadata is in `frontend/src/content/legal.ts`. Confirm:

- Legal entity name, registration number, registered address and controller identity behind the published clinic name.
- Whether the existing general email `ag@inbox.lv` should handle privacy requests; responsible contact and any DPO requirement/appointment.
- Lawful basis for each purpose/channel and the required operational consent wording; treatment of unsolicited sensitive data.
- Actual hosting/email/infrastructure providers, logs, processor agreements and any international transfers.
- Retention periods or criteria for requests, consent evidence, email/phone correspondence and logs; rights request procedures.
- Production deployment storage/cookie inventory, including anything introduced by hosting or a proxy.

The pages plainly say that online submission is unavailable and that those details will be completed before activation. No invented company registration, legal email, retention period, vendor or legal guarantee appears.

## Verification

- `npm run build --prefix frontend`: TypeScript and production build pass.
- `node --test frontend/tests/privacy-contact.test.mjs`: six tests cover fail-closed consent, language consent, required fields, email/phone/service validation, length limits, consent payload and an inert adapter that cannot fetch.
- Browser checks: required fields, malformed phone/email, unchecked/default and required consent, focus and error associations, valid local-only result, no POSTs or form data in storage.
- Cookie accept, reject, settings save, footer reopening, Escape, keyboard focus loop, persistence across reload, preference revocation and cross-tab synchronization verified.
- Layout checked at 320, 390, 768, 1024 and 1440 pixels; desktop/mobile screenshots inspected. Both legal routes and the existing `/pieraksts` route verified.
- RU/EN interface and Latvian policy notice verified. No unexpected external requests or optional scripts observed in the standard browser checks.
- Production storage-failure handling passed. Prepared loading, received and failure UI states passed with a browser-only test adapter (no production feature flag change and no POSTs). The development build’s Vue devtools can fail when the localStorage property itself throws; production has no such failure.
- `git diff --check` and the Hero lock check pass. All existing locale dictionaries were compared byte-for-byte with HEAD before refreshing **only** the i18n hash. New translation groups and consent-aware initial-language storage required that shared file change; existing Hero copy did not change. Hero component, video, poster, fonts, global CSS and all other locked files retain their prior hashes.

## Files created

- `frontend/src/components/AppointmentRequestForm.vue`
- `frontend/src/components/privacy/CookieConsent.vue`
- `frontend/src/content/legal.ts`
- `frontend/src/i18n/privacyAndContact.ts`
- `frontend/src/services/appointmentRequests.ts`
- `frontend/src/services/cookieConsent.ts`
- `frontend/src/stores/cookieConsent.ts`
- `frontend/src/views/LegalView.vue`
- `frontend/tests/privacy-contact.test.mjs`
- `docs/PRIVACY_AND_CONTACT.md`

## Files changed

- `frontend/src/App.vue`: mount global cookie UI.
- `frontend/src/components/layout/SiteFooter.vue`: legal links and settings action.
- `frontend/src/components/layout/SiteHeader.vue`: gate language persistence only; no navigation/layout changes.
- `frontend/src/i18n/index.ts`: register new UI strings and consent-aware initial language.
- `frontend/src/router/index.ts`: two lazy policy routes.
- `frontend/src/views/ContactView.vue`: form and responsive contact layout; preserve booking branch.
- `docs/HERO_LOCK.json`: refresh only the shared i18n fingerprint after verifying unchanged existing messages.

## Primary references used

The implementation follows the practical principles of a clear choice and easy withdrawal; these references do not certify the site or replace client/legal review:

- [Datu valsts inspekcija: cookie banners and freedom of consent](https://www.dvi.gov.lv/lv/jaunums/dviskaidro-sikdatnu-baneri-un-piekrisanas-briviba-biezakas-problemas-timekla-vietnes)
- [Datu valsts inspekcija: withdrawing cookie consent](https://www.dvi.gov.lv/lv/jaunums/dviskaidro-ka-nodrosinat-lietotajiem-iespeju-viegli-atsaukt-piekrisanu-sikdatnem)
- [Datu valsts inspekcija: cookie guidance](https://www.dvi.gov.lv/lv/media/1517/download)
- [GDPR, including transparency information and data-subject rights](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
