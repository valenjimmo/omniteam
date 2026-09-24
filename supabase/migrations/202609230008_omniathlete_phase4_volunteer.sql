-- OmniAthlete Phase 4: event volunteer jobs, household-safe signups, and credits.
alter table public.memberships
  add column volunteer_quota numeric(6,2) not null default 4
  check (volunteer_quota >= 0);

create table public.job_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 120),
  description text,
  default_credit numeric(6,2) not null default 1 check (default_credit > 0),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  foreign key (organization_id, team_id) references public.teams(organization_id, id)
);

create table public.job_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_id uuid not null,
  event_id uuid not null,
  template_id uuid,
  title text not null check (length(trim(title)) between 1 and 120),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  signup_deadline timestamptz not null,
  capacity integer not null default 1 check (capacity between 1 and 100),
  credit_value numeric(6,2) not null default 1 check (credit_value > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (signup_deadline <= starts_at),
  unique (team_id, id),
  foreign key (organization_id, team_id) references public.teams(organization_id, id),
  foreign key (team_id, event_id) references public.events(team_id, id) on delete cascade,
  foreign key (team_id, template_id) references public.job_templates(team_id, id)
);

create table public.job_signups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_id uuid not null,
  slot_id uuid not null,
  membership_id uuid not null,
  household_id uuid not null,
  status text not null default 'claimed' check (status in ('claimed', 'released')),
  claimed_at timestamptz not null default now(),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'claimed' and released_at is null) or (status = 'released' and released_at is not null)),
  unique (team_id, id),
  foreign key (organization_id, team_id) references public.teams(organization_id, id),
  foreign key (team_id, slot_id) references public.job_slots(team_id, id) on delete cascade,
  foreign key (team_id, membership_id) references public.memberships(team_id, id),
  foreign key (team_id, household_id) references public.households(team_id, id)
);
create unique index job_signups_one_active_member_slot_idx
  on public.job_signups(team_id, slot_id, membership_id) where status = 'claimed';

create table public.volunteer_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_id uuid not null,
  membership_id uuid not null,
  household_id uuid not null,
  signup_id uuid,
  season_year integer not null check (season_year between 2000 and 2200),
  credit numeric(6,2) not null check (credit <> 0),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (team_id, id),
  unique (team_id, signup_id),
  foreign key (organization_id, team_id) references public.teams(organization_id, id),
  foreign key (team_id, membership_id) references public.memberships(team_id, id),
  foreign key (team_id, household_id) references public.households(team_id, id),
  foreign key (team_id, signup_id) references public.job_signups(team_id, id) on delete set null
);

create index job_slots_event_start_idx on public.job_slots(team_id, event_id, starts_at);
create index job_signups_household_status_idx on public.job_signups(team_id, household_id, status);
create index volunteer_ledger_member_season_idx on public.volunteer_ledger(team_id, membership_id, season_year);

