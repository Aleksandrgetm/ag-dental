# Services & Prices activation readiness

> Status clarification — 2026-10-13: Production catalog initialization subsequently passed. See [activation evidence](SERVICES_PRICES_PRODUCTION_ACTIVATION.md). Do not repeat the historical initialization steps below.

Updated 2026-10-12 on `feature/final-development`, project `dcdgrbziounizuigmjcm`.

**All three identified blockers are resolved. Ready for separate production catalog activation approval. Catalog activation has NOT occurred.** No production CMS/price/Booking mutation, migration, upload, deployment, commit, merge or push was performed. The explicitly authorized encrypted backup and local backend restart were completed.

## 1. SEO root cause and fix

Previously, the catalog branch in the server renderer used the service's short editorial introduction as its meta description before consulting approved route/CMS metadata. The client metadata component had the same precedence problem. This changed all 24 imported service/language descriptions even though the service content itself was preserved.

Both renderers now share `resolveServiceSEO`:

1. Existing approved CMS SEO override / existing route metadata wins, using the established `resolveSEO` normalization.
2. Only a new route without approved metadata uses its independently editable catalog search title/description.
3. Editorial title/introduction/body is a fallback only when no approved or independently supplied metadata exists.

No CMS SEO fields are overwritten. Existing slugs, redirects, canonical and hreflang generators remain unchanged. New services have optional localized search title/description inputs under a collapsed search-appearance section; those fields are server-validated and saved with the existing catalog revision. Existing baseline routes do not expose those replacement fields. There is no schema migration.

### Exact preservation results

The before/after comparison was executed using current production-connected **read-only public CMS delivery**, before and after a local catalog projection:

- **24/24 titles identical.**
- **24/24 meta descriptions identical.**
- **24/24 complete metadata HTML strings identical**, including canonical, four hreflang links and Open Graph metadata.
- Shared client resolver matches those same approved results.
- All eight service URLs preserved.

[Per-route/language comparison and hashes](SERVICES_PRICES_SEO_COMPARISON.md).

Tests also verify that explicit CMS overrides win, new services accept independent metadata without altering their editorial copy, and new metadata survives real save/publication and public navigation in isolated browser workflows.

## 2. Fresh encrypted backup — VERIFIED

```text
/Volumes/AG-Dental-Secure/AG-Dental-20261012T134954Z-backup/database.dump
SHA-256: 14b607506d165d749fe1e92ce68c13ebb70eaee62551714c86db1dc7b14f7b16
```

Before capture:

- Verified AG Dental project-qualified Session Pooler identity and matching Supabase project hostname.
- `sslmode=verify-full`, trusted TLS certificate chain and matching pooler hostname.
- Exact migration ledger 001–007.
- Existing mounted AES-256 image destination verified encrypted with `hdiutil isencrypted`; approximately 3.8 GiB free.
- New timestamped private directory; no existing archive overwritten.

Capture reused the reviewed read-only repeatable-read snapshot shared by pg_dump and table fingerprints. Database role reference excludes role passwords. Credential staging remained within the encrypted destination and was removed. Archive decoding and checksum passed. Private evidence remains alongside the archive; no backup contents or credentials were printed or committed.

### Isolated restore

Pinned PostgreSQL17 container, network `none`, no exposed ports, tmpfs database, disabled Docker logs, read-only archive mount, no production credentials. Only the selected application/Auth/Storage database objects were restored.

Verified:

- **57 tables:** all row counts and fingerprints matched.
- **254 constraints, 182 indexes, 27 functions, 13 user triggers** matched.
- RLS, browser grants, signup protection, migration006/007 schema extensions passed.
- 10 enum types and 15 default-ACL groups matched.
- 23 textual ACL-order differences normalized to identical privileges; no semantic permission differences.
- Sequence state and exact ledger 001–007 matched.
- Restored CMS: **197 documents / 197 revisions**.
- Restored source catalog: **8 services / 6 categories / 69 prices**.
- Auth: one user, one identity, one role; no missing/orphan links.
- Operational Booking services and appointments: **0 / 0**.
- All source-table fingerprints, schema, roles and sequences unchanged during capture/restore verification.

