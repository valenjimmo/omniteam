-- Account closure archives a team by default. Data remains for a later
-- retention decision; ordinary team access and registration stop immediately.
alter table public.teams
  add column archived_at timestamptz;

create or replace function public.is_active_team_member(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.team_memberships m
    join public.teams t on t.id = m.team_id
    where m.team_id = target_team_id and m.user_id = auth.uid()
      and m.status = 'ACTIVE' and t.status = 'ACTIVE'
  );
$$;

create or replace function public.can_assign_team_access(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_active_team_member(target_team_id) and exists (
    select 1 from public.team_memberships m
    where m.team_id = target_team_id and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and (m.role = 'OWNER' or (m.role = 'ADMIN' and m.can_assign_access))
  );
$$;

create or replace function public.archive_team_account(
  target_team_id uuid, expected_team_name text
)
returns void language plpgsql security definer set search_path = public as $$
declare target_team public.teams%rowtype;
begin
  select * into target_team from public.teams where id = target_team_id for update;
  if target_team.id is null or target_team.name is distinct from expected_team_name then
    raise exception 'Refusing archival: ID and exact team name must match';
  end if;
  update public.team_registration_settings
    set registration_open = false, updated_at = now()
    where team_id = target_team_id;
  update public.teams
    set status = 'INACTIVE', archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = target_team_id;
end;
$$;
revoke all on function public.archive_team_account(uuid, text) from public, anon, authenticated;
grant execute on function public.archive_team_account(uuid, text) to service_role;
