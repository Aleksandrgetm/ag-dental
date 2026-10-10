# Existing website CMS integration foundation

Prepared on 9 October 2026 on `feature/admin-cms`. Source snapshot: `3a07279970f3bf24745baa40998d41e7ac6656ae`.

**Production activation is NOT performed or approved by this implementation.** No CMS migration, import, Storage upload, booking seed, Auth change or role change was made in Supabase. Local database tests used an explicitly disposable PostgreSQL 17 Docker container only. No commit, merge or push was made.

## Audit and preserved source

The read-only production audit used the existing verified TLS configuration, a read-only transaction and rollback. It found migrations `001_user_roles`, `002_booking_foundation`, `003_automatic_confirmation`; twelve public tables with RLS; no CMS tables; zero services, doctors, doctor/service links, schedules and appointments; and zero orphaned/missing Auth-role rows. No personal data was selected. This is a point-in-time audit, not authorization to deploy; repeat it immediately before approved deployment.

`CMS_CONTENT_INVENTORY.json` records each source, route, category, identifier, exact existing value, language, related media, existing editability and proposed destination. `backend/internal/cms/content.json` is the reproducible, embedded source manifest. Both are generated from the approved Git snapshot, not mutable production data or a developer's `.env`.

Inventory:

- 194 content groups and 2,198 leaf values, with existing LV/RU/EN variants and shared literals distinguished.
- 26 concrete route entries, including the not-found route; the existing `/jaunumi/params/post/:id/:slug` legacy redirect remains code-owned and points to the inventoried article records.
- Eight public services; six price categories; all 69 price rows, exact amounts and review flags; four articles with their existing dates, slugs and paragraphs.
- Twelve source media assets, including unused starter assets explicitly distinguished from live content. Fonts and protected file hashes remain covered by the original Hero manifest.
- Ten editable homepage sections follow the public content order after the Hero: introduction, services, about, doctor, Why AG, patient journey, prices, editorial clinic section, news, contact. Hero and Welcome are retained only as system references. Search appearance is presented separately from visual sections.
- Hero-only documents are system-managed: excluded from admin list/detail, mutations and the public publication feed. Protected fields in shared records remain immutable technical references and are hidden from every editor/preview. See [CMS UX refinement](CMS_UX_REFINEMENT.md).
- Unused `HelloWorld` text remains in the audit under `source-only`, not in the employee's public-page editor.

Check extraction without rewriting files:

```sh
node frontend/scripts/export-cms-content.mjs --check
node frontend/scripts/check-hero-lock.mjs
```

The extractor's source revision is deliberately pinned. Changing it is a reviewed code migration. Do not change its revision simply to accept production edits: those are revisions in PostgreSQL. `source_hash` detects conflicts with a different baseline. Re-importing an identical baseline never overwrites an employee's draft or publication.

## Admin mapping and employee workflow

The existing admin navigation is retained. Server verification is required before any editor mounts.

| Existing section | Content now represented |
| --- | --- |
| Services & Prices | Eight real public offerings, descriptions, service/category relations, six complete price lists. Linked operational duration/booking/doctor configuration is read-only and comes from existing Booking tables. |
| Specialists | Existing Dr. Anda Gutovska biography; no invented staff, portrait, qualifications or schedule. |
| Website Pages | Route filter; actual homepage section picker; introductions, section headings, CTA labels, FAQ, legal documents, footer and existing template copy. |
| News | Four existing articles, language tabs, dates, title, excerpt, category, image and paragraphs; stable slugs. |
| Media Library | Existing files, previews, usage categories, protected flags and stable registry IDs. Select existing allowed photos in content forms. |
| SEO | Per-route LV/RU/EN title and description from current App/page metadata; original HTML metadata also retained read-only for provenance. |
| Settings | Phone, email, address, map and existing social links; canonical opening hours; protected clinic identity. No secrets. |
| Dashboard / Appointments / Schedules / Contact Messages | Existing functionality or honest planned/unavailable state preserved. This task adds no appointment manager, schedule editor or message delivery system. |

Select a language, edit labelled fields, preview the section's content, save a draft, then explicitly publish the saved revision. This is a private **content preview**, not a second render of the complete public layout. History can preview previous payloads without changing the current editor; a previously published revision can be republished after confirmation. The last 30 revisions plus the active draft/publication are shown; all revisions remain stored.

Unsaved changes trigger leave/reload warnings. On same-session role refresh, the existing editor is hidden and inert while proof is pending, retaining its unsaved work. Revoked access, failed verification or changed identity/token discards the private component. Pending proof does not authorize requests: all writes also verify JWT and database role on the server. No draft is persisted to local/session storage.

