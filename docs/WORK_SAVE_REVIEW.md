# Save current work before photography integration

15 October 2026 · feature/final-audit · original HEAD bcefafd8920206ae4c9e25f121ef95bf6dd50120

## Review outcome

All pending implementation changes are completed fixes with regression evidence. No partial performance implementation is present. The audit is paused: this save point does not complete contrast cleanup, startup layout-shift work, bundle reduction or replacement of the obsolete standalone Media Library test. Real-device retesting and clinic/legal/hosting approvals remain separate gates. Photography integration has not started.

The initial index was empty. Origin was fetched; this branch did not yet exist on origin. No resets, discarded work, history rewriting or merges are part of this save operation. Previously completed mobile language-target sizing is preserved as-is; this task makes no new language-button changes. The authorized decorative Hero outline/hash change is included; Hero behavior and Welcome Intro are unchanged.

## Deployment safeguard

Before the push, the reviewed frontend/vercel.json adds only feature/final-audit:false to git.deploymentEnabled, keeping existing branch exclusions. The exact-map unit regression passes. Official Vercel documentation states that named false branches do not trigger automatic deployments, while unspecified branches default to enabled: https://vercel.com/docs/project-configuration/git-configuration . Repository inspection found no GitHub Actions workflow and the GitHub repository hooks API returned an empty list. Historical deployment records identify Vercel as the Preview creator. This uses the existing frontend project configuration; no dashboard, domain or deployment operation was performed. Only feature/final-audit is authorized to be pushed.

## Security and evidence review

Reviewed source, documentation, tests and 49 public-UI PNG captures plus three measurement JSON files. These reviewed before/after screenshots are explicitly included despite the broad historical screenshot ignore rule so report links remain usable in Git. No other ignored captures, build output or logs are included.

High-confidence private-key, privileged Supabase key, GitHub-token, credential-bearing PostgreSQL URL and JWT patterns were scanned without printing matching values. No credential findings in proposed files. Environment/CA/backup files remain ignored and unstaged. A visitor IP in the refreshed legacy crawl's Cloudflare error text was redacted before staging; historical commits are not rewritten. No real patient or private account data was found in the reviewed public screenshots. This is a scoped current-change audit, not a claim of exhaustive secret detection in repository history.

## Fresh validation

- Frontend production build: PASS; existing large-bundle warning remains, with no performance changes made.
- Frontend unit suite: 153 PASS, including deployment guard.
- Public responsive suite: 480 checks PASS, zero errors.
- Booking browser: 172 layouts and 31 flows PASS, including consent; no timeout on this run.
- CMS legal isolation: PASS (historical legal payload accepted without weakening unrelated malformed-document rejection).
- Arrow consistency: four widths and eight calendar navigation events PASS.
- iPhone UI emulation: 15 LV/RU/EN/width cases PASS, including menu resize/orientation, footer arrows and price spacing.
- Specialist embedded absence: six workflows PASS.
- Auth browser: 96 layouts and registration/login/persistence/logout/recovery/confirmation flows PASS, zero errors.
- Disposable PostgreSQL migration 008 regression: PASS, including earlier migration compatibility, preservation, repeat/rollback and constraint checks. Only its own isolated container was created/removed.
- All 15 Hero locks: PASS. No new baseline changes in this save task.
- Staged whitespace and credential checks: required before each commit.

Browser tests use localhost, synthetic Auth/API fixtures and blocked external writes. No production Supabase connections or mutations. Browser emulation does not certify physical iPhone Safari or Android Chrome. Historical broader Go/Storage acceptance remains labelled historical in the audit reports; it is not presented as rerun here.

## Exact commit file groups

### fix(cms): preserve published content compatibility

- `frontend/src/services/cms/content.ts`
- `frontend/tests/cms-legal-isolation-browser.cjs`

### fix(ui): correct mobile navigation spacing and arrow consistency

