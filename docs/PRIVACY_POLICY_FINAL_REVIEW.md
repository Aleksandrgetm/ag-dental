# Privacy Policy final review — 13 October 2026

Status: **local draft; CLIENT_CONFIRMATION_REQUIRED**. No production access, database changes, publication, deployment, commits or pushes. Public Booking remains inactive; no configuration was changed. Latvian is the primary drafting language; RU/EN cover the same sections and paragraphs. This is an implementation audit, not legal certification.

## Confirmed identity

Controller: SIA "Andas Gutovskas privātprakse", registration 40103915017. Registered address: Rīga, Ūnijas iela 21, LV-1039. Visiting address: Ūnijas iela 25, Rīga. These addresses are explicitly distinguished in every translation. Existing general contact details: +371 28229925 and ag@inbox.lv. Designation of this email for rights requests is **not confirmed**; no DPO or new contact was invented.

## Findings and changes

The previous policy incorrectly said that accounts and a booking calendar did not exist, described obsolete contact fields and omitted authentication, booking retry and motion storage. Updated all three full documents; retained existing rights, complaints and Maps disclosures. Legal bases are candidates for legal assessment, not assertions of an approved basis. Acknowledgement is not blanket consent; choosing a dental service can reveal health information despite the absence of diagnosis fields.

LegalView now uses component-scoped vue-i18n messages inheriting the selected language. This prevents historical published CMS legal translations from replacing the reviewed local documents. CMS records, historical import manifests and global content delivery were not changed. Before any future publication, reconcile this source priority with the approved CMS legal publishing process. Routes, anchors, styling, canonical/hreflang infrastructure and footer destinations are unchanged.

## Actual processing inventory

| Feature | Fields / storage | Purpose and current boundary |
|---|---|---|
| General questions | Required name, email, question ≤1000 characters, unchecked privacy acknowledgement; optional phone | Local validation only; no contact endpoint, delivery or persistent application storage. Browser autofill is independent. |
| Registration/login | Email, password sent to Supabase Auth; user ID/session; registration metadata privacy_accepted and privacy_policy_path | Authentication; optional account, server-verified roles. Application does not persist passwords. Confirmation/recovery emails are Auth functionality, not booking notifications; provider delivery settings were not live-tested. |
| Prepared public booking | First/last name, required phone/email, selected service, specialist/time, privacy acknowledgement | Guest booking supported. Server adds end time, reference, status, policy version/time, optional Auth user ID, retry key/fingerprint and timestamps. No diagnosis/history/person-code field. Public activation remains separate. |
| Booking retries | ag-booking-intent-v1 sessionStorage includes submitted contact payload, retry key and optional user ID | Retry safety after uncertain response; success replaces request with receipt. No expiry for uncertain results; browser session restoration may preserve it. Storage failure can leave prior intent until cleared. |
| Administrative appointments | Appointment data and lifecycle events, actor ID where known, changes/status/timestamps | Server JWT and database role authorization; collision protection includes pending appointments. No silent expiry introduced. |
| Notifications | Pending outbox event metadata | No booking email/WhatsApp dispatcher or delivered-message claim. |
| Public editorial content/media | Staff names, approved biographies/portraits, article attribution; media references, revisions and administrator event attribution | Public content and authorized editorial management, distinct from patient records. Private Storage writes are backend-controlled. No upload performed here. |
| Technical abuse protection | Booking API transient client-IP rate-limit state | Request-frequency protection; hosting/provider logging, retention and regions require confirmation. |

Evidence: frontend services/contactQuestions.ts, components/ContactQuestionForm.vue, stores/auth.ts, services/supabase.ts, components/booking/BookingContactFields.vue, services/booking/storage.ts, stores/booking.ts; backend/internal/booking/{models,http,store,events}.go. Current-source inspection only; no fresh production-state assertion.

## Browser storage and cookies

