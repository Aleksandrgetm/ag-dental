# Unified Services & Prices administration

> Status clarification — 2026-10-13: The catalog was subsequently initialized in production; see [activation evidence](SERVICES_PRICES_PRODUCTION_ACTIVATION.md). This implementation report preserves its original test and activation-stage context.

Completed locally on `feature/final-development`, 12 October 2026. Production Supabase was not changed. No migrations, deployment, commits, merges or pushes were performed. Production catalog activation is still required before this editor can manage live content.

## Architecture findings and implementation

Previously the public website used imported `service.*` and `prices.*` CMS documents, while Booking used operational `services` rows and explicit `cms_booking_service_links`. Bundled frontend content remains an availability fallback. Treating all 69 price rows as eight bookable procedures would invent relationships and durations.

The implemented authority is one versioned `catalog.services` CMS document. It contains localized services, stable category and price-row IDs, publication/archive flags, price type, optional image reference and explicit Booking identity. Existing CMS tables, revisions, events and media-reference safeguards support this model; **no new schema migration is required**.

After activation, public CMS delivery and the existing frontend adapters use the catalog for Services, service details, homepage service cards and Prices. Booking reads canonical names/descriptions/prices for explicitly linked UUIDs. Operational duration, eligibility, schedules and availability remain in the existing Booking tables. Original imported CMS documents and revisions remain intact as historical sources; their competing service/price edits are rejected after activation. Generic CMS mutations cannot bypass the catalog endpoint.

Admin navigation has exactly four entries: Appointments, Specialists, Services & Prices, News. The restored section provides search, localized service and category editors, price-row editing/reordering, optional inline image selection, immediate save/publication, confirmation before archival and a secondary archived-items filter with restore actions. There is one editing-language selector; drafts survive language changes and failed requests. Route-leave protection warns about unsaved changes. Old technical service-editor routes remain inaccessible.

## Existing mappings and preservation

Activation reads **current published database content**, not a blind replacement with the bundled manifest. Outstanding published/draft divergence blocks activation. Existing publication flags and current clinic image references are preserved. Existing explicit Booking links are reused only where unambiguous; no fuzzy name matching is performed.

| Public service | Explicit existing teaser price |
| --- | --- |
| Consultation | `prices.0`, row 0 |
| Restoration | `prices.2`, row 0 |
| Endodontics | `prices.2`, row 6 |
| Hygiene | `prices.1`, row 0 |
| Whitening | `prices.1`, row 8 |
| Children | `prices.4`, row 0 |
| Surgery | No verified individual price mapping |
| Prosthetics | No verified individual price mapping |

These reuse the existing source references. Category membership does not imply a specific treatment, price or duration. All eight source services, six categories and 69 rows are retained in the isolated activation test. Legacy service slugs are immutable. Text/range prices remain textual; fixed/from prices require valid decimal values. Consultation pricing is localized without inventing an amount.

New services receive disabled operational identities with no duration. Existing unlinked services can explicitly link a suitable existing operational record or prepare a new disabled identity. The UI never guesses that link. Further Booking activation requires an explicitly approved duration, eligible specialist, valid working interval and configured privacy readiness through existing guarded APIs. No public Booking activation was performed.

Archiving retains service IDs, appointments, doctor relationships, CMS revisions and pricing history. It disables future selection for linked operational services. Restoring does not silently re-enable Booking. Price rows archive independently because rows may be shared. Existing appointments do not contain a contractual price quote snapshot; this work preserves their current records and historical catalog revisions, and does not fabricate retrospective quotes.

## Delivery, SEO and security

- Existing public components and editorial service-detail template are reused. New services have supported detail routes.
- Service links preserve the chosen language on direct navigation and refresh.
- Current canonical/hreflang/SEO resolution and dynamic sitemap discovery read the published catalog. Archived services resolve unavailable rather than falling back to obsolete bundled service pages. Existing legacy URL mappings and redirects are unchanged.
- CMS publication refresh uses existing ETag/no-cache delivery. Save refreshes the local published projection; navigation/focus refreshes other views. Open idle tabs are not pushed live updates.
- Verified JWT and database admin-role checks protect catalog mutation. Ordinary users and guests are denied.
- Full-catalog optimistic version checks return conflicts; revisions/events and Booking synchronization commit transactionally under the existing configuration/CMS locks.
- Server validation rejects invalid localized fields, duplicate identities, broken references, invalid prices, changed legacy slugs and destructive removal of existing rows.
- Media references reuse existing image validation, historical reference protection and protected-asset checks. No upload configuration or Hero media was changed.
- Existing PostgreSQL overlap constraints, RLS, Auth flows and operational APIs remain in place.

## Verification

