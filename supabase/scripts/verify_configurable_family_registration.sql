-- Read-only post-deployment verification for migration 202610010001.
do $verification$
declare
  missing text[] := '{}';
begin
  if to_regclass('public.family_registration_profiles') is null then
    missing := array_append(missing, 'family_registration_profiles table');
  end if;
  if to_regclass('public.swimmer_registration_profiles') is null then
    missing := array_append(missing, 'swimmer_registration_profiles table');
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='team_registration_settings'
      and column_name='registration_configuration'
  ) then missing := array_append(missing, 'team_registration_settings.registration_configuration'); end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='parent_registration_requests'
      and column_name='registration_payload'
  ) then missing := array_append(missing, 'parent_registration_requests.registration_payload'); end if;
  if to_regprocedure('public.submit_family_registration(uuid,jsonb)') is null then
    missing := array_append(missing, 'submit_family_registration RPC');
  end if;
  if to_regprocedure('public.configure_team_registration(uuid,text,boolean,jsonb)') is null then
    missing := array_append(missing, 'configure_team_registration RPC');
  end if;
  if to_regprocedure('public.review_parent_registration(uuid,boolean)') is null then
    missing := array_append(missing, 'review_parent_registration RPC');
  end if;
  if not coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.family_registration_profiles')),false) then
    missing := array_append(missing, 'family_registration_profiles RLS');
  end if;
  if not coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.swimmer_registration_profiles')),false) then
    missing := array_append(missing, 'swimmer_registration_profiles RLS');
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version='202610010001'
  ) then missing := array_append(missing, 'migration history 202610010001'); end if;
  if cardinality(missing) > 0 then
    raise exception 'Family registration verification failed: %', array_to_string(missing, ', ');
  end if;
  raise notice 'Family registration schema verification passed.';
end;
$verification$;

select version, name
from supabase_migrations.schema_migrations
where version = '202610010001';
