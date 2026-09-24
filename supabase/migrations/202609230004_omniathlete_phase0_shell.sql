-- OmniAthlete Phase 0. Existing organizations, profiles, and teams are reused.
alter table public.organizations add column slug text, add column joining_open boolean not null default false;
alter table public.organizations add constraint organizations_slug_format check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
create unique index organizations_slug_key on public.organizations(slug) where slug is not null;
create unique index teams_organization_id_id_key on public.teams(organization_id, id);

create table public.households (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 100), status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id,id),
 foreign key(organization_id,team_id) references public.teams(organization_id,id)
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
 profile_id uuid not null references public.profiles(id), household_id uuid,
 role text not null check(role in ('team_admin','coach','volunteer_coord','family')),
 status text not null default 'active' check(status in ('pending','active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(team_id,profile_id), unique(team_id,id),
 foreign key(organization_id,team_id) references public.teams(organization_id,id),
 foreign key(team_id,household_id) references public.households(team_id,id)
);
create table public.household_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null, household_id uuid not null,
 profile_id uuid references public.profiles(id), first_name text not null, last_name text not null, email text, phone text,
 relationship text not null default 'guardian', created_at timestamptz not null default now(), unique(team_id,id), unique(team_id,household_id,profile_id),
 foreign key(organization_id,team_id) references public.teams(organization_id,id),
 foreign key(team_id,household_id) references public.households(team_id,id)
);
create table public.athletes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null, household_id uuid not null,
 first_name text not null, last_name text not null, preferred_name text, date_of_birth date,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id,id),
 foreign key(organization_id,team_id) references public.teams(organization_id,id),
 foreign key(team_id,household_id) references public.households(team_id,id)
);
create table public.join_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
 profile_id uuid not null references public.profiles(id), household_name text not null,
 athlete_names jsonb not null check(jsonb_typeof(athlete_names)='array' and jsonb_array_length(athlete_names) between 1 and 10 and octet_length(athlete_names::text)<=10000),
 note text check(note is null or length(note)<=1000), status text not null default 'pending' check(status in ('pending','approved','declined')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(team_id,profile_id), unique(team_id,id), foreign key(organization_id,team_id) references public.teams(organization_id,id)
);
create index households_team_status_idx on public.households(team_id,status);
create index memberships_profile_status_idx on public.memberships(profile_id,status);
create index memberships_team_role_status_idx on public.memberships(team_id,role,status);
create index household_members_household_idx on public.household_members(team_id,household_id);
create index athletes_household_status_idx on public.athletes(team_id,household_id,status);
create index join_requests_team_status_created_idx on public.join_requests(team_id,status,created_at desc);

create function public.is_active_omniathlete_member(target_team_id uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.memberships where team_id=target_team_id and profile_id=auth.uid() and status='active') $$;
create function public.is_omniathlete_admin(target_team_id uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.memberships where team_id=target_team_id and profile_id=auth.uid() and status='active' and role in ('team_admin','volunteer_coord')) $$;
create function public.can_read_household(target_team_id uuid,target_household_id uuid) returns boolean language sql security definer stable set search_path=public as $$
 select public.is_omniathlete_admin(target_team_id) or exists(select 1 from public.memberships where team_id=target_team_id and household_id=target_household_id and profile_id=auth.uid() and status='active') $$;
create function public.find_joinable_organization(target_slug text)
 returns table(organization_id uuid,team_id uuid,organization_name text) language sql security definer stable set search_path=public as $$
 select o.id,t.id,o.name from public.organizations o join public.teams t on t.organization_id=o.id
 where o.slug=target_slug and o.joining_open and o.status='ACTIVE' and t.status='ACTIVE' order by t.created_at limit 1 $$;

alter table public.households enable row level security; alter table public.memberships enable row level security;
alter table public.household_members enable row level security; alter table public.athletes enable row level security; alter table public.join_requests enable row level security;
create policy "read own households" on public.households for select using(public.can_read_household(team_id,id));
create policy "admins manage households" on public.households for all using(public.is_omniathlete_admin(team_id)) with check(public.is_omniathlete_admin(team_id));
create policy "read own memberships" on public.memberships for select using(profile_id=auth.uid() or public.is_omniathlete_admin(team_id));
create policy "admins manage memberships" on public.memberships for all using(public.is_omniathlete_admin(team_id)) with check(public.is_omniathlete_admin(team_id));
create policy "read own household members" on public.household_members for select using(public.can_read_household(team_id,household_id));
create policy "admins manage household members" on public.household_members for all using(public.is_omniathlete_admin(team_id)) with check(public.is_omniathlete_admin(team_id));
create policy "read own athletes" on public.athletes for select using(public.can_read_household(team_id,household_id));
create policy "admins manage athletes" on public.athletes for all using(public.is_omniathlete_admin(team_id)) with check(public.is_omniathlete_admin(team_id));
create policy "read join requests" on public.join_requests for select using(profile_id=auth.uid() or public.is_omniathlete_admin(team_id));
create policy "submit join requests" on public.join_requests for insert with check(profile_id=auth.uid() and status='pending' and exists(select 1 from public.organizations where id=organization_id and joining_open and status='ACTIVE'));
create policy "admins review join requests" on public.join_requests for update using(public.is_omniathlete_admin(team_id)) with check(public.is_omniathlete_admin(team_id));

create trigger households_team_id_immutable before update on public.households for each row execute function public.reject_team_id_change();
create trigger memberships_team_id_immutable before update on public.memberships for each row execute function public.reject_team_id_change();
create trigger household_members_team_id_immutable before update on public.household_members for each row execute function public.reject_team_id_change();
create trigger athletes_team_id_immutable before update on public.athletes for each row execute function public.reject_team_id_change();
create trigger join_requests_team_id_immutable before update on public.join_requests for each row execute function public.reject_team_id_change();
grant execute on function public.find_joinable_organization(text) to authenticated;
