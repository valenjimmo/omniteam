begin;
create function pg_temp.expect(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$ begin begin execute command; exception when others then return; end; raise exception 'FAILED: operation unexpectedly succeeded: %',command; end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('81000000-0000-4000-8000-000000000001','owner-a@example.test',now(),'{}'),('81000000-0000-4000-8000-000000000002','owner-b@example.test',now(),'{}'),
 ('81000000-0000-4000-8000-000000000003','parent-a@example.test',now(),'{}'),('81000000-0000-4000-8000-000000000004','parent-stale@example.test',now(),'{}'),
 ('81000000-0000-4000-8000-000000000005','parent-reject@example.test',now(),'{}'),
 ('81000000-0000-4000-8000-000000000006','existing-owner@example.test',now(),'{}'),('81000000-0000-4000-8000-000000000007','existing-admin@example.test',now(),'{}'),
 ('81000000-0000-4000-8000-000000000008','existing-coach@example.test',now(),'{}'),('81000000-0000-4000-8000-000000000009','inactive-coach@example.test',now(),'{}');
insert into public.organizations(id,name) values ('82000000-0000-4000-8000-000000000001','Family A'),('82000000-0000-4000-8000-000000000002','Family B');
insert into public.teams(id,organization_id,name,slug,city,state,timezone,owner_phone) values
 ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','Family A','family-a','Seattle','WA','UTC','2065550100'),
 ('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','Family B','family-b','Portland','OR','UTC','5035550100');
insert into public.team_memberships(team_id,user_id,role) values
 ('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','OWNER'),('83000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002','OWNER'),
 ('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000006','OWNER'),('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000007','ADMIN'),
 ('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000008','COACH'),('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000009','COACH');
update public.team_memberships set status='INACTIVE' where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000009';
insert into public.team_module_entitlements(team_id,module_key) values ('83000000-0000-4000-8000-000000000001','omniathlete'),('83000000-0000-4000-8000-000000000002','omniathlete');
insert into public.swim_groups(id,team_id,name) values
 ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','A Active'),('84000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001','A Stale'),
 ('84000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000002','B Foreign');
insert into public.team_registration_settings(team_id,slug,registration_open,registration_configuration)
values('83000000-0000-4000-8000-000000000001','family-a-registration',true,'{"version":1,"programs":[{"id":"learn","name":"Learn"}],"questions":[{"id":"family-text","label":"Family text","required":true,"type":"short_text","appliesTo":"family"},{"id":"family-choice","label":"Family choice","required":true,"type":"single_select","options":["Blue","Gold"],"appliesTo":"family"},{"id":"swimmer-yes","label":"Swimmer yes/no","required":true,"type":"yes_no","appliesTo":"swimmer"},{"id":"swimmer-days","label":"Swimmer days","required":true,"type":"multi_select","options":["Monday","Wednesday"],"appliesTo":"swimmer"},{"id":"swimmer-date","label":"Swimmer date","required":true,"type":"date","appliesTo":"swimmer"}],"agreements":[]}')
on conflict(team_id) do update set slug=excluded.slug,registration_open=true,registration_configuration=excluded.registration_configuration;
select pg_temp.expect(not public.registration_configuration_valid('{"programs":{},"questions":[],"agreements":[]}'::jsonb),'scalar program collection is invalid');
select pg_temp.expect(not public.registration_configuration_valid('{"programs":[],"questions":[{"id":"level","label":"Level","required":true,"type":"single_select","appliesTo":"family"}],"agreements":[]}'::jsonb),'select question requires options');
select pg_temp.expect(not public.registration_configuration_valid('{"programs":[],"questions":[{"id":"level","label":"Level","required":true,"type":"single_select","appliesTo":"family","options":["Blue","Blue"]}],"agreements":[]}'::jsonb),'duplicate options are invalid');
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true); set local role authenticated;
select pg_temp.denied($q$select public.configure_team_registration('83000000-0000-4000-8000-000000000001','family-a-registration',true,'{"programs":{},"questions":[],"agreements":[]}'::jsonb)$q$);
select pg_temp.denied($q$select public.configure_team_registration('83000000-0000-4000-8000-000000000001','family-a-registration',true,'{"programs":[],"questions":[{"id":"same","label":"One","required":true,"type":"short_text","appliesTo":"family"},{"id":"same","label":"Two","required":false,"type":"short_text","appliesTo":"family"}],"agreements":[]}'::jsonb)$q$);
select public.configure_team_registration('83000000-0000-4000-8000-000000000001','family-a-registration',true,(select registration_configuration from public.team_registration_settings where team_id='83000000-0000-4000-8000-000000000001'));
reset role;
select pg_temp.expect((select registration_open and jsonb_array_length(registration_configuration->'programs')=1 from public.team_registration_settings where team_id='83000000-0000-4000-8000-000000000001'),'rejected configuration leaves prior settings unchanged');
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true); set local role authenticated;
select pg_temp.denied($q$select public.configure_team_registration('83000000-0000-4000-8000-000000000001','family-a-registration',false,'{"programs":[],"questions":[],"agreements":[]}'::jsonb)$q$);
reset role;
create temp table family_cases(label text primary key,payload jsonb,request_id uuid); grant all on family_cases to authenticated;
insert into family_cases(label,payload) values ('approved',jsonb_build_object('version',1,
 'family',jsonb_build_object('familyName','Approved Family','address1','100 Swim Lane','city','Seattle','state','WA','postalCode','98101','primaryPhone','206-555-0100','billingEmail','parent-a@example.test'),
 'guardians',jsonb_build_array(jsonb_build_object('firstName','Pat','lastName','Parent','relationship','Parent','email','parent-a@example.test','mobilePhone','206-555-0100','alternatePhone','')),
 'emergencyContacts',jsonb_build_array(jsonb_build_object('firstName','Em','lastName','Contact','relationship','Aunt','phone','206-555-0199','alternatePhone','')),
 'swimmers',jsonb_build_array(jsonb_build_object('firstName','Sam','lastName','Swimmer','preferredName','S','birthDate','2014-05-06','legalSex','Female','requestedProgramId','learn','requestedGroupId','84000000-0000-4000-8000-000000000001','usaSwimmingId','','answers',jsonb_build_object('swimmer-yes',true,'swimmer-days',jsonb_build_array('Monday'),'swimmer-date','2024-02-29'))),
 'familyAnswers',jsonb_build_object('family-text','Ready','family-choice','Blue'),'agreements','{}'::jsonb));
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000003',true); set local role authenticated;
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{family,billingEmail}','"bad"'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{swimmers,0,legalSex}','"bad"'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{swimmers,0,requestedGroupId}','"84000000-0000-4000-8000-000000000003"'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{swimmers,0,birthDate}','"2023-02-29"'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',(select payload #- '{familyAnswers,family-text}' from family_cases where label='approved'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',(select payload #- '{swimmers,0,answers,swimmer-yes}' from family_cases where label='approved'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{familyAnswers,family-choice}','"Foreign"'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{swimmers,0,answers,swimmer-days}','["Friday"]'))$q$);
select pg_temp.denied($q$select public.submit_family_registration('83000000-0000-4000-8000-000000000001',jsonb_set((select payload from family_cases where label='approved'),'{swimmers,0,requestedProgramId}','"foreign"'))$q$);
update family_cases set request_id=public.submit_family_registration('83000000-0000-4000-8000-000000000001',payload) where label='approved'; reset role;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true); set local role authenticated;
select pg_temp.denied($q$select public.review_parent_registration('83000000-0000-4000-8000-000000000002',(select request_id from family_cases where label='approved'),true)$q$); reset role;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true); set local role authenticated;
select public.review_parent_registration('83000000-0000-4000-8000-000000000001',(select request_id from family_cases where label='approved'),true); reset role;
select pg_temp.expect((select count(*)=1 from public.group_memberships where group_id='84000000-0000-4000-8000-000000000001'),'same-team group assigned');
select pg_temp.expect((select primary_email='parent-a@example.test' from public.families where name='Approved Family'),'primary email persisted');
select pg_temp.expect((select count(*)=2 from public.family_contacts where team_id='83000000-0000-4000-8000-000000000001'),'optional guardian and emergency contacts persisted');
select pg_temp.expect((select registration_payload#>>'{family,address1}'='100 Swim Lane' from public.parent_registration_requests where id=(select request_id from family_cases where label='approved')),'address snapshot retained');
select pg_temp.expect((select role='PARENT' and status='ACTIVE' from public.team_memberships where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000003'),'new membership receives parent role');

insert into family_cases(label,payload)
select role_name, jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{family,familyName}',to_jsonb(role_name||' Family')),'{family,billingEmail}',to_jsonb(email)),'{guardians,0,email}',to_jsonb(email)),'{swimmers,0,requestedGroupId}','""')
from family_cases cross join (values
 ('existing-owner','existing-owner@example.test'),('existing-admin','existing-admin@example.test'),
 ('existing-coach','existing-coach@example.test'),('inactive-coach','inactive-coach@example.test')) roles(role_name,email)
where label='approved';
do $$ declare item record; begin
  for item in select * from (values
    ('existing-owner','81000000-0000-4000-8000-000000000006'::uuid),('existing-admin','81000000-0000-4000-8000-000000000007'::uuid),
    ('existing-coach','81000000-0000-4000-8000-000000000008'::uuid),('inactive-coach','81000000-0000-4000-8000-000000000009'::uuid)
  ) cases(label,user_id) loop
    perform set_config('request.jwt.claim.sub',item.user_id::text,true); set local role authenticated;
    update family_cases set request_id=public.submit_family_registration('83000000-0000-4000-8000-000000000001',payload) where label=item.label;
    reset role; perform set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true); set local role authenticated;
    perform public.review_parent_registration('83000000-0000-4000-8000-000000000001',(select request_id from family_cases where label=item.label),true);
    reset role;
  end loop;
end $$;
select pg_temp.expect((select role='OWNER' and status='ACTIVE' from public.team_memberships where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000006'),'existing owner role preserved');
select pg_temp.expect((select role='ADMIN' and status='ACTIVE' from public.team_memberships where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000007'),'existing admin role preserved');
select pg_temp.expect((select role='COACH' and status='ACTIVE' from public.team_memberships where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000008'),'existing coach role preserved');
select pg_temp.expect((select role='COACH' and status='ACTIVE' from public.team_memberships where team_id='83000000-0000-4000-8000-000000000001' and user_id='81000000-0000-4000-8000-000000000009'),'inactive coach reactivated without role change');
select pg_temp.expect((select count(*)=4 from public.family_guardians fg join public.team_memberships tm on tm.team_id=fg.team_id and tm.id=fg.membership_id where fg.team_id='83000000-0000-4000-8000-000000000001' and tm.user_id in ('81000000-0000-4000-8000-000000000006','81000000-0000-4000-8000-000000000007','81000000-0000-4000-8000-000000000008','81000000-0000-4000-8000-000000000009')),'staff memberships receive independent guardian links');

insert into family_cases(label,payload) select 'stale',jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{family,familyName}','"Stale Family"'),'{family,billingEmail}','"parent-stale@example.test"'),'{guardians,0,email}','"parent-stale@example.test"'),'{swimmers,0,requestedGroupId}','"84000000-0000-4000-8000-000000000002"') from family_cases where label='approved';
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000004',true); set local role authenticated;
update family_cases set request_id=public.submit_family_registration('83000000-0000-4000-8000-000000000001',payload) where label='stale'; reset role;
update public.swim_groups set status='INACTIVE' where id='84000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true); set local role authenticated;
select public.review_parent_registration('83000000-0000-4000-8000-000000000001',(select request_id from family_cases where label='stale'),true); reset role;
select pg_temp.expect(not exists(select 1 from public.group_memberships where group_id='84000000-0000-4000-8000-000000000002'),'stale group skipped');

insert into family_cases(label,payload) select 'reject',jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{family,familyName}','"Rejected Family"'),'{family,billingEmail}','"parent-reject@example.test"'),'{guardians,0,email}','"parent-reject@example.test"'),'{swimmers,0,requestedGroupId}','""') from family_cases where label='approved';
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000005',true); set local role authenticated;
update family_cases set request_id=public.submit_family_registration('83000000-0000-4000-8000-000000000001',payload) where label='reject'; reset role;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true); set local role authenticated;
select public.review_parent_registration('83000000-0000-4000-8000-000000000001',(select request_id from family_cases where label='reject'),false); reset role;
select pg_temp.expect(not exists(select 1 from public.team_memberships where user_id='81000000-0000-4000-8000-000000000005'),'rejection grants no access');
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000003',true); set local role authenticated;
select pg_temp.expect((select count(*)=1 from public.families),'parent sees only linked family'); select pg_temp.expect((select count(*)=1 from public.swimmers),'parent sees only linked swimmer'); reset role;
rollback;
