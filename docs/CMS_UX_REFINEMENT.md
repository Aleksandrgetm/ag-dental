# Admin CMS UX refinement and Hero exclusion

9 October 2026 · `feature/admin-cms` · HEAD `3a07279970f3bf24745baa40998d41e7ac6656ae` unchanged.

This report describes only the current UX task. The pre-existing, uncommitted CMS foundation is preserved. No commit, merge, push, production query, migration, import, Storage action, or Supabase mutation was performed. No UI/UX skill was used.

## Checkpoints and before/after

1. **Inspection.** Reviewed the existing CMS manifest, Go authorization/validation/revisions, actual public components, and the locally available Astrolog `ContentOverview.vue`, `SectionEditor.vue` and related admin structure. Reused the workflow ideas: page selection, recognizable section cards, language tabs, image context and explicit save/publication controls. No Astrolog code, database model or visual theme was copied.
2. **Pages.** Replaced the generic document list with cards for all 26 inventoried public route entries, including the not-found page. Page cards show names, URL, publication state, Edit and private content Preview. Page editors follow actual section order. Auth and Booking remain system-managed; only supported search appearance is editable. Search appearance is separate from the visual section list.
3. **Editing.** Populated LV/RU/EN fields, descriptive section/fragment names, scoped content selection, image previews and existing-file selection, draft save, private preview, confirmed publication, dirty warnings and revision preview/rollback reuse the existing API. Publication remains per existing document, not a new cross-document transaction. A clear notice and confirmation explain that a shared item's publication includes all saved fields/languages and can affect other sections.
4. **Services and prices.** Six category cards → category → individual row editor. All 69 rows and eight public service descriptions are retained. The homepage price preview scopes only the three actual featured rows. Booking duration/doctor links remain separately labeled read-only operational context.
5. **News, media and settings.** Four existing article cards show localized titles, dates, image, status and actions. The 12-asset library has filename/type/usage search/filtering and an accessible detail view. Clinic/contact/hours/general settings are grouped; Booking settings and notifications explicitly show that CMS management is unavailable.
6. **Workflow validation.** Browser tests intercept local Auth/CMS APIs and simulate revisions, draft/privacy, publishing, revision rollback, conflicts, read failures and role revocation. No production writes or fake implementation success paths were introduced.
7. **Responsive/accessibility/regression.** CMS navigation is tested in LV/RU/EN at 320, 375, 390, 430, 768, 1024, 1440 and 1920px. Controls retain labels, keyboard focus styling, pressed/current states, live feedback and unsaved-change protection. Media detail receives focus. Overflow and runtime/translation warnings are checked.
8. **Public preservation.** Compared current files against hashes captured before this task. Public page, layout, Booking, Auth, Hero and Welcome implementation files are unchanged by this task; all 15 Hero-lock checks pass.

## Hero boundary

- Homepage editing starts at **Introduction — our approach**, followed by the other nine editable sections.
- `messages.hero` and the Hero-specific literal document remain in the technical inventory with `system_managed: true`; their editable destinations are null.
- Server list and publication responses filter these documents. Direct authenticated-admin detail requests return 404. Draft, publish and rollback attempts fail before accessing the database.
- `clinic.media.video`, `clinic.media.poster` and the shared protected Hero CTA text retain their original values in the technical payload structure. Server validation rejects changes, including republishing a tampered historical payload; they are omitted from admin field lists and previews.
- The library retains the protected assets as filename/type/usage references only. There is no video element, Hero image preview, video picker, file input, replace, upload or publish control for them.
- Previews render safe content using scoped fields and registered non-protected images. They do not mount the public homepage or use an iframe; therefore they never load the video Hero.
- All content values, source hashes, public URLs and media checksums remain unchanged. This update changes presentation/registry metadata and application-level exclusion, not database schema.

## Still unavailable and database dependencies