create function public.has_omnivolunteer(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_active_omniathlete_member(target_team_id)
    and exists (
      select 1 from public.team_module_entitlements e
      where e.team_id = target_team_id and e.module_key = 'omnivolunteer'
        and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
    )
$$;

create function public.is_volunteer_admin(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_omnivolunteer(target_team_id) and exists (
    select 1 from public.memberships
    where team_id = target_team_id and profile_id = auth.uid() and status = 'active'
      and role in ('team_admin', 'volunteer_coord')
  )
$$;

alter table public.job_templates enable row level security;
alter table public.job_slots enable row level security;
alter table public.job_signups enable row level security;
alter table public.volunteer_ledger enable row level security;

create policy "volunteer members read templates" on public.job_templates for select using (public.has_omnivolunteer(team_id));
create policy "volunteer admins manage templates" on public.job_templates for all using (public.is_volunteer_admin(team_id)) with check (public.is_volunteer_admin(team_id) and created_by = auth.uid());
create policy "volunteer members read slots" on public.job_slots for select using (public.has_omnivolunteer(team_id));
create policy "volunteer admins manage slots" on public.job_slots for all using (public.is_volunteer_admin(team_id)) with check (public.is_volunteer_admin(team_id) and created_by = auth.uid());
create policy "volunteer members read signups" on public.job_signups for select using (public.has_omnivolunteer(team_id));
create policy "families read household ledger" on public.volunteer_ledger for select using (
  public.is_volunteer_admin(team_id) or exists (
    select 1 from public.memberships m where m.team_id = volunteer_ledger.team_id
      and m.household_id = volunteer_ledger.household_id and m.profile_id = auth.uid() and m.status = 'active'
  )
);
create policy "volunteer admins manage ledger" on public.volunteer_ledger for all using (public.is_volunteer_admin(team_id)) with check (public.is_volunteer_admin(team_id) and created_by = auth.uid());

create trigger job_templates_team_id_immutable before update on public.job_templates for each row execute function public.reject_team_id_change();
create trigger job_slots_team_id_immutable before update on public.job_slots for each row execute function public.reject_team_id_change();
create trigger job_signups_team_id_immutable before update on public.job_signups for each row execute function public.reject_team_id_change();
create trigger volunteer_ledger_team_id_immutable before update on public.volunteer_ledger for each row execute function public.reject_team_id_change();

create function public.claim_job_slot(target_team_id uuid, target_slot_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor_membership public.memberships%rowtype;
  target_slot public.job_slots%rowtype;
  new_signup_id uuid;
begin
  select * into strict actor_membership from public.memberships
    where team_id = target_team_id and profile_id = auth.uid() and status = 'active' and household_id is not null;
  if not public.has_omnivolunteer(target_team_id) then raise exception 'OmniVolunteer is not enabled'; end if;
  perform pg_advisory_xact_lock(hashtext(target_team_id::text), hashtext(actor_membership.household_id::text));

  select * into strict target_slot from public.job_slots where team_id = target_team_id and id = target_slot_id for update;
  if target_slot.signup_deadline < now() then raise exception 'The signup deadline has passed'; end if;
  if (select count(*) from public.job_signups where team_id = target_team_id and slot_id = target_slot_id and status = 'claimed') >= target_slot.capacity then
    raise exception 'This job is full';
  end if;
  if exists (
    select 1 from public.job_signups s
    join public.job_slots occupied on occupied.team_id = s.team_id and occupied.id = s.slot_id
    where s.team_id = target_team_id and s.household_id = actor_membership.household_id and s.status = 'claimed'
      and occupied.starts_at < target_slot.ends_at and occupied.ends_at > target_slot.starts_at
  ) then raise exception 'Someone in your household already has a job during this time'; end if;

  insert into public.job_signups(organization_id, team_id, slot_id, membership_id, household_id)
  values(target_slot.organization_id, target_team_id, target_slot_id, actor_membership.id, actor_membership.household_id)
  returning id into new_signup_id;
  return new_signup_id;
end $$;

create function public.release_job_signup(target_team_id uuid, target_signup_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_signup public.job_signups%rowtype; deadline timestamptz;
begin
  if not public.has_omnivolunteer(target_team_id) then raise exception 'OmniVolunteer is not enabled'; end if;
  select s, js.signup_deadline into target_signup, deadline
  from public.job_signups s join public.job_slots js on js.team_id=s.team_id and js.id=s.slot_id
  where s.team_id=target_team_id and s.id=target_signup_id and s.status='claimed' for update of s;
  if not found then raise exception 'Active signup not found'; end if;
  if deadline < now() then raise exception 'The signup deadline has passed'; end if;
  if not exists(select 1 from public.memberships m where m.team_id=target_team_id and m.profile_id=auth.uid() and m.status='active' and (m.household_id=target_signup.household_id or m.role in ('team_admin','volunteer_coord'))) then
    raise exception 'Signup access denied';
  end if;
  update public.job_signups set status='released', released_at=now(), updated_at=now() where team_id=target_team_id and id=target_signup_id;
end $$;

revoke all on function public.claim_job_slot(uuid,uuid) from public;
revoke all on function public.release_job_signup(uuid,uuid) from public;
grant execute on function public.claim_job_slot(uuid,uuid), public.release_job_signup(uuid,uuid) to authenticated;
grant select on public.job_templates, public.job_slots, public.job_signups, public.volunteer_ledger to authenticated;
grant insert, update, delete on public.job_templates, public.job_slots, public.volunteer_ledger to authenticated;

create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if exists (select 1 from storage.objects where bucket_id='omnisite-assets' and name like target_team_id::text || '/%') then raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team'; end if;
  delete from public.team_sites where team_id=target_team_id;
  delete from public.volunteer_ledger where team_id=target_team_id;
  delete from public.job_signups where team_id=target_team_id;
  delete from public.job_slots where team_id=target_team_id;
  delete from public.job_templates where team_id=target_team_id;
  delete from public.events where team_id=target_team_id;
  delete from public.attendance where team_id=target_team_id; delete from public.session_rsvps where team_id=target_team_id; delete from public.sessions where team_id=target_team_id;
  delete from public.group_members where team_id=target_team_id; delete from public.groups where team_id=target_team_id; delete from public.locations where team_id=target_team_id;
  delete from public.join_requests where team_id=target_team_id; delete from public.household_members where team_id=target_team_id; delete from public.athletes where team_id=target_team_id;
  delete from public.family_contacts where team_id=target_team_id; delete from public.family_guardians where team_id=target_team_id; delete from public.family_swimmers where team_id=target_team_id;
  delete from public.attendance_records where team_id=target_team_id; delete from public.self_checkin_tokens where team_id=target_team_id; delete from public.group_memberships where team_id=target_team_id;
  delete from public.practice_exceptions where team_id=target_team_id; delete from public.practice_sessions where team_id=target_team_id; delete from public.practice_schedules where team_id=target_team_id;
  delete from public.swim_groups where team_id=target_team_id; delete from public.swimmers where team_id=target_team_id; delete from public.families where team_id=target_team_id;
  delete from public.parent_registration_requests where team_id=target_team_id; delete from public.platform_support_sessions where team_id=target_team_id;
  delete from public.mock_checkout_sessions where team_id=target_team_id; delete from public.audit_logs where team_id=target_team_id;
  if include_account_access then
    delete from public.memberships where team_id=target_team_id; delete from public.households where team_id=target_team_id;
    delete from public.team_member_module_permissions where team_id=target_team_id; delete from public.team_module_entitlements where team_id=target_team_id;
    delete from public.team_registration_settings where team_id=target_team_id; delete from public.team_settings where team_id=target_team_id; delete from public.team_memberships where team_id=target_team_id;
  end if;
end $$;
revoke all on function public.clear_team_records(uuid,boolean) from public,anon,authenticated;
