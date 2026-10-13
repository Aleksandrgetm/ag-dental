# News Delete: confirmation-boundary session invalidation

2026-10-11 · `feature/final-development`

## Investigation and evidence

Port 8080 was owned by API PID 12193, not the earlier activation PID. Its cached `go run` executable SHA-256 was `e03ee257f8f8d97a45b13ea4e5eeeb407cf0cabc65e82cde318af0d8a878cf09`. Rebuilding current source with `go run -exec` and a hash-only executor produced the exact same binary hash without starting another backend. Thus the live API was current. A plain `go build` hash differed because it embeds VCS metadata; that difference was not evidence of stale code. Health returned 200/database connected. The frontend loaded the current News controls from local Vite.

The authenticated Chrome tab loaded the affected unpublished article. Browser console inspection returned no errors. Clicking Delete reached a native confirmation; it was not accepted for the production article. The user separately confirmed that OK appears to do nothing. The tab was also observed entering access verification again. No production deletion was attempted, so the historical production mutation's HTTP response is not available and is not claimed here.

The ordinary real isolated browser workflow passed before any application change, excluding a general archive endpoint/schema incompatibility. Inspection found a separate silent-interruption path:

1. Supabase emits `SIGNED_IN` on session recovery when a tab becomes visible, even if the user and access token have not changed (confirmed in installed auth-js source).
2. The auth store unconditionally called `accept(next)`, which invalidated verified administrator authority.
3. News then lost access/unmounted and aborted its controller. At the confirmation boundary, `cmsRequest` either fails its verified-admin guard before fetch or an in-flight operation is aborted. The component-local error is lost with the component.
4. The same session is reverified and the normal list loads again. The article remains, without an obvious failed HTTP response.

A controlled regression using **real isolated Supabase Auth, Go, PostgreSQL and browser** replayed the repeated same-session event at confirmation. Before the fix, the test timed out waiting for the archive response for the unpublished synthetic article. After the fix, the identical scenario passed. This establishes a reproducible defect and repair; it does not reconstruct the precise event timing of the user's previous production attempt.

## Minimal fix

`frontend/src/stores/auth.ts` ignores only a duplicate `SIGNED_IN` notification when the current identity already has verified admin authority and both user ID and access token are identical. It does not tear down the editor for an unchanged-credentials notification.

New/different tokens or users, sign-out, recovery, failed verification and ordinary unverified sessions retain their existing invalidation behavior. Roles are not trusted from Supabase metadata. Every API mutation continues to verify JWT and the current database role; backend role-revocation tests pass. Route/API authorization is unchanged. No schema/backend/cache workaround was added.

## HTTP and state regression evidence

Synthetic published and unpublished articles both produced:

- `POST /api/admin/cms/documents/:key/archive`
- Request: current `expected_version` only.
- HTTP **200**, sanitized response subset `{ "archived": true, "published_revision": null }`.
- Card disappears immediately and remains absent after full reload.
- Archive view permits restoration as unpublished; duplicate retries preserve one audit event; concurrent edit/delete remains protected.

Full machine-readable sanitized evidence: `docs/NEWS_ADMIN_REAL_EVIDENCE.json`. Existing public-delivery and archive exclusion tests remain in place. No production request, token or article content was copied into test fixtures.

The regression deliberately replays an Auth notification at confirmation, rather than relying on nondeterministic OS/tab-focus timing. It uses the real Auth subscriber chain and API; only the confirmation boundary is controlled. Ordinary native confirmation and cancellation are also covered by the existing browser matrix.

## Validation

- Real isolated E2E: failure reproduced before fix; PASS after fix, including unpublished deletion at repeated-session confirmation, successful HTTP response, immediate disappearance, refresh exclusion, restoration, JWT/role/RLS checks and public News workflows.
- `backend/scripts/test-media-local.sh`: all Go packages PASS against disposable PostgreSQL (CMS/Auth/Admin/Booking/Media/migration regressions).
- Frontend unit/HTTP: **111 PASS** after fix.
- Production frontend build: PASS (existing bundle advisory only).
- Hero locks: **15/15 PASS**. `git diff --check`: PASS.
- Auth browser: 96 layout checks plus registration/login/persistence/logout/recovery/confirmation flows PASS. Admin authorization: 12 cases PASS. News deletion: 12 published/unpublished LV/RU/EN desktop/mobile cases PASS, including cancellation, unavailable errors, deletion and restoration.

## Exact files changed this turn

- `frontend/src/stores/auth.ts` — duplicate verified-session notification guard.
- `frontend/tests/helpers/news-real-workflow.cjs` — deterministic repeated-session confirmation regression and HTTP response/state assertions.
- `docs/NEWS_ADMIN_REAL_EVIDENCE.json` — regenerated synthetic evidence.
- `docs/NEWS_DELETE_SESSION_FIX.md` — this report.

No production data, migration, API implementation, Hero, Welcome or public design changes. No backend restart, deployment, commit, merge or push. All prior uncommitted work preserved. Disposable E2E containers/credentials removed by the runner.

## Remaining verification boundary

The reproduced session-interruption defect is fixed and real browser-to-backend acceptance passes. The actual production article remains untouched. The user's earlier exact Network trace was not retained; if deletion still fails after loading the updated frontend, capture that attempt's method/status/sanitized body and Auth lifecycle timing instead of inferring another migration problem. Never include Authorization/Cookie values.