- Uploading new files, deleting files and Supabase Storage management remain unavailable. Existing registered clinic images can be selected. The three unserved source-only assets show labeled placeholders, not broken or invented thumbnails.
- Booking operational settings, notifications, creating/removing pages/articles and changing structural identifiers are outside this existing-content editor.
- Private content previews preserve content order and image context; they are not pixel-exact replicas of the public layout. Shared documents intentionally keep existing revision granularity, with explicit publication scope notices.
- API absence/import absence remains read-only or unavailable. Saving/publishing still requires a reachable Go API, verified JWT and server-side admin role, plus the previously prepared CMS schema and imported content.
- No new migration is needed for this UX change. The existing migration 004/content activation still requires its own approval and fresh deployment review. No migration or import was run, even in a test database, during this task.
- The SQL-backed integration suite's expected publication count was updated for excluded Hero records. Those integration tests were **not executed against a database in this task**; they remain opt-in. Earlier foundation results are historical evidence only.

## Validation

| Verification | Result |
| --- | --- |
| Frontend production build (`npm run build`, local synthetic configuration, Demo disabled) | PASS. Existing >500 kB chunk-size advisory remains; no TypeScript/build errors. |
| `node --experimental-strip-types --test frontend/tests/*.test.mjs` | PASS: 76 tests. |
| CMS browser suite | PASS: 214 checks, all eight requested widths and LV/RU/EN; zero real Supabase requests. |
| Admin browser `--all` | PASS: 299 authorization/layout checks; no runtime errors. |
| Public routes browser | PASS: 120 checks across 20 routes, three languages and desktop/mobile. |
| Booking browser | PASS: 172 layouts and 31 mocked-API flows. |
| Auth browser | PASS: 96 layouts plus register/login/persistence/logout/recovery/confirmation flows. |
| Contact browser | PASS: 24 layouts and 24 validation/no-delivery flows. |
| Missing-API production regression | PASS: 132 public checks + six Auth/unavailable checks; no unexpected requests. |
| `go test ./... -count=1 -v` | PASS for executed tests, including Hero direct-access/mutation rejection. Four opt-in PostgreSQL integration tests skipped; no database target configured. |
| Exporter `--check` | PASS: all 194 groups / 2,198 values / 26 routes / 12 media assets retained. |
| Hero lock | PASS: all 15 original protected files. |
| `git diff --check` and current-task whitespace | PASS. |
| Current-task public source hash comparison | PASS: no public component/view, Header/Footer, Auth, Booking, Hero or Welcome implementation changes. |

The four database-dependent skips were `TestMigrationsIntegration`, `TestLiveRoleSecurity`, `TestPostgresIntegration`, and `TestCMSPostgres`. No live or disposable database integration result is claimed for this task. Draft/publication browser tests use a local intercepted API; Go unit/HTTP tests separately exercise authorization and the system-managed exclusion before storage access.

Screenshots were captured from the final local production preview using a synthetic admin session and visually inspected:

- [Desktop homepage sections — 1440px](/tmp/ag-cms-browser/home-sections-1440.png)
- [Mobile homepage sections — 390px](/tmp/ag-cms-browser/home-sections-390.png)
- [Desktop localized editor — 1440px](/tmp/ag-cms-browser/editor-1440.png)
- [Mobile localized editor — 390px](/tmp/ag-cms-browser/editor-390.png)
- [Desktop settings](/tmp/ag-cms-browser/settings-1440.png)
- [Mobile settings](/tmp/ag-cms-browser/settings-390.png)

These screenshots are local test artifacts, not production screenshots. No browser test sent requests to real Supabase.

## Exact repository files changed in this task

- `backend/internal/cms/content.go`
- `backend/internal/cms/content.json`
- `backend/internal/cms/content_test.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/integration_test.go`
- `backend/internal/cms/store.go`
- `docs/CMS_CONTENT_INVENTORY.json`
- `docs/CMS_INTEGRATION.md`
- `docs/CMS_UX_REFINEMENT.md`
- `frontend/scripts/export-cms-content.mjs`
- `frontend/src/components/admin/CmsContentPreview.vue`
- `frontend/src/components/admin/CmsNavigator.vue`
- `frontend/src/i18n/cms.ts`
- `frontend/src/i18n/cmsUx.ts`
- `frontend/src/services/cms/catalog.ts`
- `frontend/src/views/admin/AdminCmsView.vue`
- `frontend/tests/admin-browser.cjs`
- `frontend/tests/cms-browser.cjs`
- `frontend/tests/cms.test.mjs`

## Next step

Review the admin screenshots and local workflows. Before making content editing live, separately approve and review the existing CMS backend/schema/content activation. Keep future Storage uploads as a separate authorized implementation. No production deployment or further phase was started here.
