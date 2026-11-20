-- Rollback-only setup projection coverage: persisted state, entitlements,
-- multi-team selection, active-group semantics, and cross-team denial.
begin;
create function pg_temp.expect(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$ begin begin execute command; exception when others then return; end; raise exception 'FAILED: operation unexpectedly succeeded: %',command; end $$;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('71000000-0000-4000-8000-000000000001','setup-both@example.test',now(),'{}'),
 ('71000000-0000-4000-8000-000000000002','setup-a@example.test',now(),'{}');
insert into public.organizations(id,name) values
 ('72000000-0000-4000-8000-000000000001','Setup A'),('72000000-0000-4000-8000-000000000002','Setup B');
insert into public.teams(id,organization_id,name,slug,city,state,timezone,owner_phone,club_code,primary_facility,season_type,logo_url) values
 ('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','Setup A','setup-a','Seattle','WA','UTC','2065550100','A1','Pool A','year_round','https://example.test/a.png'),
 ('73000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','Setup B','setup-b','Not provided','Not provided','UTC','0000000000',null,null,null,null);
insert into public.team_memberships(team_id,user_id,role,status) values
 ('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','OWNER','ACTIVE'),
 ('73000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','OWNER','ACTIVE'),
 ('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','COACH','ACTIVE');
insert into public.team_module_entitlements(team_id,module_key) values
 ('73000000-0000-4000-8000-000000000001','omniathlete');
insert into public.swim_groups(team_id,name,status) values
 ('73000000-0000-4000-8000-000000000001','Inactive old group','INACTIVE'),
 ('73000000-0000-4000-8000-000000000001','First active group','ACTIVE');

select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.expect((public.get_team_setup_checklist('73000000-0000-4000-8000-000000000001')->>'identity')::boolean,'combined identity is complete');
select pg_temp.expect((public.get_team_setup_checklist('73000000-0000-4000-8000-000000000001')->>'location')::boolean,'combined location is complete');
select pg_temp.expect((public.get_team_setup_checklist('73000000-0000-4000-8000-000000000001')->>'practiceGroup')::boolean,'active swim_groups row is first practice group');
select pg_temp.expect((public.get_team_setup_checklist('73000000-0000-4000-8000-000000000001')->>'practiceGroupAvailable')::boolean,'group is available with OmniAthlete');
select pg_temp.expect(not (public.get_team_setup_checklist('73000000-0000-4000-8000-000000000002')->>'location')::boolean,'second team has independent incomplete state');
select pg_temp.expect(not (public.get_team_setup_checklist('73000000-0000-4000-8000-000000000002')->>'practiceGroupAvailable')::boolean,'group is unavailable without OmniAthlete');
reset role;

select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.denied($q$select public.get_team_setup_checklist('73000000-0000-4000-8000-000000000002')$q$);
reset role;
rollback;
