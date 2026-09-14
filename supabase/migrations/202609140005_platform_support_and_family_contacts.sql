-- OmniTeam's platform owner is distinct from a swim team's OWNER membership.
-- Provision platform owners only from a trusted database/service-role process.
create table public.platform_owners (
  user_id uuid primary key references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.platform_owners enable row level security;

create table public.platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_user_id uuid not null references public.platform_owners(user_id),
  team_id uuid not null references public.teams(id),
  reason text not null check (length(trim(reason)) between 10 and 500),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  check (expires_at > started_at and expires_at <= started_at + interval '1 hour')
);
create index platform_support_sessions_active_idx
  on public.platform_support_sessions(platform_user_id, team_id, expires_at);
alter table public.platform_support_sessions enable row level security;

create or replace function public.is_platform_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.platform_owners p where p.user_id = auth.uid());
$$;

create or replace function public.is_platform_supporting_team(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_platform_owner() and exists (
    select 1 from public.platform_support_sessions s
    where s.platform_user_id = auth.uid() and s.team_id = target_team_id
      and s.started_at <= now() and s.expires_at > now()
  );
$$;

create or replace function public.list_platform_teams()
returns table (team_id uuid, team_name text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_platform_owner() then
    raise exception 'Platform owner access required';
  end if;
  return query select t.id, t.name from public.teams t order by t.name, t.id;
end;
$$;

create or replace function public.start_platform_support_session(
  target_team_id uuid, support_reason text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare session_id uuid;
begin
  if not public.is_platform_owner() then
    raise exception 'Platform owner access required';
  end if;
  if length(trim(support_reason)) not between 10 and 500 then
    raise exception 'A reason of 10 to 500 characters is required';
  end if;
  insert into public.platform_support_sessions
    (platform_user_id, team_id, reason)
    values (auth.uid(), target_team_id, trim(support_reason))
    returning id into session_id;
  insert into public.audit_logs
    (team_id, user_id, entity_type, entity_id, action, new_values)
    values (target_team_id, auth.uid(), 'platform_support_session', session_id,
      'START_SUPPORT_SESSION', jsonb_build_object('reason', trim(support_reason)));
  return session_id;
end;
$$;

create policy "platform owner reads own support sessions" on public.platform_support_sessions
  for select using (platform_user_id = auth.uid() and public.is_platform_owner());

-- Support sessions grant read-only visibility to one team at a time.
create policy "platform support reads teams" on public.teams
  for select using (public.is_platform_supporting_team(id));
create policy "platform support reads memberships" on public.team_memberships
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads entitlements" on public.team_module_entitlements
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads permissions" on public.team_member_module_permissions
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads swimmers" on public.swimmers
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads families" on public.families
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads family swimmers" on public.family_swimmers
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads guardians" on public.family_guardians
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads groups" on public.swim_groups
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads group memberships" on public.group_memberships
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads schedules" on public.practice_schedules
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads sessions" on public.practice_sessions
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads exceptions" on public.practice_exceptions
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads attendance" on public.attendance_records
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads checkin tokens" on public.self_checkin_tokens
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads settings" on public.team_settings
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads logs" on public.audit_logs
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads registration settings" on public.team_registration_settings
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads registration requests" on public.parent_registration_requests
  for select using (public.is_platform_supporting_team(team_id));
create policy "platform support reads organizations" on public.organizations
  for select using (exists (select 1 from public.teams t
    where t.organization_id = organizations.id and public.is_platform_supporting_team(t.id)));
create policy "platform support reads profiles" on public.profiles
  for select using (
    exists (select 1 from public.team_memberships m
      where m.user_id = profiles.id and public.is_platform_supporting_team(m.team_id))
    or exists (select 1 from public.parent_registration_requests r
      where r.user_id = profiles.id and public.is_platform_supporting_team(r.team_id))
  );

-- One family login for now; additional guardians are contact records, not shared credentials.
create unique index family_guardians_one_login_per_family
  on public.family_guardians(team_id, family_id);

create table public.family_contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  family_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  relationship_label text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  unique (team_id, id),
  foreign key (team_id, family_id) references public.families(team_id, id)
);
alter table public.family_contacts enable row level security;
create policy "family members and athlete staff read contacts" on public.family_contacts
  for select using (public.is_family_guardian(team_id, family_id)
    or public.can_access_team_module(team_id, 'omniathlete')
    or public.is_platform_supporting_team(team_id));
create policy "family members and athlete managers write contacts" on public.family_contacts
  for all using (public.is_family_guardian(team_id, family_id)
    or public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.is_family_guardian(team_id, family_id)
    or public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create trigger family_contacts_team_id_immutable before update on public.family_contacts
  for each row execute function public.reject_team_id_change();
create trigger platform_support_sessions_team_id_immutable before update on public.platform_support_sessions
  for each row execute function public.reject_team_id_change();
