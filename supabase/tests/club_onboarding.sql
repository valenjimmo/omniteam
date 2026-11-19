-- Rollback-only checkout integration coverage for validation, ownership,
-- atomic provisioning, retry safety, and final slug uniqueness.
begin;
create function pg_temp.expect(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$ begin begin execute command; exception when others then return; end; raise exception 'FAILED: operation unexpectedly succeeded: %',command; end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('61000000-0000-4000-8000-000000000001','checkout-a@example.test',now(),'{"first_name":"A","last_name":"Owner"}'),
 ('61000000-0000-4000-8000-000000000002','checkout-b@example.test',now(),'{"first_name":"B","last_name":"Owner"}');
create temp table checkout_ids(label text primary key,id uuid,team_id uuid);
grant select,insert,update on checkout_ids to authenticated;
set local role authenticated;
select pg_temp.denied($q$select public.begin_mock_checkout('website','Anonymous','anonymous',null,'X','Y','UTC','2065550100',null)$q$);
reset role;

select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.update_own_profile_names('Updated','Owner');
select pg_temp.denied($q$select public.begin_mock_checkout('team_manager','Bad','bad',null,'X','Y','UTC','2065550100',null)$q$);
select pg_temp.denied($q$select public.begin_mock_checkout('website','Bad','Bad_slug',null,'X','Y','UTC','2065550100',null)$q$);
select pg_temp.denied($q$select public.begin_mock_checkout('website','Bad code','bad-code','abc','X','Y','UTC','2065550100',null)$q$);
select pg_temp.denied($q$select public.begin_mock_checkout('website','Bad city','bad-city',null,' ','Y','UTC','2065550100',null)$q$);
select pg_temp.denied($q$select public.begin_mock_checkout('website','Bad zone','bad-zone',null,'X','Y','Not/AZone','2065550100',null)$q$);
select pg_temp.denied($q$select public.begin_mock_checkout('website','Bad phone','bad-phone',null,'X','Y','UTC','555-CALL-NOW',null)$q$);
insert into checkout_ids(label,id) values
 ('a',public.begin_mock_checkout('complete','Checkout A','checkout-a','A1','Seattle','WA','America/Los_Angeles','+1 206 555 0100','Central Pool')),
 ('race-a',public.begin_mock_checkout('website','Race A','race-club',null,'Seattle','WA','UTC','2065550101',null)),
 ('rollback',public.begin_mock_checkout('management','Rollback','rollback-club',null,'Seattle','WA','UTC','2065550102',null)),
 ('expired',public.begin_mock_checkout('website','Expired','expired-club',null,'Seattle','WA','UTC','2065550103',null));
reset role;
update public.mock_checkout_sessions set expires_at=now()-interval '1 second' where id=(select id from checkout_ids where label='expired');

select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.denied($q$select public.complete_mock_checkout((select id from checkout_ids where label='a'))$q$);
insert into checkout_ids(label,id) values
 ('race-b',public.begin_mock_checkout('website','Race B','race-club',null,'Portland','OR','UTC','5035550100',null));
reset role;

select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.denied($q$select public.complete_mock_checkout((select id from checkout_ids where label='expired'))$q$);
update checkout_ids set team_id=public.complete_mock_checkout(id) where label='a';
select pg_temp.expect(public.complete_mock_checkout((select id from checkout_ids where label='a'))=(select team_id from checkout_ids where label='a'),'retry returns the original team');
update checkout_ids set team_id=public.complete_mock_checkout(id) where label='race-a';
reset role;

select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.denied($q$select public.complete_mock_checkout((select id from checkout_ids where label='race-b'))$q$);
reset role;

update public.subscription_plans set active=false where public_key='management';
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.denied($q$select public.complete_mock_checkout((select id from checkout_ids where label='rollback'))$q$);
reset role;

select pg_temp.expect(not exists(select 1 from public.teams where slug='rollback-club'),'failed completion rolls back organization and team');
select pg_temp.expect((select count(*)=1 from public.team_memberships where team_id=(select team_id from checkout_ids where label='a') and user_id='61000000-0000-4000-8000-000000000001' and role='OWNER' and status='ACTIVE'),'exactly one authenticated owner membership');
select pg_temp.expect((select count(*)=1 from public.team_subscriptions where team_id=(select team_id from checkout_ids where label='a') and plan_id='website_manager'),'normalized subscription created');
select pg_temp.expect((select count(*)=6 from public.team_module_entitlements where team_id=(select team_id from checkout_ids where label='a')),'bundle entitlements provisioned server-side');
select pg_temp.expect((select count(*)=1 from public.audit_logs where team_id=(select team_id from checkout_ids where label='a') and action='MOCK_SUBSCRIPTION_STARTED'),'audit event created atomically');
select pg_temp.expect((select first_name='Updated' from public.profiles where id='61000000-0000-4000-8000-000000000001'),'owner edits update only the authenticated profile');
select pg_temp.expect((select name='Checkout A' and slug='checkout-a' and city='Seattle' and owner_phone='+1 206 555 0100' from public.teams where id=(select team_id from checkout_ids where label='a')),'canonical profile persisted');
rollback;
