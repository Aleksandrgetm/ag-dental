# Future CMS and media architecture

Design proposal for later implementation, reviewed 9 October 2026. Phase 3.1 creates no content tables, uploads, buckets, policies or publishing endpoints. The current public website continues using its approved bundled content.

## Employee workflow

1. Open **Pages → About**. Choose a named section in a page preview.
2. Edit its Latvian, Russian and English text in labelled fields. The layout and typography remain fixed.
3. Choose **Replace image → Upload from computer** or select an existing approved asset. Preview the intended crop and write meaningful alt text in all languages.
4. **Save draft** preserves work without changing the public page. Show a saved timestamp only after server confirmation.
5. **Preview** uses the real approved page components with an authenticated draft revision. Check desktop/mobile and all languages.
6. **Publish** presents a concise change summary and validation results. The employee confirms exactly which revision becomes public. Show success only after the transaction commits. Another editor's newer changes cause a conflict, not an overwrite.
7. The public page retrieves the newly published revision at runtime. No Git operation or frontend rebuild is required for content/media changes. New block types or layout code still require normal development/deployment.

Use the same pattern throughout: view → find → edit → preview where relevant → save → clear confirmation. Destructive actions explain their consequences and require an accessible confirmation dialog with explicit action text. Future forms retain input on errors and offer retry only where the operation's outcome is known or safely idempotent.

## Controlled content model

Maintain a versioned block registry in Go and Vue. Each allowed block type has a schema, field limits, permitted media slots/crops, locale requirements and a fixed public renderer. Accept text and constrained rich-text nodes (paragraph, heading, emphasis, safe link and list), never arbitrary HTML, JavaScript, CSS, iframe code or layout markup. Validate on the server; escape output and allowlist link schemes/hosts where appropriate. Never use unrestricted `v-html` for editor content.

Stable page/section IDs identify content independently of titles. A page revision contains ordered known block IDs and typed data. A published release points to immutable revisions; edits create drafts and never mutate published content in place. Include optimistic revision/version checks, actor, timestamp, validation result and minimal audit metadata. Audit records exclude patient messages, credentials, tokens and unnecessary personal information.

### Editable coverage

| Public area | Structured fields |
| --- | --- |
| Homepage after Hero | Intro, clinic information, services selection, specialist section, benefits, journey, price preview, gallery, news selection, contact/CTA sections |
| Service pages | Localized names/descriptions, controlled paragraphs/lists, category, images, eligibility links, price references, CTA and SEO |
| Prices | Verified price lines/ranges/display metadata, categories, notes and ordering; no invented durations or prices |
| About / clinic / specialists | Narrative sections, verified biographies/qualifications, portraits, captions, localized alt text |
| Contacts | One shared clinic-settings record for address, phone, email, opening hours and parking; map location reference validated separately |
| FAQ | Localized question/answer pairs, order and publication status |
| News / articles | Localized title/summary/body, cover media, author/date/category where verified, publication state, slug/redirect history |
| CTA and SEO | Controlled CTA label and safe internal destination; meta title/description, canonical, robots/index controls, Open Graph media and alt text |

Homepage Hero text and especially its synchronized video are protected content, excluded from ordinary page editing. Welcome Intro and page layouts remain code-owned. A later dedicated Hero workflow requires explicit approval, independent validation and the safeguards below; this proposal does not unlock them.

Store all three locales together or in revision-linked translation rows. Track missing/stale translations explicitly. Publishing requires complete LV/RU/EN content and localised alt/SEO fields for the affected public entity. Do not silently fill RU/EN with Latvian. Slug changes require safe, unique redirects; prevent cycles and conflicts with reserved application routes.

## Catalog and prices: one source of truth

The current public website's bundled service/categories/prices and the transactional Booking catalog are separate systems. Do not automatically import every marketing service as bookable or assign guessed durations.

In Phase 3.2 first establish verified identities/mappings: a public service/category can describe several bookable procedures; each booking procedure retains its existing `services.id`. Existing `doctor_services`, durations and doctor-specific overrides remain the scheduling authority. Shared published content/price records reference these stable identities instead of duplicating independently editable prices or names across CMS blocks and booking settings.

Later migrations should normalize price items and add revision-linked marketing content and category mappings. Until that migration is reviewed, keep existing booking names/display metadata authoritative for bookings; explicitly mark editorial-only offerings. Enabling booking requires verified duration, eligible doctor, appropriate recurring hours/time off, privacy notice and real availability validation. Preserve all historical appointment service/doctor references. Use the existing configuration lock and PostgreSQL collision constraints for all operational updates. Publishing a description must not silently change a schedule or appointment duration.

