# Final technical audit and handover readiness

14 October 2026 · `feature/final-audit` · baseline `bcefafd8920206ae4c9e25f121ef95bf6dd50120`

## Decision and scope

**Ready for employer technical review with documented conditions; not approved for production launch.** The verified CMS delivery defect is fixed locally and real isolated acceptance passes. Launch remains blocked by clinic schedules/translations/privacy/media approvals and employer hosting acceptance. Accessibility contrast/target-size and startup layout movement require follow-up; this is not WCAG or field-performance certification.

The user explicitly selected `feature/final-audit` after the attached prompt named the older branch. Clean initial tree; this branch contains `feature/final-development` plus the two committed Hero/legal updates. PR #7 remains OPEN/Draft, `feature/final-development` → `dev`. No merge, commit, push, deployment, DNS/Vercel configuration change or production Supabase connection/write occurred. The only external website crawl was read-only against the old public site. Database/Auth/Storage writes used newly created disposable local services with synthetic credentials/content/patients; they were removed after each run.

## 1. Architecture and delivered functionality

Vue 3/TypeScript/Vite/Vuetify/Pinia/vue-i18n frontend; Go/Gin/GORM backend; Supabase Auth/PostgreSQL/private Storage adapters. Four admin sections are present: Appointments, Specialists, Services & Prices, News. The dashboard route redirects to Appointments; legacy generic editors and standalone Media Library are not clinic navigation sections. Weekly intervals, individual dates, breaks/vacations, appointment history, version conflicts, catalog publication and reversible News archival are implemented.

The ledger-aware runner contains 001–005 plus explicit operations for 006 (`--apply-admin-operations`), 007 (`--apply-news-archive`) and 008 (`--apply-booking-horizon`). Earlier approved activation reports record production 001–008. **No live ledger was queried in this audit**; historical reports are not fresh production verification. No migration SQL changed. Local uploads were previously enabled with explicit approval; no additional production upload was made or enabled here.

## 2. Confirmed defects and safe fixes

### CMS legal-document compatibility — fixed

The legal task changed section paragraph counts in local translation snapshots. `acceptPublished` compared every historical CMS document to those snapshots and rejected the entire response on the older `messages.legalDocuments` shape. As a result, a real isolated publication succeeded server-side but the public article still showed bundled text. Captured synthetic browser evidence showed the original imported lead after publication instead of the new synthetic lead.

Reproduction: `cms-legal-isolation-browser.cjs` returned `false` for the historical manifest before the fix. The narrowly scoped fix skips applying/shape-validating only `messages.legalDocuments`, whose reviewed content is already owned by LegalView's local vue-i18n scope. Duplicate checks and all other CMS validation remain. Invalid service payloads are still rejected. No CMS record or approved content was edited. After the fix, focused browser regression and the **full real Auth/PostgreSQL/Go/Storage browser acceptance** passed, including imported and newly created article publication.

### Disposable PostgreSQL startup race — fixed

`test-booking008-local.py` used Unix-socket pg_isready, which can succeed against initdb's temporary server immediately before it exits. The subsequent SQL connection failed. The test now waits for the final TCP listener inside its network-isolated container, with an explicit timeout failure. Migration 008 preservation/default/range/rollback/repeat tests then passed. This changes a test harness only.

### Obsolete schedule test expectation — fixed

The absence test expected zero `/admin/services` links anywhere, contradicting the approved fourth main section. It now requires that main navigation link while continuing to prohibit detached service/schedule links inside the specialist schedule and all standalone schedule navigation. Breaks, vacations, impact rejection and availability assertions remain intact. Six cases pass.

### Handover contradictions — corrected

README, Handover, Deployment Guide, Admin Guide and Known Limitations incorrectly described three sections, older migration state, disabled local uploads and draft-first News publication. Updated current guidance and retained clearly labelled historical evidence. No automatic activation is implied.

## 3. SEO and legacy preservation

