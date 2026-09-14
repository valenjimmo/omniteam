-- A test-team purge keeps the team shell. Deleting a team removes its rows.
-- Global Auth users/profiles and organizations are shared and are not deleted.
alter table public.teams
  add column is_test_team boolean not null default false;

create or replace function public.clear_team_records(
  target_team_id uuid, include_account_access boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Children before parents. Keep this list in sync with every future module.
  delete from public.family_contacts where team_id = target_team_id;
  delete from public.family_guardians where team_id = target_team_id;
  delete from public.family_swimmers where team_id = target_team_id;
  delete from public.attendance_records where team_id = target_team_id;
  delete from public.self_checkin_tokens where team_id = target_team_id;
  delete from public.group_memberships where team_id = target_team_id;
  delete from public.practice_exceptions where team_id = target_team_id;
  delete from public.practice_sessions where team_id = target_team_id;
  delete from public.practice_schedules where team_id = target_team_id;
  delete from public.swim_groups where team_id = target_team_id;
  delete from public.swimmers where team_id = target_team_id;
  delete from public.families where team_id = target_team_id;
  delete from public.parent_registration_requests where team_id = target_team_id;
  delete from public.platform_support_sessions where team_id = target_team_id;
  delete from public.audit_logs where team_id = target_team_id;

  if include_account_access then
    delete from public.team_member_module_permissions where team_id = target_team_id;
    delete from public.team_module_entitlements where team_id = target_team_id;
    delete from public.team_registration_settings where team_id = target_team_id;
    delete from public.team_settings where team_id = target_team_id;
    delete from public.team_memberships where team_id = target_team_id;
  end if;
end;
$$;
revoke all on function public.clear_team_records(uuid, boolean) from public, anon, authenticated;

create or replace function public.purge_test_team_data(
  target_team_id uuid, expected_team_name text
)
returns void language plpgsql security definer set search_path = public as $$
declare target_team public.teams%rowtype;
begin
  select * into target_team from public.teams where id = target_team_id for update;
  if target_team.id is null or not target_team.is_test_team
    or target_team.name is distinct from expected_team_name then
    raise exception 'Refusing purge: team must exist, be marked as test, and match its exact name';
  end if;
  perform public.clear_team_records(target_team_id, false);
end;
$$;
revoke all on function public.purge_test_team_data(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_test_team_data(uuid, text) to service_role;

-- This marker must be set explicitly in the dedicated test project. It is not
-- inferred from a hostname or client request and cannot be changed through RLS.
create table public.project_maintenance_settings (
  singleton boolean primary key default true check (singleton),
  supabase_project_ref text not null check (supabase_project_ref ~ '^[a-z0-9]+$'),
  test_project boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.project_maintenance_settings enable row level security;

create or replace function public.purge_all_test_project_data(
  expected_project_ref text, confirmation text
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  target_team record;
  purged_count integer := 0;
begin
  if confirmation is distinct from 'PURGE ALL TEST TEAM DATA'
    or not exists (
      select 1 from public.project_maintenance_settings p
      where p.singleton and p.test_project
        and p.supabase_project_ref = expected_project_ref
    ) then
    raise exception 'Refusing purge: test project marker, project ref, and confirmation are required';
  end if;
  if exists (select 1 from public.teams where not is_test_team) then
    raise exception 'Refusing purge: every team must be marked as a test team';
  end if;
  for target_team in select id from public.teams order by id for update loop
    perform public.clear_team_records(target_team.id, false);
    purged_count := purged_count + 1;
  end loop;
  return purged_count;
end;
$$;
revoke all on function public.purge_all_test_project_data(text, text) from public, anon, authenticated;
grant execute on function public.purge_all_test_project_data(text, text) to service_role;

create or replace function public.clear_team_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.clear_team_records(old.id, true);
  return old;
end;
$$;
create trigger clear_team_before_delete before delete on public.teams
  for each row execute function public.clear_team_before_delete();

create or replace function public.delete_team_and_data(
  target_team_id uuid, expected_team_name text
)
returns void language plpgsql security definer set search_path = public as $$
declare target_team public.teams%rowtype;
begin
  select * into target_team from public.teams where id = target_team_id for update;
  if target_team.id is null or target_team.name is distinct from expected_team_name then
    raise exception 'Refusing team deletion: ID and exact name must match';
  end if;
  delete from public.teams where id = target_team_id;
end;
$$;
revoke all on function public.delete_team_and_data(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_team_and_data(uuid, text) to service_role;
