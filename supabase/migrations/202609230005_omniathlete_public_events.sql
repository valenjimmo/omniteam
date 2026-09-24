-- OmniAthlete Phase 1: public upcoming events projection for OmniSite.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  team_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  starts_at timestamptz not null,
  location text check (location is null or length(location) <= 240),
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  unique (team_id, id),
  foreign key (org_id, team_id) references public.teams(organization_id, id)
);

create index events_team_starts_at_idx on public.events(team_id, starts_at);
create index events_public_org_starts_at_idx
  on public.events(org_id, starts_at)
  where visibility = 'public';

alter table public.events enable row level security;

create policy "public reads published events"
  on public.events for select
  using (
    visibility = 'public'
    and starts_at >= now()
    and exists (
      select 1
      from public.organizations o
      join public.teams t on t.organization_id = o.id
      where o.id = events.org_id
        and t.id = events.team_id
        and o.status = 'ACTIVE'
        and t.status = 'ACTIVE'
    )
  );

create policy "active members read team events"
  on public.events for select
  using (public.is_active_omniathlete_member(team_id));

create trigger events_team_id_immutable
  before update on public.events
  for each row execute function public.reject_team_id_change();

create function public.get_public_upcoming_events()
returns table (
  id uuid,
  org_id uuid,
  org_slug text,
  title text,
  starts_at timestamptz,
  location text,
  visibility text
)
language sql
security definer
stable
set search_path = public
as $$
select
  e.id,
  e.org_id,
  o.slug as org_slug,
  e.title,
  e.starts_at,
  e.location,
  e.visibility
from public.events e
join public.organizations o on o.id = e.org_id
where e.visibility = 'public'
  and e.starts_at >= now()
  and o.slug is not null
  and o.status = 'ACTIVE'
  and exists (
    select 1 from public.teams t
    where t.id = e.team_id
      and t.organization_id = e.org_id
      and t.status = 'ACTIVE'
  );
$$;

revoke all on function public.get_public_upcoming_events() from public;
grant execute on function public.get_public_upcoming_events() to anon, authenticated;

create view public.vw_public_upcoming_events
with (security_invoker = true)
as select * from public.get_public_upcoming_events();

revoke all on public.events from public, anon, authenticated;
revoke all on public.vw_public_upcoming_events from public;
grant select on public.events to authenticated;
grant select on public.vw_public_upcoming_events to anon, authenticated;
