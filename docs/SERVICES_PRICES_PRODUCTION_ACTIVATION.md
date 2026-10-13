# Production Services & Prices catalog activation

2026-10-12 · AG Dental · `dcdgrbziounizuigmjcm` · `feature/final-development`

## Result

**PASS — production catalog initialized and verified.** Executed only the explicitly approved catalog initialization. No schema migrations, price/content edits, operational Booking records, uploads, deployment, commits, merges or pushes. Hero and Welcome Intro remain unchanged.

## Pre-activation gates

- Correct project-qualified Session Pooler identity and matching Supabase project hostname.
- Explicit `sslmode=verify-full`; successful trusted-chain and hostname verification.
- Read-only preflight transactions confirmed `transaction_read_only=on`.
- Exact ledger 001–007, absent `catalog.services` document.
- All six reviewed implementation/SEO file checksums matched `SERVICES_PRICES_ACTIVATION_PREFLIGHT.md`.
- All 61 source-table fingerprints matched the approved fresh backup baseline before activation.
- All 14 service/price source payloads matched the reviewed fixture; eight published services, six categories, 69 price rows; no conflicting drafts.
- All 24 before-activation SEO records matched the proposed catalog projection, including complete metadata HTML.
- Existing service images resolve to static registered clinic paths. No Storage media IDs or reference writes were required by this initialization.
- All 15 Hero locks passed.

### Backup evidence

```text
/Volumes/AG-Dental-Secure/AG-Dental-20261012T134954Z-backup/database.dump
SHA-256: 14b607506d165d749fe1e92ce68c13ebb70eaee62551714c86db1dc7b14f7b16
```

Checksum freshly recalculated and matched. Mounted backing image reports encrypted. Isolated restore evidence is VERIFIED: 57 application/Auth/Storage tables, exact row fingerprints, normalized schema/ACL equality and unchanged production snapshot at capture. This task verified the existing evidence rather than repeating that restore. The snapshot predates this authorized catalog addition; it does not automatically cover later activity or external Storage object bytes.

## Commands and exact database changes

From `backend`, securely loading the ignored backend environment without printing credentials:

```sh
go run ./cmd/cms --catalog --dry-run
go run ./cmd/cms --catalog --apply --confirm-import
go run ./cmd/cms --catalog --dry-run
```

A local ignored operator wrapper supplied environment values directly to the child process. The reviewed CLI implementation was not changed. Initial dry-run passed; apply returned success; no retry or rollback was needed. Final dry-run recognized the existing catalog without re-importing.

| Database object | Before | After | Authorized change |
| --- | ---: | ---: | --- |
| `cms_documents` | 197 | 198 | One `catalog.services` document |
| `cms_revisions` | 197 | 198 | One initial published catalog revision |
| `cms_events` | 204 | 205 | One `imported` event linked to the catalog revision |
| `cms_media_references` | Unchanged | Unchanged | None required for existing static image references |
| `cms_media` / media events | Unchanged | Unchanged | None |
| Operational `services` | 0 | 0 | None |
| `cms_booking_service_links` | 0 | 0 | None |
| `appointments` | 0 | 0 | None |

The catalog draft and published pointers reference the same initial revision. The event is an operator import event, not falsely attributed to a clinic employee. The audit ID sequence may advance for that insert; no unrelated sequence or record writes were requested.

No source `service.*`, `prices.*`, SEO, News, Specialist, protected Hero or other CMS document/revision was updated. There was no operational service synchronization or creation because no approved Booking relationships exist.

## Final catalog and preservation checks

