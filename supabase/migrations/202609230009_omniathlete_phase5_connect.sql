-- OmniAthlete Phase 5: OmniConnect announcements, inbox/email delivery queue,
-- event threads, notification preferences, and tenant-safe access.
create table public.announcements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null check (length(trim(body)) between 1 and 10000),
  audience text not null check (audience in ('org','group','event')),
  group_id uuid, event_id uuid, published_by uuid not null references public.profiles(id),
  published_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique(team_id,id),
  foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,group_id) references public.groups(team_id,id),
  foreign key(team_id,event_id) references public.events(team_id,id),
  check ((audience='org' and group_id is null and event_id is null)
    or (audience='group' and group_id is not null and event_id is null)
    or (audience='event' and event_id is not null and group_id is null))
);

create table public.threads (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  event_id uuid not null, created_at timestamptz not null default now(), unique(team_id,id), unique(team_id,event_id),
  foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,event_id) references public.events(team_id,id) on delete cascade
);

-- Thread posts and announcement deliveries intentionally share one transport table.
-- Email rows are a provider-neutral queue; a later authorized worker may deliver them.
create table public.messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, team_id uuid not null,
  kind text not null check(kind in ('thread','announcement_delivery')),
  thread_id uuid, announcement_id uuid, recipient_membership_id uuid,
  channel text check(channel in ('inbox','email')), author_id uuid references public.profiles(id),
  body text, delivery_status text check(delivery_status in ('queued','sent','failed')),
  created_at timestamptz not null default now(), unique(team_id,id),
  foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,thread_id) references public.threads(team_id,id) on delete cascade,
  foreign key(team_id,announcement_id) references public.announcements(team_id,id) on delete cascade,
  foreign key(team_id,recipient_membership_id) references public.memberships(team_id,id) on delete cascade,
  check(body is null or length(trim(body)) between 1 and 5000),
  check ((kind='thread' and thread_id is not null and author_id is not null and body is not null
      and announcement_id is null and recipient_membership_id is null and channel is null and delivery_status is null)
    or (kind='announcement_delivery' and thread_id is null and announcement_id is not null
      and recipient_membership_id is not null and channel is not null and body is null
      and delivery_status is not null))
);

create table public.notification_preferences (
  organization_id uuid not null, team_id uuid not null, membership_id uuid not null,
  email_announcements boolean not null default true, last_inbox_seen_at timestamptz not null default '-infinity',
  updated_at timestamptz not null default now(), primary key(team_id,membership_id),
  foreign key(organization_id,team_id) references public.teams(organization_id,id),
  foreign key(team_id,membership_id) references public.memberships(team_id,id) on delete cascade
);

create index announcements_team_published_idx on public.announcements(team_id,published_at desc);
create index messages_recipient_channel_idx on public.messages(team_id,recipient_membership_id,channel,created_at desc);
create index messages_thread_created_idx on public.messages(team_id,thread_id,created_at);

create function public.has_omniconnect(target_team_id uuid) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_active_omniathlete_member(target_team_id) and exists(
    select 1 from public.team_module_entitlements e where e.team_id=target_team_id
      and e.module_key='omniconnect' and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()))
$$;
create function public.is_connect_admin(target_team_id uuid) returns boolean
language sql security definer stable set search_path=public as $$
  select public.has_omniconnect(target_team_id) and exists(select 1 from public.memberships m
    where m.team_id=target_team_id and m.profile_id=auth.uid() and m.status='active' and m.role='team_admin')
$$;

alter table public.announcements enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.notification_preferences enable row level security;
create policy "connect members read delivered announcements" on public.announcements for select using (
  public.is_connect_admin(team_id) or exists(select 1 from public.messages d join public.memberships m
    on m.team_id=d.team_id and m.id=d.recipient_membership_id where d.team_id=announcements.team_id
    and d.announcement_id=announcements.id and d.channel='inbox' and m.profile_id=auth.uid() and m.status='active'));
create policy "connect admins create announcements" on public.announcements for insert with check(public.is_connect_admin(team_id) and published_by=auth.uid());
create policy "connect members read event threads" on public.threads for select using(public.has_omniconnect(team_id));
create policy "connect admins create event threads" on public.threads for insert with check(public.is_connect_admin(team_id));
create policy "connect members read messages" on public.messages for select using(public.has_omniconnect(team_id) and (
  (kind='thread') or exists(select 1 from public.memberships m where m.team_id=messages.team_id
    and m.id=messages.recipient_membership_id and m.profile_id=auth.uid() and m.status='active')));
create policy "connect members post thread messages" on public.messages for insert with check(
  kind='thread' and author_id=auth.uid() and public.has_omniconnect(team_id));
create policy "members read own notification preferences" on public.notification_preferences for select using(
  exists(select 1 from public.memberships m where m.team_id=notification_preferences.team_id
    and m.id=notification_preferences.membership_id and m.profile_id=auth.uid() and m.status='active'));
create policy "members manage own notification preferences" on public.notification_preferences for all using(
  exists(select 1 from public.memberships m where m.team_id=notification_preferences.team_id
    and m.id=notification_preferences.membership_id and m.profile_id=auth.uid() and m.status='active')) with check(
  exists(select 1 from public.memberships m where m.team_id=notification_preferences.team_id
    and m.id=notification_preferences.membership_id and m.profile_id=auth.uid() and m.status='active'));

create trigger announcements_team_id_immutable before update on public.announcements for each row execute function public.reject_team_id_change();
create trigger threads_team_id_immutable before update on public.threads for each row execute function public.reject_team_id_change();
create trigger messages_team_id_immutable before update on public.messages for each row execute function public.reject_team_id_change();
create trigger notification_preferences_team_id_immutable before update on public.notification_preferences for each row execute function public.reject_team_id_change();

