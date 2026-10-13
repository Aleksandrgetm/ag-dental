# Security and privacy audit

2026-10-10. Local code, dependency tools and isolated PostgreSQL only. No intrusive
production scanning, remote role changes, uploads or production data writes.

## Findings and remediation

| Severity | Evidence | Result |
|---|---|---|
| High | npm source-map-js 1.2.1 indexed source-map DoS, GHSA-68fv-2mgg-jv7q | Updated only transitive package to 1.2.2. npm audit now reports zero vulnerabilities. |
| High | govulncheck reported nine reachable Go HTTP/TLS/multipart advisories on Go 1.27.1/x/net 0.57.0 | Go 1.27.2 and x/net 0.60.0 (required x/* companions) applied. New scan: zero reachable/imported vulnerabilities; one non-imported module advisory remains documented in final test report. |
| High | Remote DB configuration could select unverified TLS | Backend now rejects remote configurations without trusted chain and hostname verification, including unsafe fallbacks. Loopback/Unix test DBs remain supported. Unit validation uses no network. |
| Medium | Delayed CMS response could outlive token rotation/logout | Client now rechecks identity, token and admin state after JSON decoding; paths allowlisted. |
| Medium | Production controller/retention approvals missing | Contact inbox remains unavailable, Booking readiness remains gated. No guessed retention or company data. |
| Medium | Hosted Storage behavior and secret provisioning unverified | MEDIA_UPLOADS_ENABLED remains false. Real synthetic hosted upload requires separate scope/approval. |
| Medium | Distributed spam/rate controls depend on hosting | Existing public creation limiter is process-local (5/minute/IP); gateway/shared limits and trusted proxy configuration need hosting review. |
| Medium | Full CSP not enforced | Existing inline Welcome behavior must remain intact; stage a nonce-compatible CSP review before production enforcement. Basic nosniff/frame/referrer headers prepared. |

## Boundaries verified

- JWT verified through configured Supabase Auth endpoint; user role read from
  authoritative PostgreSQL, not client metadata. Admin denied on missing/forged/
  ordinary-user tokens. Role revocation tested. Mutation transactions recheck role.
- CMS uses strict structured data, text escaping and no arbitrary HTML/Vue. Dynamic
  keys are namespaced and cannot target Hero. Uploaded media references reuse the
  existing protected registry/history checks.
- Booking uses bound parameters, allowlisted table identifiers, bounded search
  ranges/pages, expected revisions, idempotency and PostgreSQL exclusion constraints.
- RLS and browser grants reviewed in migrations; privileged Go connection is the
  trust boundary, not assumed protected by RLS. Proposed 006 remains unapplied.
- Bearer APIs omit browser cookies; CORS explicit origins; private no-store headers.
  No patient request-body/access logging. No new analytics or patient URL storage.
- Media signatures, MIME, dimensions, resource/time bounds and reference-safe
  deletion validated in disposable tests; private originals never public.
- Secret scan of changed/untracked text files found no private keys, privileged
  Supabase keys, credential-bearing PostgreSQL URLs or embedded long JWTs. This is
  a targeted heuristic, not proof that historical Git or hosting secrets are safe.
- Existing backup/restore documentation retained; no fresh production backup or
  recovery claim made in this task. Fresh preflight and encrypted recovery evidence
  are required before separately approved schema activation.

## Executed checks

Go tests and vet; disposable PostgreSQL suites; npm audit; official govulncheck;
Auth/admin browser and denial suites; bounded input and media tests; changed-file
secret scan; 15 Hero locks. Final rerun counts are in TEST_REPORT.md. No production
security verification is inferred from mocks or local tests.

Email: DEFERRED - OWNER DECISION. No provider, delivery, templates or reminders added.