Before the database is activated, the approved source content is visible read-only to a verified admin, with an explicit setup/import notice. A missing Go API never grants admin access or creates a fake saved/published state.

## Data model and migration

`004_website_cms.sql` is additive and follows 001–003:

| Table | Purpose |
| --- | --- |
| `cms_documents` | Stable content key, baseline hash, optimistic version, draft and published revision pointers. |
| `cms_revisions` | Immutable content payloads and optional Auth actor references; publication timestamp. |
| `cms_media` | Stable asset ID, existing URL, checksum, bytes, provenance, usage and protection metadata. No file upload. |
| `cms_events` | Imported / draft saved / published / rolled back events with actor and timestamp; no credentials or patient details. |
| `cms_booking_service_links` | Explicit verified mapping between an editorial offering and existing operational service IDs; imported empty. |

Foreign keys prevent another document's revision becoming a draft/publication or audit reference. Version checks and `FOR UPDATE` serialize saves/publications; an outdated editor gets 409. A failed write never advances a pointer. Import uses a transaction and advisory lock, detects incompatible baseline hashes, missing pointers and duplicate media identities/URLs, and is idempotent.

No existing tables, appointments, prices, schedules, settings, users or roles are updated by migration 004/import. There is no AutoMigrate. The reviewed migration runner now knows 004 and refuses older booking rollbacks while it is present. Existing migration SQL files 001–003 are unchanged.

All five new tables enable RLS and revoke browser access from `PUBLIC`, `anon`, `authenticated`, including the event sequence. No broad browser policies or Storage policies are created. The trusted Go connection may bypass RLS; **JWT verification and current server-side `user_roles` lookup are the authorization boundary**, not a client role claim or RLS assumption. Existing Supabase default privileges should be rechecked during deployment verification.

`004_website_cms.down.sql` only removes an empty CMS. It refuses to delete imported content/media. It is not automatically invoked. Once imported, use publication rollback or an explicitly reviewed forward migration; retaining revisions is not a database backup.

## Services, prices and Booking authority

Editorial services can describe several bookable procedures. They are not automatically bookable. No duration, price, eligibility, doctor or schedule has been invented or inserted into Booking.

The six existing non-null service teaser amounts map to verified rows in the public price list (mapping is checked against the source): consultation `[0,0]`, treatment `[2,0]`, root canals `[2,6]`, hygiene `[1,0]`, whitening `[1,8]`, children `[4,0]`. Edit the canonical price list; service/home teaser amounts derive from it. Existing service records keep their original amount as immutable import provenance. The unconfirmed/null surgery and prosthetics teasers remain unconfirmed.

Existing localized price names are reused on service detail pages, with amounts and ordering preserved. Booking still uses its own real operational catalog and collision safeguards. `cms_booking_service_links` is the explicit integration boundary; the editor reads verified linked durations, enablement and eligible doctors without changing them. With the current empty operational catalog, it clearly reports no verified mapping. A later separately approved operational workflow must create mappings and configure actual procedures before online booking can be enabled.

## API and runtime reading

Public:

- `GET /api/cms/published` — known published payloads, schema version and publication revision; no drafts, actor identities or audit records. ETag with conditional 304 and mandatory revalidation.

Authenticated and server-authorized admin:

- `GET /api/admin/cms/documents`
- `GET /api/admin/cms/documents/:key` — current state, revision history, read-only linked Booking configuration.
- `PUT /api/admin/cms/documents/:key/draft` — `{expected_version, payload}`.
- `POST /api/admin/cms/documents/:key/publish` — `{expected_version, revision_id}`; only current saved draft.
- `POST /api/admin/cms/documents/:key/rollback` — same shape; only a retained previously published revision of this document.

Private responses use `no-store`. Unknown request fields, incompatible shapes, oversized bodies, changed structural IDs, unsupported media, unsafe URLs, HTML, invalid amounts/contacts and modified translation interpolation tokens are rejected. Hero copy/video/poster, transaction/Auth strings, review flags, identity and structural fields remain locked. Database errors are sanitized; no credentials or payloads are logged.

The Vue adapter uses the existing vue-i18n architecture and existing page components. It patches known reactive content in place, preserves arrays/layout/route identities, updates localized document metadata and maps existing image references. Reads occur at mount, navigation and focus. A new page with no CMS starts from the approved bundled fallback. After a valid publication has loaded, a failed refresh keeps that last in-memory publication, never resetting it to the old bundled text. There is no fake endpoint, localhost fallback, demo fallback or persistent browser copy of CMS drafts. JSONB key ordering is explicitly supported.

