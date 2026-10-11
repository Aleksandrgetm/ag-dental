# Maintenance and recovery

Assign named owners for code/release, Supabase billing/access, clinic content/privacy,
backups and incident response. Use least privilege and MFA for management accounts.
A GitHub repository transfer does not transfer DB, Auth users, Storage files, domains
or secrets. Transfer account ownership through the platforms, never via source files.

## Routine checks

- Review API uptime, latency, conflicts, 401/403 rates and resource limits. Redact
  authorization headers and patient details; do not log request bodies/search terms.
- Review dependency updates with npm audit, govulncheck, build/unit/isolated-DB/browser
  regression and all 15 Hero locks. Do not suppress findings without reachability review.
- Check localized content, media references, drafts/revisions and published sitemap.
  Do not delete media referenced by historical revisions or doctor audit history.
- Review authorized admin list and remove access deliberately through reviewed role
  procedures. Public registration remains user-only.
- Retest calendar at Riga DST transitions and after scheduling-rule changes.
- Monitor Search Console after cutover: indexed URLs, sitemap errors, 404s, clicks,
  impressions and query/page trends. Preserve meaningful old URL redirects.

## Database and backup procedure

Use the established BOOKING_MIGRATION_READINESS.md, SUPABASE_BACKUP_RESTORE_VERIFICATION.md
and media activation reports for historical procedures; inspect fresh state before
reuse. Keep verify-full plus trusted CA/hostname. Never echo DATABASE_URL or put it
in process arguments, shell history, reports or Git.

A migration approval must name exact files/checksums, current ledger, affected objects,
preconditions and recovery scope. 006 remains proposed. Do not run AutoMigrate,
fixtures or direct SQL shortcuts against production. After an uncertain COMMIT,
inspect ledger/schema before any retry. Never automatically roll back audit history.

Store fresh backups only on approved encrypted private storage. Verify archive hash,
readability, schema/data coverage and isolated restore. Supabase-managed Auth/Storage
schemas need the documented platform-aware procedure; DB archives do not back up
Storage object bytes. Keep database and object backup policies coordinated.
A successful historical backup does not cover subsequent activity. Retention and
recovery objectives need owner confirmation; do not invent periods.

## Release / incident recovery

Prefer reverting a code deployment when schema remains compatible. Preserve logs
without patient details and record affected version/time. Database restore is a
separate approved incident operation into an isolated destination first; never test
restore on live. Reconcile activity after the backup snapshot before switching.
Keep uploads and booking activation disabled until their own gates pass.

Email is deferred: there is no mail provider, delivery queue consumer or reminders
to maintain. Existing lifecycle/outbox records must not be marked delivered by hand.
