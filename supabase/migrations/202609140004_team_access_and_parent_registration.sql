-- A person's family relationship is independent of their staff permissions.

alter table public.team_memberships
  add column can_assign_access boolean not null default false;
create unique index team_memberships_team_id_id_key
  on public.team_memberships(team_id, id);

create table public.team_member_module_permissions (
  team_id uuid not null,
  membership_id uuid not null,
  module_key text not null check (module_key in (
    'omniathlete', 'omnischedule', 'omnimeet', 'omnivolunteer',
    'omnipay', 'omniconnect', 'omnisite', 'omniinsights'
  )),
  access_level text not null check (access_level in ('VIEW', 'MANAGE')),
  granted_at timestamptz not null default now(),
  primary key (team_id, membership_id, module_key),
  foreign key (team_id, membership_id) references public.team_memberships(team_id, id)
);
alter table public.team_member_module_permissions enable row level security;

create or replace function public.can_access_team_module(
  target_team_id uuid, target_module text, required_level text default 'VIEW'
)
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_team_module(target_team_id, target_module)
    and exists (
      select 1 from public.team_memberships m
      left join public.team_member_module_permissions p
        on p.team_id = m.team_id and p.membership_id = m.id
        and p.module_key = target_module
      where m.team_id = target_team_id
        and m.user_id = auth.uid()
        and m.status = 'ACTIVE'
        and (m.role = 'OWNER'
          or (p.access_level = 'MANAGE')
          or (required_level = 'VIEW' and p.access_level = 'VIEW'))
    );
$$;

create or replace function public.can_assign_team_access(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.team_memberships m
    where m.team_id = target_team_id and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and (m.role = 'OWNER' or (m.role = 'ADMIN' and m.can_assign_access))
  );
$$;

create policy "members read own module permissions" on public.team_member_module_permissions
  for select using (
    exists (select 1 from public.team_memberships m
      where m.team_id = team_member_module_permissions.team_id
        and m.id = team_member_module_permissions.membership_id
        and m.user_id = auth.uid())
    or public.can_assign_team_access(team_id)
  );
-- Permission changes use the checked function below, never direct table writes.

create or replace function public.set_team_member_module_permission(
  target_team_id uuid, target_membership_id uuid, target_module text,
  target_level text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.membership_role;
  target_role public.membership_role;
begin
  select role into actor_role from public.team_memberships
    where team_id = target_team_id and user_id = auth.uid() and status = 'ACTIVE';
  if not public.can_assign_team_access(target_team_id) then
    raise exception 'Not authorized to assign team access';
  end if;
  if actor_role <> 'OWNER' and not public.can_access_team_module(target_team_id, target_module, 'MANAGE') then
    raise exception 'Cannot grant access beyond own module permissions';
  end if;
  select role into target_role from public.team_memberships
    where team_id = target_team_id and id = target_membership_id;
  if target_role is null or target_role = 'OWNER' then
    raise exception 'Invalid target membership';
  end if;
  if target_level is null then
    delete from public.team_member_module_permissions
      where team_id = target_team_id and membership_id = target_membership_id
        and module_key = target_module;
  elsif target_level in ('VIEW', 'MANAGE') and public.has_team_module(target_team_id, target_module) then
    insert into public.team_member_module_permissions
      (team_id, membership_id, module_key, access_level)
      values (target_team_id, target_membership_id, target_module, target_level)
      on conflict (team_id, membership_id, module_key)
      do update set access_level = excluded.access_level, granted_at = now();
  else
    raise exception 'Invalid module or access level';
  end if;
end;
$$;

create or replace function public.set_team_member_role(
  target_team_id uuid, target_membership_id uuid,
  target_role public.membership_role, allow_access_assignment boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
declare
  current_target_role public.membership_role;
begin
  if not public.is_active_team_member(target_team_id)
    or not exists (select 1 from public.team_memberships
    where team_id = target_team_id and user_id = auth.uid()
      and role = 'OWNER' and status = 'ACTIVE') then
    raise exception 'Only the team owner can change staff roles';
  end if;
  select role into current_target_role from public.team_memberships
    where team_id = target_team_id and id = target_membership_id;
  if current_target_role is null or current_target_role = 'OWNER'
    or target_role = 'OWNER' then
    raise exception 'Invalid role change';
  end if;
  update public.team_memberships
    set role = target_role,
      can_assign_access = (target_role = 'ADMIN' and allow_access_assignment)
    where team_id = target_team_id and id = target_membership_id;
end;
$$;

-- Parent ownership is established only through an approved family link.
create table public.family_guardians (
  team_id uuid not null,
  family_id uuid not null,
  membership_id uuid not null,
  relationship_label text,
  created_at timestamptz not null default now(),
  primary key (team_id, family_id, membership_id),
  foreign key (team_id, family_id) references public.families(team_id, id),
  foreign key (team_id, membership_id) references public.team_memberships(team_id, id)
);
alter table public.family_guardians enable row level security;

create or replace function public.is_family_guardian(target_team_id uuid, target_family_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_team_module(target_team_id, 'omniathlete') and exists (
    select 1 from public.family_guardians g
    join public.team_memberships m
      on m.team_id = g.team_id and m.id = g.membership_id
    where g.team_id = target_team_id and g.family_id = target_family_id
      and m.user_id = auth.uid() and m.status = 'ACTIVE'
  );
$$;

create or replace function public.is_swimmer_guardian(target_team_id uuid, target_swimmer_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.family_swimmers fs
    where fs.team_id = target_team_id and fs.swimmer_id = target_swimmer_id
      and public.is_family_guardian(fs.team_id, fs.family_id)
  );
$$;

create policy "guardians or athlete managers read guardian links" on public.family_guardians
  for select using (public.is_family_guardian(team_id, family_id)
    or public.can_access_team_module(team_id, 'omniathlete'));
create policy "athlete managers manage guardian links" on public.family_guardians
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));

-- Replace permissive member-level policies: parents see their own family only.
drop policy "athlete members manage swimmers" on public.swimmers;
drop policy "athlete members manage groups" on public.swim_groups;
drop policy "athlete members manage group memberships" on public.group_memberships;
drop policy "athlete members manage attendance" on public.attendance_records;
drop policy "athlete members manage settings" on public.team_settings;
drop policy "athlete members read families" on public.families;
drop policy "athlete members manage families" on public.families;
drop policy "athlete members read family swimmers" on public.family_swimmers;
drop policy "athlete members manage family swimmers" on public.family_swimmers;
drop policy "athlete members read checkin tokens" on public.self_checkin_tokens;

create policy "athlete permitted read swimmers" on public.swimmers
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.is_swimmer_guardian(team_id, id));
create policy "athlete managers write swimmers" on public.swimmers
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read families" on public.families
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.is_family_guardian(team_id, id));
create policy "athlete managers write families" on public.families
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read family swimmers" on public.family_swimmers
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.is_family_guardian(team_id, family_id));
create policy "athlete managers write family swimmers" on public.family_swimmers
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read groups" on public.swim_groups
  for select using (public.can_access_team_module(team_id, 'omniathlete'));