Publishing content requires no further frontend rebuild after this integration itself is deployed. New section types, new routes, new list entries, operational Booking configuration and uploaded media still require the corresponding reviewed extension; editors cannot introduce arbitrary layouts or HTML.

## Media registry and future Storage rollout

Existing URLs and bytes remain unchanged. IDs are deterministic from source paths, with separate SHA-256 byte hashes. The registry captures file size/type, source use and conservative usage categories. Dynamic image lookups may reference multiple possible assets; the inventory does not pretend this is a precise runtime dependency graph. No assets were copied to Storage.

The next approved upload workflow should retain these logical IDs and add immutable asset versions. Employee file input → Go JWT/admin check → allowlisted private staging bucket/path → server-side MIME/size/dimension validation and processing → registry version → authenticated preview → public derivative only on publish. Keep secrets server-side; never grant uploads to all authenticated patients. Keep old versions needed by publications/rollback and reject deletion of referenced assets. Preserve protected Hero media outside ordinary replacement controls.

Do not create production buckets, upload existing files or replace current URLs until the migration, ownership, upload limits, processing, recovery and publication policy are reviewed. The present interface intentionally offers existing assets only; it does not simulate an upload button.

## Content needing review (preserved, not silently rewritten)

- The architectural clinic section and some template literals are Latvian/shared in the approved source. Missing separate translations are identified in the editor; none were invented.
- Existing legal review flags (`CLIENT_CONFIRMATION_REQUIRED`) remain. In particular, older privacy wording about account/booking functionality should be reviewed by the clinic against the now-implemented system before publication. No legal entity, retention period or privacy contact was guessed.
- `POLICY_UPDATED`, consent versions, route structure, Auth/Booking transactional promises and Welcome/Hero behavior remain code-owned. Legal text edits that materially change consent obligations require a separate reviewed policy/version rollout.
- Starter assets/text are inventoried as unused, not promoted into the public design.
- Catalog enablement, service durations, doctor eligibility and schedules remain unconfigured until verified by the clinic.

## Approval-gated deployment procedure

**Do not execute the write commands below until separately approved.** The current Free project's historical lack of a verified recovery point is not waived for this new migration by an earlier booking-migration approval. Review recovery readiness explicitly with the owner before deployment.

1. Review this diff, source manifest, migration checksum, tests and target project. Verify the current ledger is still exactly 001–003 and no CMS objects exist. Unexpected state: stop; do not automatically repair it.
2. Reuse the private, already verified TLS configuration (`sslmode=verify-full`, correct CA and pooler hostname). Supply `DATABASE_URL` through a protected process environment; do not paste it into shell commands, logs or Git. The import CLI does not implicitly load `.env`; the existing migration runner keeps its established loading behavior.
3. Validate offline, without a database connection:

```sh
node frontend/scripts/export-cms-content.mjs --check
(cd backend && go run ./cmd/cms)
```

4. After explicit approval, from `backend/`, with the private verified environment available:

```sh
go run ./cmd/migrate
go run ./cmd/cms --dry-run
go run ./cmd/cms --apply --confirm-import
go run ./cmd/cms --dry-run
```

The first dry run after migration should report 194 missing groups. Import should create them plus the twelve media records. The final dry run should report zero groups to add. If any command fails, stop and inspect ledger/schema before retrying; do not roll back automatically. Never run development fixtures.

5. Run `docs/CMS_POST_IMPORT_VERIFY.sql` read-only, compare pre/post counts of Auth, roles and Booking records privately, and test a verified admin's drafts/publish/revision rollback in an approved environment. Do not create test bookings in production.
6. Deploy the Go backend and frontend integration with the real approved API origin and existing Supabase Auth configuration. Include the frontend origin in the existing backend CORS allowlist. Keep `VITE_BOOKING_DEMO=false`. Verify API TLS, role enforcement, public fallbacks, all languages and protected Hero hashes. Missing API remains an honest unavailable state for admin writes.

The importer is idempotent, not a synchronizer: future operator runs must never overwrite employee edits. Do not edit the generated baseline files to make a production conflict disappear.

## Validation

See `CMS_VALIDATION.md` for executed commands, results, limits and the exact changed-file list. Browser tests intercept synthetic Auth/API responses; they do not prove live Supabase deployment. PostgreSQL CMS and migration tests are separately exercised against explicitly disposable local databases and never load the production `.env`.
