# AG Zobārstniecība backup and restore readiness

**Step 2 result: BLOCKED.** The live AG Dental project is on Supabase Free. Its Dashboard provides no scheduled backup, PITR recovery window or selectable restore point. No manual backup has been created or validated. Do not deploy booking migrations until a suitable backup and recovery procedure have been verified.

Inspected on **8 October 2026**. Database metadata was read at **14:22:54 UTC** through the existing Session Pooler with `sslmode=verify-full`, verified certificate trust and matching hostname. All SQL inspections used read-only transactions ending in rollback. This is a readiness assessment, not a backup or restoration.

## Supabase backup availability

| Capability | Evidence from the authenticated project Dashboard | Result |
| --- | --- | --- |
| Scheduled backups | [Scheduled backups](https://supabase.com/dashboard/project/dcdgrbziounizuigmjcm/database/backups/scheduled) explicitly says the Free plan does not include project backups and offers an upgrade | Unavailable on this project's current plan |
| PITR | [Point in time](https://supabase.com/dashboard/project/dcdgrbziounizuigmjcm/database/backups/pitr) offers the Pro add-on instead of an earliest/latest recovery window | Unavailable in the current configuration |
| Existing restore point | No backup timestamp or selectable recovery point is offered | None established |
| Restore to a new project | [Restore page](https://supabase.com/dashboard/project/dcdgrbziounizuigmjcm/database/backups/restore-to-new-project) requires Pro or above and physical backups | Unavailable in the current configuration |

These are project-specific Dashboard observations, not assumptions based on PostgreSQL WAL settings. No Management API token was retrieved or displayed. Unknown provider-internal disaster-recovery copies are not a customer-usable restore point.

Supabase documents daily backups for paid plans and PITR as an additional paid capability. Provider restoration entails downtime and can discard changes after the selected recovery point. Database backups exclude Storage file bytes. Upgrading would require a subsequently completed backup or an actual PITR window; paying for a plan alone is not proof of recovery readiness. No upgrade or backup-setting change was made. See [Supabase backup and recovery documentation](https://supabase.com/docs/guides/platform/backups).

## Existing data and objects to preserve

| Object or relationship | Read-only observation | Required coverage |
| --- | --- | --- |
| `auth.users` | 1 row | Preserve user UUIDs, password hashes and account state; never export these to chat/logs |
| `auth.identities` | 1 row | Preserve links to user UUIDs and identity/provider data |
| `public.user_roles` | 1 row; no orphan or missing role | Preserve the assigned role exactly, together with its FK, constraints, RLS and grants |
| `public.schema_migrations` | Table exists; 0 rows | Preserve the empty ledger as well as its schema; do not insert an adoption record during backup/restore |
| Other Auth tables | 27 Auth tables plus `refresh_tokens_id_seq`; all readable | Capture the entire Auth schema/data, including sessions, refresh tokens, MFA and other authentication records, not only users |
| Application signup trigger | `auth.users.on_auth_user_created_role` calls `public.create_user_role()` | Preserve this cross-schema trigger and function; a public-only dump omits the trigger |
| Existing RLS automation | `public.rls_auto_enable()` and `ensure_rls` event trigger | Preserve their definitions and enabled state; do not assume migration 001 contains them |
| Supabase migration histories | Auth/Storage/Realtime histories exist; `supabase_migrations.schema_migrations` does not | Capture existing histories for reference and compatibility checks; do not replay them over a differently versioned managed target |
| Storage | 0 buckets and 0 object records | Include DB metadata; no Storage files were found via these DB counts |
| Vault and large objects | 0 Vault secrets and 0 PostgreSQL large objects | Recheck before backup if state changes |

Other schemas present: `extensions`, `graphql`, `graphql_public`, `pgbouncer`, `realtime`, `storage`, `vault`. Installed extensions: `pg_stat_statements` 1.11, `pgcrypto` 1.3, `plpgsql` 1.0, `supabase_vault` 0.3.1 and `uuid-ossp` 1.1. The existing database includes provider event triggers in addition to `ensure_rls`; preserve their source definitions for comparison without blindly recreating them on another Supabase instance.

The connection role has BYPASSRLS and SELECT access to all inspected non-system tables, materialized views and sequences. No unreadable relation was found. This supports manual-dump feasibility; it is not proof that every `pg_dump` catalog operation or the eventual restore will succeed. Do not use `--enable-row-security` to turn an access failure into an incomplete backup.

## Manual backup feasibility

**Feasible, pending approval and actual execution.** Use one PostgreSQL 17 custom-format database archive, preserving schema and data together. Avoid schema filters, `--schema-only`, `--data-only`, `--no-acl`, `--no-owner` and exclusion flags at capture time. This retains Auth, public objects, privileges, policies, sequence values, trigger definitions and the rest of the logical database in one consistent data snapshot. Preserve PostgreSQL role definitions separately without role passwords. The archive is a recovery source, not a script to replay wholesale into a managed project.

The installed native clients are PostgreSQL **18.4**, and native `psql` passed a read-only `verify-full` test. Prefer the already cached **PostgreSQL 17.11** Docker client to match the source major version **17.6** and avoid relying on an 18-generated archive restoring into 17. PostgreSQL warns that newer `pg_dump` output is not guaranteed to load into an older major version. See [version compatibility](https://www.postgresql.org/docs/18/app-pgdump.html#APP-PGDUMP-NOTES).

The cached image and matching client were inspected:

```text
postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675
pg_dump (PostgreSQL) 17.11 (Debian 17.11-1.pgdg13+2)
```

Its `psql` successfully executed `SELECT 1, current_setting('transaction_read_only')` under `BEGIN READ ONLY` and returned `1|on`, followed by rollback, using the same pooler, trusted CA and `verify-full`. Only `pg_dump --version` was executed; **no dump command was run**. The disposable client container ran no database server and was removed. Temporary password files were mode `0600` and removed after the probe. No existing container was restarted or modified.

## Backup procedure after explicit approval

The following is a prepared procedure, **not executed**. Approval must cover backup creation and the private destination. A test restore needs separate approval. The destination must be a mounted, encrypted private volume outside the repository and outside any publicly shared or automatically synchronized folder. Encryption and key recovery must be confirmed by the operator; the script does not infer encryption from directory permissions. Archive contents include account password hashes and tokens, so filesystem mode alone is insufficient protection at rest.

1. Approve a concrete destination and backup creation. Keep the encryption/recovery key separate from the backup. Do not put a password, connection URL or access token in shell arguments, command history, the report or Git.
2. Recheck source identity, strict TLS and the current schema/role inventory immediately before capture. Record fresh counts and the Auth/Storage/Realtime schema versions privately; today's counts are not a permanent expectation. Avoid concurrent schema or role changes during capture. The single database dump is transactionally consistent; the separate role export is not part of that same snapshot. If exact source-to-restore comparisons are needed while writes continue, collect the comparison manifest from the same exported snapshot used by `pg_dump --snapshot`, holding its read-only transaction until capture completes.
3. Run the script below from `backend/` only after approval. It uses the current, single-line, unquoted `DATABASE_URL` assignment written in Step 1; it refuses other formats rather than evaluating `.env` as shell code. It never outputs the URL/password and supplies the password through a temporary private `PGPASSFILE`, not process arguments or `PGPASSWORD`.
4. Review the archive's table of contents, schema, ACL/RLS entries and private error logs. Preserve the manifest and verified checksum separately with the backup's custody record. Keep a second encrypted private copy only in a separately approved destination; do not upload anything during this step.

Set `AG_BACKUP_DEST` to the approved existing encrypted directory. The example value below is an operator input, **not a directory already created or verified**. Setting the acknowledgement variable is not a substitute for the user's approval.

```sh
cd /Users/aleksandrgetmanenko/Desktop/Projects/Dental/backend
export AG_BACKUP_DEST='/absolute/path/to/approved/encrypted/private/directory'
export AG_BACKUP_APPROVED='yes'
python3 - <<'PY'
import datetime, hashlib, os, pathlib, subprocess, tempfile
from urllib.parse import urlsplit, parse_qs, unquote

if os.environ.get('AG_BACKUP_APPROVED') != 'yes':
    raise SystemExit('Explicit backup approval is required.')
os.umask(0o077)
backend = pathlib.Path.cwd().resolve()
repo = backend.parent
dest = pathlib.Path(os.environ['AG_BACKUP_DEST']).expanduser().resolve(strict=True)
if not dest.is_dir() or dest == repo or repo in dest.parents:
    raise SystemExit('Use the approved existing encrypted directory outside Git.')
lines = [s[len('DATABASE_URL='):] for s in (backend / '.env').read_text().splitlines()
         if s.startswith('DATABASE_URL=')]
if len(lines) != 1 or lines[0] != lines[0].strip() or lines[0].startswith(('"', "'")):
    raise SystemExit('Unexpected private URL format; stop for a safe configuration review.')
try:
    u = urlsplit(lines[0])
    q = parse_qs(u.query)
    if (u.scheme not in ('postgres', 'postgresql') or
        u.hostname != 'aws-1-eu-west-1.pooler.supabase.com' or u.port != 5432 or
        q.get('sslmode') != ['verify-full'] or len(q.get('sslrootcert', [])) != 1):
        raise ValueError()
    password = unquote(u.password or '')
    username = unquote(u.username or '')
    database = unquote(u.path.lstrip('/'))
    if not password or not username or database != 'postgres':
        raise ValueError()
    root = pathlib.Path(q['sslrootcert'][0]).read_bytes()
    if hashlib.sha256(root).hexdigest() != '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7':
        raise ValueError()
except Exception:
    raise SystemExit('Private connection or trusted CA changed; re-verify before capture.')

image = 'postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675'
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
out = dest / ('ag-dental-before-booking-' + stamp)
out.mkdir(mode=0o700)  # Fails rather than overwriting an existing directory.
env = {k:v for k,v in os.environ.items() if not k.startswith('PG') and k != 'DATABASE_URL'}
env.update(PGHOST=u.hostname, PGPORT='5432', PGUSER=username, PGDATABASE=database,
           PGSSLMODE='verify-full', PGCONNECT_TIMEOUT='15')

def pgpass_escape(value):
    if '\n' in value or '\r' in value:
        raise SystemExit('Unexpected password-file value; no credentials printed.')
    return value.replace('\\', '\\\\').replace(':', '\\:')

def checked(args, logname, stdout=None):
    with (out / logname).open('xb') as log:
        result = subprocess.run(args, env=env, stdin=subprocess.DEVNULL,
                                stdout=stdout if stdout is not None else subprocess.DEVNULL,
                                stderr=log, check=False)
    if result.returncode:
        raise SystemExit('Operation failed. Keep partial files private; review the private log. Backup NOT verified.')

base = ['docker', 'run', '--rm', '--pull=never', '--read-only', '--cap-drop=ALL',
        '--security-opt=no-new-privileges']
with tempfile.TemporaryDirectory(prefix='.ag-db-auth-', dir=dest) as temp:
    private = pathlib.Path(temp)
    (private / 'root.crt').write_bytes(root)
    (private / 'pgpass').write_text(':'.join(map(pgpass_escape,
        [u.hostname, '5432', database, username, password])) + '\n')
    for p in private.iterdir():
        p.chmod(0o600)
    live = base + ['--mount', f'type=bind,src={private},dst=/run/db,readonly',
                   '--mount', f'type=bind,src={out},dst=/out']
    for key in ('PGHOST','PGPORT','PGUSER','PGDATABASE','PGSSLMODE','PGCONNECT_TIMEOUT'):
        live += ['--env', key]
    live += ['--env','PGPASSFILE=/run/db/pgpass','--env','PGSSLROOTCERT=/run/db/root.crt']
    checked(live + ['--entrypoint','pg_dump',image,'--no-password',
        '--format=custom','--compress=gzip:6','--lock-wait-timeout=5s',
        '--file=/out/database.dump.partial'], 'database-dump.stderr')
    checked(live + ['--entrypoint','pg_dumpall',image,'--no-password',
        '--database=postgres','--roles-only','--no-role-passwords',
        '--file=/out/roles-reference.sql.partial'], 'roles-dump.stderr')

# Verification containers have no network and receive no database credentials.
offline = base + ['--network=none','--mount',f'type=bind,src={out},dst=/out,readonly']
with (out / 'archive.toc').open('xb') as toc:
    checked(offline + ['--entrypoint','pg_restore',image,'--list',
        '/out/database.dump.partial'], 'archive-list.stderr', stdout=toc)
toc = (out / 'archive.toc').read_text()
required = [
    'TABLE DATA auth users ', 'TABLE DATA auth identities ',
    'TABLE DATA auth schema_migrations ', 'TABLE DATA public user_roles ',
    'TABLE public schema_migrations ', 'TABLE DATA public schema_migrations ',
    'FUNCTION public create_user_role()', 'FUNCTION public rls_auto_enable()',
    'TRIGGER auth users on_auth_user_created_role ', 'EVENT TRIGGER - ensure_rls ',
]
if any(entry not in toc for entry in required):
    raise SystemExit('Required archive entries are missing. Backup NOT verified; inspect private TOC.')
checked(offline + ['--entrypoint','pg_restore',image,'--exit-on-error',
    '--file=/dev/null','/out/database.dump.partial'], 'archive-read.stderr')
for old, new in [('database.dump.partial','database.dump'),
                 ('roles-reference.sql.partial','roles-reference.sql')]:
    (out / old).rename(out / new)
with (out / 'SHA256SUMS').open('x') as manifest:
    for name in ('database.dump','roles-reference.sql','archive.toc'):
        h = hashlib.sha256()
        with (out / name).open('rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                h.update(chunk)
        manifest.write(h.hexdigest() + '  ' + name + '\n')
for p in out.iterdir():
    p.chmod(0o600)
print('Capture and offline archive checks completed in the approved directory.')
print('An isolated restore has NOT been tested. No production restore was attempted.')
PY
```

The script retains owner/ACL metadata and uses `pg_dump`'s normal RLS checks. It does not alter RLS policies or source data. The role file excludes **PostgreSQL role passwords**, not Auth users' stored password hashes inside the database archive. It is reference material for a reviewed recovery plan; replaying all provider roles is not safe. [PostgreSQL describes these role-dump semantics](https://www.postgresql.org/docs/17/app-pg-dumpall.html).

`pg_dump` takes read locks and a consistent transaction snapshot. A lock timeout, denied privilege, interrupted stream or any nonzero exit makes capture incomplete; stop rather than removing objects from the dump to force success. The prepared capture script has been syntax-checked, but not executed against the database. Its mandatory TOC checks must be reconciled with the actual archive before it can pass.

## Backup integrity verification

After an approved capture, set `AG_BACKUP_DIR` to its exact output directory and check the checksum again, including after copying the archive:

```sh
cd "$AG_BACKUP_DIR"
shasum -a 256 -c SHA256SUMS
```

The prepared script already runs these two non-restoring checks using the PostgreSQL 17 image, no network and no credentials:

```sh
pg_restore --list database.dump
pg_restore --exit-on-error --file=/dev/null database.dump
```

These are the exact **client operations** inside its isolated verification containers; a bare local `pg_restore` is not currently on PATH. The first validates the archive index; the second reads and decompresses the archive contents into a discarded SQL stream without connecting to a database. Neither proves that schema dependencies, managed privileges or Auth services will function after recovery. [PostgreSQL archive selection and restore behavior](https://www.postgresql.org/docs/17/app-pgrestore.html) govern the later restore.

Inspect private TOC/schema output for all Auth tables, sequence state, `public.user_roles`, the empty application ledger, RLS/ACLs, the signup trigger/function, and RLS automation. Account row counts alone are insufficient: verify preserved UUID relationships and exact role assignments during an approved drill, without logging password hashes, tokens or personal data. A matching checksum proves unchanged bytes relative to the recorded checksum, not restorable semantics or completeness.

## Managed schema recovery boundaries

**Never run an unrestricted restore, `--clean`, `--create`, or the role-reference script against the live Supabase project.** Capture broadly, then select only the reviewed objects needed for the specific recovery. SQL dumps are executable code and must be inspected before use.

- **Application objects:** restore their schema, data, ownership and privileges deliberately. Preserve the empty `public.schema_migrations` ledger exactly. Do not rerun migration 001 as a substitute: it seeds role rows and a ledger record and is not an image of the existing state. Existing target default grants must not accidentally expose restored tables to `anon` or `authenticated`.
- **Auth:** use a compatible Supabase Auth schema and service version on the isolated target. Preserve the full account/identity relationships. Compare managed migration histories before importing; do not load source Auth migration history over a different target version, recreate all Auth tables blindly, or merge by email. The custom signup trigger belongs in a separately reviewed post-data step; enabling it before loading saved users can recreate conflicting role rows. Any trigger-suppression strategy requires target-specific approval and checks; it must never affect production.
- **Provider infrastructure:** do not replace target-owned `auth`, `storage`, `realtime`, `pgbouncer`, GraphQL, extension infrastructure, provider event triggers or built-in roles using the full archive. Treat these entries as reference and use the platform's supported initialization/recovery path. Extension-owned internals are normally represented by extension definitions and configuration data, not a complete export of every internal object. `ensure_rls` must be compared against the target's existing event trigger before deciding whether to restore or reuse it.
- **Other state:** project Auth configuration, redirect URLs, email/OAuth providers, API/JWT signing keys, external files, Edge Functions, platform settings, replication state and encryption keys are not reproduced by this logical database archive. Do not invent or copy production keys into a test environment. There are currently no Vault secrets, but if that changes, encrypted values require an appropriate encryption-root-key recovery procedure.

Supabase's CLI default schema dump excludes managed schemas and does not include table data or custom roles. It is not sufficient by itself for this database. See the [CLI dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump). Supabase also requires separate handling for custom triggers/policies on managed schemas and for migration histories; its [migration guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) must be applied to the actual target version rather than copied wholesale. The [project-cloning documentation](https://supabase.com/docs/guides/platform/clone-project) distinguishes database contents from Auth configuration, file storage and encryption-key recovery.

## Isolated restore approval and acceptance criteria

A restore drill is necessary before calling this manually captured database recovery-ready. **No drill has been authorized or performed.** The proposed environment is a new disposable local Supabase stack with PostgreSQL 17 and compatible Auth/Storage migrations, on encrypted local storage. It must be separate from the clinic database and existing development databases, with no production connection URL, no shared production volumes and no external email/webhook/network effects. Mount the archive read-only. Expose any test interfaces only on loopback; block outbound network during restore. The repository's minimal Auth test stub is not a faithful Supabase recovery environment.

After approval, prepare and review a `pg_restore --use-list` selection for the actual target: application objects, compatible Auth data and the cross-schema custom trigger, with controlled ordering and target-owned platform objects excluded. Use error-stop and transactional restoration where supported. Resolve target ownership, dependencies and privileges before running; do not suppress restoration errors. A plain PostgreSQL container that only accepts public tables would not establish Supabase Auth recovery.

Acceptance requires: error-free approved restore; preserved user/identity UUIDs and role assignments; expected application ledger; validated relationships and sequence state; correct functions/triggers, RLS and browser-role denials; compatible Auth service behavior; and a documented recovery duration and data-loss window. Test login/signup only in the isolated environment and only within the approved drill scope, using a dedicated disposable account. Neither existing user passwords nor production sessions should be exercised or logged.

## Changes and next action

Only this report was added and `BOOKING_MIGRATION_READINESS.md` updated for Step 2. No backend/frontend code, `.env`, TLS configuration, schema, RLS, users or production records changed. Temporary read-only inspection helpers were created at `/tmp/dental-backup-readiness.go` and `/tmp/dental-libpq-readiness.go`; they contain no credentials. The temporary private password file used for client verification was removed. No backup files were created, committed or uploaded.

**Recovery readiness remains BLOCKED.** The next action is explicit approval to create the described manual backup in a named, verified encrypted private destination and perform its offline integrity checks. Then request separate approval for the isolated Supabase restore drill. If choosing provider backups instead, approve the plan/configuration change separately, wait for a completed usable restore point and verify its scope before deployment. Migration deployment remains a later, separately authorized step.
