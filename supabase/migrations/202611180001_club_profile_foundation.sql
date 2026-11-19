-- Canonical club profile foundation. The team is the tenant/security boundary;
-- organizations remain provisioning containers in the current one-to-one model.

alter table public.teams
  add column slug text,
  add column club_code text,
  add column city text,
  add column state text,
  add column owner_phone text,
  add column primary_facility text,
  add column season_type text;

create or replace function public.club_slug_base(value text)
returns text language sql immutable parallel safe set search_path = public as $$
  select left(
    trim(both '-' from regexp_replace(lower(coalesce(value, 'club')), '[^a-z0-9]+', '-', 'g')),
    31
  )
$$;

update public.teams
set slug = coalesce(nullif(public.club_slug_base(name), ''), 'club') || '-' || left(id::text, 8),
    city = 'Not provided',
    state = 'Not provided',
    owner_phone = '0000000000'
where slug is null;

alter table public.teams
  alter column slug set not null,
  alter column city set not null,
  alter column state set not null,
  alter column owner_phone set not null,
  add constraint teams_name_nonempty check (length(trim(name)) between 2 and 120),
  add constraint teams_slug_format check (
    length(slug) between 3 and 40
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  add constraint teams_club_code_format check (
    club_code is null or club_code ~ '^[A-Z0-9]{2,5}$'
  ),
  add constraint teams_city_nonempty check (length(trim(city)) between 1 and 120),
  add constraint teams_state_nonempty check (length(trim(state)) between 1 and 120),
  add constraint teams_owner_phone_format check (
    owner_phone = trim(owner_phone)
    and owner_phone ~ '^\+?[0-9][0-9 ()-]{7,23}[0-9]$'
    and length(regexp_replace(owner_phone, '[^0-9]', '', 'g')) between 10 and 15
  ),
  add constraint teams_primary_facility_nonempty check (
    primary_facility is null or length(trim(primary_facility)) between 1 and 160
  ),
  add constraint teams_season_type_allowed check (
    season_type is null or season_type in ('year_round', 'seasonal', 'summer')
  );

create unique index teams_slug_key on public.teams(slug);

create or replace function public.prepare_club_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  new.name := trim(new.name);
  new.slug := trim(new.slug);
  if new.slug is null then
    new.slug := coalesce(nullif(public.club_slug_base(new.name), ''), 'club')
      || '-' || left(new.id::text, 8);
  end if;
  new.club_code := nullif(trim(new.club_code), '');
  new.city := coalesce(trim(new.city), 'Not provided');
  new.state := coalesce(trim(new.state), 'Not provided');
  new.owner_phone := coalesce(trim(new.owner_phone), '0000000000');
  new.primary_facility := nullif(trim(new.primary_facility), '');
  new.season_type := nullif(trim(new.season_type), '');
  return new;
end;
$$;

create trigger teams_prepare_club_profile
before insert or update of name, slug, club_code, city, state, owner_phone, primary_facility, season_type
on public.teams for each row execute function public.prepare_club_profile();

create or replace function public.require_iana_timezone()
returns trigger language plpgsql set search_path = public, pg_catalog as $$
begin
  new.timezone := trim(new.timezone);
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception using errcode = '22023', message = 'Choose a valid timezone.';
  end if;
  return new;
end;
$$;

create trigger teams_require_iana_timezone
before insert or update of timezone on public.teams
for each row execute function public.require_iana_timezone();

-- Public package keys are an API contract; normalized subscriptions continue to
-- reference internal catalog IDs. Callers cannot activate an inactive plan.
create or replace function public.internal_plan_id(public_plan text)
returns text language plpgsql security definer stable set search_path = public as $$
declare result text;
begin
  result := case public_plan
    when 'website' then 'omnisite_starter'
    when 'management' then 'team_manager'
    when 'complete' then 'website_manager'
    else null
  end;
  if result is null or not exists (
    select 1 from public.subscription_plans where id = result and active
  ) then
    raise exception using errcode = '22023', message = 'Choose a valid plan.';
  end if;
  return result;
end;
$$;
revoke all on function public.internal_plan_id(text) from public, anon, authenticated;

create or replace function public.update_club_profile(
  target_team_id uuid,
  requested_name text,
  requested_slug text,
  requested_club_code text,
  requested_city text,
  requested_state text,
  requested_timezone text,
  requested_owner_phone text,
  requested_primary_facility text,
  requested_season_type text
)
returns public.teams language plpgsql security definer set search_path = public as $$
declare result public.teams;
begin
  if not exists (
    select 1 from public.team_memberships
    where team_id = target_team_id and user_id = auth.uid()
      and role = 'OWNER' and status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Active team owner access required';
  end if;

  update public.teams set
    name = requested_name,
    slug = requested_slug,
    club_code = requested_club_code,
    city = requested_city,
    state = requested_state,
    timezone = requested_timezone,
    owner_phone = requested_owner_phone,
    primary_facility = requested_primary_facility,
    season_type = requested_season_type,
    updated_at = now()
  where id = target_team_id
  returning * into result;
  return result;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Club slug is already in use.';
end;
$$;
revoke all on function public.update_club_profile(uuid,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.update_club_profile(uuid,text,text,text,text,text,text,text,text,text) to authenticated;

comment on table public.teams is
  'Tenant boundary and canonical club profile. Ownership is derived from active OWNER team_memberships.';
comment on column public.teams.name is 'Canonical club name; organization.name is a provisioning-container label.';
comment on column public.teams.owner_phone is
  'Team-scoped owner contact snapshot; 10-15 digits with optional leading + and display separators.';
comment on column public.teams.primary_facility is
  'Optional temporary free-text facility label pending a dedicated team-owned facility model.';