Fresh bounded crawl: **12 discovered endpoints**, 11 HTTP 200 and one already-broken Cloudflare email-protection 404; nine HTML pages, five sitemap entries, four article detail slugs. Queue exhausted within the 500-page cap. All URL/status pairs still match LEGACY_URL_MAPPING.csv; no invented new mapping or homepage catch-all. Eight exact one-hop 301 mappings are retained, including old `/pakalpojumi/` (price-list content) → `/cenas`. Four article slugs remain unchanged. Fresh titles/descriptions remain in legacy-crawl.json; raw page hashes changed without a new discovered path.

Unit HTTP fixtures verify redirect destinations, 404s, archived/unpublished exclusion, dynamic sitemap and renderer behavior. Browser SEO: **120 route/locale/viewport cases passed** for title, description, canonical, four hreflang links, one H1, structured data and overflow. Existing 24 service/language SEO values are protected by catalog tests; no SEO metadata or Vercel rules changed here. Real catalog publication/detail/refresh/archive tests pass.

Production metadata/robots/sitemap are generated through the Vercel-compatible renderer and published API; private routes/previews are excluded/noindexed. Existing page bodies remain substantially client-rendered. The legacy crawl does not prove orphan/historical URL completeness; Search Console is unavailable. Actual Vercel edge packaging, redirect normalization, HTTP cache behavior, indexing and DNS cutover remain employer acceptance tasks. `/specialisti` is not a separate current public Vue route: specialist content is presented in the approved About/home sections; no unsupported legacy mapping was invented.

Provisional **local SEO review score: 76/100**, a subjective readiness rubric, not rankings or hosted certification: technical 85×25%, content 75×25%, on-page 90×20%, schema 80×10%, performance 40×10%, images 70×5%, AI readiness 50×5%. Production/GSC/field evidence is unavailable, so this must not be used as a launch approval.

## 4. Security and privacy

- Supabase `/auth/v1/user` verifies tokens over HTTPS; anonymous/malformed identities fail closed. Go looks up authoritative `user_roles` for protected requests; metadata/client roles are not authority. Revocation and forged JWT tests pass.
- Private API responses use no-store. Recovery-only server logging avoids patient request payloads; untrusted proxies are disabled. Exact-origin CORS and process-local rate limits are present. Employer must configure gateway limits/proxy behavior for multiple replicas.
- Booking exclusion constraint reserves overlapping pending/confirmed and historical occupied states; cancelled/rejected release time. Atomic creation, idempotency and concurrency tested in real PostgreSQL. No public booking-reference PII endpoint.
- RLS/revoked browser grants and restrictive private-bucket policies tested with local ordinary/anonymous roles. Privileged backend connections bypass some RLS: API authorization is the trust boundary, not an assumption that RLS protects privileged credentials.
- Inline media validates file content/size, authorization, safe references, private originals, failed-upload handling and historical references; real isolated Storage and denial tests passed. Hero assets remain protected. Simplified editors reject video selection.
- API database configuration requires remote verify-full. The migration runner consumes its DSN directly: verified TLS remains an explicit operator precondition, not an assumed runner default.
- Tracked-file audit: 488 files scanned, no high-confidence credential/private-key/DSN patterns or private backup/env filenames found. Public clinic identity/contact details and synthetic test data are intentional. This is a current-tree scan, not an exhaustive secret-rotation/history audit.
- npm audit: zero advisories. govulncheck: zero reachable/imported-package vulnerabilities; unused-module advisory **GO-2026-5932** for unmaintained `golang.org/x/crypto/openpgp`, no fixed version. Application does not import/call the affected package; retain dependency monitoring, do not remove required crypto functionality blindly.

