# Legacy migration verification

2026-10-10. Local preparation only.

- Read-only legacy crawl: 12 discovered responses; 11 HTTP 200, one existing 404. Nine HTML content pages. No observed redirects within discovered responses.
- Sitemap: five listed pages; all fetched. Four news detail pages discovered through links.
- Search Console: UNAVAILABLE; historical/orphan URL completeness NOT VERIFIED.
- Local HTTP routing contract test: PASS for every discovered endpoint, one-hop 301 destinations, no homepage catch-all, unknown 404. The test executes the committed Vercel route definitions in an isolated HTTP fixture; it is NOT the Vercel edge runtime.
- Actual Vercel deployment status: NOT VERIFIED, deployment forbidden in this task.
- Public Vue paths: existing routes retained; dynamic content routes added separately.
- Article slugs: all four preserved. Old price-list URL maps to /cenas.
- Metadata, multilingual URLs, sitemap and local dynamic status handling completed in checkpoint 11; 120 rendered checks passed. See SEO_FULL_AUDIT.md for hosted limitations.

Run: `node --test frontend/tests/legacy-routes.test.mjs`. After approved deployment, repeat with curl GET requests without auto-follow first, then inspect each Location target. Verify no 308 normalization precedes the intended 301. Never test by modifying the old site.
