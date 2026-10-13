# Final end-to-end acceptance — AG Dental

Date: 2026-10-11. Branch: `feature/final-development`.

**Decision: local technical acceptance demonstrated; conditional handover for
review. NOT fully production-ready.** Hosted deployment and clinic activation gates
remain open. No production Supabase connection or mutation, deployment, DNS change,
commit, merge or push was performed by this acceptance work.

## Evidence boundaries

- **Real browser/backend:** Chrome → Vue → Go → disposable PostgreSQL. API requests
  were not fulfilled or mocked. Outgoing browser requests were restricted to loopback.
- **Real authentication:** local official Supabase GoTrue container, real signup and
  login, real tokens verified by Go, authoritative database `user_roles`. Fresh
  synthetic identities and keys; no production credentials. Forged user metadata
  did not grant administrator access.
- **Real Storage:** approved local official Supabase Storage container, private
  synthetic bucket, file backend, real API/RLS, actual uploaded/optimized files.
  This is not hosted Supabase/S3 acceptance.
- **Disposable database:** PostgreSQL 17.11, tmpfs, fresh schemas/migrations/imported
  approved content plus synthetic operational records. Manual confirmation is a
  local fixture for exercising confirmation; production settings were not changed.
- **Mocked browser regression:** existing suites separately intercept API/Auth
  transport. Their responsive/error/revocation results are not real persistence proof.
- **Production verified:** NOT TESTED in this task. Earlier migration 001–006
  activation reports remain historical evidence, not a fresh production audit.
- **Hosted staging:** NOT TESTED; no deployment authorization used.

Machine-readable evidence: [FINAL_E2E_EVIDENCE.json](FINAL_E2E_EVIDENCE.json).
Screenshots: [screenshots/final-e2e](screenshots/final-e2e).

## Checkpoint matrix

| Phase | Status | Evidence / limits |
|---|---|---|
| 1 Isolated environment | PASS | Pinned PG/Auth/Storage images, unique network, loopback-only published ports, generated local keys, envDir:false, Go launched outside repo `.env`, demo false |
| 2 Synthetic clinic | PASS | Two seeded doctors, three explicitly synthetic services/durations, eligibility, recurring hours, breaks, vacation and privacy version; third doctor created through UI |
| 3 Booking lifecycle | PASS | Real mobile guest browser submission persisted; admin confirmation/reschedule/cancel/history; slot release; idempotent retry; concurrent 201/409 and exactly one active row |
| 4 Simplified admin | PASS | Day/Week/Month, details, manual booking; specialist eligibility/hours/break/vacation/activation; News LV/RU/EN draft/preview/publish/unpublish and real public delivery |
| 5 Local Storage | PASS | Browser image upload, optimized derivatives, authenticated preview, published delivery, private originals, direct role denials, type/size rejection, replacement/publication, reference protection, unreferenced archive/purge |
| 6 Public website | PASS (local scope) | 48 real-service cases: eight routes × LV/RU/EN × 390/1440px; no overflow, broken loaded images, JS errors or demo banner; broader public routes covered separately |
| 7 SEO migration | PASS (local); hosted NOT TESTED | Fresh 12-endpoint crawl; eight real local HTTP301 → one-hop200; metadata/hreflang/sitemap/robots tests; unknown dynamic content with missing API correctly returns503 |
| 8 Security/privacy | PASS (tested scope) | Real JWT tampering401, ordinary user403, anon401, database role denial, Storage policies; PostgreSQL conflict/rate/consent regressions; no production credential use |
| 9 Accessibility/performance | PASS (limited automated scope) | Responsive, labels, keyboard/error/loading regressions; screenshot inspection. Main bundle warning remains; field CWV and screen-reader/staff studies NOT TESTED |
| 10 Regression | PASS subject to results below | Build, unit/HTTP, Go, real PostgreSQL, targeted browser suites, manifest and Hero checks |
| 11 Handover | PASS | README and five required handover documents updated; obsolete service-editing/navigation and pending006 instructions corrected |
| 12 Report | PASS | Evidence distinctions, persistence, limitations and exact task files documented |

## Regression results

Build PASS; 108 unit/HTTP tests PASS; Go/PostgreSQL suites and go vet PASS; Hero15
and content manifest194/2198/26/12 PASS. Fourteen existing browser suites passed (including no-API production build:132
public checks and6 unavailable/Auth checks);
exact counts and screenshot inventory are in FINAL_E2E_TEST_RESULTS.json.

## Persistence and lifecycle evidence

The final synthetic appointment was `a9b56d45-437e-4fd4-9392-55bf0946936e`,
reference `AG-28435500C2605D0E9DBA`. Its ID/reference/timestamps are recorded in
FINAL_E2E_EVIDENCE.json. Tests query PostgreSQL directly after the browser receives
HTTP201 and compare the saved reference/status. Confirmation changes the row to
`confirmed`; rescheduling changes its instant; cancellation changes it to
`cancelled`. Four ordered audit events are asserted: created, confirmed,
rescheduled, cancelled. Original and moved slots are checked through real availability.

Two concurrent HTTP submissions for the same doctor/time return exactly 201 and409;
PostgreSQL contains one active row. Reusing the initial idempotency key returns200
and the original appointment ID, not a duplicate. Manual appointment creation also
persists through the admin UI. This satisfies the final real-booking acceptance
criterion; no demo confirmation screen is used as evidence.

## Storage isolation and safeguards

