# Database change tracking

Use `supabase/migrations/` for schema changes. Git records the intended changes; each Supabase database records migrations actually applied in `supabase_migrations.schema_migrations`. Vercel deployments do not apply database migrations.

Use `supabase/scripts/` for manual, operational actions such as previews, archive, deletion, and test-data purge. These are **not** migrations, are never run by `supabase db push`, and have no automatic deployed/pending status. Run one only when its documented operation is intended. Keep an external operations log for destructive actions (project, operator, time, script, outcome); do not store customer identifiers or secrets in Git.

## One-time transition for the existing test project

Some schema was applied with the Supabase SQL Editor before migration tracking was established. **Do not run `supabase db push` yet:** it could try to replay those migrations over existing tables. In the Supabase SQL Editor, first inspect history:

```sql
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;
```

If the result is not null, inspect recorded versions:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

Compare this with the actual schema and the local files. An existing table alone does not prove its whole migration completed. For each migration that was **fully applied manually** but has no history row, use `supabase migration repair <version> --status applied` after linking the CLI. Repair records history only; it does not run SQL. Never mark a partly applied or unverified migration as applied. If a migration is partial, inspect the database and resolve the difference before using `db push`.

The current connection check found `organizations`, `teams`, `swimmers`, and `families`, but not `team_registration_settings` or `family_contacts`. This suggests migration `202609140004` and later are pending; confirm earlier migrations before repairing history. Migration `202609140003_parent_role.sql` adds an enum value and must commit separately before `202609140004` runs.

## Routine workflow after reconciliation

1. Install/authenticate the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then link this checkout to the **intended** Supabase project with `supabase link --project-ref <project-ref>`. Verify the linked project before making changes. Keep credentials outside Git.
2. Create each schema change with `supabase migration new <descriptive_name>`, edit its SQL, test it locally, and commit the file.
3. Run `supabase migration list` to compare local and remote versions. A local version with no remote version is pending.
4. Review `supabase db push --dry-run`; then run `supabase db push` once against the intended project. It applies pending migrations in order and records successful versions.
5. Run `supabase migration list` again and verify the app. Repeat separately for each Supabase project; migration history is per database.

Do not make routine remote schema changes through the Dashboard SQL/Table Editor after adopting this workflow; that bypasses CLI history. If an emergency edit is necessary, capture and reconcile it before the next push. Never run `supabase db reset` against a remote project.

## Manual SQL Editor deployment

When CLI access is unavailable, generate a tracked SQL Editor bundle from one
unchanged migration file:

```bash
npm run migration:manual -- supabase/migrations/202609220001_omnisite_schema.sql
```

The command writes `.manual-deploy/<migration>.deploy.sql`. Review it, select the
intended Supabase project, and run the entire file once in the SQL Editor. The
bundle executes the migration and records its version, name, original SQL, and
SHA-256 checksum in the standard `supabase_migrations.schema_migrations` ledger
and the companion `supabase_migrations.manual_deployments` audit table. It runs
in one transaction and rejects an existing version or checksum mismatch.

Deploy files individually in filename order. Never combine files, edit the
generated bundle, rerun an applied bundle, or mark a partially applied migration
as complete. Generated bundles are ignored by Git; the source migration remains
the authoritative reviewed file.

## Fresh baseline and uncertain partial deployment

Do not make the 18 historical migrations independently idempotent by adding
`CREATE IF NOT EXISTS` everywhere. PostgreSQL does not provide that form for
policies, triggers, constraints, or types, and later migrations intentionally
replace objects created by earlier migrations. A blanket rewrite can therefore
silently leave an incomplete or incompatible schema.

For a genuinely empty/new Supabase project, generate one ordered baseline:

```bash
npm run migration:fresh-baseline
```

The generated `.manual-deploy/omniteam_fresh_baseline.sql` runs every canonical
migration in filename order, with one transaction per file, and records each
completed version in `supabase_migrations.schema_migrations`. It preserves the
required commit boundary for the `PARENT` enum value. It must not be run against
a project containing application tables or uncertain partial deployment.

For an existing project, first run
`supabase/scripts/audit_migration_state.sql` in the SQL Editor. If migration
history and object presence disagree, stop and compare the live schema with the
canonical files. Do not rerun individual historical migrations, and do not use
the fresh baseline as a repair script. For a disposable test project, recreate
the database and run the generated baseline; for a retained project, perform a
reviewed schema repair or restore from a verified backup before resuming normal
`supabase db push` deployments.

If the existing project must be retained but its OmniTeam data can be destroyed,
the scoped reset script is available at
`supabase/scripts/reset_omniteam_application.sql`. It requires a verified backup,
an explicit confirmation-token edit, and an empty `omnisite-assets` Storage
bucket. It preserves Supabase Auth users and schemas outside the repository's
application objects. Run it once, regenerate the fresh baseline, and run that
baseline once. This is destructive and is not a repair script.

## CLI deployment without SQL Editor

The repository includes npm wrappers for the Supabase CLI. Install the CLI using
the official Supabase instructions, authenticate, and link this checkout to the
intended project:

```bash
supabase login
supabase link --project-ref <project-ref>
```

Alternatively, populate the ignored workspace file `.supabase.env`:

```dotenv
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ACCESS_TOKEN=your-personal-access-token
SUPABASE_DB_PASSWORD=your-database-password
```

The access token is available from the Supabase dashboard account tokens page.
The database password is optional unless `db push` requests it. Never commit
`.supabase.env` or place these values in frontend environment variables.

For normal pending migrations, use:

```bash
npm run supabase:deploy
```

This runs `supabase db push --linked` and applies only pending canonical files.
It does not make an uncertain or partially deployed database safe automatically.

For a destructive reset followed by a clean deployment, after taking a backup
and removing any files from the `omnisite-assets` bucket, use:

```bash
OMNITEAM_RESET_CONFIRMATION='RESET OMNITEAM APPLICATION' npm run supabase:reset
```

The wrapper generates the current baseline, runs the scoped reset through
`supabase db query --linked --file`, executes the baseline through the same CLI, and
prints the linked migration list. It does not touch Supabase Auth users, but it
does delete OmniTeam application data, functions, policies, and schema objects.
Never use this command for a retained production dataset.

For a migration that was completely applied before tracking existed, first audit
every statement and dependency. Only after that verification, generate a
record-only bundle:

```bash
npm run migration:manual -- supabase/migrations/<file>.sql --record-existing --verified
```

This mode does not execute the migration SQL. It is equivalent in intent to
`supabase migration repair --status applied` and must never be used based only on
the presence of one table or function. Run
`supabase/scripts/manual_migration_history.sql` in the SQL Editor to inspect the
ledger. Once CLI access is restored, `supabase migration list --linked` must show
the same versions before returning to `supabase db push`.

For a quick read-only view in the SQL Editor, run the history query above. A missing history table means the CLI has not established tracking; it does **not** mean the database has no schema.
