# Authentication, phase 1

## Boundaries
Supabase Auth owns passwords, hashing, access/refresh tokens, recovery and persistence. The Vue app uses one official supabase-js client and a Pinia store. No custom password database, patient profile, booking or admin UI is added. Legal documents and the locked Hero remain unchanged.

Auth routes: `/login`, `/register`, `/forgot-password`, `/reset-password`. All interface text is registered with the existing vue-i18n instance for LV/RU/EN. The Header uses an initialization placeholder rather than flashing guest controls while restoring a session. Public content does not wait for remote role lookup.

## Local configuration
Copy the variable names in each `.env.example` into an ignored local `.env`. Do not overwrite the existing database connection. Frontend: `VITE_API_URL` (including `/api`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy `VITE_SUPABASE_ANON_KEY` also supported). Backend: existing `DATABASE_URL`, `PORT`, plus `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, optional comma-separated `CORS_ALLOWED_ORIGINS`. Default CORS origin remains `http://localhost:5173`. Add the actual development port explicitly if Vite selects another one.

Never put a service-role/secret key, database password or JWT signing secret into Vite. `.env` files remain ignored; example files contain names only. The public publishable key is not a secret.

## Dashboard settings still required
Live inspection on 2026-09-29 found email sign-up enabled, **email confirmation required** (`mailer_autoconfirm: false`), anonymous sign-in disabled, and ES256 signing keys.

For the requested immediate registration/login UX, open **Authentication → Sign In / Providers → User Signups → Confirm email**, disable that toggle and save. This is on the parent page, not inside the Email provider's password-settings panel. Leave other security settings enabled. If Supabase returns a session, the app signs in immediately. If it returns no session, registration fails closed with a localized account-support message; no confirmation-email journey or authenticated success is shown. This does not change the server setting. See the supported Management API procedure below.

Under **Authentication → URL Configuration**, set the deployment Site URL and add exact permitted redirect URLs:
- `http://localhost:5173/reset-password`
- `http://localhost:5173/login`
- Corresponding exact production HTTPS URLs; use the actual dev origin if different.

No arbitrary redirect parameter is accepted. Configure Supabase's supported email delivery for production recovery emails; default hosted email limits/recipient restrictions may apply. No Resend integration is included.

Minimum new password length in the UI is eight; Supabase remains authoritative for configured strength requirements. Stronger provider rules map to a localized message. Forgot-password success is neutral. No raw provider errors, passwords or tokens are rendered/logged.

## Recovery and session behavior
The supported browser implicit recovery flow permits opening the email link in another browser. Supabase consumes the callback, verifies the user and emits PASSWORD_RECOVERY. Only that event opens the reset form; a normal persisted session by itself does not. Missing/expired callbacks offer a new reset request. The password is updated using Supabase `updateUser`; success offers Sign in. That action signs out through Supabase before navigating to /login, so the guest-only guard does not immediately redirect back home. Reloading a consumed recovery page without recovery state requires a fresh link. Callback hashes/error query parameters are removed from auth routes after initialization. Supabase manages persistence and cross-tab sign-out; no custom token/password storage exists.

## Roles and migration
Run from `backend`: `go run ./cmd/migrate`. The runner applies `migrations/001_user_roles.sql` transactionally, records its version and serializes concurrent runners. Repeating the command is a no-op after success. No AutoMigrate or changes to the existing PostgreSQL connection.

`user_roles` references `auth.users(id)` with cascade deletion, constrains roles to user/admin and defaults to user. A SECURITY DEFINER trigger with an empty search_path **always inserts user**, ignoring all client metadata. Existing users are backfilled as user. RLS is enabled with **no browser read/write policies**, and all anon/authenticated privileges are revoked. The trusted Go database connection reads roles; browser role changes are impossible. Missing/unavailable role information fails closed. The current database connection uses its existing administrative identity; a future least-privilege API database role needs SELECT on this table only, while migrations require an administrator.

Promote an existing, verified account only via the Supabase SQL editor or another trusted administrative database session. First inspect the intended account UUID in Authentication → Users. Then:

