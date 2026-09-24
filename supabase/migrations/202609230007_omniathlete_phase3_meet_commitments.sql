-- OmniAthlete Phase 3: meet publishing and whole-household commitments.
-- Meets remain calendar events in OmniSchedule; this does not introduce OmniMeet.
alter table public.events
  add column kind text not null default 'practice' check (kind in ('practice', 'meet')),
  add column ends_at timestamptz,
  add column commit_deadline timestamptz,
  add column status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  add column details text,
  add column created_by uuid references public.profiles(id),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now(),
  add constraint events_time_order check (ends_at is null or ends_at > starts_at),
  add constraint meets_require_deadline check (kind <> 'meet' or commit_deadline is not null);

create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  team_id uuid not null,
  event_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (team_id, id),
  unique (team_id, event_id, id),
  foreign key (org_id, team_id) references public.teams(organization_id, id),
  foreign key (team_id, event_id) references public.events(team_id, id) on delete cascade
);

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  team_id uuid not null,
  event_id uuid not null,
  athlete_id uuid not null,
  response text not null check (response in ('attend', 'decline')),
  coach_note text check (coach_note is null or length(coach_note) <= 1000),
  responded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  unique (team_id, event_id, id),
  unique (team_id, event_id, athlete_id),
  foreign key (org_id, team_id) references public.teams(organization_id, id),
  foreign key (team_id, event_id) references public.events(team_id, id) on delete cascade,
  foreign key (team_id, athlete_id) references public.athletes(team_id, id)
);

create table public.commitment_sessions (
  team_id uuid not null,
  event_id uuid not null,
  commitment_id uuid not null,
  event_session_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (team_id, commitment_id, event_session_id),
  foreign key (team_id, event_id, commitment_id)
    references public.commitments(team_id, event_id, id) on delete cascade,
  foreign key (team_id, event_id, event_session_id)
    references public.event_sessions(team_id, event_id, id) on delete cascade
);

create index event_sessions_event_idx on public.event_sessions(team_id, event_id, sort_order);
create index commitments_event_response_idx on public.commitments(team_id, event_id, response);

alter table public.event_sessions enable row level security;
alter table public.commitments enable row level security;
alter table public.commitment_sessions enable row level security;

create policy "members read event sessions" on public.event_sessions for select
  using (public.is_active_omniathlete_member(team_id));
create policy "coaches manage event sessions" on public.event_sessions for all
  using (public.is_omniathlete_coach(team_id))
  with check (public.is_omniathlete_coach(team_id));
create policy "families read own commitments" on public.commitments for select
  using (public.is_omniathlete_coach(team_id) or public.can_manage_athlete(team_id, athlete_id));
create policy "families insert own commitments" on public.commitments for insert
  with check (public.can_manage_athlete(team_id, athlete_id) and responded_by = auth.uid());
create policy "families update own commitments" on public.commitments for update
  using (public.can_manage_athlete(team_id, athlete_id))
  with check (public.can_manage_athlete(team_id, athlete_id) and responded_by = auth.uid());
create policy "families read own commitment sessions" on public.commitment_sessions for select
  using (exists (select 1 from public.commitments c where c.team_id=commitment_sessions.team_id and c.id=commitment_sessions.commitment_id and (public.is_omniathlete_coach(c.team_id) or public.can_manage_athlete(c.team_id,c.athlete_id))));
create policy "families manage own commitment sessions" on public.commitment_sessions for all
  using (exists (select 1 from public.commitments c where c.team_id=commitment_sessions.team_id and c.id=commitment_sessions.commitment_id and public.can_manage_athlete(c.team_id,c.athlete_id)))
  with check (exists (select 1 from public.commitments c where c.team_id=commitment_sessions.team_id and c.id=commitment_sessions.commitment_id and public.can_manage_athlete(c.team_id,c.athlete_id)));

