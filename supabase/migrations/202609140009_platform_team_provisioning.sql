-- Platform-owner tenant provisioning. This creates an isolated team with OmniSite only.
create or replace function public.create_platform_omnisite_team(
  requested_team_name text,
  requested_timezone text default 'America/Los_Angeles'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  new_team_id uuid;
  new_membership_id uuid;
  mark_as_test boolean;
begin
  if not public.is_platform_owner() then
    raise exception 'Platform owner access required';
  end if;
  if length(trim(requested_team_name)) not between 2 and 120 then
    raise exception 'Team name must contain 2 to 120 characters';
  end if;
  if requested_timezone is null or length(trim(requested_timezone)) not between 1 and 80 then
    raise exception 'A valid timezone is required';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Platform owner profile is missing';
  end if;

  select coalesce((select test_project from public.project_maintenance_settings where singleton), false)
    into mark_as_test;
  insert into public.organizations(name)
    values (trim(requested_team_name))
    returning id into new_organization_id;
  insert into public.teams(organization_id, name, timezone, is_test_team)
    values (new_organization_id, trim(requested_team_name), trim(requested_timezone), mark_as_test)
    returning id into new_team_id;
  insert into public.team_memberships(team_id, user_id, role, status)
    values (new_team_id, auth.uid(), 'OWNER', 'ACTIVE')
    returning id into new_membership_id;
  insert into public.team_module_entitlements(team_id, module_key)
    values (new_team_id, 'omnisite');
  insert into public.audit_logs(team_id, user_id, entity_type, entity_id, action, new_values)
    values (new_team_id, auth.uid(), 'team', new_team_id, 'PLATFORM_CREATE_TEAM',
      jsonb_build_object('name', trim(requested_team_name), 'modules', jsonb_build_array('omnisite')));

  return new_team_id;
end;
$$;
revoke all on function public.create_platform_omnisite_team(text, text) from public, anon;
grant execute on function public.create_platform_omnisite_team(text, text) to authenticated;
