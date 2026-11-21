-- AUD-12: validate the configurable-registration contract at its trusted write
-- boundary. Preserve malformed legacy JSON for owner repair, but close those
-- registrations so public callers cannot consume it.

create function public.registration_configuration_valid(configuration jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  item jsonb;
  option_value jsonb;
  item_id text;
  question_type text;
  seen_ids text[];
  seen_options text[];
begin
  if jsonb_typeof(configuration) is distinct from 'object'
    or octet_length(configuration::text) > 100000 then return false; end if;

  if (configuration ? 'version' and jsonb_typeof(configuration -> 'version') <> 'number')
    or (configuration ? 'title' and (jsonb_typeof(configuration -> 'title') <> 'string' or length(trim(configuration ->> 'title')) = 0))
    or (configuration ? 'introduction' and jsonb_typeof(configuration -> 'introduction') <> 'string')
    or (configuration ? 'supportEmail' and jsonb_typeof(configuration -> 'supportEmail') <> 'string')
    or (configuration ? 'collectInsurance' and jsonb_typeof(configuration -> 'collectInsurance') <> 'boolean')
    or (configuration ? 'collectPhysician' and jsonb_typeof(configuration -> 'collectPhysician') <> 'boolean')
    or (configuration ? 'collectSchool' and jsonb_typeof(configuration -> 'collectSchool') <> 'boolean')
    or (configuration ? 'collectApparel' and jsonb_typeof(configuration -> 'collectApparel') <> 'boolean')
    or (configuration ? 'collectDemographics' and jsonb_typeof(configuration -> 'collectDemographics') <> 'boolean')
    or (configuration ? 'programs' and jsonb_typeof(configuration -> 'programs') <> 'array')
    or (configuration ? 'questions' and jsonb_typeof(configuration -> 'questions') <> 'array')
    or (configuration ? 'agreements' and jsonb_typeof(configuration -> 'agreements') <> 'array') then return false; end if;

  seen_ids := array[]::text[];
  for item in select value from jsonb_array_elements(coalesce(configuration -> 'programs', '[]'::jsonb)) loop
    item_id := trim(coalesce(item ->> 'id', ''));
    if jsonb_typeof(item) is distinct from 'object' or item_id = '' or item_id = any(seen_ids)
      or jsonb_typeof(item -> 'name') is distinct from 'string' or length(trim(item ->> 'name')) = 0
      or (item ? 'description' and jsonb_typeof(item -> 'description') <> 'string') then return false; end if;
    seen_ids := array_append(seen_ids, item_id);
  end loop;

  seen_ids := array[]::text[];
  for item in select value from jsonb_array_elements(coalesce(configuration -> 'questions', '[]'::jsonb)) loop
    item_id := trim(coalesce(item ->> 'id', ''));
    question_type := item ->> 'type';
    if jsonb_typeof(item) is distinct from 'object' or item_id = '' or item_id = any(seen_ids)
      or jsonb_typeof(item -> 'label') is distinct from 'string' or length(trim(item ->> 'label')) = 0
      or jsonb_typeof(item -> 'required') is distinct from 'boolean'
      or question_type is null or question_type not in ('short_text','long_text','yes_no','single_select','multi_select','date')
      or coalesce(item ->> 'appliesTo','') not in ('family','swimmer')
      or (item ? 'helpText' and jsonb_typeof(item -> 'helpText') <> 'string')
      or (item ? 'options' and jsonb_typeof(item -> 'options') <> 'array') then return false; end if;
    if question_type in ('single_select','multi_select') then
      if jsonb_typeof(item -> 'options') is distinct from 'array' or jsonb_array_length(item -> 'options') = 0 then return false; end if;
      seen_options := array[]::text[];
      for option_value in select value from jsonb_array_elements(item -> 'options') loop
        if jsonb_typeof(option_value) is distinct from 'string' or length(trim(option_value #>> '{}')) = 0
          or (option_value #>> '{}') = any(seen_options) then return false; end if;
        seen_options := array_append(seen_options, option_value #>> '{}');
      end loop;
    end if;
    seen_ids := array_append(seen_ids, item_id);
  end loop;

  seen_ids := array[]::text[];
  for item in select value from jsonb_array_elements(coalesce(configuration -> 'agreements', '[]'::jsonb)) loop
    item_id := trim(coalesce(item ->> 'id', ''));
    if jsonb_typeof(item) is distinct from 'object' or item_id = '' or item_id = any(seen_ids)
      or jsonb_typeof(item -> 'title') is distinct from 'string' or length(trim(item ->> 'title')) = 0
      or jsonb_typeof(item -> 'body') is distinct from 'string'
      or jsonb_typeof(item -> 'required') is distinct from 'boolean'
      or jsonb_typeof(item -> 'requireInitials') is distinct from 'boolean' then return false; end if;
    seen_ids := array_append(seen_ids, item_id);
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function public.registration_configuration_valid(jsonb) from public, anon, authenticated;

update public.team_registration_settings
set registration_open = false, updated_at = now()
where not public.registration_configuration_valid(registration_configuration);

alter table public.team_registration_settings
  add constraint team_registration_configuration_valid
  check (public.registration_configuration_valid(registration_configuration)) not valid;

create or replace function public.configure_team_registration(
  target_team_id uuid, target_slug text, open_registration boolean,
  registration_config jsonb default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_team_member(target_team_id)
    or not exists (select 1 from public.team_memberships where team_id=target_team_id and user_id=auth.uid() and role='OWNER' and status='ACTIVE') then
    raise exception 'Only the team owner can configure registration';
  end if;
  if target_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid registration slug'; end if;
  if registration_config is not null and not public.registration_configuration_valid(registration_config) then
    raise exception 'Invalid registration configuration';
  end if;
  insert into public.team_registration_settings(team_id,slug,registration_open,registration_configuration)
  values(target_team_id,target_slug,open_registration,coalesce(registration_config,'{}'::jsonb))
  on conflict(team_id) do update set slug=excluded.slug, registration_open=excluded.registration_open,
    registration_configuration=coalesce(registration_config,team_registration_settings.registration_configuration), updated_at=now();
end;
$$;

revoke all on function public.configure_team_registration(uuid,text,boolean,jsonb) from public, anon;
grant execute on function public.configure_team_registration(uuid,text,boolean,jsonb) to authenticated;

comment on function public.registration_configuration_valid(jsonb) is
  'Trusted structural contract for configurable family registration; malformed legacy rows remain stored but are closed until an owner saves a valid replacement.';