```sql
BEGIN;
UPDATE public.user_roles SET role = 'admin' WHERE user_id = '<verified-existing-user-uuid>';
-- Confirm exactly the intended row was updated before committing.
COMMIT;
```

Use the same process with `role = 'user'` to demote. Never use an email comparison in application code, public registration role, URL parameter, frontend state or user_metadata as authority. Privacy acceptance metadata is an acknowledgement, not immutable audit evidence; no final legal compliance claim is made.

## API authorization
`GET /api/auth/me` requires a Bearer access token. The Go verifier calls the fixed configured project's `/auth/v1/user` over HTTPS with a bounded timeout/body and redirects disabled. Supabase verifies token signature/expiry for its active keys (including ES256 and legacy HS256); Go does not merely decode a JWT or choose a key from attacker-controlled headers. This intentionally trades one remote Auth request per authenticated API call for current authoritative validation and key-rotation compatibility; no signing secret is needed. Outages fail closed with 503, invalid credentials with 401. Responses have `Cache-Control: no-store` and return only id/email/database role.

`RequireAuth` and `RequireRole("admin")` are reusable middleware. No admin endpoints exist yet. Future admin routes must use both; frontend `requiresAuth`/`requiresAdmin` guards are UX only. Role is re-read from PostgreSQL on every protected API request. Frontend role lookup never grants backend access. `/api/health` remains public and unchanged.

## Verification
- `npm run build --prefix frontend`
- `node --test frontend/tests/*.test.mjs`
- `node frontend/scripts/check-hero-lock.mjs`
- From backend: `go test ./...`
- Opt-in database isolation test: `AUTH_DB_INTEGRATION=1 go test ./internal/auth -run TestLiveRoleSecurity -v`. It creates a synthetic auth row with malicious role metadata inside a rolled-back transaction, verifies user assignment/RLS/browser privilege denial, and leaves no test user.

Live account signup/login/email-recovery requires a controlled test mailbox and correct Supabase dashboard redirects/email configuration. Mocked browser flow checks do not substitute for email delivery or a real valid-token integration test.