Legal controller is SIA "Andas Gutovskas privātprakse", 40103915017; registered Rīga, Ūnijas iela 21, LV-1039, clinic Ūnijas iela 25, Rīga. LV/RU/EN policies remain CLIENT_CONFIRMATION_REQUIRED. Retention, purpose-specific bases/special-category conditions, rights contact, processors/transfers and final translation approval remain clinic/legal decisions. Contact questions only validate locally; no delivery endpoint. Booking collects names/phone/email, procedure/doctor/time and acknowledgement, not diagnoses/history/person codes. Retry sessionStorage can contain submitted contact data after uncertain outcomes. Supabase Auth email functionality is distinct from absent appointment emails/WhatsApp/Resend.

## 5. Performance and accessibility

See FINAL_TECHNICAL_LAB_RESULTS.json for exact environment and findings. Production build observed in local Chrome emulation, no CPU/network throttle, API/external traffic blocked, Welcome previously seen. Performance was sampled **before** axe injection to exclude audit-tool CPU work.

- Main JS: about 1.316 MB raw / 290 KB independently gzipped; Vite warning remains. Lazy admin modules exist, but substantial messages/shared code remain in the initial bundle.
- 42 cases (seven routes × three locales × 390/1440): observed LCP 80–236 ms on loopback; **not representative of mobile networks or field CWV**. Maximum raw startup layout-shift sum about **1.097**, with footer-before-route and font/content settling. This sum is not a field CLS percentile or Lighthouse score. Observed long task max 85 ms; max observed transfer about 1.41 MB. INP not measured.
- Synthetic Hero: 24 touch/viewport/locale cases pass. 418,952-byte synthetic video transfer per tested context; disabled mode had zero additional seeks/decoded frames during observation, video-off reload made zero video requests, settled shift zero. Startup shifts remain. This does not benchmark approved real footage, which is missing.
- 480 public route/locale/eight-width checks pass with no overflow. All requested widths covered: 320, 375, 390, 430, 768, 1024, 1440, 1920.
- Axe found color-contrast issues (e.g. muted #72786d on #f7f6f0 ≈4.19:1, journey numbers ≈3.94:1, inactive language labels ≈3.08:1) and desktop language targets ~17×32px with insufficient separation for the 24px criterion. Brand wordmark text needs manual logo-exemption assessment; other muted body/metadata does not automatically qualify.
- Form labels/errors, localized focus handling, role semantics, keyboard workflows, reduced motion and session preservation covered by browser tests. No claim of full screen-reader or WCAG certification. Axe was sampled on public routes, not every authenticated form.

Shared color/font/style files are Hero-protected; no protected baseline or Welcome behavior was changed to conceal these findings. Follow-up requires scoped approval for shared-token/initial-mount/font changes and visual regression. Native iOS Safari/Android testing remains unavailable; Chrome touch emulation is not equivalent. WebKit runtime was not installed/tested this audit.

## 6. Public, admin and Booking acceptance

Public fallback works without API configuration: 132 public and six unavailable/Auth checks pass, no unexpected requests. Legal 12 browser checks, contact 24 layouts/24 no-delivery flows and editorial articles 48 cases pass. Public rendering made zero rejected-footage/poster requests. Rejected source assets remain in the preserved public tree and must not be represented as approved clinic media; removal/repackaging needs separate review.

Four-section admin: nine locale/viewport cases; role denial 12; refresh/focus/token/outage/revocation checks pass. News edit/publication field errors, drafts, publication, archival/restoration and version/race handling pass. Specialists retain profile identity, service linkage and embedded weekly/date/absence scheduling. Real catalog suite passes six language/viewport workflows (create, price edit, public delivery, archive/restore, concurrency, authorization), with appointments preserved and Booking disabled.

Confirmed procedure durations and specialists were tested only in isolated staging: consultation 30 minutes and dental visit 60 minutes with Anda; hygiene 60 minutes with Henriete. Full confirmed Latvian labels remain in REAL_BOOKING_DATA_ACTIVATION.md. RU/EN offering labels still require clinic approval. Anda Wednesday/Friday exact hours are missing; Monday 12:00–17:00 is owner-entered test data. Henriete requires actual individual dates. Manual pending confirmation, one calendar month, 24-hour-before-appointment semantics and collisions pass; clinic wording about a working day remains unresolved. No silent expiration or delivery notifications were added.

Historical production inventory has automatic/60-day/120-minute settings and null privacy version; those are not the requested launch rules. Do not treat schema migration 008 as operational activation. Fresh separate authorization is required to create/link/configure real offerings, remove the test interval after dependency checks and eventually enable public Booking. DEMO configuration was not changed.

## 7. Test results and honest failure history

- Frontend build PASS; 153 unit tests PASS from frontend working directory; Go test ./... and go vet ./... PASS.
- Full disposable PostgreSQL suite PASS for all packages; migration 008 dedicated preservation/repeat/transaction rollback test PASS after startup-probe fix.
- Exact Booking browser rerun PASS: 172 layouts, 31 flows, no errors. The prior calendar timeout was not reproduced with the correct isolated fixture. An initial audit run reached signed-in assertions but failed because the server used a different synthetic Supabase hostname than the seeded `sb-integration-test-auth-token`. Rerun used `https://integration-test.supabase.co`; no consent check was removed. Original timeout attribution remains unproven; do not call it a confirmed application defect.
- Real full acceptance initially FAILED: imported publication remained fallback due to legal CMS shape mismatch. Focused regression proved it. After the fix, full real Auth/Booking/Specialist/News/Media/Storage/security/public48 acceptance PASS; disposable cleanup completed.
- Real Booking configuration suite PASS; real catalog suite PASS. One attempted overlapping real suite stopped at the port-isolation guard before setup, then was rerun after cleanup and passed.
- Corrected mocked suite: Auth96, public480, SEO120, four-section admin9, authorization12, session stability, News/admin/archive/validation, specialist editor24, absence6, inline portrait6, privacy12, contact24+24 PASS. Unified article48 PASS.
- Original admin runs with the wrong synthetic Auth hostname failed; preserved as setup failures, superseded only by successful reruns.
- `media-browser.cjs` standalone `/admin/media` suite FAILED against removed navigation (redirect reached unmocked appointments search). **Not counted as passed.** It is a historical suite requiring migration to the simplified inline flows; current inline portrait and real News/Storage tests pass. No route or assertion was weakened to revive removed UI.
- One unit invocation from repository root FAILED redirect fixture resolution (503 `/cenas`); required frontend working-directory invocation passed. Documentation provides correct cwd.
- Hero locks 15/15 PASS; synthetic modes24, public rejected-media2 and idle/off performance checks PASS. No protected hashes changed.
- Security scans above; no complete pentest, real-device run, hosted performance/SEO acceptance or production fingerprint comparison performed.

## 8. Employer deployment and remaining owners

| Remaining task | Owner / gate |
|---|---|
| Review and integrate uncommitted audit fixes; PR #7 does not yet contain them or automatically include Hero branch commits | Developer action; separate Git approval |
| Retire/migrate obsolete standalone media test; consolidate test-server synthetic Auth/cwd requirements | Developer action |
| Contrast, desktop targets, initial layout movement and initial bundle reduction | Developer action; scoped protected-design approval where necessary |
| Real clinic footage and rights, exact specialist hours/dates, offering translations, advance-notice wording | Clinic approval |
| Legal bases, retention, privacy contact, processor/transfer terms, final policies | Clinic/legal approval |
| Hosted Go/container, TLS/CA, CORS/gateway, secret manager, Auth redirects, monitoring and recovery ownership | Employer deployment |
| Preview Vercel routing/packaging/status/noindex, domain cutover, GSC, real-device acceptance | Employer deployment |
| Fresh project/TLS/ledger/data/backup verification, real Booking configuration, test Monday removal, public activation | Separate production authorization |
| Hosted Storage smoke/enablement beyond prior local permission | Separate production authorization |
| Appointment notifications or contact delivery | Separate approved scope; not implemented |

The committed Vercel deployment map disables only feature/final-development and feature/hero-mobile-fix. **feature/final-audit is not covered**. Before any future push, independently verify automatic preview behavior; this task did not push or change Vercel settings.

Use DEPLOYMENT_GUIDE.md for exact environment roles and guarded runner operations. Do not replay migrations from a handover checklist. Supply only publishable Auth config to Vite; DB/Storage privileged credentials belong exclusively in backend secret storage. Preserve legacy redirects and test deployed 200/301/404/503 semantics before DNS cutover.

## 9. Exact files changed

- README.md
- backend/scripts/test-booking008-local.py
- frontend/src/services/cms/content.ts
- frontend/tests/cms-legal-isolation-browser.cjs
- frontend/tests/specialist-time-off-browser.cjs
- docs/ADMIN_USER_GUIDE.md
- docs/DEPLOYMENT_GUIDE.md
- docs/HANDOVER.md
- docs/KNOWN_LIMITATIONS.md
- docs/TEST_REPORT.md
- docs/legacy-crawl.json
- docs/FINAL_TECHNICAL_AUDIT.md
- docs/FINAL_TECHNICAL_LAB_RESULTS.json

Historical screenshots/evidence overwritten by test tools were restored to their pre-audit contents; fresh compact results are recorded here. Synthetic video and disposable credentials/services were removed. Local test/tool logs under /tmp are not committed deliverables. No secrets, production dumps or real patient data are included.

## 10. Cleanup follow-up — protected-style approval gate

14 October 2026: inspected the cleanup request on `feature/final-audit` before implementation. The existing audit changes and CMS legal compatibility fix remain preserved.

The confirmed shared muted-text contrast rule (`--muted: #72786d`) and desktop language-button styling are in `frontend/src/style.css`, one of the 15 hash-protected files. The requested shared-style correction therefore needs explicit scoped approval before changing that file and its baseline. No alternate global stylesheet was added to bypass the protection. Per the cleanup instruction to stop if a protected baseline change is needed, cleanup implementation is paused at this gate.

Requested scope: darken only failing muted text/language-label colors and enlarge language-button hit areas without changing typography, Header height, Hero composition, video behavior or Welcome Intro. Review affected public layouts and contrast before updating only the authorized stylesheet hash. All other protected hashes must remain unchanged.

Read-only inspection also confirmed two safe follow-up candidates after this gate: the application mounts before its initial asynchronous route resolves (allowing the footer to render before page content), and the router eagerly imports the CMS catalog/manifest solely to construct legacy News redirects. Admin translation bundles are also eagerly imported by main.ts. These are candidates, not implemented or measured improvements.

No new cleanup code changes, build or regression-suite reruns have occurred at this gate. The earlier results above remain historical audit evidence, not cleanup verification. The Booking consent test must still be rerun for the cleanup pass. No production access, deployment or Git mutation occurred.


## Save-point update — 15 October 2026

The technical audit is paused by the owner before photography integration. Completed CMS compatibility, mobile menu/service-grid spacing and SVG arrow fixes are being saved with their tested evidence. The earlier audit findings remain dated evidence: contrast, startup layout shifts, initial bundle reduction and replacement of the obsolete standalone Media Library test are still unfinished. No performance experiments or photo integration are included.

The branch's reviewed `frontend/vercel.json` now explicitly sets `git.deploymentEnabled["feature/final-audit"]` to false, alongside the two existing disabled branches. The matching regression test protects the exact map. This supersedes the earlier warning that this branch was not covered; other branches are unchanged. Vercel documents this as preventing automatic deployments for the named branch: https://vercel.com/docs/project-configuration/git-configuration . No repository GitHub Actions workflows or repository webhooks were found. Only this branch may be pushed under the current authorization; no deployment or merge is authorized.

See WORK_SAVE_REVIEW.md for the current file inventory, test evidence and save-point limitations.