The disposable restore container was removed after successful verification. `verification-result.json` records the result and archive hash.

Recovery limitations remain explicit: database backup includes Auth and Storage metadata, not external Storage object bytes or API credentials. Hosted provider-specific objects are archived but excluded from standalone rehearsal (821 selected TOC entries, 114 exclusions). This is not a claim of full hosted-platform recovery. The snapshot does not cover future activity after its timestamp. The 61-table source inventory and 57-table isolated restore scope differ by documented provider-specific exclusions.

## 3. Local backend — READY

The outdated listener was positively identified as PID **24208**, `/tmp/ag-local-media-api`, on `127.0.0.1:8080`. It returned 404 for the catalog route.

Built current source using the existing loopback-only entry point, stopped only that verified PID, and started:

```text
PID: 31663
Executable: /tmp/ag-catalog-ready-api
Listener: 127.0.0.1:8080
Executable SHA-256: 47bcae65c44737cf0c705f93ee02e7ec1a93b51636a34a6fe9a8b13a9539f22d
Source HEAD: e402516c78883af8400a77ca4d29d123e24a09a0
```

The executable includes the current uncommitted working-tree source, not merely HEAD. No exact commit identity is falsely claimed for an uncommitted build. Existing ignored backend configuration, backend-only credentials and local upload setting were preserved; uploads were not newly enabled or exercised. No automatic migration or catalog import occurs at startup.

Read-only HTTP verification:

| Request | Result |
| --- | --- |
| `GET /api/health` | 200 |
| Anonymous `GET /api/admin/cms/catalog` | 401 |
| Invalid-JWT `GET /api/admin/cms/catalog` | 401 |
| `GET /api/cms/published` | 200, existing 8 services and 6 categories |

Catalog authorization and successful admin workflows were exercised with synthetic authenticated users in the disposable environment. No production admin write was used as a smoke test. Until activation, an authorized catalog read cannot return a catalog document because it is intentionally absent; public CMS continues serving existing content.

## 4. Production compatibility — PASS

Final verified READ ONLY transactions confirm:

```text
001_user_roles
002_booking_foundation
003_automatic_confirmation
004_website_cms
005_cms_media
006_admin_operations
007_news_archive
```

`CatalogSeed` and `ActivateCatalog(ctx, false)` pass against production without writing. All 14 published service/price documents are JSON-equal to the representative fixture used in disposable tests. No blocking draft divergence was found. All eight services remain published.

| Existing service slug | Preserved price-row reference | Booking link |
| --- | --- | --- |
| `konsultacija` | `prices.0.0` | None |
| `zobu-arstesana` | `prices.2.0` | None |
| `saknu-kanalu-arstesana` | `prices.2.6` | None |
| `zobu-higiena` | `prices.1.0` | None |
| `zobu-balinasana` | `prices.1.8` | None |
| `zobu-kirurgija` | No verified individual teaser price | None |
| `zobu-protezesana` | No verified individual teaser price | None |
| `bernu-zobarstnieciba` | `prices.4.0` | None |

No ambiguous mapping was guessed. Surgery/prosthetics remain without individual teaser-price mappings. There are zero operational service records, zero explicit service links and zero appointments. Their future Booking relationships/durations require separate clinic-approved configuration; they do not block public catalog activation.

Final fingerprints against the new backup showed **no table changes**, including CMS, Auth, Booking and Storage metadata. `catalog.services` count remains **zero**. Current CMS counts remain 197 documents / 197 revisions. Existing IDs, raw prices, text ranges, translations, source revisions and publication states remain unchanged.

## 5. Regression results

| Check | Result |
| --- | --- |
| Frontend production build | PASS; existing large-chunk advisory only |
| Frontend unit tests | **146 passed**, zero failures |
| Exact legacy SEO preservation | **24/24** title/description/head equality; overrides and new-route metadata covered |
| Go + disposable PostgreSQL (`test-media-local.sh`) | PASS: migration runner, Auth, Booking, CMS, database, Media, server |
| Real catalog browser workflow | PASS: LV/RU/EN × mobile390/desktop1440; publication, independent SEO, prices, categories, archive/restore, refresh, concurrency, auth and Booking safeguards |
| Real isolated News/CMS/Auth/Media regression | PASS: publication, visibility, language/refresh, replacement, archive/restore, retry, role revocation, JWT tampering, RLS and private Storage restrictions |
| Hero locks | **15/15 passed** |
| Production read-only dry-run/preservation | PASS; catalog absent |

