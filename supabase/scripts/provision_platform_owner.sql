-- ONE-TIME TRUSTED PROVISIONING. Run only in the intended Supabase project.
-- 1. Create and confirm your user under Supabase Dashboard > Authentication > Users.
-- 2. Replace BOTH email placeholders below with that exact email, review this file, and run it.
begin;

do $$
declare
  owner_email constant text := 'REPLACE_WITH_YOUR_EMAIL';
  owner_id uuid;
  matching_users integer;
begin
  if owner_email = 'REPLACE_WITH_YOUR_EMAIL' then
    raise exception 'Replace owner_email before running this script';
  end if;
  select count(*), min(id) into matching_users, owner_id
    from auth.users where lower(email) = lower(owner_email);
  if matching_users <> 1 then
    raise exception 'Expected exactly one Auth user for %, found %', owner_email, matching_users;
  end if;
  if not exists (select 1 from public.profiles where id = owner_id) then
    raise exception 'Profile missing. Confirm migration 004 and the Auth profile trigger are installed';
  end if;
  insert into public.platform_owners(user_id) values(owner_id)
    on conflict(user_id) do nothing;
  raise notice 'Provisioned platform owner user ID: %', owner_id;
end;
$$;

select p.user_id, u.email, p.created_at
from public.platform_owners p
join auth.users u on u.id = p.user_id
where lower(u.email) = lower('REPLACE_WITH_YOUR_EMAIL');

commit;
