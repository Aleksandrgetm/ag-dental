# Deployment readiness — do not deploy automatically

Branch feature/final-development; production activation requires separate approval.
No production configuration, DNS, credentials, buckets or data changed in this task.

## Architecture and gates

Vercel hosts the Vue build and a small public-content metadata/sitemap function.
It does **not** host the Go/Gin API. Choose a compatible long-running Go container
runtime, HTTPS termination, persistent secret manager and an approved region.
Do not enable bookings or uploads simply because the application starts.

Before release: review diffs/tests; verify a fresh encrypted backup and isolated
restore; approve any proposed schema; configure verified clinic durations, eligible
doctors, Riga schedules and privacy acknowledgement/version; approve retention;
verify hosted Storage separately. Email: DEFERRED — OWNER DECISION / NOT IMPLEMENTED.

## Local build and container preparation

From repository root:

```sh
cd frontend
npm ci
npm run build
cd ../backend
go test ./...
go build ./cmd/api
```

Go toolchain 1.27.2 is declared in go.mod. The optional backend/Dockerfile builds a
non-root image with CA roots, ffmpeg, ffprobe and cwebp. Build context is backend/;
.dockerignore excludes private env/TLS material, SQL and tests. This image never
runs migrations. Local image building is not a deployment:

```sh
docker build -t ag-dental-api:local backend
```

Keep secrets outside build arguments/layers. At an approved host, inject environment
through its secret manager. Mount the verified database CA read-only at the path
named by sslrootcert. A read-only root filesystem with writable bounded /tmp is
recommended; media processors need temporary space, CPU/time limits and at least
the configured request duration. Native media support must be checked at startup
acceptance with `ffmpeg -version`, `ffprobe -version`, `cwebp -version`.

## Backend configuration

Use backend/.env.example for variable names, never commit filled values:

- DATABASE_URL: actual Session Pooler hostname/port/project user; sslmode=verify-full
  and sslrootcert pointing at the trusted readable CA. Do not print the URL.
  Backend rejects unverified remote TLS. Keep runner TLS configuration equally strict.
- SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY: correct project frontend-safe verifier
  settings. No arbitrary client/admin role is accepted; Go checks user_roles.
- SUPABASE_STORAGE_SECRET_KEY: backend secret manager only. Never VITE_, Git or logs.
- MEDIA_UPLOADS_ENABLED=false until scoped real Storage testing and owner approval.
- CORS_ALLOWED_ORIGINS: comma-separated exact approved frontend origins; no wildcard.
  Do not broadly allow every preview origin. Keep local defaults out of live acceptance.
- PORT: hosting runtime's port. Bind behind HTTPS; Go itself is an internal HTTP listener.

Apply gateway request-size/time limits compatible with media's 32 MiB file limit
and multipart overhead. Go timeouts are 125s read / 150s write; coordinate proxy
limits and graceful container termination. Limit network access and database pool
capacity (20 open / 5 idle connections per instance). Rate limiting is process-local;
multiple replicas need an approved shared gateway limit. Avoid patient body/query
logging. Configure uptime/error monitoring with redaction and no appointment payloads.

## Frontend and Vercel

Project root: frontend; build `npm run build`; output `dist`; Node runtime supporting
current Vite/TypeScript tooling. Use lockfile installation. Configure only the real
public VITE_API_URL ending in /api once Go is hosted; blank renders public fallback
and unavailable API features safely. VITE_SUPABASE_URL/PUBLISHABLE_KEY are public
Auth settings. VITE_BOOKING_DEMO=false; demo transport is excluded from production.

Set server-only CMS_PUBLIC_API_URL to the real HTTPS Go API base including /api
for dynamic initial HTML and sitemap. No service-role or Storage key is needed by
this renderer. It uses published content only, never admin APIs. The optional base
must have no userinfo/query/fragment. Blank supports known bundled pages; unknown
CMS pages return unavailable rather than invented content.

frontend/vercel.json includes exact legacy 301s, public HTML renderer, private route
noindex headers, security headers, filesystem assets and real unknown-route 404.
The function includes dist/index.html and dist/robots.txt. Preview uses noindex and
robots disallow. **Local HTTP tests do not prove Vercel packaging or edge behavior.**
On an approved preview, verify all discovered legacy paths, query languages, direct
Auth/admin/Booking refresh, dynamic CMS pages and runtime sitemap before production.
Do not change old hosting/DNS or redirect unrelated URLs to the homepage.

## Migrations and activation

Prior authorized tasks recorded migrations 001–008 applied (see individual activation reports). This task did not reconnect to
production or alter that ledger. Inspect fresh project identity, TLS, ledger,
checksums, schema/data fingerprints and recovery evidence before any approved write.
Existing runner: `cd backend && go run ./cmd/migrate`; it knows only 001–005.
**Do not run it against production as part of this handover.**

006_admin_operations.sql is in migrations/proposed only, NOT registered in the
runner. It was tested only against disposable PostgreSQL. Review overlap/source-link
preconditions and CMS event constraint, prepare reviewed runner integration/checksums,
then obtain explicit owner approval. Do not manually apply it as a shortcut.
Until then new operational lists/CMS creation may correctly report unavailable.

## Release verification and recovery

