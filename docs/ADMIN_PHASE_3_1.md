# Admin Phase 3.1 — implementation record

## Checkpoint 1: repository and security audit — PASS

Inspected 9 October 2026 on `feature/admin-dashboard`, with a clean working tree. A temporary SHA256 manifest records all tracked files before changes. No live database inspection or writes were performed.

- Vue Router currently has no admin routes. Existing Supabase session restoration, login, logout and recovery live in the Auth Pinia store.
- `GET /api/auth/me` verifies the bearer token through Supabase `/auth/v1/user`, then reads `public.user_roles` through the Go database connection. Client metadata is not an authority.
- Existing `/api/admin/health` and every `/api/admin/booking/*` route independently require the verified identity and database `admin` role. Responses use `no-store`.
- Booking admin reads support paginated appointments filtered by date/status and booking settings. There is no dashboard aggregate, all-doctors catalog, recent-events endpoint, contact-message inbox or CMS API.
- Public bookable services are filtered by active/booking-enabled flags and a non-null duration. The response also exposes privacy notice readiness; the public Booking frontend checks it separately. This catalog cannot be represented as a count of all active services.
- Migration 001 forces new accounts to `user` and revokes direct browser access to roles. Migrations 002–003 contain Booking schema and automatic confirmation; this phase neither edits nor runs migrations.
- Existing frontend tests, mocked Auth/Booking/contact browser suites, Go tests, Auth configuration-helper tests and the 15-file Hero manifest are available. Database integration suites require explicitly confirmed disposable test databases and never fall back to production configuration.

### Architecture and affected files

Reuse the existing Auth store, add race-safe authoritative role verification and an admin GET client. Protect a lazy `/admin` route group with a gate that never mounts dashboard content before verification. An admin-only application branch isolates its layout from public Header/Footer/motion. Keep Auth pages untouched; a narrowly scoped router return destination handles login-to-admin. Add only the admin entry to the existing account dropdown.

New code belongs in `services/admin`, `stores/admin`, `components/admin`, `views/admin`, `router/admin.ts`, and `i18n/admin.ts`. Shared integration changes are limited to `App.vue`, `main.ts`, `router/index.ts`, `stores/auth.ts` and `components/layout/AuthControl.vue`. Add focused frontend/browser/backend authorization tests and CMS/media documentation.

### Risks and boundaries

Role revocation must clear visible data and invalidate in-flight responses. Backend outages must not become a zero count or guest success. Paginated lists must not be presented as total counts. A stale or manipulated frontend role never authorizes a server operation. Pending verification hides the account-menu entry. All testing uses mocked identity/API services or isolated test infrastructure; live admin identity, live roles and deployment remain NOT VERIFIED.

## Checkpoint log

Implementation proceeds through checkpoints 2–10 in the master prompt. Results and exact commands will be recorded after each gate is exercised.

### Checkpoint 2 — PASS

Four focused unit tests cover exact redirect allowlisting, identity/role response validation, guests/users/admins/revocation/outages and late-response invalidation. Six browser access scenarios passed against intercepted Auth/API responses. Existing Go Auth tests passed with database integration connections explicitly disabled. Auth pages and Hero files remain unchanged.

### Checkpoint 3 — PASS

The existing account dropdown gains only a localized admin link. Opening it starts fresh server verification; the link is absent while checking or on failure. Sixteen browser access/menu scenarios passed, including all three languages. Header markup and styling outside AuthControl are unchanged.

### Checkpoint 4 — PASS

All eleven routes resolve. The navigation/layout browser gate passed 49 checks, including all access/menu checks, eleven routes at phone/tablet/desktop sizes in Russian, a wrapped keyboard focus loop, Escape and focus restoration. Drawer navigation closes correctly. No public layout elements render inside admin.

### Checkpoint 5 — PASS

Shared page-header, empty, loading, error, stat and status components require no new dependency. Used states passed the 49-check browser layout/navigation gate again and the production build. Confirmation/edit forms are deliberately deferred because no management action exists in this phase.

### Checkpoint 6 — PASS

Eight focused admin unit tests and 25 browser access/menu/dashboard scenarios passed. The dashboard reads existing GET endpoints only: today's appointments (Europe/Riga date; first 50), pending appointments (all dates; first 50), settings and the public bookable service catalog. Counts at the page limit show `50+`; unknown is never zero. There is no full upcoming-calendar aggregate, doctor count, inbox or recent-events read endpoint, so those capabilities are not fabricated. Unused contact/identity fields are discarded at the client parsing boundary. A privileged 401/403 clears dashboard state; retries are explicit.

### Checkpoint 7 — PASS