create policy "athlete managers write groups" on public.swim_groups
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read group memberships" on public.group_memberships
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.is_swimmer_guardian(team_id, swimmer_id));
create policy "athlete managers write group memberships" on public.group_memberships
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read attendance" on public.attendance_records
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.is_swimmer_guardian(team_id, swimmer_id));
create policy "athlete managers write attendance" on public.attendance_records
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete permitted read settings" on public.team_settings
  for select using (public.can_access_team_module(team_id, 'omniathlete'));
create policy "athlete managers write settings" on public.team_settings
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "athlete managers read checkin tokens" on public.self_checkin_tokens
  for select using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));

drop policy "members read memberships" on public.team_memberships;
create policy "members read own or managed memberships" on public.team_memberships
  for select using (user_id = auth.uid() or public.can_assign_team_access(team_id));
drop policy "members read profiles" on public.profiles;
create policy "read own or managed team profiles" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.team_memberships m
    where m.user_id = id and public.can_assign_team_access(m.team_id)
  )
);
drop policy "members read logs" on public.audit_logs;
create policy "access managers read audit logs" on public.audit_logs
  for select using (public.can_assign_team_access(team_id));

-- The initial schedule policies also used membership alone; a parent membership
-- must not grant access to every team's practice or its write endpoints.
drop policy "members read sessions" on public.practice_sessions;
drop policy "members manage sessions" on public.practice_sessions;
drop policy "members manage schedules" on public.practice_schedules;
drop policy "members read exceptions" on public.practice_exceptions;
drop policy "members manage exceptions" on public.practice_exceptions;
create policy "permitted staff read practice sessions" on public.practice_sessions
  for select using (public.can_access_team_module(team_id, 'omniathlete')
    or public.can_access_team_module(team_id, 'omnischedule'));
create policy "permitted staff manage practice sessions" on public.practice_sessions
  for all using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE')
    or public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE')
    or public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'));
create policy "schedule staff read practice schedules" on public.practice_schedules
  for select using (public.can_access_team_module(team_id, 'omnischedule'));
