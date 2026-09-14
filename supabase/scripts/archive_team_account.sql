-- Default account-closure action: make one team unavailable without erasing data.
-- Run through a trusted service-role process after confirming ID and exact name.
select public.archive_team_account(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'REPLACE WITH EXACT TEAM NAME'
);
