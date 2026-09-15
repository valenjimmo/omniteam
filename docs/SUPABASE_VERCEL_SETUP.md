# Connect OmniTeam to Supabase and Vercel

The checkout is linked locally to the existing `valenjimmos-projects/omniteam` Vercel project. Production has Supabase URL and anon key configured. Its connection reaches Supabase, but the database is missing registration tables, so the health endpoint reports `database_unavailable`. Preview environment values must be configured separately if Preview is used.

## 1. Apply the schema

Follow [DATABASE_CHANGE_WORKFLOW.md](DATABASE_CHANGE_WORKFLOW.md) to reconcile SQL Editor changes and adopt Supabase CLI migration tracking. Do not blindly replay migrations over an existing schema. Once reconciled, use `supabase migration list` and `supabase db push` for pending migrations. The `202609140003_parent_role.sql` enum change must commit before the next migration uses it. Do not run `seed.sql` against a real customer project; it creates demo data.

Use the dedicated test Supabase project for real-data trials. For its project-wide purge, explicitly mark the project as test in `project_maintenance_settings` and mark **every** team `is_test_team = true` through a trusted SQL Editor/service-role operation. The purge refuses to run otherwise.

Create your OmniTeam platform-owner identity under Supabase Dashboard → Authentication → Users. Confirm the email, then edit and run `supabase/scripts/provision_platform_owner.sql` once in the intended project's SQL Editor. The script resolves the Auth user by exact email, requires an existing profile, and inserts its user ID into `platform_owners`. After migration `202609140009_platform_team_provisioning.sql` is applied, sign in at `/platform/login`; `/platform` can create a team, assign you its OWNER membership, and enable OmniSite. Do not put passwords, user IDs, or the service-role key in source control.

## 2. Configure the project environment

From Supabase project settings, obtain the project URL and its browser-safe anon/publishable key. Add these exact names to Vercel's Development, Preview, and Production environments as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Set the same values in a local `.env.local` for local development. The existing `.gitignore` excludes that file. `SUPABASE_SERVICE_ROLE_KEY` is not needed for the browser pages or the health check. If later used for trusted server administration, keep it server-only and never prefix it with `NEXT_PUBLIC_`.

The local Vercel CLI login and project link are complete. Production values are populated. Configure Preview separately in Vercel's Environment Variables UI when needed, and redeploy after changing environment variables.

## 3. Configure Supabase Auth

Enable email confirmation for parent sign-up. Set the Supabase Auth Site URL to the deployed application URL. Add the exact deployed callback URL `https://<your-domain>/auth/callback` to the allowed redirect URLs; add any specific preview domain that you intend to test. The registration page sends verification links through this callback, which exchanges the Auth code for a session and returns the parent to the team registration page.

## 4. Verify the connection

Open `https://<your-domain>/api/health/supabase`. `{"status":"ok"}` means the Vercel environment values can reach the migrated Supabase schema. `not_configured` means the variables are missing; `database_unavailable` means the URL/key or schema needs attention. This checks connectivity only, not RLS correctness.

Sign in as a team owner at `/team/access`, choose a unique registration slug, and open registration. Visit `/register/<slug>` as a new parent. After email verification, sign in on that page and submit family/swimmer information. Approve it at `/team/access`, then confirm the parent sees only the approved family at `/my-family`.

The attendance screen at `/attendance` is still a local-data prototype. It is **not** a real-data verification target yet.

## Test-data cleanup

`supabase/scripts/purge_test_team_data.sql` calls a guarded function that clears business records for **all teams** in the dedicated test project while keeping team shells, memberships, module grants, and settings. Before running it, use the test project's actual reference in this setup SQL:

```sql
insert into public.project_maintenance_settings
  (singleton, supabase_project_ref, test_project)
values (true, 'YOUR_TEST_PROJECT_REF', true)
on conflict (singleton) do update
  set supabase_project_ref = excluded.supabase_project_ref,
      test_project = excluded.test_project;
update public.teams set is_test_team = true;
```

Run that setup **only in the dedicated test project**. The purge also requires the exact project reference and confirmation phrase in the script. It leaves Auth users/profiles because those identities may be shared across teams, and leaves the team shells so another test cycle can start.

`supabase/scripts/archive_team_account.sql` is the **default account-closure path**. It marks one team unavailable and closes registration while retaining its records pending a retention decision. Active-member and module checks deny ordinary access to the archived team.

`supabase/scripts/delete_team_and_data.sql` is a separate hard-delete maintenance path, **not** the account-closure action. It deletes one team and all current team-owned rows. Direct deletion of a team also has a database cleanup trigger. Shared Auth users/profiles and parent organizations remain. Future modules must add their tables to the cleanup function or use tenant-scoped cascading foreign keys; a missing dependent FK should make deletion fail rather than leave an orphan.

Run `supabase/scripts/preview_test_project_data.sql`, then `supabase/scripts/dry_run_test_project_purge.sql`, and make a backup before the actual project-wide purge. Neither cleanup script is run automatically by deployment.