create function public.post_announcement(target_team_id uuid, announcement_title text, announcement_body text,
  target_audience text, target_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare target_org_id uuid; new_id uuid;
begin
  if not public.is_connect_admin(target_team_id) then raise exception 'team admin access required'; end if;
  if target_audience not in ('org','group','event') then raise exception 'invalid audience'; end if;
  select organization_id into strict target_org_id from public.teams where id=target_team_id and status='ACTIVE';
  if target_audience='group' and not exists(select 1 from public.groups where team_id=target_team_id and id=target_id) then raise exception 'group not found'; end if;
  if target_audience='event' and not exists(select 1 from public.events where team_id=target_team_id and id=target_id) then raise exception 'event not found'; end if;
  insert into public.announcements(organization_id,team_id,title,body,audience,group_id,event_id,published_by)
  values(target_org_id,target_team_id,trim(announcement_title),trim(announcement_body),target_audience,
    case when target_audience='group' then target_id end,case when target_audience='event' then target_id end,auth.uid()) returning id into new_id;
  insert into public.messages(organization_id,team_id,kind,announcement_id,recipient_membership_id,channel,delivery_status)
  select target_org_id,target_team_id,'announcement_delivery',new_id,m.id,c.channel,'queued'
  from public.memberships m
  cross join lateral (values('inbox'::text),('email'::text)) c(channel)
  left join public.notification_preferences p on p.team_id=m.team_id and p.membership_id=m.id
  where m.team_id=target_team_id and m.status='active'
    and (c.channel='inbox' or coalesce(p.email_announcements,true))
    and (target_audience in ('org','event') or exists(select 1 from public.athletes a join public.group_members gm
      on gm.team_id=a.team_id and gm.athlete_id=a.id where a.team_id=m.team_id and a.household_id=m.household_id and gm.group_id=target_id));
  return new_id;
end $$;

create function public.post_event_message(target_team_id uuid,target_event_id uuid,message_body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare target_org_id uuid; target_thread_id uuid; new_id uuid;
begin
  if not public.has_omniconnect(target_team_id) then raise exception 'OmniConnect is not enabled'; end if;
  select org_id into strict target_org_id from public.events where team_id=target_team_id and id=target_event_id;
  insert into public.threads(organization_id,team_id,event_id) values(target_org_id,target_team_id,target_event_id)
    on conflict(team_id,event_id) do update set event_id=excluded.event_id returning id into target_thread_id;
  insert into public.messages(organization_id,team_id,kind,thread_id,author_id,body)
    values(target_org_id,target_team_id,'thread',target_thread_id,auth.uid(),trim(message_body)) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.post_announcement(uuid,text,text,text,uuid), public.post_event_message(uuid,uuid,text) from public;
grant execute on function public.post_announcement(uuid,text,text,text,uuid), public.post_event_message(uuid,uuid,text) to authenticated;
grant select on public.announcements,public.threads,public.messages,public.notification_preferences to authenticated;
grant insert,update on public.notification_preferences to authenticated;

create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from storage.objects where bucket_id='omnisite-assets' and name like target_team_id::text||'/%') then raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team'; end if;
  delete from public.messages where team_id=target_team_id; delete from public.threads where team_id=target_team_id;
  delete from public.announcements where team_id=target_team_id; delete from public.notification_preferences where team_id=target_team_id;
  delete from public.team_sites where team_id=target_team_id; delete from public.volunteer_ledger where team_id=target_team_id;
  delete from public.job_signups where team_id=target_team_id; delete from public.job_slots where team_id=target_team_id; delete from public.job_templates where team_id=target_team_id;
  delete from public.events where team_id=target_team_id; delete from public.attendance where team_id=target_team_id; delete from public.session_rsvps where team_id=target_team_id; delete from public.sessions where team_id=target_team_id;
  delete from public.group_members where team_id=target_team_id; delete from public.groups where team_id=target_team_id; delete from public.locations where team_id=target_team_id;
  delete from public.join_requests where team_id=target_team_id; delete from public.household_members where team_id=target_team_id; delete from public.athletes where team_id=target_team_id;
  delete from public.family_contacts where team_id=target_team_id; delete from public.family_guardians where team_id=target_team_id; delete from public.family_swimmers where team_id=target_team_id;
  delete from public.attendance_records where team_id=target_team_id; delete from public.self_checkin_tokens where team_id=target_team_id; delete from public.group_memberships where team_id=target_team_id;
  delete from public.practice_exceptions where team_id=target_team_id; delete from public.practice_sessions where team_id=target_team_id; delete from public.practice_schedules where team_id=target_team_id;
  delete from public.swim_groups where team_id=target_team_id; delete from public.swimmers where team_id=target_team_id; delete from public.families where team_id=target_team_id;
  delete from public.parent_registration_requests where team_id=target_team_id; delete from public.platform_support_sessions where team_id=target_team_id;
  delete from public.mock_checkout_sessions where team_id=target_team_id; delete from public.audit_logs where team_id=target_team_id;
  if include_account_access then delete from public.memberships where team_id=target_team_id; delete from public.households where team_id=target_team_id;
    delete from public.team_member_module_permissions where team_id=target_team_id; delete from public.team_module_entitlements where team_id=target_team_id;
    delete from public.team_registration_settings where team_id=target_team_id; delete from public.team_settings where team_id=target_team_id; delete from public.team_memberships where team_id=target_team_id; end if;
end $$;
revoke all on function public.clear_team_records(uuid,boolean) from public,anon,authenticated;