All write tests used synthetic operational data and disposable services. No production tests created services, prices, doctors, schedules, appointments, media or CMS revisions. Disposable integration environments were cleaned up.

## 6. Exact files changed in this blocker-resolution task

Application/test source:

- `backend/internal/cms/catalog.go` — optional validated independent metadata for new service routes.
- `frontend/src/services/seo.ts` — shared approved-metadata-first resolver.
- `frontend/api/render.ts` — server resolver integration.
- `frontend/src/components/common/CmsMetadata.vue` — matching client resolution.
- `frontend/src/services/cms/serviceCatalog.ts` — optional metadata types.
- `frontend/src/views/admin/AdminCatalogView.vue` — compact optional new-service search fields.
- `frontend/src/i18n/catalog.ts` — LV/RU/EN labels.
- `frontend/tests/catalog-seo-preservation.test.mjs` — 24 legacy comparisons plus override/new-route regressions.
- `frontend/tests/catalog-real-browser.cjs` — independent metadata publication checks.

Documentation/evidence:

- This report.
- `docs/SERVICES_PRICES_SEO_COMPARISON.md`.
- Existing `docs/screenshots/unified-catalog/` captures regenerated by synthetic tests.

Ignored local operator helpers: `backend/.tls/catalog-backup-restore.py`, `backend/.tls/catalog-ready-start.go`, and updated `backend/.tls/catalog-preflight.go`. They contain no credential values. The new archive/evidence is outside Git on the encrypted volume. `.env` was not changed. All prior unrelated working-tree edits remain preserved.

## 7. Remaining activation approval and sequence

**Request separate explicit approval to create the production unified catalog.** No schema migration is needed. This approval should cover only the catalog document, initial revision/event and necessary media-reference records—not price changes, Booking activation, uploads or deployment.

After approval:

1. Recheck project/TLS, ledger001–007, latest backup hash/coverage, absent catalog, unchanged source payloads and no conflicting drafts. Stop on unexpected drift; backup coverage does not advance automatically.
2. From `backend`, run:
   ```sh
   go run ./cmd/cms --catalog --dry-run
   ```
3. Only after all gates pass, run:
   ```sh
   go run ./cmd/cms --catalog --apply --confirm-import
   ```
   Do not run migrations or the standard content importer. Inspect ledger/catalog state before retrying an uncertain commit.
4. Verify exactly one new catalog document, one initial revision and one import event relative to the fresh baseline; original source payloads/history and all other records unchanged; 8 services/6 categories/69 prices; exact public URLs and metadata; no operational service seeding.
5. Repeat dry-run/idempotency read checks and verify authorized admin read/public delivery. Do not edit real content merely for smoke testing.
6. Real content editing, public Booking setup and hosted deployment remain separate scopes. No destructive automatic rollback: source history is retained, but any later rollback must reconcile catalog edits.

Current reviewed checksums:

```text
d21b0481c9e16abcf9805328632e4f1b3535996893cc5688c979edcd9e4c454b  backend/internal/cms/catalog.go
344e34f793ecb5fbd7c964a335fe58906aa4b8c3d6cf768506b0a5c2dfb62372  backend/internal/booking/editorial.go
a2fc85cd0c4e171429f9c1ea2e695f70f874ddd34ffed6055bb1ca0bc1568aaa  backend/cmd/cms/main.go
0ec2785a21371fbd3be2bd1622188b035b2f4c02305b501d9fbc73a86700560f  frontend/src/services/seo.ts
8911df13cbb12397ef79e5426a96ce16b048f3369abbfa751c7c7855cbafefcb  frontend/api/render.ts
9ec82b75b58e68ecbc6e429f0f984f3d1ffc1c6d3e1dbc80790a005d0db63591  frontend/src/components/common/CmsMetadata.vue
```

Stopped for review. Production catalog remains inactive.
