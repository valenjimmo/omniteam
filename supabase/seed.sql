insert into public.organizations (id, name) values ('00000000-0000-0000-0000-000000000001', 'OmniSport Systems Demo');
insert into public.teams (id, organization_id, name) values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SSF Aquatics');
insert into public.team_settings (team_id) values ('00000000-0000-0000-0000-000000000002');
insert into public.swim_groups (team_id, name) values
  ('00000000-0000-0000-0000-000000000002', 'Senior'), ('00000000-0000-0000-0000-000000000002', 'Senior Prep'),
  ('00000000-0000-0000-0000-000000000002', 'Age Group 1'), ('00000000-0000-0000-0000-000000000002', 'Age Group 2'),
  ('00000000-0000-0000-0000-000000000002', 'Novice'), ('00000000-0000-0000-0000-000000000002', 'Pre-Team'),
  ('00000000-0000-0000-0000-000000000002', 'Masters');