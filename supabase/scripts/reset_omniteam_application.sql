-- DESTRUCTIVE: reset only the OmniTeam application objects.
-- This preserves Supabase Auth users and Supabase schemas outside public.
--
-- Before running:
-- 1. Take a verified database backup.
-- 2. Delete OmniSite files through the Supabase Storage API if the preflight
--    reports objects in the omnisite-assets bucket.
-- 3. Replace the confirmation value below exactly.
-- 4. Run this entire file once in the intended SQL Editor project.
-- 5. Generate and run .manual-deploy/omniteam_fresh_baseline.sql afterward.

begin;

do $reset_preflight$
declare
  expected_confirmation constant text := 'RESET OMNITEAM APPLICATION';
  supplied_confirmation constant text := 'REPLACE_WITH_RESET_OMNITEAM_APPLICATION';
begin
  if supplied_confirmation <> expected_confirmation then
    raise exception 'Reset refused: edit supplied_confirmation to the exact confirmation phrase';
  end if;
  if exists (
    select 1 from storage.objects where bucket_id = 'omnisite-assets'
  ) then
    raise exception 'Reset refused: delete objects from storage bucket omnisite-assets through the Storage API first';
  end if;
end;
$reset_preflight$;

-- Remove policies that are outside public tables before dropping the application.
drop policy if exists "omnisite team uploads" on storage.objects;
drop policy if exists "omnisite team edits objects" on storage.objects;
drop policy if exists "omnisite team deletes objects" on storage.objects;
-- Keep the empty bucket row. Supabase protects direct deletes from storage
-- tables; the migrations use ON CONFLICT for this bucket and restore its policy.

-- Drop repository-owned functions, including overloaded signatures, without
-- touching unrelated public functions.
do $drop_functions$
declare
  function_name text;
  function_signature text;
begin
  for function_name in
    select unnest(array[
      'archive_team_account', 'begin_mock_checkout', 'can_access_team_module',
      'can_assign_team_access', 'can_manage_omnisite', 'can_view_omnisite',
      'can_write_site_catalog', 'clear_team_before_delete', 'clear_team_records',
      'complete_mock_checkout', 'configure_team_registration',
      'create_platform_omnisite_team', 'create_team_site', 'delete_team_and_data',
      'get_public_site', 'handle_new_auth_user', 'has_team_module',
      'is_active_team_member', 'is_family_guardian', 'is_platform_owner',
      'is_platform_supporting_team', 'is_public_omnisite', 'is_swimmer_guardian',
      'is_verified_user', 'list_platform_team_modules', 'list_platform_team_overview',
      'list_platform_teams', 'omnisite_immutable_team_id', 'os_actor_manage',
      'os_assert_assets', 'os_asset_operation', 'os_clear_limits', 'os_domain_operation',
      'os_draft', 'os_immutable_publication', 'os_paths', 'os_public_media_path',
      'os_public_snapshot', 'os_safe_link', 'os_safe_slug', 'os_stale_assets',
      'os_supported_snapshot', 'os_take_limit', 'os_valid_snapshot',
      'os_valid_template', 'os_validate_content', 'platform_set_team_module',
      'platform_set_team_plan', 'platform_set_team_status', 'preview_test_project_reset',
      'public_site_primary', 'publish_site_revision', 'publish_team_site',
      'purge_all_test_project_data', 'purge_test_project_data', 'purge_test_team_data',
      'reject_team_id_change', 'reset_all_test_client_data', 'resolve_site_hostname',
      'review_parent_registration', 'rollback_team_site', 'save_site_draft',
      'save_site_template', 'set_site_enabled', 'set_team_member_module_permission',
      'set_team_member_role', 'start_platform_support_session'
    ])
  loop
    for function_signature in
      select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = function_name
    loop
      execute format('drop function if exists %s cascade', function_signature);
    end loop;
  end loop;
end;
$drop_functions$;

-- CASCADE removes repository-owned policies, triggers, indexes, and constraints
-- attached to these tables. It does not drop auth.users or storage schemas.
drop table if exists public.site_action_limits cascade;
drop table if exists public.site_domains cascade;
drop table if exists public.site_catalog_audit cascade;
drop table if exists public.site_catalog_writers cascade;
drop table if exists public.site_publications cascade;
drop table if exists public.site_assets cascade;
drop table if exists public.site_pages cascade;
drop table if exists public.team_sites cascade;
drop table if exists public.site_templates cascade;
drop table if exists public.team_subscriptions cascade;
drop table if exists public.mock_checkout_sessions cascade;
drop table if exists public.subscription_plans cascade;
drop table if exists public.project_maintenance_settings cascade;
drop table if exists public.family_contacts cascade;
drop table if exists public.platform_support_sessions cascade;
drop table if exists public.platform_owners cascade;
drop table if exists public.parent_registration_requests cascade;
drop table if exists public.team_registration_settings cascade;
drop table if exists public.family_guardians cascade;
drop table if exists public.family_swimmers cascade;
drop table if exists public.family_contacts cascade;
drop table if exists public.team_member_module_permissions cascade;
drop table if exists public.team_module_entitlements cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.team_settings cascade;
drop table if exists public.self_checkin_tokens cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.practice_exceptions cascade;
drop table if exists public.practice_sessions cascade;
drop table if exists public.practice_schedules cascade;
drop table if exists public.group_memberships cascade;
drop table if exists public.swim_groups cascade;
drop table if exists public.swimmers cascade;
drop table if exists public.families cascade;
drop table if exists public.team_memberships cascade;
drop table if exists public.profiles cascade;
drop table if exists public.teams cascade;
drop table if exists public.organizations cascade;

drop type if exists public.checkin_method cascade;
drop type if exists public.attendance_status cascade;
drop type if exists public.practice_status cascade;
drop type if exists public.membership_role cascade;
drop type if exists public.record_status cascade;

-- Remove only this repository's migration records. Keep unrelated history rows.
delete from supabase_migrations.schema_migrations
where version in (
  '202609110001', '202609140001', '202609140002', '202609140003',
  '202609140004', '202609140005', '202609140006', '202609140007',
  '202609140008', '202609140009', '202609150001', '202609150002',
  '202609150003', '202609220001', '202609220002', '202609220003',
  '202609220004', '202609220005'
);

commit;

-- After this reset, generate and run the fresh baseline. Do not run this file
-- twice without rebuilding the application schema first.