See `ADMIN_CMS_MEDIA_ARCHITECTURE.md` for employee workflows, full locale/block coverage, shared catalog ownership, proposed schema, drafts/revisions, preview/publishing/cache invalidation, private staging/public delivery, controlled uploads, immutable replacements, usage-safe deletion and protected Hero video. Official Supabase Storage documentation was consulted. All database/Storage work remains a proposal, not an implemented feature.

### Checkpoint 8 — PASS

The compiled production build passed 289 browser assertions/scenarios: all eleven routes at 320, 375, 390, 430, 768, 1024, 1440 and 1920 pixels in LV/RU/EN (264 route/layout combinations), plus access/menu/dashboard states. No horizontal overflow, runtime errors or Vue/i18n warnings. Desktop and mobile screenshots were inspected. Drawer Tab wrapping, Escape and focus restoration passed. Four locale/navigation unit tests also passed.

### Checkpoint 9 — PASS (mocked services; live checks NOT VERIFIED)

The security browser suite passed 26 access/menu/security scenarios, including direct-link login and return, logout, client-side Pinia/localStorage/user-metadata role forgery, repeated rejected refreshed tokens, an actual eight-second API timeout, mobile account-menu navigation, live locale switching and unsafe return destinations. Refresh is bounded to prevent loops. Late responses cannot restore revoked access. API 401/403 purges dashboard state; no private data mounts during permission verification.

New Go tests exercise all seven registered Booking admin endpoints with missing, forged and expired token responses (401), a valid ordinary user (403) and identity-provider outage (503): 35 rejection subcases. A separate middleware test verifies an unchanged token against admin → user → admin roles with a fresh trusted role lookup on every request. Existing verifier tests exercise the real Supabase-verification adapter against a test HTTP server. Public signup remains unchanged: it sends privacy metadata only, and migration 001 explicitly inserts `user` regardless of submitted metadata. No self-promotion endpoint exists. The live signup trigger, live role grants and an actual production admin session were not exercised.

The changed/new files and compiled frontend were scanned for privileged Supabase keys, PostgreSQL credential URLs and private-key material; no matches. Test configuration uses only a synthetic publishable key. Tokens, patient contact information and raw provider/database errors are not added to application logs.

## First administrator: future, explicitly approved operation only

No account or role was created/promoted in this task. Role infrastructure was inspected in repository migrations, trusted Go middleware and isolated tests; current live roles are NOT VERIFIED. The first admin must be an existing, owner-approved Supabase Auth account.

1. Obtain explicit owner approval naming the intended existing account. Use a trusted operator's verified-TLS database session or Supabase SQL editor; never a browser-exposed privileged key, client metadata or a public endpoint.
2. Read the exact `auth.users.id`, email and confirmation state and its matching `public.user_roles` row. Confirm the intended project and person through a separate trusted channel. Stop on a missing/duplicate/unexpected role row; do not create or repair it as part of promotion.
3. In that trusted session, start a transaction and lock/recheck the one role row. Bind the verified UUID and email as parameters through the trusted client. The following is a future-operation template, not a migration and not executed here:

```sql
BEGIN;
SELECT u.id, u.email, u.email_confirmed_at, r.role
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE u.id = $1::uuid AND u.email = $2
FOR UPDATE OF r;

UPDATE public.user_roles r
SET role = 'admin'
FROM auth.users u
WHERE r.user_id = u.id AND u.id = $1::uuid
  AND u.email = $2 AND u.email_confirmed_at IS NOT NULL
  AND r.role = 'user'
RETURNING r.user_id, r.role;
```

4. Expect exactly one approved row from both statements. Commit only after checking it; otherwise roll back. Parameter placeholders require a parameter-capable trusted client; they are not pasted as literal values into SQL Editor. Record operator, approval, account UUID, timestamp and old/new role in the clinic's restricted operations record, without passwords or tokens. No change to `auth.users` is needed.
5. The existing session can use `GET /api/auth/me` to verify `role: admin`, reopen Account and enter `/admin`; each privileged API still performs its own role lookup. Confirm an ordinary user remains forbidden. Revocation uses an equally approved conditional update back to `user`; the API takes effect on its next request. The UI rechecks on entry/navigation/focus and every 60 seconds, and clears on a privileged rejection.

This procedure is documentation, not permission to execute it. First-admin creation/promotion and live acceptance remain future operator tasks.

## Checkpoint 10 — PASS

The production build, existing frontend/Go/Auth-helper suites, public-route checks and all 15 Hero-lock checks passed. Browser testing ran against a compiled local production preview with synthetic Supabase configuration and intercepted API/Auth traffic. No production signup, booking, contact delivery, database read/write or role change was performed.

