-- Read-only preview in the dedicated test Supabase project's SQL Editor.
select p.supabase_project_ref, p.test_project,
  (select count(*) from public.teams) as team_count,
  (select count(*) from public.teams where not is_test_team) as unmarked_team_count,
  (select count(*) from public.families) as family_count,
  (select count(*) from public.swimmers) as swimmer_count,
  (select count(*) from public.practice_sessions) as practice_count,
  (select count(*) from public.attendance_records) as attendance_count,
  (select count(*) from public.parent_registration_requests) as registration_count
from public.project_maintenance_settings p
where p.singleton;

select id, name, status, is_test_team, archived_at
from public.teams order by name, id;
