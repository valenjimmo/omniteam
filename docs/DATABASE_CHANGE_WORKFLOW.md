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

For a quick read-only view in the SQL Editor, run the history query above. A missing history table means the CLI has not established tracking; it does **not** mean the database has no schema.
