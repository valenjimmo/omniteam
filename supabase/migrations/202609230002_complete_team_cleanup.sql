-- Preserve the full OmniSite cleanup added in 202609140008 while also removing
-- the completed checkout reference discovered by the staging hard-delete test.
create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from storage.objects where bucket_id='omnisite-assets'
    and name like target_team_id::text || '/%') then
    raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team';
  end if;
  delete from public.team_sites where team_id=target_team_id;
  delete from public.family_contacts where team_id = target_team_id;
  delete from public.family_guardians where team_id = target_team_id;
  delete from public.family_swimmers where team_id = target_team_id;
  delete from public.attendance_records where team_id = target_team_id;
  delete from public.self_checkin_tokens where team_id = target_team_id;
  delete from public.group_memberships where team_id = target_team_id;
  delete from public.practice_exceptions where team_id = target_team_id;
  delete from public.practice_sessions where team_id = target_team_id;
  delete from public.practice_schedules where team_id = target_team_id;
  delete from public.swim_groups where team_id = target_team_id;
  delete from public.swimmers where team_id = target_team_id;
  delete from public.families where team_id = target_team_id;
  delete from public.parent_registration_requests where team_id = target_team_id;
  delete from public.platform_support_sessions where team_id = target_team_id;
  delete from public.mock_checkout_sessions where team_id = target_team_id;
  delete from public.audit_logs where team_id = target_team_id;
  if include_account_access then
    delete from public.team_member_module_permissions where team_id = target_team_id;
    delete from public.team_module_entitlements where team_id = target_team_id;
    delete from public.team_registration_settings where team_id = target_team_id;
    delete from public.team_settings where team_id = target_team_id;
    delete from public.team_memberships where team_id = target_team_id;
  end if;
end;
$$;
revoke all on function public.clear_team_records(uuid, boolean) from public, anon, authenticated;