create policy "coaches publish events" on public.events for all
  using (public.is_omniathlete_coach(team_id))
  with check (public.is_omniathlete_coach(team_id) and created_by = auth.uid());

create trigger event_sessions_team_id_immutable before update on public.event_sessions for each row execute function public.reject_team_id_change();
create trigger commitments_team_id_immutable before update on public.commitments for each row execute function public.reject_team_id_change();
create trigger commitment_sessions_team_id_immutable before update on public.commitment_sessions for each row execute function public.reject_team_id_change();

create function public.publish_meet(target_team_id uuid, meet_title text, meet_location text, deadline timestamptz, sessions jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare target_org_id uuid; new_event_id uuid; item jsonb; first_start timestamptz; last_end timestamptz;
begin
  if not public.is_omniathlete_coach(target_team_id) then raise exception 'coach access required'; end if;
  if jsonb_typeof(sessions)<>'array' or jsonb_array_length(sessions)<>2 then raise exception 'exactly two sessions required'; end if;
  select organization_id into strict target_org_id from public.teams where id=target_team_id and status='ACTIVE';
  select min((value->>'starts_at')::timestamptz),max((value->>'ends_at')::timestamptz) into first_start,last_end from jsonb_array_elements(sessions);
  if deadline>=first_start then raise exception 'commit deadline must be before the meet'; end if;
  insert into public.events(org_id,team_id,title,starts_at,ends_at,location,visibility,kind,commit_deadline,status,created_by)
    values(target_org_id,target_team_id,trim(meet_title),first_start,last_end,nullif(trim(meet_location),''),'members','meet',deadline,'published',auth.uid()) returning id into new_event_id;
  for item in select * from jsonb_array_elements(sessions) loop
    insert into public.event_sessions(org_id,team_id,event_id,name,starts_at,ends_at,sort_order)
      values(target_org_id,target_team_id,new_event_id,trim(item->>'name'),(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz,(item->>'sort_order')::integer);
  end loop;
  return new_event_id;
end $$;

-- One transaction saves every athlete and replaces that athlete's selected sessions.
create function public.save_household_commitments(target_team_id uuid, target_event_id uuid, choices jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare target_org_id uuid; item jsonb; saved_commitment_id uuid; selected_session text;
begin
  if jsonb_typeof(choices) <> 'array' then raise exception 'choices must be an array'; end if;
  select org_id into strict target_org_id from public.events
    where team_id=target_team_id and id=target_event_id and kind='meet' and status='published' and commit_deadline >= now();
  for item in select * from jsonb_array_elements(choices) loop
    if not public.can_manage_athlete(target_team_id,(item->>'athlete_id')::uuid) then raise exception 'athlete access denied'; end if;
    if item->>'response'='attend' and jsonb_array_length(coalesce(item->'session_ids','[]'::jsonb))=0 then raise exception 'attending athletes require a session'; end if;
    insert into public.commitments(org_id,team_id,event_id,athlete_id,response,coach_note,responded_by)
      values(target_org_id,target_team_id,target_event_id,(item->>'athlete_id')::uuid,item->>'response',nullif(trim(item->>'coach_note'),''),auth.uid())
      on conflict(team_id,event_id,athlete_id) do update set response=excluded.response,coach_note=excluded.coach_note,responded_by=auth.uid(),updated_at=now()
      returning id into saved_commitment_id;
    delete from public.commitment_sessions where team_id=target_team_id and commitment_id=saved_commitment_id;
    if item->>'response'='attend' then
      for selected_session in select jsonb_array_elements_text(item->'session_ids') loop
        insert into public.commitment_sessions(team_id,event_id,commitment_id,event_session_id)
          values(target_team_id,target_event_id,saved_commitment_id,selected_session::uuid);
      end loop;
    end if;
  end loop;
end $$;

create function public.meet_commitment_counts(target_team_id uuid,target_event_id uuid)
returns table(group_id uuid,group_name text,committed bigint,declined bigint,undeclared bigint)
language plpgsql security invoker stable set search_path=public as $$
begin
  if not public.is_omniathlete_coach(target_team_id) then raise exception 'coach access required'; end if;
  return query select g.id,g.name,
    count(*) filter(where c.response='attend'),count(*) filter(where c.response='decline'),count(*) filter(where c.id is null)
    from public.groups g join public.group_members gm on gm.team_id=g.team_id and gm.group_id=g.id
    join public.athletes a on a.team_id=gm.team_id and a.id=gm.athlete_id and a.status='active'
    left join public.commitments c on c.team_id=a.team_id and c.athlete_id=a.id and c.event_id=target_event_id
    where g.team_id=target_team_id and g.status='active' group by g.id,g.name order by g.name;
end $$;

revoke all on function public.save_household_commitments(uuid,uuid,jsonb) from public;
grant execute on function public.save_household_commitments(uuid,uuid,jsonb) to authenticated;
revoke all on function public.publish_meet(uuid,text,text,timestamptz,jsonb) from public;
grant execute on function public.publish_meet(uuid,text,text,timestamptz,jsonb) to authenticated;
revoke all on function public.meet_commitment_counts(uuid,uuid) from public;
grant execute on function public.meet_commitment_counts(uuid,uuid) to authenticated;
grant select on public.event_sessions, public.commitments, public.commitment_sessions to authenticated;
grant insert, update, delete on public.event_sessions, public.commitments, public.commitment_sessions to authenticated;
grant insert, update on public.events to authenticated;

-- Keep archive separate from hard deletion; extend the trusted cleanup boundary
-- so Phase 0-3 rows cannot strand or leak tenant data.
create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if exists (select 1 from storage.objects where bucket_id='omnisite-assets' and name like target_team_id::text || '/%') then raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team'; end if;
  delete from public.team_sites where team_id=target_team_id;
  delete from public.events where team_id=target_team_id;
  delete from public.attendance where team_id=target_team_id;
  delete from public.session_rsvps where team_id=target_team_id;
  delete from public.sessions where team_id=target_team_id;
  delete from public.group_members where team_id=target_team_id;
  delete from public.groups where team_id=target_team_id;
  delete from public.locations where team_id=target_team_id;
  delete from public.join_requests where team_id=target_team_id;
  delete from public.household_members where team_id=target_team_id;
  delete from public.athletes where team_id=target_team_id;
  delete from public.family_contacts where team_id=target_team_id;
  delete from public.family_guardians where team_id=target_team_id;
  delete from public.family_swimmers where team_id=target_team_id;
  delete from public.attendance_records where team_id=target_team_id;
  delete from public.self_checkin_tokens where team_id=target_team_id;
  delete from public.group_memberships where team_id=target_team_id;
  delete from public.practice_exceptions where team_id=target_team_id;
  delete from public.practice_sessions where team_id=target_team_id;
  delete from public.practice_schedules where team_id=target_team_id;
  delete from public.swim_groups where team_id=target_team_id;
  delete from public.swimmers where team_id=target_team_id;
  delete from public.families where team_id=target_team_id;
  delete from public.parent_registration_requests where team_id=target_team_id;
  delete from public.platform_support_sessions where team_id=target_team_id;
  delete from public.mock_checkout_sessions where team_id=target_team_id;
  delete from public.audit_logs where team_id=target_team_id;
  if include_account_access then
    delete from public.memberships where team_id=target_team_id;
    delete from public.households where team_id=target_team_id;
    delete from public.team_member_module_permissions where team_id=target_team_id;
    delete from public.team_module_entitlements where team_id=target_team_id;
    delete from public.team_registration_settings where team_id=target_team_id;
    delete from public.team_settings where team_id=target_team_id;
    delete from public.team_memberships where team_id=target_team_id;
  end if;
end $$;
revoke all on function public.clear_team_records(uuid,boolean) from public,anon,authenticated;