- `docs/HERO_LOCK.json`
- `frontend/src/components/booking/BookingCalendar.vue`
- `frontend/src/components/home/ScrollClinicHero.vue`
- `frontend/src/components/layout/SiteFooter.vue`
- `frontend/src/components/layout/SiteHeader.vue`
- `frontend/src/components/common/DesktopExternalArrow.vue`
- `frontend/src/views/NewsView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/tests/arrow-consistency-browser.cjs`
- `frontend/tests/iphone-ui-browser.cjs`
- `docs/MOBILE_ARROW_CONSISTENCY_FIX.md`
- `docs/REAL_IPHONE_UI_FIX.md`
- `docs/screenshots/mobile-arrows/calendar-comparison.png`
- `docs/screenshots/mobile-arrows/calendar-original-desktop.png`
- `docs/screenshots/mobile-arrows/calendar-original-vs-vector.png`
- `docs/screenshots/mobile-arrows/hero-comparison.png`
- `docs/screenshots/mobile-arrows/hero-original-desktop.png`
- `docs/screenshots/mobile-arrows/hero-original-vs-vector.png`
- `docs/screenshots/mobile-arrows/metrics.json`
- `docs/screenshots/mobile-arrows/news-comparison.png`
- `docs/screenshots/real-iphone-ui/after.json`
- `docs/screenshots/real-iphone-ui/before.json`
- `docs/screenshots/real-iphone-ui/en-1440-footer.png`
- `docs/screenshots/real-iphone-ui/en-1440-prices.png`
- `docs/screenshots/real-iphone-ui/en-320-footer.png`
- `docs/screenshots/real-iphone-ui/en-320-menu.png`
- `docs/screenshots/real-iphone-ui/en-320-prices.png`
- `docs/screenshots/real-iphone-ui/en-375-footer.png`
- `docs/screenshots/real-iphone-ui/en-375-menu.png`
- `docs/screenshots/real-iphone-ui/en-375-prices.png`
- `docs/screenshots/real-iphone-ui/en-390-footer.png`
- `docs/screenshots/real-iphone-ui/en-390-menu.png`
- `docs/screenshots/real-iphone-ui/en-390-prices.png`
- `docs/screenshots/real-iphone-ui/en-430-footer.png`
- `docs/screenshots/real-iphone-ui/en-430-menu.png`
- `docs/screenshots/real-iphone-ui/en-430-prices.png`
- `docs/screenshots/real-iphone-ui/lv-1440-footer.png`
- `docs/screenshots/real-iphone-ui/lv-1440-prices.png`
- `docs/screenshots/real-iphone-ui/lv-320-footer.png`
- `docs/screenshots/real-iphone-ui/lv-320-menu.png`
- `docs/screenshots/real-iphone-ui/lv-320-prices.png`
- `docs/screenshots/real-iphone-ui/lv-375-footer.png`
- `docs/screenshots/real-iphone-ui/lv-375-menu.png`
- `docs/screenshots/real-iphone-ui/lv-375-prices.png`
- `docs/screenshots/real-iphone-ui/lv-390-footer.png`
- `docs/screenshots/real-iphone-ui/lv-390-menu.png`
- `docs/screenshots/real-iphone-ui/lv-390-prices.png`
- `docs/screenshots/real-iphone-ui/lv-430-footer.png`
- `docs/screenshots/real-iphone-ui/lv-430-menu.png`
- `docs/screenshots/real-iphone-ui/lv-430-prices.png`
- `docs/screenshots/real-iphone-ui/ru-1440-footer.png`
- `docs/screenshots/real-iphone-ui/ru-1440-prices.png`
- `docs/screenshots/real-iphone-ui/ru-320-footer.png`
- `docs/screenshots/real-iphone-ui/ru-320-menu.png`
- `docs/screenshots/real-iphone-ui/ru-320-prices.png`
- `docs/screenshots/real-iphone-ui/ru-375-footer.png`
- `docs/screenshots/real-iphone-ui/ru-375-menu.png`
- `docs/screenshots/real-iphone-ui/ru-375-prices.png`
- `docs/screenshots/real-iphone-ui/ru-390-footer.png`
- `docs/screenshots/real-iphone-ui/ru-390-menu.png`
- `docs/screenshots/real-iphone-ui/ru-390-prices.png`
- `docs/screenshots/real-iphone-ui/ru-430-footer.png`
- `docs/screenshots/real-iphone-ui/ru-430-menu.png`
- `docs/screenshots/real-iphone-ui/ru-430-prices.png`

### test: stabilize isolated database and specialist regressions

- `backend/scripts/test-booking008-local.py`
- `frontend/tests/specialist-time-off-browser.cjs`

### chore(audit): save review evidence and prevent preview deployment

- `README.md`
- `docs/ADMIN_USER_GUIDE.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/HANDOVER.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/TEST_REPORT.md`
- `docs/legacy-crawl.json`
- `docs/FINAL_TECHNICAL_AUDIT.md`
- `docs/FINAL_TECHNICAL_LAB_RESULTS.json`
- `docs/WORK_SAVE_REVIEW.md`
- `frontend/vercel.json`
- `frontend/tests/deployment-guard.test.mjs`

## Remaining work

No unfinished code experiments are staged. Audit findings and unmet approval gates are intentionally saved as documentation, not described as resolved. Temporary logs, local environment files and historical ignored screenshots remain local; no credentials are added. Commit IDs and final remote verification are reported in the task response. No new pull request, merge, deployment or photograph integration is requested.
