# CMS persistent navigation and editor state

Implemented on `feature/admin-cms`. No commits, migrations, production requests,
content imports, production edits or publishing were performed. Existing working
tree changes were preserved.

## Reproduction and root cause

Before changing runtime code, a local Chrome reproduction opened Dr. Anda
Gutovska, entered unsaved text, switched to another browser tab, rotated the
synthetic Supabase session through the Supabase client and returned to the editor.
The URL remained `/admin/doctors`; the editor disappeared and the category list
returned. All Auth and CMS requests were intercepted.

Two conditions caused the reset:

1. CMS selection existed only in component refs, with no document identity in the
   URL. The router exposed category roots only.
2. `AdminGate` tied component preservation to the current access token and full
   route. Supabase token refresh invalidated that grant during role revalidation,
   unmounting the editor. Remounting loaded the catalog with empty selection and
   discarded the in-memory payload. Existing coverage tested same-token focus,
   but did not reproduce token rotation.

## Implementation

- A shared navigation registry derives URLs from existing CMS document keys,
  page routes, section IDs and price-row indices. It contains 301 destinations,
  including 250 editor scopes. No content identifiers or database records were
  changed.
- CMS routes accept deep paths; the registry validates the exact item and optional
  document part. Unknown, deleted or out-of-scope items show an unavailable state.
  Hero and Welcome Intro editor destinations remain excluded.
- The URL drives selection in the editor and navigator. Back/Forward, refresh and
  copied deep links reopen the selected item. Section previews use the same route.
- An administrator-scoped, in-memory Pinia navigation store remembers the last
  destination per CMS category. Sidebar return links retain that destination.
  Identity changes, logout and role revocation clear the remembered navigation.
- During same-user role revalidation or a temporary identity API outage, the
  existing editor stays mounted but hidden and inert. Rendering and API mutations
  still require the current session's verified administrator role. Confirmed
  expiration, logout, identity changes or revoked access unmount the editor.
- Background authorization checks do not reload an already loaded draft. All
  language variants remain in its existing payload. Route leave/update guards and
  the existing browser unload warning protect unsaved changes.
- Login return validation now permits scoped CMS deep links, including `part`,
  while rejecting external URLs, traversal, control characters, double encoding
  and unexpected query parameters.
- Save, publish and restore continue through the existing secured CMS client and
  Go endpoints. No draft auto-save, auto-publish, local-storage draft cache or new
  token storage was introduced.

Example destinations:

| Content | URL |
| --- | --- |
| Specialist | `/admin/doctors/clinic.doctorBio` |
| Service | `/admin/services/service.konsultacija` |
| Price row | `/admin/services/prices.0/items/0` |
| Homepage introduction | `/admin/pages/home/intro` |
| Scoped about text | `/admin/pages/par-mums/about?part=clinic.about` |
| News article | `/admin/news/news.zobu-higiena` |
| Working hours | `/admin/settings/hours` |

## Validation

Tests used a separate local Vite server with `envDir: false`, `/api`, a synthetic
Supabase URL/key and `VITE_BOOKING_DEMO=false`. Browser routes intercepted every
API request; CMS mutations changed only in-memory test fixtures. The missing-API
suite built a separate production bundle without `VITE_API_URL`.

| Check | Result |
| --- | --- |
| `npm run build` | PASS: TypeScript and production bundle |
| `node --test tests/*.test.mjs` | PASS: 79 tests |
| `cms-navigation-browser.cjs`, headed Chrome | PASS: 45 checks |
| `cms-browser.cjs` | PASS: 214 checks |
| `admin-browser.cjs --all` | PASS: 299 checks |
| `auth-browser.cjs` | PASS: 96 layout checks and registration/login/session/logout/recovery/confirmation flows |
| `missing-api-browser.cjs` | PASS: 132 public-page checks, 6 unavailable/Auth checks, zero unexpected requests |
| `booking-browser.cjs` | PASS: 172 layout checks, 31 flows |
| `check-hero-lock.mjs` | PASS: all 15 approved files |
| `export-cms-content.mjs --check` | PASS: unchanged 194 groups, 2,198 values, 26 routes, 12 media records |
| `git diff --check` | PASS |

The new headed Chrome suite covers actual second-tab switching and token rotation,
visibility/focus events, lifecycle suspension, minimize/restore, LV/RU/EN draft
retention, previews, canceled navigation, draft save and deep refresh, Back/Forward,
sidebar return, API outages/retry, invalid/deleted items, unauthorized Hero paths,
role revocation, session expiry, logout and verified login return to a scoped URL.
Desktop (1440px) and mobile (390px) screenshots were visually inspected; no overflow
or unintended layout changes were found. Wider CMS/Admin responsive suites cover
320–1920px in all three languages.

An existing admin test used a 300ms delay to assert the dashboard was absent before
verification. It raced under concurrent browser load. The test now explicitly holds
the mocked identity response, verifies that no dashboard or privileged requests
exist, then releases it. The initial new SEO test locator was also corrected to
accept the existing read-only action on the first SEO entry. Both final suites pass.

Re-run browser suites with `TEST_BASE_URL` pointing to an isolated local test server
and `PLAYWRIGHT_MODULE` pointing to an installed Playwright package. Do not point
these tests at a deployed site or the production Go backend.

## Exact files changed by this task

Existing files:

- `frontend/src/components/admin/AdminNavigation.vue`
- `frontend/src/components/admin/CmsNavigator.vue`
- `frontend/src/i18n/cms.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/services/admin/access.ts`
- `frontend/src/views/admin/AdminCmsView.vue`
- `frontend/src/views/admin/AdminGate.vue`
- `frontend/tests/admin-browser.cjs`

New files:

- `frontend/src/services/cms/navigation.ts`
- `frontend/src/stores/cmsNavigation.ts`
- `frontend/tests/cms-navigation.test.mjs`
- `frontend/tests/cms-navigation-browser.cjs`
- `frontend/tests/helpers/cms-fixture.cjs`
- `docs/CMS_NAVIGATION_STATE_FIX.md`

The frontend source/test list was compared against SHA-256 fingerprints captured
before this task, so this list excludes pre-existing uncommitted CMS work. Public
components, Auth store/views, Booking, Hero, Welcome Intro, backend and database
were not changed by this task.

## Limitations

Selection survives reload/tab restoration through the URL. Unsaved text is kept
only in the mounted editor, not durable browser storage. If an administrator accepts
the browser's reload/leave warning, closes the tab, signs out or loses authorization,
the editor opens the latest server-saved revision after re-entry. Save a draft before
those actions. No offline or crash-recovery cache was added.

The build still reports its existing warning about JavaScript chunks over 500 kB.
No real production editing or publishing was performed to validate this change.
