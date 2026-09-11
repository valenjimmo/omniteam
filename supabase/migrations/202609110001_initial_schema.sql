create extension if not exists "pgcrypto";

create type public.record_status as enum ('ACTIVE', 'INACTIVE');
create type public.membership_role as enum ('OWNER', 'ADMIN', 'COACH');
create type public.practice_status as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE', 'LEFT_EARLY', 'NOT_SCHEDULED');
create type public.checkin_method as enum ('COACH', 'SELF', 'PARENT', 'ADMIN', 'IMPORT');

create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, status public.record_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.teams (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, timezone text not null default 'America/Los_Angeles', status public.record_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, first_name text not null, last_name text not null, email text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.team_memberships (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), user_id uuid not null references public.profiles(id), role public.membership_role not null, status public.record_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id, user_id));
create table public.swimmers (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), external_id text, first_name text not null, last_name text not null, preferred_name text, date_of_birth date, status public.record_status not null default 'ACTIVE', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.swim_groups (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), name text not null, description text, status public.record_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id, name));
create table public.group_memberships (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), swimmer_id uuid not null references public.swimmers(id), group_id uuid not null references public.swim_groups(id), start_date date not null, end_date date, is_primary boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.practice_schedules (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), group_id uuid not null references public.swim_groups(id), day_of_week smallint not null check(day_of_week between 0 and 6), start_time time not null, end_time time not null, effective_start_date date not null, effective_end_date date, status public.record_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.practice_sessions (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), group_id uuid not null references public.swim_groups(id), practice_date date not null, start_time time not null, end_time time not null, status public.practice_status not null default 'SCHEDULED', cancel_reason text, schedule_id uuid references public.practice_schedules(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id, group_id, practice_date, start_time));
create table public.practice_exceptions (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), group_id uuid references public.swim_groups(id), exception_date date not null, exception_type text not null, reason text not null, cancel_practice boolean not null default true, replacement_start_time time, replacement_end_time time, notes text, created_by_user_id uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.attendance_records (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), practice_session_id uuid not null references public.practice_sessions(id), swimmer_id uuid not null references public.swimmers(id), status public.attendance_status not null, checkin_method public.checkin_method not null default 'COACH', checked_in_at timestamptz, recorded_by_user_id uuid references public.profiles(id), verified_by_user_id uuid references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(practice_session_id, swimmer_id));
create table public.self_checkin_tokens (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), practice_session_id uuid not null references public.practice_sessions(id), token text not null unique, active boolean not null default true, valid_from timestamptz not null, expires_at timestamptz not null, created_at timestamptz not null default now());
create table public.team_settings (team_id uuid primary key references public.teams(id), count_excused_against_attendance boolean not null default false, count_late_as_present boolean not null default true, self_checkin_mode text not null default 'COACH_ONLY' check(self_checkin_mode in ('COACH_ONLY', 'SELF_CHECKIN', 'HYBRID')), require_coach_confirmation boolean not null default false, checkin_open_minutes integer not null default 30, checkin_close_minutes integer not null default 15, updated_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), user_id uuid references public.profiles(id), entity_type text not null, entity_id uuid not null, action text not null, old_values jsonb, new_values jsonb, created_at timestamptz not null default now());

create index attendance_records_team_date_idx on public.attendance_records(team_id, created_at);
create index practice_sessions_team_date_idx on public.practice_sessions(team_id, practice_date);
create index group_memberships_current_idx on public.group_memberships(team_id, swimmer_id, end_date);

create or replace function public.is_active_team_member(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.team_memberships where team_id = target_team_id and user_id = auth.uid() and status = 'ACTIVE');
$$;

alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_memberships enable row level security;
alter table public.swimmers enable row level security;
alter table public.swim_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.practice_schedules enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_exceptions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.self_checkin_tokens enable row level security;
alter table public.team_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "members read team" on public.teams for select using (public.is_active_team_member(id));
create policy "members read scoped data" on public.swimmers for select using (public.is_active_team_member(team_id));
create policy "members write scoped data" on public.swimmers for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members read groups" on public.swim_groups for select using (public.is_active_team_member(team_id));
create policy "members manage attendance" on public.attendance_records for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members read sessions" on public.practice_sessions for select using (public.is_active_team_member(team_id));
create policy "members manage schedules" on public.practice_schedules for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members read memberships" on public.team_memberships for select using (public.is_active_team_member(team_id));
create policy "members read logs" on public.audit_logs for select using (public.is_active_team_member(team_id));
create policy "members manage organizations" on public.organizations for select using (exists (select 1 from public.teams where teams.organization_id = organizations.id and public.is_active_team_member(teams.id)));
create policy "members read profiles" on public.profiles for select using (id = auth.uid() or exists (select 1 from public.team_memberships where user_id = id and public.is_active_team_member(team_id)));
create policy "members manage group memberships" on public.group_memberships for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members read exceptions" on public.practice_exceptions for select using (public.is_active_team_member(team_id));
create policy "members manage exceptions" on public.practice_exceptions for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members manage sessions" on public.practice_sessions for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members manage groups" on public.swim_groups for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));
create policy "members read checkin tokens" on public.self_checkin_tokens for select using (public.is_active_team_member(team_id));
create policy "members manage settings" on public.team_settings for all using (public.is_active_team_member(team_id)) with check (public.is_active_team_member(team_id));