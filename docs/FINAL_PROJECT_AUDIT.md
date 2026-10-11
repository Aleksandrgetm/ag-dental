# Final project audit

Baseline: `6300bc1` (integrated dev), clean `infra/backend-deployment` at inspection; identical file tree to `feature/admin-media`. Work isolated on `feature/final-development`. No production changes authorized by this task. Earlier 001–005 production activation is historical evidence, not authorization for further writes.

## Architecture and actual gaps

Vue public routes and lazy admin routes use existing Supabase Auth identity plus Go `/api/auth/me` role verification. Go registers Booking, CMS and Media under Gin; privileged routes require JWT and current database role. CMS is a fixed approved manifest (194 documents, 2,198 values, 26 routes, 12 assets) with revision-based draft/publish/restore. Media uses one registry, private Storage and publication-gated derivatives. Booking has atomic PostgreSQL overlap exclusion and configuration locking.

- **Priority 1:** operational services/doctors/schedule methods exist but are not exposed as complete admin workflows. Appointment and schedule routes show honest placeholders. Catalog configuration lacks administrative audit/concurrency envelopes. Existing service-price links are informational rather than authoritative synchronization.
- **Priority 1:** CMS validation is fixed-shape: imported entries can be edited, but arbitrary creation/reordering/archive is not implemented. New dynamic entities require structured validation and explicit public routing, not arbitrary HTML.
- **Priority 1:** Go hosting and backend-only Storage credential not finalized; uploads remain disabled. Clinic-confirmed catalog, durations, schedules and privacy notice version are missing. Never seed editorial services as operational availability.
- **Priority 2:** no root README or consolidated handover; SEO metadata uses a client-side SPA and needs an evidence-based audit; large CMS navigation bundle requires measurement.
- Contact endpoint is absent, with honest unavailable form behavior. Retention/controller information awaits confirmation; do not introduce storage of questions without that coverage.
- Existing outbox is a dormant lifecycle foundation, not a mail sender. Email delivery, reminders, providers and templates are excluded from this task.

## Protections and validation strategy

Preserve 15 Hero lock files and approved public composition; no broad refactor. Keep manifest baseline intact. Synthetic local database/HTTP fixtures only for writes; production configuration is never sourced into automated write tests. Additive migrations remain proposals and are not applied remotely. Separate local/mocked checks from production evidence in every checkpoint report.

Potential risks to inspect in later checkpoints: administrative mutation role revocation during transactions; schedule edits affecting reservations; fixed CMS shapes versus dynamic content; private response caching; proxy-aware rate limiting; migration runner automatically applying newly added migrations; dependency advisories; indexing of Auth/admin/preview URLs. These are audit targets, not unverified claims of vulnerabilities.