- ag-cookie-consent: localStorage choice/version/timestamp; analytics/marketing remain false.
- ag-language: localStorage only with preference consent; withdrawal deletes it. Language routing may independently choose a locale.
- Supabase sb-…-auth-token: persistent authentication session; lifetime depends on provider configuration.
- ag-booking-intent-v1: sessionStorage as above.
- ag-welcome-seen: sessionStorage introduction marker.
- ag-hero-preferences-v1: explicit animation/video choice in localStorage, separate from optional language consent; no automatic expiry.
- Google Maps iframe loads only after Maps consent; withdrawal removes the iframe, not data already sent or Google cookies.
- No active analytics/advertising scripts found. No new tracking enabled. Cookie-choice withdrawal does not log users out or erase other functional storage.

Cookie banner/settings behavior was retained. The policy now describes actual functional storage rather than claiming rejection leaves only one record. No consent-version change because processing behavior was not changed.

## Booking approval dependencies

The approved future catalog is three services: consultation (30 minutes), dental visit including a procedure (60 minutes), full oral hygiene (60 minutes); Dr. Anda Gutovska and hygienist Henriete Jete Otto. This task creates none of these records. Intended manual confirmation must be verified during activation; current code supports manual and automatic modes. Do not infer production settings from the draft. Exact working hours, privacy notice version and legal readiness remain activation gates.

## Outstanding clinic/legal decisions

1. Purpose-specific Article 6 bases and any Article 9 conditions; separate account, appointment, security and correspondence review.
2. Retention/deletion criteria for accounts, appointments, audit/revision history, acknowledgements, correspondence, infrastructure logs and backups. No periods invented.
3. Verified privacy-request contact, identity-verification procedure and DPO assessment.
4. Supabase, hosting, general email and other processor identities/contracts, regions, subprocessors and international-transfer safeguards.
5. Confirm production cookies/logging and classification of separately requested motion/session preferences. No analytics activation approved.
6. Future notification providers and disclosures; no Resend/WhatsApp implementation.
7. Clinic/legal approval of the complete LV text and equivalent RU/EN translations before publication. Existing accounts already require appropriate disclosure; this is not solely a future Booking issue.

Reference checks: [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679), [DVI rights](https://www.dvi.gov.lv/lv/datu-subjekta-tiesibas), [DVI transfers](https://www.dvi.gov.lv/lv/datu-nodosana-arpus-es-un-eez). No legal basis or retention period was inferred solely from technical implementation.

## Files changed

- frontend/src/content/legal.ts
- frontend/src/i18n/legalDocuments.ts
- frontend/src/views/LegalView.vue
- frontend/tests/legal-localization.test.mjs
- frontend/tests/privacy-review-browser.cjs
- docs/PRIVACY_POLICY_FINAL_REVIEW.md

## Verification

- Production build passed; existing large-bundle warning remains.
- Frontend unit suite: 153 passed, zero failed (includes legal, cookie, Booking, Auth and CMS tests).
- Legal content: seven targeted tests passed; matching section/paragraph structure, official proper-name exceptions only, controller/address/storage coverage, email rendering and language switching.
- Contact browser: 24 locale/responsive layouts and 24 validation/no-delivery flows passed; external traffic and API writes blocked.
- Dedicated Chrome legal browser: 12 route/locale/layout checks passed (375/1440 px), live LV/RU/EN desktop switching, complete section counts, footer privacy links and native cookie settings dialogs.
- Existing full Booking browser regression did not complete: timed out waiting for `.calendar-grid[aria-busy=false]` before consent. This is an unresolved test limitation, not a successful Booking E2E result. Booking code was not modified; unit regressions passed.
- Initial dedicated legal test used an explicit role attribute selector for a native dialog; corrected the test to `dialog[open]`, then it passed. No product behavior was changed to accommodate the test.
- `git diff --check` passed; only the six listed local files changed.
- All 15 Hero locks passed. Hero and Welcome files unchanged.
- Mobile checks use desktop Chrome emulation, not physical iOS/Android certification.
