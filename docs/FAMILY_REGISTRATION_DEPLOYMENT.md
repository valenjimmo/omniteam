# Configurable family registration deployment

Migration `202610010001_configurable_family_registration.sql` adds the complete,
configurable OmniAthlete family-registration data path. It must be applied before
the new registration page is used against a Supabase project.

The deployment is non-destructive to existing families and registration requests.
It adds configuration and payload columns, two tenant-owned profile tables, RLS
policies, and registration RPCs. It also replaces the registration approval and
team-cleanup functions so the new data is retained on approval and removed by an
explicit test purge or hard delete.

## Prerequisites

1. Read `DATABASE_CHANGE_WORKFLOW.md`, especially the migration-history
   reconciliation rules. Do not deploy to a project with uncertain or partially
   recorded migration history.
2. Install the Supabase CLI and authenticate:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Create the ignored `.supabase.env` file in the repository root:

   ```dotenv
   SUPABASE_PROJECT_REF=your-project-ref
   SUPABASE_ACCESS_TOKEN=your-personal-access-token
   SUPABASE_DB_PASSWORD=your-database-password
   ```

   `SUPABASE_DB_PASSWORD` may be omitted when the CLI does not request it. Never
   commit this file or expose these values through `NEXT_PUBLIC_*` variables.

4. Confirm that the linked project is the intended environment:

   ```bash
   supabase projects list
   supabase migration list --linked
   ```

## Test-project deployment

Run the preflight first. This prints the target project, compares migration
history, and performs `db push --dry-run`; it does not change the database.

```bash
npm run supabase:deploy:registration
```

Review the pending list. It must contain the expected migration sequence and
must not propose replaying migrations already present in the database. Then
apply the pending tracked migrations:

```bash
npm run supabase:deploy:registration -- --apply
```

The script first links the checkout to `SUPABASE_PROJECT_REF`. The apply command
then performs the dry run again, runs `supabase db push`, executes
the read-only verification script, and prints the final migration history. It
fails if either registration profile table, required column, RPC, or RLS setting
is missing.

After deployment, verify in the application:

1. Sign in as a team owner and open `/team/access`.
2. Configure a registration slug, at least one program, a custom question, and
   an agreement; save the form and open registration.
3. Open `/register/<slug>` in a separate browser session, create or sign in to a
   family account, add at least one swimmer, and submit.
4. Return to `/team/access`, confirm the pending request, and approve it.
5. Confirm `/my-family` shows only the approved family's swimmers and contacts.
6. Repeat the read and approval checks with a second team to confirm that neither
   team can see, approve, or link the other team's registration data.

## Production deployment

Use the same commands only after the test-project verification succeeds. Take a
database backup, verify the production project reference in `.supabase.env`, and
record the operator, project, time, migration version, and outcome in the
external operations log.

```bash
npm run supabase:deploy:registration
npm run supabase:deploy:registration -- --apply
```

Do not run `supabase:reset`, the scoped reset SQL, or a fresh baseline against a
retained production database. Do not manually paste only part of the migration
into the SQL Editor.

## SQL Editor fallback

If CLI deployment is unavailable, generate the repository's transactional,
history-recording bundle:

```bash
npm run migration:manual -- \
  supabase/migrations/202610010001_configurable_family_registration.sql
```

Review `.manual-deploy/202610010001_configurable_family_registration.deploy.sql`,
select the intended Supabase project, and execute the entire generated file once
in the SQL Editor. Do not edit or rerun the generated bundle. Then run
`supabase/scripts/verify_configurable_family_registration.sql` in the SQL Editor
and confirm migration `202610010001` appears in the result.

## Rollback policy

This migration intentionally has no automated down migration. Once registration
payloads have been submitted, dropping the new columns or tables would destroy
family and medical data. If deployment fails, rely on the migration transaction;
if a later operational rollback is required, disable registration, preserve the
data, restore from a verified backup or deploy a reviewed forward-fix migration.
