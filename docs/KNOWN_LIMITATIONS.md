# Current limitations — 14 October 2026

This section supersedes conflicting historical notes below. See FINAL_TECHNICAL_AUDIT.md.

- Employer: Go hosting, HTTPS/CORS, real API URL, Auth redirect allowlists, monitoring,
  Vercel packaging/301/404/noindex and real-device validation are not deployed/verified here.
- Clinic: real AG Dental Hero footage is not approved/provided. Rejected footage is not
  rendered; source files remain in the repository/public asset tree for preservation.
- Clinic/legal: controller identity is confirmed, but retention, bases, privacy contact,
  processors/transfers and final LV/RU/EN text remain approval-required.
- Clinic + separate production authorization: configure three procedures/two specialists,
  Wednesday/Friday hours and individual monthly dates, manual confirmation and advance
  notice. Public Booking is inactive. The Monday schedule is test data, not clinic hours.
- Historical production reports record migrations 001–008 and 8/6/69 catalog activation.
  This audit does not verify current live fingerprints or authorize migration replay.
- Local image uploads were approved previously; hosted upload activation needs its own
  verification/approval. No additional production upload was performed.
- Four admin sections now include Services & Prices. News supports reversible archival.
- General questions have no backend delivery. Booking emails/WhatsApp/Resend are absent;
  Supabase Auth recovery/confirmation is separate.
- Search Console and field CWV unavailable. Browser emulation is not physical-device QA.
- Current automated contrast findings, bundle cost and all test limitations are detailed
  in the final audit. No complete WCAG or production-readiness certification is claimed.

## Historical checkpoint notes (not current activation instructions)

# Remaining limitations and activation gates

## Must resolve before affected production features

1. Migration 006 is now activated through the tested explicit runner operation;
   current local API routes and admin screens verified. See
   [activation results](ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md). Operational
   catalogs are still empty; clinic data and privacy readiness remain required.
2. Go hosting, HTTPS/CORS, real API URL, secret manager and monitoring are not deployed.
   Public fallback works; API-dependent features are honestly unavailable without Go.
3. Real local Supabase Storage upload/delivery/deletion has been tested in isolation.
   Hosted Storage upload/replace/delete behavior has not been tested in this task.
   MEDIA_UPLOADS_ENABLED=false. Separate scoped staging or synthetic test approval
   and backend-only credentials are required; never use clinic assets as test files.
4. Real bookable services, verified durations, eligible doctors, schedules, booking
   policy and privacy notice readiness require clinic confirmation. No data invented.
5. Contact inbox/data retention/controller details remain unconfirmed. No message
   storage or delivery implemented; form offers direct contact alternatives.
6. Email/Resend: **DEFERRED — OWNER DECISION / NOT IMPLEMENTED**. No alternative
   provider, templates, delivery, reminders or claimed email success.

## SEO / deployment evidence gaps

- Search Console unavailable: legacy crawl covers all discovered reachable pages,
  not unknown historical/orphan URLs. Owner must obtain access/export when possible.
- Eight exact redirect rules and public renderer pass local HTTP tests. Vercel edge
  route order, status, packaged files and deployed preview noindex are NOT VERIFIED.
- Existing public page body remains Vue-rendered; initial metadata is server-ready,
  new structured pages have initial plain content. Full existing-page SSR is not done.
- Field Core Web Vitals, rankings, indexing and mobile network latency unavailable.
- Clinical attribution and legal facts must be owner-reviewed; no invented expertise.

## Local implementation boundaries

- Six approved price category templates retained; rows can be added/edited/ordered/
  archived. New top-level category templates need a reviewed code/content change.
- Operational profiles do not automatically replace existing editorial doctor bio.
- New structured content supports unpublish/history; retiring imported legacy
  articles/routes needs a reviewed redirect/editor extension, not silent deletion.
- Catalog list limit 1,000; larger datasets return unavailable instead of truncation.
- Main JS and lazy admin catalog still exceed Vite's 500KB warning threshold.
- Process-local rate limiter needs shared enforcement if multiple API replicas.
- Full WCAG certification, actual screen-reader study and live clinic user acceptance
  were not performed. Automated keyboard/layout checks are narrower evidence.
- Runtime image package scanning/SBOM, CSP tuning and platform shutdown behavior need
  hosting acceptance. npm and reachable Go vulnerability checks are documented separately.

The Final Master implementation did not connect to production. A later, separately
authorized [activation investigation](ADMIN_OPERATIONS_ACTIVATION_INVESTIGATION.md)
now verifies 001–005, CMS parity and fresh encrypted backup/isolated restore. It also
identifies the stale local API process as the immediate missing-route cause. Migration
006 and runner integration subsequently completed with explicit approval; clinic
configuration and upload/hosting gates remain pending.
No production write capability was tested by changing clinic data.

## Admin UX simplification acceptance (2026-10-10)

- New guided doctor setup requires the latest Go binary (atomic setup/options API).
  The current local backend was restarted and verified; no new migration is needed.
  Other environments must run the updated Go binary before using this editor.
- Doctor details, services and weekly intervals save atomically. Absences/vacations
  use the existing Schedule screen after the doctor has an ID; the link opens a new
  tab to preserve the current draft. No invented default hours are supplied.
- Operational services appear in Booking when eligible. Creating one does not
  automatically add a new public marketing-service template; the existing eight
  service pages and six price categories remain approved templates.
- Published website prices remain authoritative. An unlinked operational service
  cannot be assigned an independent contradictory website price in this UI.
- Doctor readiness shown in the browser is guidance; the server revalidates actual
  eligibility, durations, schedules and privacy configuration on activation.
- Before/after screenshots and automated workflow tests are synthetic acceptance
  evidence, not a clinic employee usability study or production write verification.
- Native keyboard/focus and responsive checks are not a full screen-reader/WCAG audit.

## Acceptance evidence update — 2026-10-11

See FINAL_E2E_ACCEPTANCE.md for real local service evidence. Earlier descriptions
of broad CMS/price/schedule navigation are historical: the clinic interface now
exposes only Appointments, Specialists and News. Prices/durations cannot be edited
by staff through the UI; breaks and vacations are embedded in Specialist Schedule.
No production or hosted readiness is inferred from local success.
