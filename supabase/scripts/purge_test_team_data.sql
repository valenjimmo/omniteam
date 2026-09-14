-- Run only in the dedicated test Supabase project's SQL Editor.
-- First set project_maintenance_settings.test_project = true and store that
-- project's exact Supabase project reference. Mark every team is_test_team = true.
-- Replace the project-ref placeholder below. This keeps team shells, memberships,
-- module grants, and settings for another test cycle; business records are removed.
select public.purge_all_test_project_data(
  'REPLACE_WITH_TEST_PROJECT_REF',
  'PURGE ALL TEST TEAM DATA'
);
