# Employer handover

Reviewed implementation on feature/final-development. Final Git delivery status is
in FINAL_GIT_REVIEW.md; review does not authorize merge/deployment or production
DB/Auth/Storage changes. Existing public design,
Hero, Welcome, Auth and Booking retained. See FINAL_IMPLEMENTATION_STATUS.md for
checkpoint history and TEST_REPORT.md for actual environments/results.

## Delivered client interface

Appointments, Specialists and News are the three clinic-facing sections. Service,
price and generic CMS infrastructure is retained, but service creation and
price/duration editing are not exposed to clinic staff. Schedules, breaks and
vacations live inside each specialist editor; images live inside Specialist/News
editors. See ADMIN_USER_GUIDE.md for current actions.

Real isolated Auth, PostgreSQL, Go/Vue and Storage acceptance is documented in
FINAL_E2E_ACCEPTANCE.md. Production and hosted readiness are separate claims.

## Read first

ADMIN_USER_GUIDE.md: clinic staff workflows.
DEPLOYMENT_GUIDE.md: hosting and gated activation.
ADMIN_OPERATIONS_ACTIVATION.md: exact proposed-006 review and read-only preconditions.
MAINTENANCE_GUIDE.md: backups, updates and incidents.
KNOWN_LIMITATIONS.md: exact remaining scope and unavailable external evidence.
FINAL_GIT_REVIEW.md: current reviewed file inventory and feature-branch delivery.
CHANGED_FILES.md: historical checkpoint inventory; not the final release list.

## Approval and acceptance order

1. Review the draft feature PR, tests and known limitations. Any merge requires
   separate approval; Git delivery is not production activation.
2. Obtain current production schema/data/ledger fingerprints and a fresh encrypted
   recovery point. Historical backup verification is not a current recovery claim.
3. Migrations 001–006 have historical approved activation evidence. Verify the current
   ledger read-only before any future authorized deployment; do not replay them.
4. Select/approve Go hosting and secret manager, configure verified TLS/CORS/Auth.
   Deploy only on explicit approval; test health, public CMS and role denial.
5. Local isolated real Storage verification is complete. Verify the intended hosted
   environment separately and obtain explicit approval before enabling uploads.
6. Clinic owner supplies verified operational catalog/durations/schedules and privacy
   details. Do not infer readiness from eight editorial services or sample fixtures.
7. Deploy an approved preview; verify actual Vercel routes/301/404, dynamic CMS,
   sitemap, noindex, locale switching and existing public design on real devices.
8. Plan domain cutover separately; preserve old URL mapping and obtain Search Console
   access/export. Monitor indexing and traffic; no DNS changes in this task.
9. Approve retention/contact inbox separately if desired. Email is deferred and
   requires a separate owner decision/task; no delivery functionality exists here.

## Accounts and materials to transfer privately

GitHub ownership/access; Vercel project/environment ownership; Supabase project,
billing, DB/Auth/Storage policies and backups; domain registrar/DNS; backend hosting;
monitoring; approved media rights; clinic privacy/clinical content sign-off.
The Git repository contains none of the required private credentials, live users,
Storage objects or database archives. Use platform invitations/secret managers,
not email attachments, source files or this handover document, for secrets.

## Acceptance checklist

- [ ] All local test results reviewed with mock vs real isolated-DB distinctions.
- [ ] 15 Hero locks and imported content parity verified.
- [x] Migration 006 activation recorded in ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md.
  This acceptance task did not re-query production.
- [ ] Hosted backend/Auth/CORS and privileged denial verified.
- [ ] Real Storage verification and explicit upload activation approved.
- [ ] Clinic services, doctors, durations, schedules and privacy approved.
- [ ] Actual legacy HTTP redirects, locale SEO and sitemap accepted on preview.
- [ ] Backup/restore ownership, retention and incident plan assigned.
- [ ] Clinical/admin staff walkthrough completed.
- [ ] Email expectations explicitly recorded as deferred.

Unchecked hosted gates mean this handover is **not** a claim of production readiness.
