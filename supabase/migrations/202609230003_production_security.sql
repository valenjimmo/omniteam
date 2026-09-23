-- Production security boundary and service-role operational monitoring.
-- Platform-owner identity may be checked at aal1 only to route an owner into MFA.
create or replace function public.is_platform_owner_identity()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.platform_owners p where p.user_id = auth.uid());
$$;

revoke all on function public.is_platform_owner_identity() from public, anon;
grant execute on function public.is_platform_owner_identity() to authenticated;

create or replace function public.is_platform_owner()
returns boolean language sql security definer stable set search_path = public, auth as $$
  select public.is_platform_owner_identity()
    and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

revoke all on function public.is_platform_owner() from public, anon;
grant execute on function public.is_platform_owner() to authenticated;

create table public.security_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type ~ '^[a-z0-9_]{3,80}$'),
  severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
  actor_user_id uuid references auth.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index security_events_created_at_idx on public.security_events(created_at desc);
create index security_events_severity_created_at_idx on public.security_events(severity,created_at desc);
alter table public.security_events enable row level security;
alter table public.security_events force row level security;
revoke all on public.security_events from public, anon, authenticated;
grant select, insert on public.security_events to service_role;
grant usage, select on sequence public.security_events_id_seq to service_role;

create or replace function public.record_security_event(
  requested_event_type text,
  requested_severity text,
  requested_details jsonb default '{}'::jsonb,
  requested_actor_user_id uuid default null,
  requested_team_id uuid default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare event_id bigint;
begin
  insert into public.security_events(event_type,severity,details,actor_user_id,team_id)
  values(requested_event_type,requested_severity,coalesce(requested_details,'{}'::jsonb),requested_actor_user_id,requested_team_id)
  returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.record_security_event(text,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_security_event(text,text,jsonb,uuid,uuid) to service_role;

-- Only abandoned transitional rows are candidates. READY assets, drafts and
-- immutable publication references are never removed by reconciliation.
create or replace function public.omnisite_asset_reconciliation_candidates(
  older_than interval default interval '2 hours'
) returns table(id uuid,team_id uuid,site_id uuid,object_path text,state text,created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select a.id,a.team_id,a.site_id,a.object_path,a.state,a.created_at
  from public.site_assets a
  where a.state in ('PENDING','DELETING') and a.created_at < now()-older_than
  order by a.created_at
  limit 500;
$$;
revoke all on function public.omnisite_asset_reconciliation_candidates(interval) from public,anon,authenticated;
grant execute on function public.omnisite_asset_reconciliation_candidates(interval) to service_role;

create or replace function public.omnisite_domain_review_candidates(
  review_after interval default interval '30 days'
) returns table(id uuid,hostname text,verification_token text,last_checked_at timestamptz)
language sql security definer stable set search_path = public as $$
  select d.id,d.hostname,d.verification_token,d.last_checked_at
  from public.site_domains d
  where d.active and d.detached_at is null
    and (d.last_checked_at is null or d.last_checked_at < now()-review_after)
  order by d.last_checked_at nulls first
  limit 500;
$$;
revoke all on function public.omnisite_domain_review_candidates(interval) from public,anon,authenticated;
grant execute on function public.omnisite_domain_review_candidates(interval) to service_role;

create or replace function public.record_omnisite_domain_review(
  target_domain_id uuid, ownership_confirmed boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.site_domains
  set last_checked_at=now(),
      last_error=case when ownership_confirmed then null else 'Periodic ownership review failed' end,
      active=case when ownership_confirmed then active else false end,
      is_primary=case when ownership_confirmed then is_primary else false end,
      verification_status=case when ownership_confirmed then verification_status else 'PENDING' end,
      provider_status=case when ownership_confirmed then provider_status else 'PENDING' end,
      updated_at=now()
  where id=target_domain_id and detached_at is null;
  if not found then raise exception 'Domain unavailable'; end if;
end;
$$;
revoke all on function public.record_omnisite_domain_review(uuid,boolean) from public,anon,authenticated;
grant execute on function public.record_omnisite_domain_review(uuid,boolean) to service_role;

create or replace function public.production_security_snapshot()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'generatedAt',now(),
    'criticalEvents24h',(select count(*) from public.security_events where severity='CRITICAL' and created_at>now()-interval '24 hours'),
    'staleAssetTransitions',(select count(*) from public.site_assets where state in ('PENDING','DELETING') and created_at<now()-interval '2 hours'),
    'domainsDueReview',(select count(*) from public.site_domains where active and detached_at is null and (last_checked_at is null or last_checked_at<now()-interval '30 days')),
    'expiredSupportSessions',(select count(*) from public.platform_support_sessions where expires_at<=now() and expires_at>now()-interval '24 hours'),
    'incompatiblePublishedSites',(select count(*) from public.team_sites s join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version where not public.os_supported_snapshot(p.snapshot))
  );
$$;
revoke all on function public.production_security_snapshot() from public,anon,authenticated;
grant execute on function public.production_security_snapshot() to service_role;
