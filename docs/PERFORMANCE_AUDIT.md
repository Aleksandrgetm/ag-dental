# Performance audit

2026-10-10; local production builds and disposable PostgreSQL 17.11. No field
Core Web Vitals, production backend latency or real mobile network claims.

## Measured changes

| Artifact / operation | Before | After |
|---|---:|---:|
| Main CSS, uncompressed | 584,784 bytes | 261,330 bytes |
| Icon-font artifacts | 3,606,740 bytes (four formats) | 0 |
| Largest application JS | 634,465 bytes | 643,460 bytes |
| Admin catalog JS chunk | 620,816 bytes | 620,816 bytes |
| Catalog query round trips for N services | 2 + 3N | 2 |
| Catalog query round trips for N doctors | 2 + 2N | 2 |
| Catalog query round trips for N schedule/time-off rows | 2 + N | 2 |

Rounded build output may differ by a few bytes on subsequent builds. Artifact
size is not transferred size: browsers previously chose one icon font format,
not all four. WOFF2 was 403,216 bytes. Main CSS gzip is now about 42.23 KB.
The matching SVG search glyph adds about 9 KB JavaScript (built-in aliases), a
substantial net reduction without changing the visible search control.

Catalogs use the same bounded SQL projection for list and single-row mutations;
indexed correlated joins execute inside PostgreSQL, not per-row network requests.
The integration test counts exactly two queries and requires list/mutation
optimistic revisions to match. No pagination or authorization guard was removed.
The existing 1,001-row sentinel rejects catalogs beyond the supported 1,000-row
limit rather than silently truncating data.

## Reviewed unchanged behavior

- Public and admin views are lazy Vue Router imports. Large CMS navigation/catalog
  code remains an admin chunk; it is not an excuse to raise the warning threshold.
- Locale bundles and core UI still produce a >500 KB application chunk. Further
  translation splitting needs measured route-loading/error regressions; not done
  speculatively during this release.
- Published CMS uses ETag / must-revalidate and a shared in-flight fetch; admin
  requests are no-store. Server still reads published documents to compute ETag.
  At higher volume, benchmark revision-key caching with publish invalidation.
- Current image assets inspected; clinic images are about 28–240 KB. Public image
  dimensions/alt text verified by SEO browser suite. Uploaded derivatives reuse
  resource-bounded media processing and immutable identifiers.
- The approved ~35 MB Hero video, poster, timing and scroll logic are locked and
  unchanged. Delivery caching/range support needs actual hosting verification;
  re-encoding or changing its loading behavior is outside this authorization.

## Validation and remaining work

Production build PASS; Go tests PASS; actual isolated PostgreSQL Auth/Booking/CMS/
Media/operations/migrations suite PASS after optimization. All 15 Hero locks and
final public/browser regression are repeated in the release gate.

Do not equate localhost timing with CWV. After approved staging deployment,
measure mobile Lighthouse/LCP/CLS/INP, cold and warm routes, API pool saturation,
media cache behavior and JS execution. Collect field p75 data when available.
The chunk warning remains a documented medium optimization opportunity, not a
suppressed warning or fabricated passing performance score.

Files: frontend/src/plugins/vuetify.ts, PricesView.vue, package.json/package-lock.json;
backend/internal/booking/operations.go and operations_integration_test.go.
