# Admin auto-refresh and state-loss fix

Date: 2026-10-12. Branch: `feature/final-development`.

## Verified cause and reproduction

An authenticated, isolated Chromium session opened `/admin/news/new`, entered an unsaved title and dispatched the real browser `focus` event. Before the fix, the assertion failed: expected `Unsaved synthetic title`, actual empty string. No production account or record was used.

The trigger chain was:

1. `AdminGate` runs `check()` on window focus, visible-tab recovery, route/token changes, and every 60 seconds.
2. `check()` set `ready=false`; `createAuthority.verify()` unconditionally invalidated the existing proof and published `checking`, even for identical already-verified credentials.
3. The Gate retained some editors in memory, but hid them. More importantly, `AdminNewsView` watched `verifiedAdmin`: false cleared the payload/history and aborted requests; true called `load()` and replaced local input with saved content or an empty new article.
4. A genuine Supabase token rotation also caused invalidation. The previous duplicate-`SIGNED_IN` workaround covered only one event type with identical credentials, not this periodic revalidation path.

Thus the reproduced failure was an **authorization-driven form reset/background refetch**, not a document reload or router redirect. It could resemble a remount even when the Gate kept the component alive. The new browser regression also explicitly verifies unchanged document time origin, route and editor DOM identity after refresh.

## Changes

- `createAuthority` coalesces concurrent verification as before, but retains an existing server proof while rechecking **identical credentials**. New tokens do not inherit old proof. A failed response or user/forbidden result clears access.
- Accepting an identical session no longer invalidates authority. New users/tokens and sign-out still invalidate it.
- The Gate leaves an already verified editor visible during same-token background verification. During a changed-token check, it retains the same user's mounted editor, visibly in place but inert until verified. Temporary outages hide and retain only that same-user in-memory editor. Expiry, sign-out and revocation destroy it.
- News initialization is keyed to the successfully loaded route, not every authorization transition. Reverification no longer clears text, image selection, selected language or revision context. Failed initial loads are not marked loaded.
- Explicit user navigation still uses existing unsaved-change confirmation. No patient/editor draft is persisted to localStorage, sessionStorage or a new cache.

The Go API remains the authority for every privileged request. JWT verification, database roles, 401/403 handling, stale-token response guards and Supabase automatic token refresh remain enabled. This is not an authorization bypass or a client role cache granting API access.

## Separate development reload behavior

Inspection found no app-level `window.location.reload`, `location.assign` or `location.replace` in the admin/auth flow. The only Gate redirect is to login when no session exists; valid revalidation does not redirect to `/admin`.

Vite logs from the development checks separately showed late optimization of Vuetify deep imports, followed by `optimized dependencies changed. reloading`. The existing plugin-generated `VApp`, `VMain` and lazy-route `VIcon` imports are now included in startup optimization. HMR remains enabled. The regression opens the lazy Prices route in another tab, returns to the dirty editor and verifies stability.

Actual developer source/configuration changes, server replacement, a browser reload or Vite's explicit full-reload messages can still reload/remount an application. This change does not promise durable drafts across those events, and does not disable useful HMR. No claim is made that every refresh in the user's previous real session came from the single reproduced mechanism.

## Regression evidence

- Before fix: `admin-refresh-browser.cjs` failed on the real Gate focus listener with the unsaved News title cleared.
- After fix: desktop and mobile passed for unsaved News title/introduction/image selection, repeated `SIGNED_IN`, multiple `TOKEN_REFRESHED`, `INITIAL_SESSION`, 30 accelerated minutes of periodic checks, browser-tab recovery, unchanged URL/document/editor identity, temporary identity-API outage/recovery, role revocation, 401 expiry, and `SIGNED_OUT`.
- The same suite passed for unsaved doctor name, selected editing language, active editor tab and working-hour value across visibility/focus/token changes. Cancelled intentional navigation retains edits; confirmed navigation and browser Back/Forward work normally.
- Expired/revoked sessions lose the editor and cannot retain privileged UI. No draft text is stored in browser storage.
- `admin-access.test.mjs` verifies same-token pending checks retain proof, changed tokens require a new proof, and revoked roles lose access. Existing logout/stale-verification/security tests remain passing.
- Production build passed. Existing large-chunk warning remains.
- Full frontend unit suite: **115 passed**, including Auth, Booking, CMS navigation, News, Media and SEO/public-route tests.
- Auth browser suite: **96 layout checks passed**, registration/login/persistence/logout/recovery/confirmation flows.
- Current admin authorization suite: **12 denial cases passed**, zero privileged requests for guests, ordinary users, forged metadata and unavailable identity.
- News workflow browser suite: **24 locale/viewport cases passed**, publication/edit/error retention/unpublish/republish and refresh.
- Specialist workflow browser suite: **24 locale/viewport cases passed**, including portrait, services, schedule, revalidation and deep-link refresh.
- `go test ./...`: passed. No Go source changed; this invocation did not run database integration tests without their opt-in disposable database configuration.
- All **15 Hero locks passed**.

Browser tests use authenticated synthetic sessions and intercepted local APIs. These are real Vue/Supabase-callback/Gate lifecycle tests, not evidence of a production session being mutated. There were no production database writes. The old generic `cms-navigation-browser.cjs` targets the retired multi-section CMS editor; current News/doctor navigation is covered by the new lifecycle test and current workflow suites, while CMS navigation unit tests ran in the full suite.

One test-harness issue was corrected: the shared fixture automatically accepts dialogs, so the explicit cancellation test first removes that listener before installing its dismissal handler. It was not an application failure.

## Exact files changed in this task

- `frontend/src/services/admin/access.ts`
- `frontend/src/stores/auth.ts`
- `frontend/src/views/admin/AdminGate.vue`
- `frontend/src/views/admin/AdminNewsView.vue`
- `frontend/vite.config.ts`
- `frontend/tests/admin-access.test.mjs`
- `frontend/tests/admin-refresh-browser.cjs` (new)
- `docs/ADMIN_AUTO_REFRESH_FIX.md` (new)

Existing unrelated uncommitted work was preserved. Existing browser suites also regenerate their ignored local screenshot evidence; no screenshots or tokens are used as production data.

## Limitations and handover

- Verification used isolated Chromium, accelerated time and synthetic Auth responses; it is not a multi-hour observation of the user's production-backed browser, nor Safari/Firefox coverage.
- In-flight requests still reject stale-token results rather than silently replaying writes across token changes. If this occurs, the draft remains and the existing retry/error behavior applies.
- Genuine expiry/revocation deliberately discards privileged in-memory state. No insecure recovery storage was introduced.
- A normal development-server restart loads the optimizer configuration. No deployment, production data change, commit, merge or push was performed. Hero, Welcome Intro, Booking data and email functionality were not modified.
