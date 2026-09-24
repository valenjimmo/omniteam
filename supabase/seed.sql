-- Local OmniAthlete demo. All demo passwords are: demo-password
insert into public.organizations(id,name,slug,joining_open) values('10000000-0000-0000-0000-000000000001','Harbor Sharks','harbor-sharks',true);
insert into public.teams(id,organization_id,name) values('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Harbor Sharks');
insert into public.team_settings(team_id) values('10000000-0000-0000-0000-000000000002');
insert into public.team_module_entitlements(team_id,module_key) values('10000000-0000-0000-0000-000000000002','omniathlete');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000001','authenticated','authenticated','alex.morgan@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Alex","last_name":"Morgan"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000002','authenticated','authenticated','jamie.chen@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Jamie","last_name":"Chen"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000003','authenticated','authenticated','sam.rivera@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Sam","last_name":"Rivera"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000004','authenticated','authenticated','coach.lee@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Taylor","last_name":"Lee"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000005','authenticated','authenticated','coach.patel@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Devon","last_name":"Patel"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000006','authenticated','authenticated','pending.brooks@example.test',crypt('demo-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Jordan","last_name":"Brooks"}',now(),now(),'','','','');
insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select id,id,email,jsonb_build_object('sub',id::text,'email',email),'email',now(),now(),now() from auth.users where id in
('11000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000003','11000000-0000-0000-0000-000000000004','11000000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000006');

insert into public.households(id,organization_id,team_id,name) values
('12000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Morgan Family'),
('12000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Chen Family'),
('12000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Rivera Family');
insert into public.memberships(organization_id,team_id,profile_id,household_id,role) values
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','family'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','family'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000003','12000000-0000-0000-0000-000000000003','family'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000004',null,'team_admin'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000005',null,'coach');
insert into public.household_members(organization_id,team_id,household_id,profile_id,first_name,last_name,email) values
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Alex','Morgan','alex.morgan@example.test'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','Jamie','Chen','jamie.chen@example.test'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000003','11000000-0000-0000-0000-000000000003','Sam','Rivera','sam.rivera@example.test');
insert into public.athletes(organization_id,team_id,household_id,first_name,last_name,date_of_birth) values
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000001','Maya','Morgan','2013-04-16'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000001','Theo','Morgan','2016-09-03'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','Lena','Chen','2012-12-20'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','Max','Chen','2015-07-11'),
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000003','Sofia','Rivera','2014-02-08');
insert into public.join_requests(organization_id,team_id,profile_id,household_name,athlete_names,note) values
('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000006','Brooks Family','["Ellis Brooks"]','We just moved to Harbor and would love to join.');
