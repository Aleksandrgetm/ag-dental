# Full SEO audit - AG Dental

2026-10-10. Local dental clinic / health-related service site. Applied installed seo,
seo-audit, seo-technical, seo-hreflang, seo-schema and seo-sitemap instructions.
The skill fetch_page.py and parse_html.py ran against the old homepage using an
isolated temporary Python environment. Full legacy crawl evidence is separately
preserved. No live deployment, Search Console, CrUX or ranking data was available.

## Evidence and fixes

- Before: no sitemap or robots, no canonical/hreflang, no structured data, shared
  description on all 20 public pages, generic initial Vite metadata and SPA deep-link
  hosting configuration absent.
- After: 20 public paths x 3 locales x desktop/mobile = 120 rendered checks passed
  for one H1, correct document language, canonical, four reciprocal alternatives,
  nonempty title/description, Dentist schema and no horizontal overflow.
  See seo-browser-evidence.json; local intercepted CMS, not live hosting.
- Duplicate description fallback now derives service descriptions/article excerpts
  from approved content and distinct page labels. Explicit CMS SEO edits retain
  precedence. No clinical copy, qualifications, prices or claims were invented.
- Discoverable language URLs use ?lang=ru and ?lang=en; LV retains exact old paths.
  Canonicals self-reference the appropriate language; x-default is LV. Language
  selection updates the URL without modifying Header presentation.
- Sitemap contains 60 canonical language URLs, with full reciprocal alternatives.
  Admin, Auth, Booking, API and drafts are excluded. No invented lastmod timestamps.
  Runtime sitemap adds published created content; unpublished content is absent.
- Prepared Vercel rendering function emits initial localized title, description,
  canonical, hreflang and OG metadata and uses public CMS SEO when configured.
  Created structured pages include safely escaped initial article text. Missing
  dynamic content is 404; unavailable dynamic CMS is 503, not a fake 200.
  Known approved public pages still render without a Go API. Preview robots deny
  crawling and renderer sends noindex; production robots excludes private routes.
- Eight exact legacy HTTP 301 rules; all discovered URLs tested against local HTTP
  routing contract, with no chains or homepage catch-all. Vercel edge NOT VERIFIED.
- Dentist/WebPage/BreadcrumbList and Article where applicable added client-side.
  Only existing address/phone/social links and article dates are used. No ratings,
  invented opening hours, medical credentials, authors or FAQ rich-result promises.
- Images: rendered audit found no missing alt attributes or width/height attributes.
  Existing images and Hero assets unchanged. Visual mobile screenshot inspected.

## Prioritized findings

| Severity | Finding | Disposition |
|---|---|---|
| High | Existing Vue page body still requires JS in initial response | Initial metadata fixed; measure Google rendered indexing after approved Preview. Full SSR/prerender of locked homepage deferred to an explicitly reviewed rendering change; do not alter its approved motion. |
| High | Actual Vercel packaging/routing/TLS/status behavior unverified | Run Preview smoke checks before domain cutover; prepared Node handler is locally tested only. |
| High | GSC historical/orphan URLs and baseline traffic unavailable | Obtain access/export, reconcile mapping, monitor launch. Current discovered coverage is not historical completeness. |
| High | Clinical content needs attributable expert review | Preserve approved text; owner should confirm authorship/review dates rather than inventing qualifications. |
| Medium | Very short existing service/article pages | Services 78-198 LV main-content words; shortest news 51. These are existing concise pages. Do not inflate medical copy to meet a mechanical word target. Owner-reviewed answers to actual patient questions would help. |
| Medium | JSON-LD remains JS-generated on existing pages | Google rendering/Schema validator live check required; no rich-result eligibility claim. |
| Medium | Field LCP/INP/CLS unavailable | Local layout checks are not 75th-percentile CWV. Collect real field/lab data after approved hosting. |
| Medium | Dynamic CMS SEO needs public backend | Configure server-only CMS_PUBLIC_API_URL to the same verified Go API as the browser. No secret key is needed or accepted. |
| Low | Optional AI crawler policy not decided | Default ordinary public crawling; do not invent marketing or training preferences. |

## Content, local authority and AI-readiness

Public NAP is consistent with the approved content. One clinic location only; no
doorway location pages, fabricated reviews or provider certifications. Existing
articles remain the approved four, with original slugs/dates and translations.
Short factual passages, service headings and contact details are parsable after
rendering, but independent authority/backlinks/Google Business Profile access were
not verified. No claim about actual AI citations or ranking gains is made.

## Provisional assessment

Using skill category weights: Technical 80 (25%), Content 55 (25%), On-page 90
(20%), Schema 75 (10%), Images 90 (5%), AI readiness 60 (5%). Performance (10%)
is NOT SCORED until meaningful hosting measurements exist. Verified-category
weighted subtotal is 66.75/90 (74/100 normalized); this is an engineering rubric,
not a search-engine score or a production-readiness claim.

## Launch gate and sources

Complete the SEO_MIGRATION_PLAN.md Search Console checklist. Confirm production
origin remains https://www.zobarstnieciba-ag.lv before deployment. Follow official
[Vercel route/status configuration](https://vercel.com/docs/project-configuration/vercel-json).
Validate structured data and rendered Google indexing after hosting is approved.
Do not deploy, change DNS or old hosting as part of this audit.