References: [Supabase configuration](https://supabase.com/docs/guides/auth/general-configuration), [JWT validation](https://supabase.com/docs/guides/auth/jwts), [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Completed checks in this implementation
The migration was applied to the configured Supabase project. All 25 frontend unit tests, Go tests, the opt-in rolled-back database security test, production build, and the 15-file Hero lock check passed. Live API health returned 200, missing/invalid access tokens returned 401, local-origin CORS preflight returned 204, and an untrusted origin returned 403. Source/build scanning found no database credential or private Supabase key material.

`frontend/tests/auth-browser.cjs` is a saved regression suite using mocked Supabase responses and an isolated browser context (no account creation or email sending). It passed 96 layout combinations (four routes × three languages × eight viewport sizes), plus registration validation and session creation, no client role payload, login errors, refresh persistence, logout, Header account controls, Escape/focus return, neutral recovery requests, valid recovery events, password mismatch/update, callback cleanup and fail-closed handling of unexpectedly confirmation-required registration. It writes review screenshots to `/tmp/ag-auth-*.png`. Run with an externally available Playwright installation:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright TEST_BASE_URL=http://localhost:5173 node frontend/tests/auth-browser.cjs
```

Real-user sign-in, delivery of recovery/confirmation email, and acceptance of a real valid Supabase access token by `/api/auth/me` still require a controlled test account and dashboard URL/email setup. These are not claimed as completed by the mocked checks.

## Authentication refinement: hosted confirmation configuration
The hosted project's public `/auth/v1/settings` still reports `mailer_autoconfirm: false`. This is the cause of the missing signup session and unconfirmed-account login failures. The installed publishable key and PostgreSQL connection cannot update hosted Auth service configuration. No Supabase management personal access token is available in this environment; the setting has **not** been changed.

Current Dashboard location: **Authentication → Sign In / Providers → User Signups → Confirm email**, on the parent provider-list page, not inside the Email provider drawer. A project owner/administrator can disable it there. If the UI does not expose it, use the supported Management API procedure:

1. A project administrator creates a personal access token at `https://supabase.com/dashboard/account/tokens` with access to this project. This is an account management token (`sbp_…`), not a publishable key, project secret key or service-role key. Do not put it in Vite, commit it or paste it into chat.
2. From the project root run:

   ```sh
   python3 backend/scripts/configure-auth.py --apply-immediate-registration
   ```

3. Enter the personal access token at the hidden terminal prompt. The helper does not persist it. It sends exactly `PATCH https://api.supabase.com/v1/projects/dcdgrbziounizuigmjcm/config/auth` with JSON `{"mailer_autoconfirm": true}`. No other setting is changed. It verifies the Management API response and then the public Auth setting. HTTP 401/403 means the account/token lacks the necessary administrative access; use an authorized project administrator.
4. Recheck at any time without a management token:

   ```sh
   python3 backend/scripts/configure-auth.py
   ```

   Expected: `Email confirmation required: False`.
5. Register with a **new controlled email address** and verify that Supabase returns a session, then refresh, log out and log in. Earlier disposable test users may still be unconfirmed. Delete only those identified disposable accounts through **Authentication → Users** and recreate them; do not use an old unconfirmed test account to judge the new setting.
6. Test forgot/reset through the actual mailbox and allowed `/reset-password` redirect, then use the new password to sign in. Supabase's hosted default email restrictions still apply to recovery delivery independently of signup confirmation.

[Supported Auth configuration PATCH API](https://supabase.com/docs/reference/api/v1-update-auth-service-config) · [Current Dashboard location documented by Supabase](https://supabase.com/blog/flutter-tutorial-building-a-chat-app).

### Refined UI and tests
The four auth routes share a compact editorial split layout, bordered 58px fields, reserved field feedback, localized accessible eye controls, stable loading buttons, mobile stacking, and localized inline success/error states. Existing Header behavior, public designs, backend verification, role storage and the locked Hero are unchanged in this refinement. Forgot-password provider failures no longer produce a false success state. Missing signup sessions and unconfirmed legacy accounts produce localized support guidance, never a forged session.

The expanded browser suite covers all four pages in LV/RU/EN at 320, 375, 390, 430, 768, 1024, 1440 and 1920px, plus real SDK calls against intercepted test responses. This remains a **mocked flow test**, not proof of live mailbox delivery or new-account authentication while the hosted setting remains enabled.

The administrative helper has five isolated standard-library unit tests: read-only default, a one-field PATCH payload, rejecting a publishable key as management authority, no-op when already enabled, and failing when the update is not confirmed. Run `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s backend/scripts -p 'test_*.py'`.

Exact files changed by the refinement (separate from the preceding Phase 1 implementation):
- `frontend/src/views/AuthView.vue`
- `frontend/src/components/auth/AuthField.vue` (new)
- `frontend/src/i18n/auth.ts`
- `frontend/src/services/authValidation.ts`
- `frontend/src/stores/auth.ts`
- `frontend/tests/auth-browser.cjs`
- `frontend/tests/auth.test.mjs`
- `backend/scripts/configure-auth.py` (new administrative helper)
- `backend/scripts/test_configure_auth.py` (new helper tests)
- `docs/AUTH_PHASE_1.md`

Final refinement verification: production build passed; 25 frontend tests, existing Go tests, and five configuration-helper tests passed. The 96-case responsive matrix covered all requested widths. Eighteen additional LV/RU/EN checks at 320/390/1440px confirmed that validation did not move or resize the primary button. Mocked SDK flows verified immediate-session registration, persistence, logout/login, wrong credentials, duplicate handling, password visibility, loading dimensions, reset followed by login with the new password, expired links, and fail-closed missing-session behavior. All 15 Hero-lock files remain unchanged. Live new-account and mailbox recovery checks remain pending the hosted configuration change and a controlled mailbox.
