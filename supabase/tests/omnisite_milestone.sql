-- Run after all migrations in a disposable/local Supabase database as postgres.
-- Entire test rolls back. The PGlite runner uses an explicit pg_jsonschema shim.
begin;
create function pg_temp.expect(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
 begin execute command; exception when others then return; end;
 raise exception 'FAILED: operation unexpectedly succeeded: %',command;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','os-a@example.test',now()),
 ('10000000-0000-4000-8000-000000000002','os-b@example.test',now()),
 ('10000000-0000-4000-8000-000000000003','os-view@example.test',now()),
 ('10000000-0000-4000-8000-000000000004','os-platform@example.test',now());
insert into public.organizations(id,name) values('20000000-0000-4000-8000-000000000001','OmniSite test');
insert into public.teams(id,organization_id,name,is_test_team) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Team A',true),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Team B',true);
insert into public.team_memberships(id,team_id,user_id,role) values
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','OWNER'),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','OWNER'),
 ('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','COACH');
insert into public.team_member_module_permissions(team_id,membership_id,module_key,access_level) values('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003','omnisite','VIEW');
insert into public.team_module_entitlements(team_id,module_key) values('30000000-0000-4000-8000-000000000001','omnisite'),('30000000-0000-4000-8000-000000000002','omnisite');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.create_team_site('30000000-0000-4000-8000-000000000001',(select id from public.site_templates where status='PUBLISHED' limit 1),'os-team-a','Team A');
select public.create_team_site('30000000-0000-4000-8000-000000000001',(select id from public.site_templates where status='PUBLISHED' limit 1),'os-team-a','Team A');
select pg_temp.expect((select count(*)=1 from public.team_sites),'idempotent site creation');
select pg_temp.expect((select count(*)=3 from public.site_pages),'atomic starter pages');
select pg_temp.expect(public.get_public_site('os-team-a') is null,'draft not public');
select pg_temp.denied($q$update public.team_sites set published_version=99$q$);
select pg_temp.denied($q$insert into public.site_pages(team_id,site_id,slug,title) select team_id,id,'bad','Bad' from public.team_sites$q$);
select public.publish_site_revision(team_id,id,draft_revision,0) from public.team_sites;
select pg_temp.expect(public.get_public_site('os-team-a')->>'siteName'='Team A','publication available');
select pg_temp.denied($q$select public.publish_site_revision(team_id,id,draft_revision,0) from public.team_sites$q$);
reset role;
-- Build and save a coherent new draft, then verify stale revisions fail.
create temp table os_test_draft as select team_id,id,public.os_draft(team_id,id) v from public.team_sites where slug='os-team-a';
select pg_temp.expect((select public.os_valid_snapshot(jsonb_set(v,'{pages,0,sections}',$json$[
 {"type":"richText","heading":"Story","blocks":[{"type":"paragraph","children":[{"text":"Safe <script> text","marks":["bold"],"href":"/contact"}]}]},
 {"type":"newsList","heading":"News","items":[{"title":"Update","summary":"Public news","publishedDate":"2026-09-22","href":"https://example.org/news"}]},
 {"type":"eventsList","heading":"Events","items":[{"title":"Open house","summary":"Public event","date":"2026-10-01","time":"18:00","location":"Pool","href":"/contact"}]}
]$json$::jsonb)) from os_test_draft),'v3 structured content passes real JSON schema');
select pg_temp.expect(not public.os_safe_link('javascript:alert(1)'),'SQL rejects hostile links');
grant select on os_test_draft to authenticated;
set local role authenticated;
select public.save_site_draft(team_id,id,1,jsonb_set(v,'{siteName}','"Updated A"')) from os_test_draft;
select pg_temp.denied($q$select public.save_site_draft(team_id,id,1,v) from os_test_draft$q$);
select pg_temp.expect(public.get_public_site('os-team-a')->>'siteName'='Team A','draft edits do not alter publication');
select public.publish_site_revision(team_id,id,2,1) from os_test_draft;
select public.publish_site_revision(team_id,id,2,2,1) from os_test_draft;
select pg_temp.expect(public.get_public_site('os-team-a')->>'siteName'='Team A','rollback copied earlier snapshot');
select pg_temp.expect((select count(*)=3 from public.site_publications),'rollback retains history');
select pg_temp.denied($q$update public.site_publications set snapshot='{}'$q$);
select pg_temp.denied($q$delete from public.site_publications$q$);
-- Owner B cannot see or mutate A.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.create_team_site('30000000-0000-4000-8000-000000000002',(select id from public.site_templates where status='PUBLISHED' limit 1),'os-team-b','Team B');
select pg_temp.expect((select count(*)=1 and bool_and(slug='os-team-b') from public.team_sites),'RLS site isolation');
select pg_temp.expect((select count(*)=0 from public.site_publications),'RLS publication isolation');
select pg_temp.expect((select count(*)=0 from public.site_assets),'RLS media isolation');
select pg_temp.denied($q$select public.save_site_draft(team_id,id,2,v) from os_test_draft$q$);
select pg_temp.denied($q$select public.publish_site_revision(team_id,id,2,3) from os_test_draft$q$);
select pg_temp.denied($q$select public.publish_site_revision(team_id,id,2,3,1) from os_test_draft$q$);
select pg_temp.denied($q$select public.set_site_enabled(team_id,id,false) from os_test_draft$q$);
select pg_temp.denied($q$select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,id,'claim',null,'www.stolen.org','www.stolen.org') from os_test_draft$q$);
select pg_temp.denied($q$select public.os_asset_operation('10000000-0000-4000-8000-000000000001',team_id,id,'reserve',gen_random_uuid(),100,64,64) from os_test_draft$q$);
select pg_temp.denied($q$insert into storage.objects(bucket_id,name) values('omnisite-assets','30000000-0000-4000-8000-000000000001/spoof.webp')$q$);
reset role;
-- Composite FKs and immutable tenant keys also protect privileged writes.
select pg_temp.denied($q$insert into public.site_pages(team_id,site_id,slug,title) select '30000000-0000-4000-8000-000000000002',id,'cross','Cross' from os_test_draft$q$);
select pg_temp.denied($q$insert into public.site_assets(team_id,site_id,object_path,mime_type,bytes) select '30000000-0000-4000-8000-000000000002',id,'30000000-0000-4000-8000-000000000002/x.webp','image/webp',100 from os_test_draft$q$);
select pg_temp.denied($q$insert into public.site_domains(team_id,site_id,hostname,display_hostname) select '30000000-0000-4000-8000-000000000002',id,'www.cross.org','www.cross.org' from os_test_draft$q$);
select pg_temp.denied($q$update public.site_pages set team_id='30000000-0000-4000-8000-000000000002' where team_id='30000000-0000-4000-8000-000000000001'$q$);
select pg_temp.denied($q$update public.site_publications set snapshot='{}'$q$);
-- View grants allow reads, never mutations.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.expect((select count(*)=1 from public.team_sites),'VIEW reads drafts');
select pg_temp.denied($q$select public.save_site_draft(team_id,id,2,v) from os_test_draft$q$);
select pg_temp.denied($q$select public.publish_site_revision(team_id,id,2,3) from os_test_draft$q$);
select pg_temp.denied($q$select public.set_site_enabled(team_id,id,false) from os_test_draft$q$);
reset role;
-- Missing, expired entitlement, inactive membership, archived team all deny writes.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
update public.team_module_entitlements set starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' where team_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.expect(not public.can_manage_omnisite('30000000-0000-4000-8000-000000000001'),'expired entitlement denied');
select pg_temp.denied($q$select public.publish_site_revision(team_id,id,2,3) from os_test_draft$q$);
select pg_temp.expect(public.get_public_site('os-team-a') is null,'expired entitlement not public');
reset role;
update public.team_module_entitlements set ends_at=null where team_id='30000000-0000-4000-8000-000000000001';
update public.team_memberships set status='INACTIVE' where id='40000000-0000-4000-8000-000000000001';
select pg_temp.expect(not public.can_manage_omnisite('30000000-0000-4000-8000-000000000001'),'inactive member denied');
update public.team_memberships set status='ACTIVE' where id='40000000-0000-4000-8000-000000000001';
update public.teams set status='INACTIVE' where id='30000000-0000-4000-8000-000000000001';
select pg_temp.expect(not public.can_manage_omnisite('30000000-0000-4000-8000-000000000001'),'archived team denied');
select pg_temp.expect(public.get_public_site('os-team-a') is null,'archived publication unavailable');
update public.teams set status='ACTIVE' where id='30000000-0000-4000-8000-000000000001';
-- Domains: service-only verified state transitions, uniqueness and retained detachment.
select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,id,'claim',null,'www.os-club.org','www.os-club.org') from os_test_draft;
select pg_temp.expect(public.resolve_site_hostname('www.os-club.org') is null,'unverified hostname not served');
select pg_temp.denied($q$select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'activate',id) from public.site_domains$q$);
select pg_temp.denied($q$select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'verify',id,null,null,'wrong',true) from public.site_domains$q$);
select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'verify',id,null,null,verification_token,false) from public.site_domains;
select pg_temp.expect(public.resolve_site_hostname('www.os-club.org') is null,'verified but provider-pending hostname not served');
select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'activate',id,null,null,null,true) from public.site_domains;
select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'primary',id) from public.site_domains;
select pg_temp.expect(public.resolve_site_hostname('www.os-club.org')='os-team-a','verified active hostname resolves exact team');
select pg_temp.expect(public.public_site_primary('os-team-a')='www.os-club.org','primary is exact verified hostname');
select pg_temp.expect(public.resolve_site_hostname('www.os-club.org.evil.org') is null,'suffix cannot spoof hostname');
select pg_temp.denied($q$select public.os_domain_operation('10000000-0000-4000-8000-000000000002',team_id,id,'claim',null,'www.os-club.org','www.os-club.org') from public.team_sites where slug='os-team-b'$q$);
select public.os_domain_operation('10000000-0000-4000-8000-000000000001',team_id,site_id,'detach',id) from public.site_domains;
select pg_temp.expect(public.resolve_site_hostname('www.os-club.org') is null,'detached hostname unavailable');
select pg_temp.denied($q$select public.os_domain_operation('10000000-0000-4000-8000-000000000002',team_id,id,'claim',null,'www.os-club.org','www.os-club.org') from public.team_sites where slug='os-team-b'$q$);
-- Media reservation and ownership. No direct public object policy.
select public.os_asset_operation('10000000-0000-4000-8000-000000000001',team_id,id,'reserve','50000000-0000-4000-8000-000000000001',100,64,64) from os_test_draft;
select public.os_asset_operation('10000000-0000-4000-8000-000000000001',team_id,id,'ready','50000000-0000-4000-8000-000000000001') from os_test_draft;
select public.os_asset_operation('10000000-0000-4000-8000-000000000001',team_id,id,'reserve','50000000-0000-4000-8000-000000000002',100,64,64) from os_test_draft;
update public.site_assets set created_at=now()-interval '2 hours' where id='50000000-0000-4000-8000-000000000002';
select pg_temp.expect((select count(*)=1 from public.os_stale_assets('10000000-0000-4000-8000-000000000001',(select team_id from os_test_draft),(select id from os_test_draft))),'stale pending media is reconciled');
select pg_temp.expect((select not public from storage.buckets where id='omnisite-assets'),'bucket private');
select pg_temp.denied($q$select public.os_asset_operation('10000000-0000-4000-8000-000000000002',team_id,id,'delete','50000000-0000-4000-8000-000000000001') from os_test_draft$q$);
-- Platform catalog requires explicit grant, and support mode cannot write.
insert into public.platform_owners(user_id) values('10000000-0000-4000-8000-000000000004');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select pg_temp.expect(public.is_platform_owner_identity() and not public.is_platform_owner(),'password-only owner is denied privileged access');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect(public.is_platform_owner(),'aal2 owner receives privileged access');
set local role authenticated;
select pg_temp.denied($q$select public.record_security_event('test_event','INFO','{}'::jsonb)$q$);
select pg_temp.denied($q$select * from public.security_events$q$);
reset role;
select pg_temp.expect(not public.can_write_site_catalog(),'owner alone is not catalog writer');
insert into public.site_catalog_writers(user_id) values('10000000-0000-4000-8000-000000000004');
select pg_temp.expect(public.can_write_site_catalog(),'explicit catalog writer');
select public.start_platform_support_session('30000000-0000-4000-8000-000000000001','Investigate website rendering');
select pg_temp.expect(not public.can_write_site_catalog(),'support cannot write catalog');
update public.platform_support_sessions set expires_at=now()-interval '1 second',started_at=now()-interval '1 hour' where platform_user_id='10000000-0000-4000-8000-000000000004';
update public.site_templates set name='Changed shared template';
select pg_temp.expect(public.get_public_site('os-team-a')->>'siteName'='Team A','template updates cannot mutate publications');
-- Anonymous cannot enumerate drafts, domain tokens, assets or publications.
set local role anon;
select pg_temp.expect((select count(*)=0 from public.team_sites),'anon cannot read sites');
select pg_temp.expect((select count(*)=0 from public.site_pages),'anon cannot read drafts');
select pg_temp.expect((select count(*)=0 from public.site_assets),'anon cannot read media metadata');
select pg_temp.expect((select count(*)=0 from public.site_domains),'anon cannot read domain tokens');
select pg_temp.expect((select count(*)=0 from public.site_publications),'anon cannot enumerate history');
select pg_temp.expect((select count(*)=0 from storage.objects),'anon cannot read draft objects');
reset role;
-- Purge includes domains, media metadata, and limits; preserves shared catalog/Auth users.
select public.clear_team_records('30000000-0000-4000-8000-000000000001',false);
select pg_temp.expect((select count(*)=0 from public.site_domains where team_id='30000000-0000-4000-8000-000000000001'),'purge domains');
select pg_temp.expect((select count(*)=0 from public.site_assets where team_id='30000000-0000-4000-8000-000000000001'),'purge assets');
select pg_temp.expect((select count(*)>=3 from public.site_templates),'purge preserves templates');
select pg_temp.expect((select count(*)=4 from auth.users where email like 'os-%@example.test'),'purge preserves users');
rollback;