1. Approved preview: GET /api/health, published CMS, 401/403 admin denial, browser
   network/CORS, verify-full hostname/CA, synthetic staging tests, missing API fallback.
2. Verify all 15 Hero locks, content parity, locale/deep-link and status tests.
3. Owner verifies clinic facts, privacy and actual operational readiness separately.
4. Fresh backup must cover Auth/data/schema/roles and account for managed Storage
   separately. Test restores only in an isolated approved destination.
5. Prefer reverting application deployment for code faults; do not automatically
   roll back schema or erase audit/history. If commit outcome is uncertain, inspect
   ledger and objects before retry. Backup covers its snapshot, not subsequent activity.
6. Monitor errors, unauthorized attempts, conflicts, API latency and Search Console
   index/traffic after an explicitly approved cutover. Never log patient data for SEO.

Hosted services, account access, Storage writes, DNS and paid resources remain owner
approval gates. No Resend or alternative email integration is included.

## Migration 006 activation update (2026-10-10)

The earlier proposed-006 notes describe the pre-activation state. Owner-approved
006 is now recorded in AG Dental production; do not replay it. Current runner accepts
ledger 001–006, keeps the default manifest at 001–005, and provides the explicit
`--apply-admin-operations` operation with pinned checksum and verified no-op behavior.
See [ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md](ADMIN_OPERATIONS_PRODUCTION_ACTIVATION.md).
A new independent environment needs its own approved migration sequence. The latest
backend currently runs locally only; no hosted deployment or public booking/upload
activation was performed.

## Acceptance update — 2026-10-11

Migrations 001–006 have prior activation reports; this task did not connect to
production or verify its current ledger. Do not replay them. The approved local
acceptance stack uses freshly generated Auth credentials, loopback ports, disposable
PostgreSQL and real Supabase Storage. See FINAL_E2E_ACCEPTANCE.md. Its local
MEDIA_UPLOADS_ENABLED=true is test-only; production must remain false.

Before release, verify real hosted Auth redirects/JWT, HTTPS/CORS, API URL, Storage
permissions/optimization, gateway limits, backups and monitoring. Test Vercel edge
301/404/noindex and canonical/hreflang/sitemap behavior on an approved preview.
Local equivalent-server tests cannot prove Vercel packaging or deployed behavior.

## Git review branch deployment guard

`frontend/vercel.json` disables Git-triggered deployments only for
`feature/final-development`. This permits the reviewed branch push and draft PR
without deploying it. Other branches retain their existing behavior. Do not remove
this guard or trigger a manual deployment without explicit approval.
Reference: https://vercel.com/docs/project-configuration/git-configuration

## Current handover gates — 14 October 2026

The employer's team owns deployment. No deployment, DNS or Vercel changes were made in
this audit. The committed Vercel Git deployment map disables feature/final-development
and feature/hero-mobile-fix only; it does **not** disable every possible branch. Review
preview automation before any future push of feature/final-audit. No push is authorized here.

Existing database: inspect ledger/checksums and do not replay completed migrations.
For a separately approved fresh target, the runner's ordinary operation covers 001–005;
006, 007 and 008 require `--apply-admin-operations`, `--apply-news-archive` and
`--apply-booking-horizon`, respectively, in that order. Do not run these commands merely
from reading this guide. Do not use AutoMigrate or development fixtures in production.
The migration runner uses its supplied DSN; the operator must explicitly supply verified
TLS (`verify-full` with the trusted readable CA), independently of API TLS validation.

Local upload activation is historical evidence, not permission to enable an employer's
hosted backend. Keep privileged Storage keys backend-only and verify private bucket,
JWT/role denials, file validation and public publication-gated delivery on the actual host.
Never copy local .env into Git, frontend artifacts or deployment images.

Before public Booking activation: confirm the three service durations and two specialists,
actual schedules, manual confirmation, one calendar month and advance-notice semantics;
remove the owner's test Monday schedule only after dependency checks and explicit approval.
No automatic appointment email or WhatsApp exists. General questions have no delivery API.
Supabase Auth's account confirmation/recovery emails are a distinct provider feature.

Approved real clinic Hero footage, legal approval, actual iOS/Android checks, backup
ownership, incident response and hosted HTTP/SEO/Auth tests remain acceptance gates.


## Save-point update — 15 October 2026

The technical audit is paused by the owner before photography integration. Completed CMS compatibility, mobile menu/service-grid spacing and SVG arrow fixes are being saved with their tested evidence. The earlier audit findings remain dated evidence: contrast, startup layout shifts, initial bundle reduction and replacement of the obsolete standalone Media Library test are still unfinished. No performance experiments or photo integration are included.

The branch's reviewed `frontend/vercel.json` now explicitly sets `git.deploymentEnabled["feature/final-audit"]` to false, alongside the two existing disabled branches. The matching regression test protects the exact map. This supersedes the earlier warning that this branch was not covered; other branches are unchanged. Vercel documents this as preventing automatic deployments for the named branch: https://vercel.com/docs/project-configuration/git-configuration . No repository GitHub Actions workflows or repository webhooks were found. Only this branch may be pushed under the current authorization; no deployment or merge is authorized.

See WORK_SAVE_REVIEW.md for the current file inventory, test evidence and save-point limitations.
