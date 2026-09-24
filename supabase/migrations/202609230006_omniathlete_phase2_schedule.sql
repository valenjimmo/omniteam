-- OmniAthlete Phase 2: groups, generated practice sessions, family RSVPs, attendance.
create table public.locations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120), address text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,id), unique(team_id,name), foreign key(organization_id,team_id) references public.teams(organization_id,id)
);
create table public.groups (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80), status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,id), unique(team_id,name), foreign key(organization_id,team_id) references public.teams(organization_id,id)
);
create table public.group_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  group_id uuid not null, athlete_id uuid not null, created_at timestamptz not null default now(),
  unique(team_id,group_id,athlete_id), foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,group_id) references public.groups(team_id,id), foreign key(team_id,athlete_id) references public.athletes(team_id,id)
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  group_id uuid not null, location_id uuid, kind text not null default 'practice' check(kind in ('practice','meet')),
  title text not null check(length(trim(title)) between 1 and 120), starts_at timestamptz not null, ends_at timestamptz not null,
  series_id uuid, status text not null default 'scheduled' check(status in ('scheduled','cancelled','complete')),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(ends_at>starts_at), unique(team_id,id), unique(team_id,group_id,starts_at),
  foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,group_id) references public.groups(team_id,id), foreign key(team_id,location_id) references public.locations(team_id,id)
);
create table public.session_rsvps (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  session_id uuid not null, athlete_id uuid not null, response text not null check(response in ('yes','no','maybe')),
  responded_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,session_id,athlete_id), foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,session_id) references public.sessions(team_id,id), foreign key(team_id,athlete_id) references public.athletes(team_id,id)
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  session_id uuid not null, athlete_id uuid not null, status text not null check(status in ('present','absent','late','excused')),
  recorded_by uuid not null references public.profiles(id), recorded_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,session_id,athlete_id), foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,session_id) references public.sessions(team_id,id), foreign key(team_id,athlete_id) references public.athletes(team_id,id)
);
create index sessions_team_starts_idx on public.sessions(team_id,starts_at);
create index group_members_athlete_idx on public.group_members(team_id,athlete_id);
create index session_rsvps_session_idx on public.session_rsvps(team_id,session_id);
create index attendance_session_idx on public.attendance(team_id,session_id);

create function public.is_omniathlete_coach(target_team_id uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.memberships where team_id=target_team_id and profile_id=auth.uid() and status='active' and role in ('team_admin','coach')) $$;
create function public.can_manage_athlete(target_team_id uuid,target_athlete_id uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.athletes a join public.memberships m on m.team_id=a.team_id and m.household_id=a.household_id
  where a.team_id=target_team_id and a.id=target_athlete_id and m.profile_id=auth.uid() and m.status='active') $$;

-- One-off creates one row; weekly creates eight concrete rows. There is no recurrence engine.
create function public.create_practice_sessions(target_team_id uuid,target_group_id uuid,target_location_id uuid,
  practice_title text,first_start timestamptz,first_end timestamptz,repeat_weekly boolean default false)
returns setof uuid language plpgsql security invoker set search_path=public as $$
declare target_org_id uuid; new_series_id uuid := case when repeat_weekly then gen_random_uuid() else null end;
begin
  if not public.is_omniathlete_coach(target_team_id) then raise exception 'coach access required'; end if;
  if first_end<=first_start then raise exception 'practice must end after it starts'; end if;
  select organization_id into strict target_org_id from public.teams where id=target_team_id and status='ACTIVE';
  return query insert into public.sessions(organization_id,team_id,group_id,location_id,title,starts_at,ends_at,series_id,created_by)
    select target_org_id,target_team_id,target_group_id,target_location_id,trim(practice_title),
      first_start+(n*interval '1 week'),first_end+(n*interval '1 week'),new_series_id,auth.uid()
    from generate_series(0,case when repeat_weekly then 7 else 0 end) n returning sessions.id;
end $$;
grant execute on function public.create_practice_sessions(uuid,uuid,uuid,text,timestamptz,timestamptz,boolean) to authenticated;

alter table public.locations enable row level security; alter table public.groups enable row level security;
alter table public.group_members enable row level security; alter table public.sessions enable row level security;
alter table public.session_rsvps enable row level security; alter table public.attendance enable row level security;
create policy "active members read locations" on public.locations for select using(public.is_active_omniathlete_member(team_id));
create policy "coaches manage locations" on public.locations for all using(public.is_omniathlete_coach(team_id)) with check(public.is_omniathlete_coach(team_id));
create policy "active members read groups" on public.groups for select using(public.is_active_omniathlete_member(team_id));
create policy "coaches manage groups" on public.groups for all using(public.is_omniathlete_coach(team_id)) with check(public.is_omniathlete_coach(team_id));
create policy "active members read group members" on public.group_members for select using(public.is_active_omniathlete_member(team_id));
create policy "coaches manage group members" on public.group_members for all using(public.is_omniathlete_coach(team_id)) with check(public.is_omniathlete_coach(team_id));
create policy "active members read sessions" on public.sessions for select using(public.is_active_omniathlete_member(team_id));
create policy "coaches manage sessions" on public.sessions for all using(public.is_omniathlete_coach(team_id)) with check(public.is_omniathlete_coach(team_id) and created_by=auth.uid());
create policy "families read relevant rsvps" on public.session_rsvps for select using(public.is_omniathlete_coach(team_id) or public.can_manage_athlete(team_id,athlete_id));
create policy "families create rsvps" on public.session_rsvps for insert with check(public.can_manage_athlete(team_id,athlete_id) and responded_by=auth.uid());
create policy "families update rsvps" on public.session_rsvps for update using(public.can_manage_athlete(team_id,athlete_id)) with check(public.can_manage_athlete(team_id,athlete_id) and responded_by=auth.uid());
create policy "coaches read attendance" on public.attendance for select using(public.is_omniathlete_coach(team_id));
create policy "coaches create attendance" on public.attendance for insert with check(public.is_omniathlete_coach(team_id) and recorded_by=auth.uid());
create policy "coaches update attendance" on public.attendance for update using(public.is_omniathlete_coach(team_id)) with check(public.is_omniathlete_coach(team_id) and recorded_by=auth.uid());

create trigger locations_team_id_immutable before update on public.locations for each row execute function public.reject_team_id_change();
create trigger groups_team_id_immutable before update on public.groups for each row execute function public.reject_team_id_change();
create trigger group_members_team_id_immutable before update on public.group_members for each row execute function public.reject_team_id_change();
create trigger sessions_team_id_immutable before update on public.sessions for each row execute function public.reject_team_id_change();
create trigger session_rsvps_team_id_immutable before update on public.session_rsvps for each row execute function public.reject_team_id_change();
create trigger attendance_team_id_immutable before update on public.attendance for each row execute function public.reject_team_id_change();