Migrate approved bundled content in a controlled, idempotent import with provenance and a reconciliation report; preserve exact approved prices and existing unresolved confirmation flags. Enable runtime delivery only after content parity and public regression checks. Remove the old editable source when cutover succeeds so editors cannot create conflicting versions.

## Future schema/migrations — proposed only

Names are design candidates, not created tables or approved migrations:

- `cms_pages`: stable identity, unique route/slug, block-schema version, published revision pointer.
- `cms_revisions`: page/entity FK, monotonically increasing revision, draft/published/archive state, creator, timestamps, previous revision, publication metadata.
- `cms_blocks` or revision-bound JSON blocks: stable section ID, known type/version, validated locale data, order. Keep publication changes atomic.
- `cms_publications` / `cms_audit_events`: release references, actor, operation, affected section IDs and minimal diff metadata; no sensitive request bodies.
- Shared clinic settings, localized specialist content, service category/price items and service-content mappings: extend/reuse existing operational identities rather than a second booking catalog.
- `media_assets`: stable logical asset ID, human label/tags, ownership/rights confirmation, protected flag, archival state.
- `media_versions`: immutable object paths, content hash, detected type, size/dimensions/duration, processing state, uploader, responsive variants, locale alt text.
- `media_usages`: asset-version/revision/block/slot references, including drafts and published/rollback revisions. Prevent deleting referenced versions.
- Processing/publication outbox jobs: idempotent tasks, attempts, error codes, lease and actual completion timestamp; no fake delivered/processed states.

Use forward-only versioned SQL migrations with reviewed rollback limits, explicit constraints/FKs/indexes and RLS/grants denying direct browser writes. Plan data-preserving backfills and a recovery point separately. The Go connection may bypass RLS; every server route must independently verify Supabase JWT and current database role. Do not assume policies secure a privileged DB connection. No schema work is authorized by this document.

## Public runtime content, preview and caching

Future public GET endpoints return only published content with a version/ETag, locale and schema version. No draft, actor email, storage secret or preview token appears in a public response. Vue fetches these endpoints and renders existing approved components. Backend cache keys include page, locale and publication revision; never mix private preview responses into shared caches.

Publish in one transaction: validate the draft, confirm expected revision, verify all approved assets/locale fields, update the published pointer and write an invalidation outbox event. On commit, invalidate server page/catalog caches and the corresponding public CDN response keys. Use a short bounded public response TTL/conditional ETag revalidation as a fallback if invalidation delivery is delayed; define the exact freshness SLA with hosting before implementation. Media URLs are immutable/versioned and can use long cache lifetimes. An open public page may revalidate on navigation/focus; preserve reading position and avoid disruptive mid-article replacement.

Private preview is admin-authenticated on every request, uses `Cache-Control: no-store` and `noindex`, and never changes a published pointer. A draft preview token alone must not bypass admin verification. Provide revision comparison and a reversible publish action by repointing to a retained valid published revision. That recovery depends on retained media versions; do not delete those assets through ordinary cleanup.

## Media Library and Storage trust boundary

Proposed path: Vue admin → Go verifies identity and current `admin` role → controlled upload authorization/stream → private Supabase Storage staging → validated media registry → approved public derivative objects → immutable media references in published CMS blocks.

