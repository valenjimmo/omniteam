-- Manual trusted operation; never part of migration deployment.
-- Replace the placeholder with the intended existing platform owner's Auth UUID.
-- Review the target identity before executing. No team OWNER grant is sufficient.
begin;
do $$
declare target_user uuid := 'REPLACE_WITH_PLATFORM_OWNER_AUTH_UUID';
begin
 if not exists(select 1 from public.platform_owners where user_id=target_user) then
  raise exception 'Target must already be an OmniTeam platform owner';
 end if;
 insert into public.site_catalog_writers(user_id) values(target_user) on conflict do nothing;
end;
$$;
commit;