| Checkpoint | Result | Evidence |
| --- | --- | --- |
| 1. Repository/security audit | PASS | Correct feature branch, clean initial tree, Auth/API/migration audit, task-start file hashes |
| 2. Secure routes | PASS | Exact return allowlist; guest/user/admin/loading/expiry/revocation/outage tests |
| 3. Account menu | PASS | Server-verified admin only; desktop/mobile; LV/RU/EN |
| 4. Layout/navigation | PASS | All 11 routes; desktop sidebar and accessible tablet/mobile drawer |
| 5. Shared UI | PASS | Six reusable state/header/stat/status components plus layout/navigation; no dependency added |
| 6. Dashboard | PASS | Existing read APIs; partial/error/empty cases; unknown distinct from zero |
| 7. CMS/media architecture | PASS | Separate design document; no migration, Storage or upload implementation |
| 8. Localization/responsive/accessibility | PASS | 264 route/locale/width combinations; keyboard/focus, normal/reduced motion and screenshot review |
| 9. Security | PASS in isolated tests | Real middleware with test verifier/role store, mock browser responses; live checks NOT VERIFIED |
| 10. Regressions | PASS | Build, unit/browser/Go/Auth-helper/public-route/Hero checks below; 3 disposable-DB suites skipped |

### Executed tests

| Command / suite | Result |
| --- | --- |
| `npm run build` in `frontend` | PASS: TypeScript + Vite production build; synthetic local test configuration |
| `node --test tests/*.test.mjs` in `frontend` | 62 passed, 0 failed/skipped; includes 12 new admin tests |
| `node tests/admin-browser.cjs --all` | 289 checks/scenarios passed, 0 runtime/translation errors, including 264 layout combinations |
| `node tests/admin-browser.cjs --security` | 26 access/menu/security scenarios passed, including 10 additional security checks; the access/menu cases overlap with `--all` |
| `node tests/auth-browser.cjs` | 96 layout checks; registration/login/session persistence/logout/recovery/confirmation flows passed |
| `node tests/booking-browser.cjs` | 172 layout checks and 31 mocked-API flows passed |
| `node tests/contact-browser.cjs` | 24 layouts and 24 validation/no-delivery flows passed; no API writes/external requests |
| `node tests/public-routes-browser.cjs` | 20 routes × 3 languages × 2 widths = 120 checks; no runtime/translation errors or unexpected requests |
| `AUTH_TEST_DATABASE_URL= BOOKING_TEST_DATABASE_URL= MIGRATION_TEST_DATABASE_URL= go test ./... -v` in `backend` | PASS: 16 top-level tests / 109 passing tests including subtests; 3 integration suites skipped |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s backend/scripts -p 'test_*.py'` | 5 Auth configuration-helper tests passed |
| `node frontend/scripts/check-hero-lock.mjs` | All 15 approved file hashes pass |
| Prettier check on changed/new frontend files; `gofmt -l` on new Go test | PASS |
| `git diff --check` plus whitespace check on each untracked file | PASS |
| Task-start SHA256 comparison | Exactly 5 existing files changed, listed below; all other tracked files unchanged |
| Changed/new-file and build/log credential scans | No privileged key, credential URL, private-key material or privileged service-role JWT found |

Browser runtime was the existing bundled Playwright with local Chrome, provided through `PLAYWRIGHT_MODULE`; no project dependency or lockfile changed. Tests use `TEST_BASE_URL=http://127.0.0.1:5185`. Screenshots and test logs are temporary local artifacts outside Git. The full admin browser suite now also includes the additional security scenarios when rerun with `--all`.

Reproduce the production preview using explicit synthetic configuration, never a production test account:

```sh
cd frontend
VITE_SUPABASE_URL=https://integration-test.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_integration_test \
VITE_API_URL=http://127.0.0.1:5185/api VITE_BOOKING_DEMO=false npm run build
npm run preview -- --host 127.0.0.1 --port 5185 --strictPort
```

In another terminal, run each browser command with `TEST_BASE_URL` as above and `PLAYWRIGHT_MODULE` pointing to a locally installed Playwright package. These tests intercept identity/API responses; the dashboard application itself has no test-data fallback. Local screenshots contain explicitly synthetic patients only.

### Skipped / not verified

- `TestMigrationsIntegration`, `TestLiveRoleSecurity` and `TestPostgresIntegration` skipped: no explicitly confirmed disposable test database was supplied. Their safeguards remain unchanged; production `.env` is not a test fallback.
- No live Supabase identity, current role rows, RLS grants, signup trigger or real appointment data was inspected. No live admin was created or promoted. A future approved operator must perform the first-admin acceptance check.
- Browser checks use Chrome emulation, not a physical-device lab, every browser engine or a formal screen-reader audit. Keyboard, focus, responsive bounds, labels, announcements and reduced-motion behavior were checked.
- No production deployment, email delivery, CMS publishing, Storage upload or management mutation was exercised or implemented.

