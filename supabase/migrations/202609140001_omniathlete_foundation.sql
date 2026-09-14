-- OmniAthlete owns families, swimmer relationships, and its attendance ledger.
-- Product access is granted per team; a bundle grants the same individual module keys.

create table public.team_module_entitlements (
  team_id uuid not null references public.teams(id),
  module_key text not null check (module_key in (
    'omniathlete', 'omnischedule', 'omnimeet', 'omnivolunteer',
    'omnipay', 'omniconnect', 'omnisite', 'omniinsights'
  )),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (team_id, module_key),
  check (ends_at is null or ends_at > starts_at)
);

create or replace function public.has_team_module(target_team_id uuid, target_module text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_active_team_member(target_team_id)
    and exists (
      select 1 from public.team_module_entitlements e
      where e.team_id = target_team_id
        and e.module_key = target_module
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    );
$$;

alter table public.team_module_entitlements enable row level security;
create policy "members read team entitlements" on public.team_module_entitlements
  for select using (public.is_active_team_member(team_id));
-- Provisioning uses a trusted server process; members cannot grant themselves modules.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  name text not null,
  primary_email text,
  primary_phone text,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id)
);

create unique index swimmers_team_id_id_key on public.swimmers(team_id, id);

create table public.family_swimmers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  family_id uuid not null,
  swimmer_id uuid not null,
  relationship_label text,
  created_at timestamptz not null default now(),
  unique (team_id, family_id, swimmer_id),
  foreign key (team_id, family_id) references public.families(team_id, id),
  foreign key (team_id, swimmer_id) references public.swimmers(team_id, id)
);

alter table public.families enable row level security;
alter table public.family_swimmers enable row level security;

create policy "athlete members read families" on public.families
  for select using (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage families" on public.families
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members read family swimmers" on public.family_swimmers
  for select using (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage family swimmers" on public.family_swimmers
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));

-- Existing broad membership policies otherwise bypass the entitlement check.
drop policy "members read scoped data" on public.swimmers;
drop policy "members write scoped data" on public.swimmers;
drop policy "members read groups" on public.swim_groups;
drop policy "members manage groups" on public.swim_groups;
drop policy "members manage group memberships" on public.group_memberships;
drop policy "members manage attendance" on public.attendance_records;
drop policy "members manage settings" on public.team_settings;
drop policy "members read checkin tokens" on public.self_checkin_tokens;

create policy "athlete members manage swimmers" on public.swimmers
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage groups" on public.swim_groups
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage group memberships" on public.group_memberships
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage attendance" on public.attendance_records
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members manage settings" on public.team_settings
  for all using (public.has_team_module(team_id, 'omniathlete'))
  with check (public.has_team_module(team_id, 'omniathlete'));
create policy "athlete members read checkin tokens" on public.self_checkin_tokens
  for select using (public.has_team_module(team_id, 'omniathlete'));

-- Match tenant IDs across the existing OmniAthlete relationships.
create unique index swim_groups_team_id_id_key on public.swim_groups(team_id, id);
create unique index practice_sessions_team_id_id_key on public.practice_sessions(team_id, id);
alter table public.group_memberships
  add constraint group_memberships_swimmer_team_fk foreign key (team_id, swimmer_id) references public.swimmers(team_id, id),
  add constraint group_memberships_group_team_fk foreign key (team_id, group_id) references public.swim_groups(team_id, id);
alter table public.attendance_records
  add constraint attendance_records_swimmer_team_fk foreign key (team_id, swimmer_id) references public.swimmers(team_id, id),
  add constraint attendance_records_session_team_fk foreign key (team_id, practice_session_id) references public.practice_sessions(team_id, id);
