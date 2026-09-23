-- Read-only migration reconciliation audit.
-- Run this in the intended Supabase project's SQL Editor before choosing a
-- repair or fresh-start path. This script does not create, alter, or delete.

do $audit_preflight$
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Migration history is missing. Inspect the database manually; do not run the fresh baseline until this project is confirmed empty.';
  end if;
end;
$audit_preflight$;

with expected(version, name) as (
  values
    ('202609110001', 'initial_schema'),
    ('202609140001', 'omniathlete_foundation'),
    ('202609140002', 'tenant_integrity'),
    ('202609140003', 'parent_role'),
    ('202609140004', 'team_access_and_parent_registration'),
    ('202609140005', 'platform_support_and_family_contacts'),
    ('202609140006', 'team_lifecycle'),
    ('202609140007', 'team_archival'),
    ('202609140008', 'omnisite'),
    ('202609140009', 'platform_team_provisioning'),
    ('202609150001', 'mock_subscriptions_and_test_reset'),
    ('202609150002', 'platform_console'),
    ('202609150003', 'payments_platform_capability'),
    ('202609220001', 'omnisite_schema'),
    ('202609220002', 'omnisite_operations'),
    ('202609220003', 'omnisite_domains_media'),
    ('202609220004', 'omnisite_public_projection'),
    ('202609220005', 'omnisite_content_v3')
), recorded as (
  select version from supabase_migrations.schema_migrations
)
select 'missing_history' as issue, e.version, e.name
from expected e
left join recorded r using (version)
where r.version is null
union all
select 'unexpected_history', r.version, null
from recorded r
left join expected e using (version)
where e.version is null
order by version;

with expected_table(name) as (
  values
    ('organizations'), ('teams'), ('profiles'), ('team_memberships'),
    ('swimmers'), ('swim_groups'), ('group_memberships'),
    ('practice_schedules'), ('practice_sessions'), ('practice_exceptions'),
    ('attendance_records'), ('self_checkin_tokens'), ('team_settings'),
    ('audit_logs'), ('team_module_entitlements'), ('families'),
    ('family_swimmers'), ('team_member_module_permissions'),
    ('family_guardians'), ('platform_owners'), ('platform_support_sessions'),
    ('family_contacts'), ('team_registration_settings'),
    ('parent_registration_requests'), ('site_templates'), ('team_sites'),
    ('site_pages'), ('site_assets'), ('site_publications'),
    ('subscription_plans'), ('mock_checkout_sessions'), ('team_subscriptions'),
    ('project_maintenance_settings'), ('site_catalog_writers'),
    ('site_catalog_audit'), ('site_domains'), ('site_action_limits')
)
select 'missing_table' as issue, e.name, null::text as detail
from expected_table e
left join information_schema.tables t
  on t.table_schema = 'public' and t.table_name = e.name
where t.table_name is null
order by e.name;

select 'migration_history_table' as check_name,
       to_regclass('supabase_migrations.schema_migrations')::text as value
union all
select 'manual_deployment_table',
       to_regclass('supabase_migrations.manual_deployments')::text
union all
select 'pg_jsonschema_extension',
       (select extname from pg_extension where extname = 'pg_jsonschema');

-- Interpretation:
-- * Any missing_history row means the normal ordered deployment is incomplete.
-- * Any missing_table row means object presence does not match the expected
--   complete schema, regardless of whether a migration version is recorded.
-- * If history and objects disagree, do not rerun individual historical files.
--   Restore/recreate the disposable project, or perform a reviewed repair after
--   comparing the live schema with the canonical migrations.