Official Auth/Storage images and PG are pinned by digest in
`backend/scripts/acceptance-local.py`. The local private bucket matches the reviewed
32MiB MIME allowlist and restrictive policies. The raw local PostgreSQL cluster
needs explicit Supabase-equivalent schema grants; tests then exercise RLS using
actual anonymous/authenticated tokens. This setup is not a claim that hosted
platform grants were inspected.

A generated blue PNG uploaded through the editor produces original/display/medium/
thumbnail objects. Published article images load through the Go public delivery
route. Original/private/unpublished access is rejected. A historically referenced
asset cannot be archived (409). An unreferenced synthetic image can be archived and
purged; SQL verifies its Storage objects are gone. Invalid SVG and oversized input
are rejected. Production MEDIA_UPLOADS_ENABLED was not changed.

Local HTTPS uses an ephemeral localhost certificate with hostname SANs. Go/Node
trust that exact certificate; Chrome is scoped to its SPKI. Local disposable PG
uses unencrypted loopback/container transport; this does not replace or claim
production `verify-full` verification. Temporary keys, containers, volumes and
network are removed by the harness.

## SEO and public review

Fresh read-only crawl evidence: [FINAL_E2E_LEGACY_EVIDENCE.json](FINAL_E2E_LEGACY_EVIDENCE.json).
Eleven endpoints returned200 and the old `/cdn-cgi/l/email-protection` endpoint
returned404. No new discoverable route was found. Existing mapping remains
`LEGACY_URL_MAPPING.csv`; no invented redirects or homepage catch-all were added.

The new HTTP test consumes the eight actual Vercel redirect rules and confirms
301 plus a one-hop200 destination using the existing renderer. Static unknown URLs
return404; unknown CMS article URLs return503 when the CMS API is unavailable, to
avoid asserting absence during an outage. Existing renderer tests cover localized
canonical/hreflang and preview robots/noindex. Actual Vercel edge packaging, hosted
API-backed unknown-article404 and domain cutover still require approved preview QA.
Search Console remains unavailable: discovery cannot prove all historical/orphan URLs.

## Findings and corrections

One admin-only thumbnail mapping defect was fixed: `AdminMediaPreview.vue` now
uses the existing validated `mediaID` parser for saved `cms-media:upload.*` values
before matching authorized media. Previously saved uploaded images showed a
placeholder in the editor while public delivery still worked. The real browser
regression checks a loaded thumbnail before replacement. No public-design, Hero,
Welcome, Booking or Auth implementation changes were made. Test setup corrections included Auth schema search_path,
local Storage grants, optional-cookie dismissal, and leaving Preview before image
editing. These were harness corrections, not bypasses of application authorization.
An initial sandboxed unit run could not bind a local HTTP port; the permitted rerun
passed. Expected RLS-denial output is a successful negative test, not an API failure.

Screenshots initially caught entrance animations; capture now waits for them to
settle. The public design is preserved. Large main JS chunk warning remains:
1,291.69kB minified / 287.15kB gzip in this build. No field CWV score is claimed.

## Remaining release blockers / approvals

1. Approve and configure hosted Go runtime, HTTPS, exact CORS origins, real API URLs,
   verified database TLS, backend-only secrets, media processing tools and monitoring.
2. Verify hosted Auth redirects/token validation and Storage behavior/permissions;
   explicitly approve production upload activation. Local success is insufficient.
3. Supply verified clinic services/durations, eligibility, schedules and privacy/
   controller/retention details. Explicitly approve Booking activation; no synthetic
   catalog was inserted into production.
4. Verify a current recovery point and operational ownership before release. This
   task did not create or validate a production backup.
5. Deploy only an approved preview; check edge301/404/noindex, CMS rendering, real
   devices, network performance and accessibility. Then approve any domain cutover.
6. Obtain Search Console access/export and monitor indexing/clicks/impressions after
   a separately approved migration. Historical coverage is currently incomplete.
7. Clinic staff/clinical/legal sign-off is outstanding. Contact delivery remains
   unavailable. Resend, email, reminders and alternate mail providers are excluded.

## Exact files attributable to this acceptance work

New:
- backend/scripts/acceptance-local.py
- backend/testdata/acceptance.sql
- frontend/scripts/acceptance-server.mjs
- frontend/tests/acceptance-real-browser.cjs
- frontend/tests/acceptance-workflows.cjs
- frontend/tests/acceptance-public.cjs
- frontend/tests/acceptance-redirects.test.mjs
- docs/FINAL_E2E_ACCEPTANCE.md
- docs/FINAL_E2E_EVIDENCE.json
- docs/FINAL_E2E_LEGACY_EVIDENCE.json
- docs/FINAL_E2E_TEST_RESULTS.json (regression summary)
- docs/screenshots/final-e2e/*.png (explicit inventory in test-results artifact)

Updated:
- frontend/src/components/admin/AdminMediaPreview.vue
- README.md
- docs/HANDOVER.md
- docs/DEPLOYMENT_GUIDE.md
- docs/ADMIN_USER_GUIDE.md
- docs/KNOWN_LIMITATIONS.md
- docs/TEST_REPORT.md

Existing browser suites also regenerate their documented specialist/calendar
screenshots. Those paths are listed in the test-results artifact. The repository
already contained substantial uncommitted work; this list does not attribute the
entire working-tree diff to this task. No prior changes were discarded.

## Cleanup

All acceptance containers and the dedicated network were removed. Temporary Auth
keys, local TLS keys and private diagnostic directories were deleted, including
failed setup attempts. The task-owned mock Vite server was stopped. Existing user
services were left alone. Only synthetic evidence and screenshots remain in the repo.
