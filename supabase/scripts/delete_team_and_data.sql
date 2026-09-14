-- Separate hard-delete maintenance action. Account closure uses archive_team_account.sql.
-- Replace both placeholders. This removes the team and every current team-owned row.
-- Auth users, global profiles, and organizations remain because they can be shared.
select public.delete_team_and_data(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'REPLACE WITH EXACT TEAM NAME'
);
