# Contact questions and privacy infrastructure

Contact form refined 9 October 2026. This documents the current implementation; it is not a legal compliance certification.

## Routes and scope

- `/kontakti` is for general questions. The existing two-column editorial layout, clinic details, Maps consent gate and FAQ are preserved.
- `/pieraksts` is the independent booking wizard. The contact form imports no booking service and never calls the Booking API.
- `/privatuma-politika` and `/sikdatnu-politika` use the existing complete LV/RU/EN legal documents. No legal document, cookie behavior or booking implementation changes in this refinement.
- The required, initially unchecked privacy acknowledgement links to the existing policy in a separate tab, preserving the question in the original tab. No marketing consent is requested.

## Contact form boundary

`frontend/src/components/ContactQuestionForm.vue` replaces the appointment-named component. Its independent validator is `frontend/src/services/contactQuestions.ts`.

| Field | Required | Limit / validation |
| --- | --- | --- |
| Name | Yes | One Unicode name field, maximum 100 characters; no control characters |
| Email | Yes | Email format, maximum 254 characters |
| Phone | No | Optional leading `+`, spaces, parentheses, periods and hyphens; 7–15 digits when supplied, maximum 40 characters; no country-specific prefix |
| Question | Yes | Multiline text, maximum 1000 characters, not whitespace-only |
| Privacy acknowledgement | Yes | Must be explicitly checked |

Name and email share a row on desktop, followed by phone, question, privacy and the action. Fields stack on smaller screens. Reserved error space, visible keyboard focus and associated inline errors avoid disruptive movement; invalid checks focus the first invalid field. The question hint asks visitors not to provide diagnoses, identity numbers or detailed health information.

All labels, the question placeholder, hints, validation and status messages are provided through the existing `privacyAndContact.ts` vue-i18n content for Latvian, Russian and English. Changing language preserves entered values.

## Delivery is unavailable

The Go router currently exposes health, Auth and Booking routes; there is no contact-message endpoint or delivery provider. The form therefore has **no network transport**, prepared delivery payload, success receipt, loading simulation or browser persistence. No message is silently discarded. Entered values remain in component memory until the visitor leaves or reloads the page.

The action is explicitly **“Check question”**, localized in each language. It validates fields locally. A concise notice beside the action explains that online sending is unavailable and offers the clinic's existing phone/email links. A valid check says that fields are valid and the question **has not been sent**. Editing fields clears that validation status. There is no enabled control claiming to deliver a message, and no fabricated success, appointment or Supabase user.

### Before real message delivery can be enabled

1. Confirm the clinic's delivery workflow, recipients and outstanding legal/contact-processing details below.
2. Separately implement a Go contact-message endpoint and actual delivery mechanism, with server-side validation, safe normalization, field limits, spam/rate limiting and appropriate access, logging and retention controls. No provider or database is added in this task.
3. Define a reliable response contract distinguishing server acceptance from actual delivery and covering retries/duplicate prevention. Do not log question bodies or contact details unnecessarily.
4. Add and test the real client transport, pending state and recoverable errors. Show success only after the real backend confirms the corresponding outcome. Until then retain the current unavailable notice and phone/email alternatives.

## Cookie architecture and inventory

- `services/cookieConsent.ts`: versioned schema, strict category validation, defensive storage reads, consent-aware initial language.
- `stores/cookieConsent.ts`: current choice, settings visibility, save/reject, storage-failure reporting and cross-tab synchronization.
- `components/privacy/CookieConsent.vue`: equal-weight accept/reject controls, settings, native modal dialog, explicit keyboard focus loop, Escape without consent, focus restoration and footer reopening.
- `ag-cookie-consent` in localStorage: version, necessary=true, preference permission, analytics=false, marketing=false, ISO timestamp. No personal details. Created only after a choice.
- `ag-language` in localStorage: LV/RU/EN only after preference consent. Rejection/revocation removes it. Language changes work in memory without consent. Legacy language entries without valid consent are removed.
- Analytics and marketing are absent and their settings disabled. Accept all enables preferences and Google Maps. The map iframe on Contacts loads only with explicit Maps consent.
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

The contact form plainly says that online message delivery is unavailable. Unconfirmed legal details remain in the existing confirmation architecture. No invented company registration, legal email, retention period, vendor or legal guarantee appears.

## Verification commands

From the repository root:

```sh
npm run build --prefix frontend
node --test frontend/tests/*.test.mjs
node frontend/scripts/check-hero-lock.mjs
```

The browser suite requires Playwright with Chrome installed, a local frontend started with **synthetic** Auth configuration, and the real Booking API mode (requests are intercepted). It refuses non-local target hosts and blocks all external and non-health API requests:

```sh
# In frontend/, terminal 1; these are deliberately synthetic test values.
VITE_SUPABASE_URL=https://integration-test.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_integration_test \
VITE_API_URL=http://127.0.0.1:5184/api VITE_BOOKING_DEMO=false \
npm run dev -- --host 127.0.0.1 --port 5184 --strictPort

# In frontend/, terminal 2; set PLAYWRIGHT_MODULE to an installed package if needed.
TEST_BASE_URL=http://127.0.0.1:5184 node tests/contact-browser.cjs
```

`privacy-contact.test.mjs` covers required/optional fields, privacy, international phone and Unicode name handling, email, whitespace, multiline questions, exact length boundaries and local-only validation. Existing cookie tests remain in place.

`contact-browser.cjs` covers LV/RU/EN at 320, 375, 390, 430, 768, 1024, 1440 and 1920 pixels; field composition, focus/error associations, stable layout, optional phone, privacy policy navigation, live locale switching, question limits, retained input and truthful unavailable status. It verifies no question enters URLs, storage or API requests. Screenshots are written to a temporary directory, not the repository.

The existing `booking-browser.cjs` and `auth-browser.cjs` regression suites can use the same local synthetic server and their mocked responses. No live clinic data or authentication users are needed.

### Results for this refinement

- Production build and TypeScript checks: passed.
- All frontend unit tests: 50 passed, none failed or skipped.
- Contact browser checks: 24 locale/responsive layouts and 24 validation/no-delivery flows passed in both development and compiled production builds. No API writes or external requests occurred.
- Existing Auth browser suite: 96 layout checks and registration/login/persistence/logout/recovery/confirmation flows passed with mocked Auth responses.
- Existing Booking browser suite: the final compiled-build run passed 172 layout checks and 31 flows with mocked API responses and no browser errors. Earlier development-server runs hit a calendar timeout and a locale mismatch; no Booking code or tests were changed to obtain the passing compiled-build result.
- Hero lock: all 15 protected files passed. Task-start SHA256 comparison also confirmed all backend, Booking, Auth, navigation, Welcome and other unrelated files are unchanged.
- Desktop/mobile screenshots inspected; formatting and whitespace checks passed. No database or live Auth/Booking operation was performed.
