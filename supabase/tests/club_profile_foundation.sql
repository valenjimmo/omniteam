-- Run after all migrations in a disposable/local database. Entire test rolls back.
begin;
create function pg_temp.expect(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  begin execute command; exception when others then return; end;
  raise exception 'FAILED: operation unexpectedly succeeded: %',command;
end $$;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('51000000-0000-4000-8000-000000000001','club-a@example.test',now(),'{"first_name":"A","last_name":"Owner"}'),
 ('51000000-0000-4000-8000-000000000002','club-b@example.test',now(),'{"first_name":"B","last_name":"Owner"}'),
 ('51000000-0000-4000-8000-000000000003','club-coach@example.test',now(),'{"first_name":"A","last_name":"Coach"}');
insert into public.organizations(id,name) values
 ('52000000-0000-4000-8000-000000000001','Club profile org A'),
 ('52000000-0000-4000-8000-000000000002','Club profile org B');
insert into public.teams(id,organization_id,name,slug,city,state,timezone,owner_phone,club_code,season_type) values
 ('53000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','Club A','club-a','Seattle','WA','America/Los_Angeles','+1 (206) 555-0100','A12','year_round'),
 ('53000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000002','Club B','club-b','Portland','OR','America/Los_Angeles','503-555-0100',null,'seasonal');
insert into public.team_memberships(id,team_id,user_id,role,status) values
 ('54000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','OWNER','ACTIVE'),
 ('54000000-0000-4000-8000-000000000002','53000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000002','OWNER','ACTIVE'),
 ('54000000-0000-4000-8000-000000000003','53000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000003','COACH','ACTIVE');

select pg_temp.expect(public.internal_plan_id('website')='omnisite_starter','website maps to active OmniSite plan');
select pg_temp.expect(public.internal_plan_id('management')='team_manager','management maps to active manager plan');
select pg_temp.expect(public.internal_plan_id('complete')='website_manager','complete maps to active bundle plan');
select pg_temp.denied($q$select public.internal_plan_id('team_manager')$q$);
update public.subscription_plans set active=false where id='team_manager';
select pg_temp.denied($q$select public.internal_plan_id('management')$q$);
update public.subscription_plans set active=true where id='team_manager';

select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Bad slug','Bad_Slug','X','Y','UTC','2065550100')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Duplicate','club-a','X','Y','UTC','2065550100')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,club_code,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Bad code','bad-code','abc','X','Y','UTC','2065550100')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone,season_type) values('52000000-0000-4000-8000-000000000001','Bad season','bad-season','X','Y','UTC','2065550100','winter')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Bad city','bad-city',' ','Y','UTC','2065550100')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Bad zone','bad-zone','X','Y','Not/AZone','2065550100')$q$);
select pg_temp.denied($q$insert into public.teams(organization_id,name,slug,city,state,timezone,owner_phone) values('52000000-0000-4000-8000-000000000001','Bad phone','bad-phone','X','Y','UTC','555-CALL-NOW')$q$);

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.expect((select count(*)=1 and bool_and(id='53000000-0000-4000-8000-000000000001') from public.teams),'owner sees only own team profile');
update public.teams set city='Direct bypass' where id='53000000-0000-4000-8000-000000000001';
select pg_temp.expect((select city='Seattle' from public.teams where id='53000000-0000-4000-8000-000000000001'),'direct table update is blocked by RLS');
select public.update_club_profile('53000000-0000-4000-8000-000000000001','Club A Updated','club-a-updated','A99','Tacoma','WA','America/Los_Angeles','+1 253 555 0100','Central Pool','summer','https://example.test/logo.png');
select pg_temp.expect((select city='Tacoma' and primary_facility='Central Pool' from public.teams where id='53000000-0000-4000-8000-000000000001'),'owner updates own canonical profile through trusted RPC');
select pg_temp.denied($q$select public.update_club_profile('53000000-0000-4000-8000-000000000002','Stolen','stolen-club',null,'X','Y','UTC','2065550100',null,null,null)$q$);
reset role;

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.denied($q$select public.update_club_profile('53000000-0000-4000-8000-000000000001','Coach edit','coach-edit',null,'X','Y','UTC','2065550100',null,null,null)$q$);
reset role;

select pg_temp.expect(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='owner_id'),'owner authority is not duplicated');
rollback;
