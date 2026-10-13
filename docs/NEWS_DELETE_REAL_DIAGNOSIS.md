# News deletion: authenticated-browser diagnosis

> Status clarification — 2026-10-13: The later [admin auto-refresh fix](ADMIN_AUTO_REFRESH_FIX.md) addresses the periodic revalidation limitation identified below. Production article deletion was not used for acceptance testing.

Date: 2026-10-11. Branch: feature/final-development.

## Actual-session evidence and limits

The existing authenticated Chrome session at localhost:5173 was accessible. The affected unpublished article was visible. No production archive request was permitted: an opt-in development-only `?newsTrace=readonly` guard stopped archive/restore immediately before fetch. The guard was tested with intercepted requests first (zero archive requests).

Before the change, clicking Delete and accepting Chrome's native confirmation produced these sanitized stages:

- click: busy false, verified true, signal not aborted;
- confirmation: true, verified true, signal not aborted;
- API guard: configured true, verified true, session present;
- read-only stop: wouldSend true;
- immediately following confirmation, authority changed to checking/unverified and the News authority watcher ran;
- a repeated SIGNED_IN event was also observed while authority was already unverified.

Thus neither the button nor confirmation prevented submission. The actual session exposed an additional authorization-refresh path not covered by the previous identical-SIGNED_IN guard. AdminGate revalidates on window focus/visibility and every 60 seconds. Revalidation temporarily removes verifiedAdmin; the News watcher clears rows and aborts its controller. Subsequent reauthorization reloads the list and clears errors. This is a concrete cancellation/error-erasure race around native confirmation returning focus.

Evidence limitation: the production POST was deliberately blocked. No production HTTP status, response, database mutation, or original failed request cancellation was captured. The precise fate of the user's earlier POST therefore cannot be asserted retrospectively. The observed focus race and source behavior explain the symptom; production deletion itself remains untested under the read-only restriction. This report does not claim that a synthetic pass alone proves the user's production deletion succeeded.

After replacing native confirmation, the same authenticated session reached confirmation and API guard with verified access and a live controller, without the immediate focus-triggered invalidation. The deliberate read-only error remained visible. The article remained present. The tab was returned to normal /admin/news, disabling diagnostic mode.

## Running code

Port 8080: API PID 12193, Go run cached executable e03ee257f8f8d97a45b13ea4e5eeeb407cf0cabc65e82cde318af0d8a878cf09. Executable identity was compared to the current source using a non-launching go-run executor. Health returned HTTP 200. No backend restart or migration was necessary. The actual frontend served the new trace module and in-page dialog, proving current source was loaded.

## Minimal change

News archive and archive restoration now use a modal HTML dialog instead of window.confirm. Cancel has initial focus; Escape cancels; existing focus trapping and localized text are retained. This avoids opening a native browser dialog and its focus-return transition. AdminGate verification, JWT checks, role revocation, request identity checks, optimistic versions, archive lifecycle and database constraints remain unchanged.

Diagnostics are local-development-only, opt-in, and restricted to stages and boolean/numeric flags. They never log tokens, content, identifiers, response bodies or credentials, and cannot enable a production bypass. In trace mode, archive/restore are intentionally unavailable. No backend or SQL change is part of this fix.

## Verification

- Real isolated browser → Go → disposable PostgreSQL workflow passed for published and never-published articles. POST /api/admin/cms/documents/:key/archive returned 200, archived=true, published_revision=null. Immediate removal and exclusion after refresh passed; restoration returned an unpublished article.
- Real isolated missing-schema response: 503 news_archive_unavailable, useful error, unchanged version. Duplicate retry, revision preservation, edit/archive conflict and role revocation checks passed.
- Test rejects native window.confirm for the unpublished deletion scenario, so the old confirmation mechanism cannot silently return.
- 12 fixture browser combinations: LV/RU/EN × desktop/mobile × published/unpublished, cancellation, restoration, public exclusion and refresh persistence passed.
- Read-only diagnostic regression passed: accepted confirmation, zero archive requests, retained card, sanitized flag-only logging.
- Frontend tests: 111/111 passed. Initial sandbox run could not bind loopback HTTP; rerun with local-server permission passed.
- go test ./... passed (Auth, Booking, CMS, migration runner, database, Media and server). Database-dependent write behavior above was separately exercised by the isolated acceptance harness; this is not a claim that every optional Go integration suite ran.
- Production build passed (existing large-chunk warning only).
- All 15 Hero-lock files match the approved baseline.

## Files changed in this diagnosis

- frontend/src/views/admin/AdminNewsView.vue — in-page archive/restore confirmation and trace stages.
- frontend/src/i18n/newsAdmin.ts — LV/RU/EN Cancel labels.
- frontend/src/services/admin/newsTrace.ts — opt-in read-only diagnostics.
- frontend/src/services/cms/admin.ts — diagnostic guard before archive fetch.
- frontend/src/stores/auth.ts — sanitized authority/event trace calls; previous session guard preserved.
- frontend/tests/news-delete-browser.cjs — dialog confirmation/cancellation regression.
- frontend/tests/news-trace-browser.cjs — zero-write diagnostic test.
- frontend/tests/helpers/news-real-workflow.cjs — real backend dialog workflow and native-confirm regression.
- docs/NEWS_ADMIN_REAL_EVIDENCE.json — refreshed isolated workflow evidence.
- docs/NEWS_DELETE_REAL_DIAGNOSIS.md — this report.

Other existing working-tree changes were preserved. No production records, migrations, Hero, Welcome Intro, Booking implementation or public design were changed. No commit, merge, push or deployment occurred.

## Remaining verification

Only a user-authorized real deletion can prove the final production write outcome. If the issue remains, open DevTools Network with Preserve log, filter `archive`, perform the intended deletion, and record method/status plus sanitized response (never Authorization headers, cookies or tokens). A cancelled request vs 4xx/5xx vs 200 distinguishes remaining paths. Diagnostic mode is safe for tracing up to fetch but intentionally cannot verify HTTP outcomes. The separate periodic authorization-refresh race remains a general architectural limitation; security rechecks were not disabled to conceal it.

Additional browser regressions: Auth passed 96 layout/flow checks. The legacy `admin-browser.cjs` suite failed waiting for the removed `Overview` dashboard heading (line 269); it does not match the current three-section admin navigation. This unrelated suite was not rewritten in this focused fix, and is not reported as passing.
Current simplified-admin authorization suite passed all 12 guest, ordinary-user/forged-metadata and unavailable-identity cases, with zero privileged requests.
