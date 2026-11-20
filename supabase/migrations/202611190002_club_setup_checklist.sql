-- Platform-level club logo and an authorized, team-scoped checklist projection.
-- A first practice group means an ACTIVE row in the existing swim_groups table.

alter table public.teams add column logo_url text;
alter table public.teams add constraint teams_logo_url_format check (
  logo_url is null or (length(logo_url) <= 500 and logo_url ~ '^https://')
);

drop function public.update_club_profile(uuid,text,text,text,text,text,text,text,text,text);
create function public.update_club_profile(
  target_team_id uuid, requested_name text, requested_slug text,
  requested_club_code text, requested_city text, requested_state text,
  requested_timezone text, requested_owner_phone text,
  requested_primary_facility text, requested_season_type text,
  requested_logo_url text
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
    name=trim(requested_name), slug=trim(requested_slug), club_code=nullif(trim(requested_club_code), ''),
    city=trim(requested_city), state=trim(requested_state), timezone=trim(requested_timezone),
    owner_phone=trim(requested_owner_phone), primary_facility=nullif(trim(requested_primary_facility), ''),
    season_type=nullif(trim(requested_season_type), ''), logo_url=nullif(trim(requested_logo_url), ''), updated_at=now()
  where id=target_team_id returning * into result;
  return result;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Club slug is already in use.';
end;
$$;
revoke all on function public.update_club_profile(uuid,text,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.update_club_profile(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;

create function public.get_team_setup_checklist(target_team_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare result jsonb;
begin
  if not public.is_active_team_member(target_team_id) then
    raise exception using errcode = '42501', message = 'Active team membership required';
  end if;
  select jsonb_build_object(
    'identity', length(trim(t.name)) > 0 and length(trim(t.slug)) > 0,
    'timezone', length(trim(t.timezone)) > 0,
    'ownerPhone', length(trim(t.owner_phone)) > 0 and t.owner_phone <> '0000000000',
    'location', length(trim(t.city)) > 0 and length(trim(t.state)) > 0
      and t.city <> 'Not provided' and t.state <> 'Not provided',
    'clubCode', t.club_code is not null,
    'facility', t.primary_facility is not null,
    'seasonType', t.season_type is not null,
    'logo', t.logo_url is not null,
    'practiceGroupAvailable', public.has_team_module(t.id, 'omniathlete'),
    'practiceGroup', exists(select 1 from public.swim_groups g where g.team_id=t.id and g.status='ACTIVE')
  ) into result from public.teams t where t.id=target_team_id and t.status='ACTIVE';
  if result is null then raise exception using errcode='P0002', message='Team not found'; end if;
  return result;
end;
$$;
revoke all on function public.get_team_setup_checklist(uuid) from public, anon;
grant execute on function public.get_team_setup_checklist(uuid) to authenticated;

comment on column public.teams.logo_url is 'Platform-level club logo, independent of OmniSite entitlement.';
comment on function public.get_team_setup_checklist(uuid) is 'Derived setup state for one authorized active team; setup_complete is the four required rows.';