Supabase supports private buckets with controlled downloads and public buckets for world-readable assets. Keep drafts/originals in private staging, never in a public bucket. Only cleared assets needed by a published revision enter public delivery. [Supabase bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Keep privileged Storage credentials solely in server/worker secret configuration. A service key bypasses Storage RLS, so the server must enforce authorization, permitted bucket/path, ownership and operation itself. Do not copy example policies granting all authenticated users upload rights: clinic patients are also authenticated users. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

For larger files, a future short-lived upload grant may be bound to one generated object path, expected type/size, uploader and an expiring upload intent. The server checks authorization again at finalization. A revoked uploader may finish transferring into quarantine but cannot approve or publish; cleanup handles abandoned intents. Do not trust successful byte transfer as validation success. Admin preview preferably streams through a verified Go route; if short-lived signed download links are used, document their bearer-link leakage/revocation window and prevent logging/caching them. [Serving Storage assets](https://supabase.com/docs/guides/storage/serving/downloads).

### Validation and processing

- Support drag/drop and multi-file selection with individual progress, cancellation, retry and clear error codes. Show previews and success only for actual results; distinguish uploading, scanning/processing, ready and failed.
- Allowlist extensions and MIME families, then inspect actual file signatures and decode contents. Reject executables, HTML and active/malicious SVG; initially reject SVG uploads entirely unless a dedicated sanitizer/render-to-raster pipeline is approved.
- Apply explicit per-file/batch quotas, dimensions/pixel-count limits, decoded-memory limits and timeouts to prevent decompression bombs. Do not trust client dimensions or content types. Strip unnecessary EXIF/location metadata; preserve required orientation/color handling.
- Use generated unique paths with an immutable version/hash and validated extension. Original filenames are display metadata only, length-limited/escaped; never concatenate paths from user input. No path traversal, remote-URL fetching or arbitrary bucket selection.
- Produce tested responsive raster variants (e.g. AVIF/WebP with suitable fallback), record dimensions, and generate `srcset`/`sizes` through controlled block renderers. Proposed formats/limits need validation against the actual hosting/tooling budget; no transformation service is assumed to be purchased or configured.
- Validate video container/codec, size, dimensions, duration, audio expectations and browser compatibility. Generate poster/metadata in a resource-limited worker. Preserve byte-range delivery and test playback before publishing. Do not transcode synchronised Hero footage silently.
- Track uploader, rights/consent confirmation, tags, search/filter fields, localized alt text and usage locations. Clinic media should not collect patient health information. Sensitive patient images need a separately approved workflow and must not enter the general public media library by default.

### Replace, publish and delete

Replacing creates a new immutable media version, never overwrites the bytes of a published URL. A draft references the candidate version. Existing published blocks remain pinned to their prior version until explicit publication. Show every affected usage and the chosen crop before confirmation. Cache-safe new URLs avoid displaying old bytes under a replacement's metadata.

Deletion is server-authorized and blocked while referenced by any published, draft or retained recovery revision. Offer archive/hide from picker first. Recheck references under a transaction/lock immediately before scheduling deletion, and coordinate publishing so it cannot race deletion. Use a retryable outbox worker to remove unreferenced Storage objects through the supported Storage API, then mark completion; reconcile partial failures rather than claiming deletion. Do not delete directly from `storage.objects` SQL, which does not remove the underlying bytes. [Supabase object deletion](https://supabase.com/docs/guides/storage/management/delete-objects).

## Special protection for the Scroll-Locked Hero

Mark the current clinic-tour video and poster as protected assets. Ordinary media deletion/replacement and CMS publication cannot target them. A later explicitly approved replacement flow must warn that the video is synchronized to scrolling, preserve a recoverable prior version, and validate duration, dimensions, codec, seek/keyframe behaviour, frame decoding, poster, overlays, text timing, scroll-distance mapping and mobile/reduced-motion fallback. Require side-by-side review, browser/device checks, Hero-lock evidence and a separate confirmation before publishing. Never automatically normalize a new video's duration, change `currentTime` logic or bypass the protected-asset check.

## Future module order and acceptance

1. **Services/prices:** reconcile existing real catalog and approved public content, verified duration/price provenance, categories, ordering and booking-enable checks. Existing appointments retain stable FKs.
2. **Specialists:** only verified clinic staff, portraits/bios/qualifications, eligibility mappings and duration overrides.
3. **Schedules:** recurring intervals, breaks, holidays/time off, Europe/Riga DST behaviour and the existing configuration-lock/collision rules. Show availability preview before saving.
4. **Appointments:** read/details/filter, then explicit mutations using existing admin API, idempotency, status transitions, audit and database exclusion protection. Calendar drag/drop must not commit silently.
5. **CMS + Media:** controlled block editing, draft preview, publication and the secure asset pipeline above; deploy runtime fetching with content-parity checks.
6. **Contact messages:** only after a real contact endpoint, lawful handling/retention and delivery workflow exist. Keep questions separate from bookings; read/unread/filter/reply/archive later.
7. **SEO/settings:** safe length/URL validation, canonical/robots safeguards, previewed OG assets; no arbitrary secret/environment editor. A dedicated SEO audit is separate later work. Notification preferences must not imply working email delivery before the actual provider/outbox worker exists.

These are recommendations only. Phase 3.2 has not started.
