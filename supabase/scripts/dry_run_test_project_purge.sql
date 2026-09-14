-- Replace the project ref and run in the dedicated test project's SQL Editor.
-- Everything is rolled back. This proves the purge can complete before running
-- the actual purge_test_team_data.sql script.
begin;
select public.purge_all_test_project_data(
  'REPLACE_WITH_TEST_PROJECT_REF',
  'PURGE ALL TEST TEAM DATA'
) as teams_purged_in_dry_run;
select count(*) as families_after_dry_run from public.families;
select count(*) as swimmers_after_dry_run from public.swimmers;
rollback;
