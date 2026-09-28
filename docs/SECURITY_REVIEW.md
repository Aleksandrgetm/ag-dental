# Limited security review — 28 September 2026

Strix was unavailable: no installed skill or callable tool was found. This is a local source/dependency review, not a Strix report, penetration test or comprehensive security certification. No production infrastructure was attacked or changed.

## Checks and findings

- Both `npm audit --omit=dev --json` and full `npm audit --json` returned zero known advisories at review time. Packages and lockfile were not changed.
- Application content uses Vue interpolation. No `v-html`, `innerHTML`, `eval`, or dynamic Function construction was found in the application source. New price search treats input as text only and does not transmit it.
- A filename-only scan found no obvious embedded PostgreSQL URLs, service-role tokens, private keys, or common secret-key prefixes in frontend source. Environment values were not printed. No environment files are tracked; `.gitignore` continues to exclude them.
- The only browser environment reference in the API service is `VITE_API_URL`. Database credentials stay in the existing Go environment. `localStorage` holds only the chosen language.
- Active external links use `rel="noopener noreferrer"`. Unused starter-component links remain outside the shipped application routes.
- New FAQs use native details/summary and escaped source-grounded text. Gallery images come from the existing local media registry. No third-party embed or remote script was added.
- Appointment links continue to launch phone/email clients. The website does not collect, store or claim to submit patient information. No authentication-sensitive functionality was added.
- Existing browser API health check succeeded on the configured `http://localhost:5173` origin: status `ok`, service `ag-dental-api`, database `connected`.

## Existing deployment considerations

The backend currently permits the localhost frontend origin. Production must supply its actual allowlisted origin and HTTPS; this task leaves CORS unchanged. The health handler reports the startup connection status, not a new database ping on each request. No change was needed for this visual refinement. HTTP security headers and a production CSP should be configured and validated at the real hosting boundary; no speculative policy was inserted that could break Vite or the approved video.

Future booking/authentication requires its own validation, authorization, data-handling and privacy review. No Supabase settings, credentials, migrations or production services were modified here.