Executed against synthetic disposable environments only for writes:

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk advisory remains |
| Frontend unit tests | 120 passed, 0 failed |
| Go packages plus disposable PostgreSQL (`backend/scripts/test-media-local.sh`) | PASS: migration runner, Auth, Booking, CMS, database, Media and server |
| Real catalog browser → Go → PostgreSQL | PASS: LV/RU/EN × 390/1440px; create, localized description, price edit, public detail, refresh, archive, restore |
| Catalog category/price workflow | PASS: add category/row and remove row from public prices |
| Explicit Booking configuration | PASS: approved duration, eligible scheduled specialist, API inclusion; unapproved duration rejected; archive disables selection |
| Catalog concurrency / authorization | PASS: stale update 409, guest 401, ordinary user 403 |
| Existing appointment and doctor relationship | PASS: appointment JSON unchanged and relation preserved after service archive |
| News real isolated regression | PASS: direct publication, public list/detail, LV/RU/EN, refresh, image replacement, archive/restore, retry and role revocation |
| Isolated Media/Storage security | PASS: real local Storage, private originals, historical references, direct-access denial, file/size rejection and unreferenced cleanup |
| Admin responsive navigation | PASS: nine language/viewport combinations, four sections, retired routes blocked, role revocation |
| Admin access browser checks | PASS: 12 guest/user/unavailable-identity cases; zero privileged requests |
| News UI regression | PASS: 24 language/viewport scenarios |
| Specialist inline portrait UI | PASS: six localized cases with mocked transport, disabled gate, validation, retry and selection |
| Auth browser regression | PASS: 96 layout checks plus registration/login/persistence/logout/recovery/confirmation |
| Hero lock | All 15 files match the approved baseline |

The first restricted unit-test invocation could not bind local test-server ports (`EPERM`); rerunning with permission for loopback test servers passed all 120 tests. No production verification or production Storage success is claimed.

## Screenshots

Synthetic real-API catalog list captures:

- [English desktop](screenshots/unified-catalog/en-1440.png)
- [English mobile](screenshots/unified-catalog/en-390.png)
- [Latvian desktop](screenshots/unified-catalog/lv-1440.png)
- [Latvian mobile](screenshots/unified-catalog/lv-390.png)
- [Russian desktop](screenshots/unified-catalog/ru-1440.png)
- [Russian mobile](screenshots/unified-catalog/ru-390.png)

## Files changed for this task

Backend:
- `backend/cmd/cms/main.go`
- `backend/internal/cms/catalog.go`
- `backend/internal/cms/catalog_test.go`
- `backend/internal/cms/content.go`
- `backend/internal/cms/http.go`
- `backend/internal/cms/store.go`
- `backend/internal/cms/media_store.go`
- `backend/internal/cms/integration_test.go`
- `backend/internal/booking/editorial.go`
- `backend/scripts/acceptance-local.py`

Frontend:
- `frontend/src/services/cms/serviceCatalog.ts`
- `frontend/src/services/cms/content.ts`
- `frontend/src/services/cms/admin.ts`
- `frontend/src/views/admin/AdminCatalogView.vue`
- `frontend/src/i18n/catalog.ts`
- `frontend/src/main.ts`
- `frontend/src/services/admin/navigation.ts`
- `frontend/src/services/admin/access.ts`
- `frontend/src/router/admin.ts`
- `frontend/src/views/ServicesView.vue`
- `frontend/src/views/ServiceView.vue`
- `frontend/src/components/home/ServiceIndex.vue`
- `frontend/src/components/PriceList.vue`
- `frontend/src/components/common/CmsMetadata.vue`
- `frontend/api/render.ts`

Tests/evidence:
- `frontend/tests/catalog-real-browser.cjs`
- `frontend/tests/service-catalog.test.mjs`
- `frontend/tests/admin-simple.test.mjs`
- `frontend/tests/admin-localization.test.mjs`
- `frontend/tests/cms-navigation.test.mjs`
- `frontend/tests/simple-admin-browser.cjs`
- `frontend/tests/simple-admin-access-browser.cjs`
- This report and screenshots listed above. Existing simple-admin screenshots were regenerated by regression tests.

The working tree also contains earlier approved-task changes; those were preserved and are not attributed to this task.

## Production activation requirements and remaining limitations

1. Review this change and the explicit service/Booking mapping with the clinic. Unmapped services remain unbookable until deliberately configured; no durations or factual prices were invented.
2. Before any production write, perform a fresh authorized project/TLS/ledger/data preflight, verify an encrypted backup and restore evidence, and ensure there are no unpublished source edits. Capture original service/price/CMS/Booking fingerprints.
3. Update the intended Go Backend to this source under separate approval. The production-connected local backend was not restarted for this task.
4. From `backend`, with the existing securely configured database connection, run the read-only command:
   ```sh
   go run ./cmd/cms --catalog --dry-run
   ```
5. Only after separate explicit activation approval, run:
   ```sh
   go run ./cmd/cms --catalog --apply --confirm-import
   ```
   This is an additive, idempotent CMS activation, not a schema migration. It creates the catalog document, initial revision/event and media references; it does not seed operational services. Repeating activation preserves existing catalog edits.
6. Verify source content equality, counts, original revision retention, media references, existing operational records and public/admin delivery. Test real editing only with separately approved scope. No production synthetic records should be created merely for verification.
7. Review and explicitly approve each operational identity, duration, specialist and schedule before enabling Booking. This activation is separate from public catalog publication.
8. Deployments remain separately authorized. The public site needs the reachable current Go CMS API; an API-unavailable browser retains the existing fallback/last valid content, not magically updated prices. Other clients refresh on navigation/focus or reload.

Rollback must not delete appointments, operational identities or historical revisions. Source documents remain available as evidence, but switching back after catalog edits would require deliberate reconciliation to avoid losing those edits. No automatic/destructive rollback is provided or executed.