- **8 services / 6 categories / 69 price rows** in the actual public catalog response.
- Stored catalog is exactly equal to a fresh `CatalogSeed` derived from unchanged source documents.
- All service IDs, slugs, translations, descriptions, raw prices, category IDs/order and assigned price references preserved.
- Surgery and prosthetics still have no guessed individual teaser-price mapping.
- All eight Booking mappings remain empty; no Booking configuration changed or activation performed.
- Full fingerprint checks on the three changed tables, excluding only the new catalog document/revision/event, exactly match their pre-activation fingerprints.
- Every other captured table fingerprint remains identical, including Auth, roles, Booking, existing CMS media and Storage metadata.
- Database schema, constraints, indexes, RLS, policies, owners and grants match the verified pre-activation schema snapshot.
- Migration ledger remains exactly 001–007; no new migration entry.

This distinguishes the three expected additive CMS changes from preservation of all existing records; it does not claim that the entire CMS table fingerprints remained unchanged after adding rows.

## SEO and public delivery

Captured approved metadata before activation, then requested actual post-activation public CMS delivery and resolved every existing service route in LV/RU/EN:

- **24/24 titles unchanged.**
- **24/24 descriptions unchanged.**
- **24/24 full metadata HTML strings unchanged**, covering canonical, hreflang and Open Graph fields.
- All eight service routes still resolve 200 in the public renderer.
- Legacy redirect configuration unchanged.
- Existing source service/price documents remain in the database as history; public delivery now uses the unified catalog instead of duplicate service/price documents.

The local runtime receives the new catalog through the existing public CMS endpoint without a frontend redeploy. This verifies API delivery and renderer behavior; it is not a claim of a newly deployed hosted website or a production content-editing browser test.

## API and authorization verification

Current local backend: `/tmp/ag-catalog-ready-api`, PID 31663 at verification, listening only on `127.0.0.1:8080`.

| Check | Result |
| --- | --- |
| `GET /api/health` | 200 |
| `GET /api/cms/published` | 200; catalog present with exact 8/6/69 counts |
| Anonymous `GET /api/admin/cms/catalog` | 401 |
| Invalid-JWT `GET /api/admin/cms/catalog` | 401 |
| Catalog store read and source comparison | PASS under READ ONLY transaction |
| RLS/grants/schema comparison | Exact match |

A real authorized admin HTTP write was deliberately not performed. Verified-admin success and ordinary-user rejection were covered by the preceding unchanged-source isolated acceptance suite; they are not mislabeled as new production write tests. Existing backend upload configuration was not changed, and no uploads occurred.

## Tests

This activation turn:

- 28 focused catalog/SEO tests passed, zero failures.
- Production read-only identity/TLS/ledger/fingerprint checks passed before and after.
- Actual public catalog/metadata comparison passed 24/24.
- Initial and repeat CLI dry-runs passed.
- All 15 Hero locks passed before and after activation.

The approved prior readiness run remains applicable to unchanged application source: frontend build, 146 unit tests, all Go packages/disposable PostgreSQL, real isolated catalog and News/Auth/CMS/Media workflows passed. Those broader suites were not needlessly relabeled as rerun during production activation.

## Files and evidence

Tracked file added: `docs/SERVICES_PRICES_PRODUCTION_ACTIVATION.md`.

Ignored, credential-free operator helpers added:

- `backend/.tls/catalog-command.go` — invokes the reviewed CLI with private backend environment.
- `backend/.tls/catalog-activation-verify.go` — READ ONLY exact-source, original-row and schema verification.

Private temporary aggregate fingerprints/SEO comparison inputs and sanitized execution logs remain outside Git. Application code, migrations, `.env` and all earlier working-tree edits were preserved. No credentials or backup contents are included in this report.

## Remaining steps before live editorial use

The initialized catalog is ready for the existing Services & Prices UI through the current local backend. An authorized employee can refresh/reopen the section. No real price/content change was made to demonstrate editing; perform deliberate clinic-approved edits only.

Hosted use still requires a separately approved reachable backend/deployment configuration and operational backups, including Storage bytes where relevant. This task does not deploy either application. Future Booking availability requires explicit clinic-approved operational identities, durations, eligible doctors and schedules; none were inferred or enabled. The pre-activation backup remains available and its known recovery scope is unchanged.

Stopped after verification. No further production action performed.
