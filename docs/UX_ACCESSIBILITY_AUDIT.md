# UX and accessibility audit — local implementation

2026-10-10. Synthetic identities and intercepted local APIs only; no production
records were created or read. This is engineering QA, not a certified WCAG audit.

## Scope and fixes

LV/RU/EN at 320, 375, 390, 430, 768, 1024, 1440 and 1920px. Existing public design,
Hero, Welcome Intro and Header preserved. New operational editors use the existing
admin shell, translated labels, native controls and 44px minimum actions. Confirmed
visual inspection of new-content editor at 390 and 1440px; no clipped controls.

- Fixed Russian news-heading min-content overflow at 320px with a scoped grid and
  word wrapping; no typography or global layout changes.
- Native appointment/media dialogs retain keyboard focus. Tests select the open
  dialog, rather than the hidden navigation drawer.
- Extended existing admin in-memory editor preservation to schedules/appointments
  and operational service/doctor routes. During role verification the shell is
  hidden and inert; access is never granted by mounting state. Logout, changed
  identity and revoked authorization remove access.
- Fixed a new-content route load racing with admin revalidation. Loads start only
  with verified authorization; successful loads are remembered so focus checks do
  not erase edits. Catalog route changes use the same guarded loading rule.
- Required fields, conflicts, missing API/schema, unsaved drafts and read-only
  privacy blockers remain explicit. No fake submission, appointment or upload.

## Executed evidence

New-content creation/publication/archive/restore: 24 locale/viewport scenarios.
Services: 24. Price rows: 24. Doctors/portrait selection: 24. Schedules: 24.
Appointments: 24, including focus confinement, preserved contact data during
revalidation, idempotent network retry and stale edit conflict.
Existing CMS: 214 checks; media: 45; persistent navigation: 135.
Earlier checkpoints: Auth 96 layouts plus flows; Contact 24 layouts and 24
validation/no-delivery flows; Booking 172 layouts and 31 flows; admin gate 16.
Final regression totals and any later reruns are recorded in TEST_REPORT.md.

Expanded public sweep passed 480 checks. Final admin suite passed 299 checks;
TEST_REPORT.md records all final reruns and test-contract corrections.

## Limits

No live clinic usability study, assistive-technology certification or exhaustive
screen-reader/contrast audit is claimed. Keyboard/focus and label assertions do
not establish full WCAG conformance. Hosted latency, real Storage delivery and
real patient workflows require separately approved acceptance testing.

## Files

AdminGate.vue; router/admin.ts; AdminCatalogView.vue; AdminCreatedContentView.vue;
AdminAppointmentsView.vue; services/dialogFocus.ts; scoped NewsView.vue rule;
appointments/created-content/doctors/schedules/operations/price-editor/public-routes/
cms-navigation browser suites. Existing unrelated public components unchanged.