## Implemented routes, data and limits

`/admin` is the functional read-only dashboard. These ten routes are explicit localized future-module placeholders, without dead create/edit/upload actions:

`/admin/appointments`, `/admin/services`, `/admin/doctors`, `/admin/schedules`, `/admin/pages`, `/admin/news`, `/admin/media`, `/admin/seo`, `/admin/messages`, `/admin/settings`.

The dashboard uses the existing Go API without adding server production code:

- `GET /api/auth/me`: current identity and trusted database role.
- `GET /api/admin/booking/appointments?date=<Riga date>&limit=50&offset=0`: today's list/count includes all returned statuses, capped at the first page.
- `GET /api/admin/booking/appointments?status=pending&limit=50&offset=0`: pending count across dates, capped at the first page.
- `GET /api/admin/booking/settings`: actual confirmation mode, horizon, advance notice, slot interval and privacy readiness.
- `GET /api/booking/services`: public bookable-catalog count, not all active marketing services. This count does not prove that eligible doctors or schedules provide usable availability.

At 50 rows, counts read `50+` instead of claiming a total. Missing or failed reads remain unavailable; empty successful reads show zero/empty. There is no all-doctors endpoint, full upcoming aggregate, recent-events endpoint or questions inbox: those capabilities are explicitly unavailable. Schedule completeness cannot be verified from the current read contracts and is stated accordingly. Only refresh, navigation, public-site return and logout are enabled actions.

LV/RU/EN keys are added through the existing vue-i18n architecture. Admin language selection updates the document language and respects the existing cookie preference rules. The separate layout uses a sidebar at desktop widths and a modal drawer below 1100px, with Escape, focus wrapping/restoration and adequate control heights. No public design tokens or typography files changed.

## Exact file manifest

**5 existing files modified:**

- `frontend/src/App.vue`
- `frontend/src/components/layout/AuthControl.vue`
- `frontend/src/main.ts`
- `frontend/src/router/index.ts`
- `frontend/src/stores/auth.ts`

**25 files added:**

- `backend/internal/booking/admin_security_test.go`
- `docs/ADMIN_CMS_MEDIA_ARCHITECTURE.md`
- `docs/ADMIN_PHASE_3_1.md`
- `frontend/src/components/admin/AdminEmptyState.vue`
- `frontend/src/components/admin/AdminErrorState.vue`
- `frontend/src/components/admin/AdminLayout.vue`
- `frontend/src/components/admin/AdminLoadingState.vue`
- `frontend/src/components/admin/AdminNavigation.vue`
- `frontend/src/components/admin/AdminPageHeader.vue`
- `frontend/src/components/admin/AdminStatCard.vue`
- `frontend/src/components/admin/AdminStatusBadge.vue`
- `frontend/src/i18n/admin.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/services/admin/access.ts`
- `frontend/src/services/admin/dashboard.ts`
- `frontend/src/services/admin/navigation.ts`
- `frontend/src/stores/admin/dashboard.ts`
- `frontend/src/views/admin/AdminDashboard.vue`
- `frontend/src/views/admin/AdminGate.vue`
- `frontend/src/views/admin/AdminPlaceholder.vue`
- `frontend/tests/admin-access.test.mjs`
- `frontend/tests/admin-browser.cjs`
- `frontend/tests/admin-dashboard.test.mjs`
- `frontend/tests/admin-localization.test.mjs`
- `frontend/tests/public-routes-browser.cjs`

No dependency, environment, migration, Hero, Welcome, public-page, Booking, Auth-view or backend production file changed. Shared Auth changes are limited to the server-role proof and bounded admin refresh; existing registration, login, recovery and logout actions remain intact. No commit, merge, push, branch advancement, Supabase write or deployment was performed. Work remains uncommitted on `feature/admin-dashboard`.

## Recommended next phase — not started

Phase 3.2 should proceed **services/prices → specialists/eligibility → schedules/time off**, using verified clinic data and existing stable booking identities. Define the missing authenticated catalog/configuration APIs and their tests before management forms. Preserve appointment references, configuration locking and collision protection, and verify any proposed migrations separately. See `ADMIN_CMS_MEDIA_ARCHITECTURE.md` for later appointments/CMS/media/contact/SEO sequencing. Live admin acceptance and deployment remain separate approved operations.
