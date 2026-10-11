# Legacy URL preservation and migration plan

Status: local configuration prepared; no deployment, DNS or old-host changes.

## Discovery evidence

Read-only crawl of https://www.zobarstnieciba-ag.lv/ on 2026-10-10. See legacy-crawl.json for response status, source links, metadata, headings, image attributes, canonical/hreflang evidence, body text and response hashes. The crawl follows the homepage, navigation, footer and all discovered article links. Sitemap contains five pages; article links reveal four additional content pages. No individual service pages or alternate-language site were discovered. This does not prove that none exist.

Google Search Console access/export is unavailable. Indexed orphan pages, historical backlinks and search-performance URLs remain unverified. Reconcile an owner-provided Search Console Pages and Performance export before launch if available; do not claim complete historical coverage.

## Mapping

LEGACY_URL_MAPPING.csv records all 12 discovered endpoints: nine HTML content pages, robots, sitemap and one existing broken platform endpoint. Eight exact redirects are proposed (four articles, three slash paths plus the prices path; inspect CSV for exact count). Article slugs are preserved. The exact old /pakalpojumi/ is prices, so it redirects to /cenas; /pakalpojumi without the slash remains the approved new services overview. Do not enable automatic trailing-slash normalization ahead of these rules. Confirm historical non-slash search traffic when Search Console is available.

The broken /cdn-cgi/l/email-protection endpoint remains 404. Unknown paths must not redirect to the homepage. Existing Vue compatibility navigation is not proof of an HTTP redirect; the Vercel route rules provide actual 301 status codes once deployed.

## Per-page metadata comparison

| Legacy path | Target | Old H1 count | Old canonical | Old title | New LV title |
|---|---|---:|---|---|---|
| / | / | 7 | https://www.zobarstnieciba-ag.lv/ | Zobārstniecība Rīgā / Zobu higiēna + dāvanā zobu apstrāde ar AirFlow | Sākums · AG Zobārstniecība |
| /pakalpojumi/ | /cenas | 1 | https://www.zobarstnieciba-ag.lv/pakalpojumi/ | Zobārstniecība, zobu higiēna Rīgā, zobu higiēna Teikā, zobārsts Rīgā | Cenas · AG Zobārstniecība |
| /jaunumi/ | /jaunumi | 4 | https://www.zobarstnieciba-ag.lv/jaunumi/ | Jaunumi un akcijas / AG zobārstniecībā Rīgā / Zobārstniecība Teikā / VEF kvartāls | Jaunumi · AG Zobārstniecība |
| /par-mums/ | /par-mums | 0 | https://www.zobarstnieciba-ag.lv/par-mums/ | AG zobārstniecība - rūpes, maigums, iejūtīgums un kvalitāte vienu viet! | Par mums · AG Zobārstniecība |
| /kontakti/ | /kontakti | 1 | https://www.zobarstnieciba-ag.lv/kontakti/ | Zobārstniecība Rīgā | Kontakti · AG Zobārstniecība |
| /jaunumi/params/post/5259478/zobu-higiena-kas-pieejama-ikvienam | /jaunumi/zobu-higiena-kas-pieejama-ikvienam | 1 | https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5259478/zobu-higiena-kas-pieejama-ikvienam | Zobu higiēna, kas pieejama ikvienam - Jaunumi un akcijas / AG zobārstniecībā Rīgā / Zobārstniecība Teikā / VEF kvartāls | Zobu higiēna, kas pieejama ikvienam · AG Zobārstniecība |
| /jaunumi/params/post/5259473/zobu-protezes-un-protezesana | /jaunumi/zobu-protezes-un-protezesana | 1 | https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5259473/zobu-protezes-un-protezesana | Zobu protēzes un protezēšana - Jaunumi un akcijas / AG zobārstniecībā Rīgā / Zobārstniecība Teikā / VEF kvartāls | Zobu protēzes un protezēšana · AG Zobārstniecība |
| /jaunumi/params/post/5159831/zobu-higiena | /jaunumi/zobu-higiena | 1 | https://www.zobarstnieciba-ag.lv/jaunumi/params/post/5159831/zobu-higiena | Zobu higiēna, kuru izbaudīsi - maiga un bez sāpēm! | Zobu higiēna · AG Zobārstniecība |
| /jaunumi/params/post/4689080/aktualitates | /jaunumi/aktualitates | 1 | https://www.zobarstnieciba-ag.lv/jaunumi/params/post/4689080/aktualitates | Aktualitātes - Jaunumi un akcijas / AG zobārstniecībā Rīgā / Zobārstniecība Teikā / VEF kvartāls | Aktualitātes · AG Zobārstniecība |

Existing four article dates/slugs and approved article data are retained in content.ts/articles sources. No service descriptions or prices were rewritten for SEO. Old homepage contains repeated H1 headings; approved new Hero remains locked. Page-level description/headings/internal link checks and multilingual canonicals continue in checkpoint 11.

## Production and dynamic content

Vercel project root must be frontend, using frontend/vercel.json. Run the build and routing tests before a separately approved Preview deployment. Verify actual edge responses there: this task has not deployed. Dynamic CMS routes currently need server-aware 404/503 handling and runtime sitemap inclusion; these are explicit SEO audit items, not a claim of complete hosted validation.

Use the existing verified domain as the intended production canonical origin unless the owner chooses a different domain. Do not activate or change DNS here. Locale-specific discoverable URLs and sitemap/hreflang are addressed in checkpoint 11.

## Search Console launch checklist

1. Obtain authorized access to the existing property; export indexed/excluded URLs, landing pages, clicks and impressions with date ranges.
2. Reconcile orphan URLs against this mapping; use one-hop 301 only to relevant destinations.
3. On an approved Preview, verify every known legacy URL, canonical, hreflang and 404 response.
4. Preserve old hosting/backup until release rollback is agreed. Confirm TLS and preferred host.
5. After approved launch, submit the canonical sitemap. Use Change of Address only for an actual domain move, not a same-domain rebuild.
6. Inspect representative homepage, prices, services and four article URLs.
7. Monitor 404s, redirect errors, indexing, crawl stats, clicks and impressions daily initially, weekly thereafter; compare seasonally appropriate baseline.
8. Keep useful redirects indefinitely; do not remove them after indexing first stabilizes.