create policy "schedule staff manage practice schedules" on public.practice_schedules
  for all using (public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'));
create policy "schedule staff read practice exceptions" on public.practice_exceptions
  for select using (public.can_access_team_module(team_id, 'omnischedule'));
create policy "schedule staff manage practice exceptions" on public.practice_exceptions
  for all using (public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omnischedule', 'MANAGE'));

-- Registration is a request, not automatic access to an existing family.
create table public.team_registration_settings (
  team_id uuid primary key references public.teams(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  registration_open boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.team_registration_settings enable row level security;
create policy "open team registration visible" on public.team_registration_settings
  for select using (registration_open or public.can_assign_team_access(team_id));

create or replace function public.configure_team_registration(
  target_team_id uuid, target_slug text, open_registration boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_team_member(target_team_id)
    or not exists (select 1 from public.team_memberships
    where team_id = target_team_id and user_id = auth.uid()
      and role = 'OWNER' and status = 'ACTIVE') then
    raise exception 'Only the team owner can configure registration';
  end if;
  if target_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid registration slug';
  end if;
  insert into public.team_registration_settings (team_id, slug, registration_open)
    values (target_team_id, target_slug, open_registration)
    on conflict (team_id) do update
      set slug = excluded.slug, registration_open = excluded.registration_open,
        updated_at = now();
end;
$$;

create table public.parent_registration_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  user_id uuid not null references public.profiles(id),
  family_name text not null check (length(trim(family_name)) between 1 and 100),
  swimmers jsonb not null check (jsonb_typeof(swimmers) = 'array'
    and jsonb_array_length(swimmers) between 1 and 10
    and octet_length(swimmers::text) <= 10000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id),
  unique (team_id, user_id),
  unique (team_id, id)
);
alter table public.parent_registration_requests enable row level security;

create or replace function public.is_verified_user()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;

create policy "applicant or access manager reads registration" on public.parent_registration_requests
  for select using (user_id = auth.uid() or public.can_assign_team_access(team_id));
create policy "verified applicant submits registration" on public.parent_registration_requests
  for insert with check (
    user_id = auth.uid() and status = 'PENDING'
    and exists (select 1 from public.team_registration_settings r
      where r.team_id = parent_registration_requests.team_id and r.registration_open)
    and public.is_verified_user()
  );
-- Approval and rejection are trusted server operations; no direct client updates.

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 'Parent'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 'Account'),
    coalesce(new.email, '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_profile_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.review_parent_registration(
  target_request_id uuid, approve boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  request_row public.parent_registration_requests%rowtype;
  new_family_id uuid;
  new_swimmer_id uuid;
  target_membership_id uuid;
  swimmer_item jsonb;
begin
  select * into request_row from public.parent_registration_requests
    where id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'PENDING'
    or not public.can_assign_team_access(request_row.team_id) then
    raise exception 'Registration request unavailable';
  end if;

  if approve then
    insert into public.families (team_id, name, primary_email)
      values (request_row.team_id, request_row.family_name,
        (select email from public.profiles where id = request_row.user_id))
      returning id into new_family_id;
    for swimmer_item in select value from jsonb_array_elements(request_row.swimmers) loop
      if length(trim(coalesce(swimmer_item ->> 'first_name', ''))) not between 1 and 100
        or length(trim(coalesce(swimmer_item ->> 'last_name', ''))) not between 1 and 100 then
        raise exception 'Swimmer first and last name required';
      end if;
      insert into public.swimmers (team_id, first_name, last_name)
        values (request_row.team_id, trim(swimmer_item ->> 'first_name'),
          trim(swimmer_item ->> 'last_name'))
        returning id into new_swimmer_id;
      insert into public.family_swimmers (team_id, family_id, swimmer_id)
        values (request_row.team_id, new_family_id, new_swimmer_id);
    end loop;
    insert into public.team_memberships (team_id, user_id, role)
      values (request_row.team_id, request_row.user_id, 'PARENT')
      on conflict (team_id, user_id) do update set status = 'ACTIVE'
      returning id into target_membership_id;
    insert into public.family_guardians (team_id, family_id, membership_id)
      values (request_row.team_id, new_family_id, target_membership_id);
  end if;

  update public.parent_registration_requests
    set status = case when approve then 'APPROVED' else 'REJECTED' end,
      reviewed_at = now(), reviewed_by_user_id = auth.uid()
    where id = target_request_id;
end;
$$;

create trigger team_member_module_permissions_team_id_immutable before update on public.team_member_module_permissions
  for each row execute function public.reject_team_id_change();
create trigger family_guardians_team_id_immutable before update on public.family_guardians
  for each row execute function public.reject_team_id_change();
create trigger parent_registration_requests_team_id_immutable before update on public.parent_registration_requests
  for each row execute function public.reject_team_id_change();
