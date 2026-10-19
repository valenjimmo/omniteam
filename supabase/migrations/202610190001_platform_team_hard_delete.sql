-- Platform-owner permanent team deletion. Storage objects are removed by the
-- server-only API first; this transaction refuses to commit unless cleanup is complete.
create or replace function public.preview_team_hard_delete(target_team_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare target public.teams%rowtype; result jsonb='{}'::jsonb; item record; amount bigint;
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access with AAL2 required'; end if;
  select * into target from public.teams where id=target_team_id;
  if target.id is null then raise exception 'Team unavailable'; end if;
  for item in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='team_id' and c.table_name <> 'security_events'
    order by c.table_name
  loop
    execute format('select count(*) from public.%I where team_id=$1',item.table_name) into amount using target_team_id;
    if amount > 0 then result=result||jsonb_build_object(item.table_name,amount); end if;
  end loop;
  select count(*) into amount from storage.objects where bucket_id='omnisite-assets' and name like target_team_id::text||'/%';
  return jsonb_build_object('teamId',target.id,'teamName',target.name,
    'records',result,'recordCount',(select coalesce(sum(value::text::bigint),0) from jsonb_each(result)),
    'assetCount',amount,'preserves',jsonb_build_array('Auth users','shared profiles','shared OmniSite templates'));
end $$;
revoke all on function public.preview_team_hard_delete(uuid) from public,anon;
grant execute on function public.preview_team_hard_delete(uuid) to authenticated;

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
  delete from public.swimmer_registration_profiles where team_id=target_team_id; delete from public.family_registration_profiles where team_id=target_team_id;
  delete from public.family_contacts where team_id=target_team_id; delete from public.family_guardians where team_id=target_team_id; delete from public.family_swimmers where team_id=target_team_id;
  delete from public.attendance_records where team_id=target_team_id; delete from public.self_checkin_tokens where team_id=target_team_id; delete from public.group_memberships where team_id=target_team_id;
  delete from public.practice_exceptions where team_id=target_team_id; delete from public.practice_sessions where team_id=target_team_id; delete from public.practice_schedules where team_id=target_team_id;
  delete from public.swim_groups where team_id=target_team_id; delete from public.swimmers where team_id=target_team_id; delete from public.families where team_id=target_team_id;
  delete from public.parent_registration_requests where team_id=target_team_id; delete from public.platform_support_sessions where team_id=target_team_id;
  delete from public.mock_checkout_sessions where team_id=target_team_id; delete from public.audit_logs where team_id=target_team_id;
  if include_account_access then
    delete from public.memberships where team_id=target_team_id; delete from public.households where team_id=target_team_id;
    delete from public.site_action_limits where team_id=target_team_id; delete from public.team_subscriptions where team_id=target_team_id;
    delete from public.team_member_module_permissions where team_id=target_team_id; delete from public.team_module_entitlements where team_id=target_team_id;
    delete from public.team_registration_settings where team_id=target_team_id; delete from public.team_settings where team_id=target_team_id; delete from public.team_memberships where team_id=target_team_id;
  end if;
end $$;

create or replace function public.delete_team_and_data(target_team_id uuid, expected_team_name text, actor_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target public.teams%rowtype; residue record; has_residue boolean;
begin
  if actor_user_id is null or not exists(select 1 from public.platform_owners where user_id=actor_user_id) then raise exception 'Platform owner required'; end if;
  select * into target from public.teams where id=target_team_id for update;
  if target.id is null or target.name is distinct from expected_team_name then raise exception 'Refusing team deletion: ID and exact name must match'; end if;
  perform public.clear_team_records(target_team_id,true);
  for residue in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='team_id' and c.table_name <> 'security_events'
  loop
    execute format('select exists(select 1 from public.%I where team_id=$1)',residue.table_name) into has_residue using target_team_id;
    if has_residue then raise exception 'Incomplete cleanup in table %',residue.table_name; end if;
  end loop;
  insert into public.security_events(event_type,severity,actor_user_id,details)
    values('platform_team_permanently_deleted','CRITICAL',actor_user_id,jsonb_build_object('scope','team','organizationRemoved',not exists(select 1 from public.teams where organization_id=target.organization_id and id<>target.id)));
  delete from public.teams where id=target_team_id;
  delete from public.organizations where id=target.organization_id and not exists(select 1 from public.teams where organization_id=target.organization_id);
end $$;
drop function if exists public.delete_team_and_data(uuid,text);
revoke all on function public.delete_team_and_data(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.delete_team_and_data(uuid,text,uuid) to service_role;
