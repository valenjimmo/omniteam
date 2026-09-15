-- ONE-TIME TRUSTED PROVISIONING. Run only in the intended Supabase project.
-- 1. Create and confirm your user under Supabase Dashboard > Authentication > Users.
-- 2. Replace the ONE placeholder below with that exact email, review, and run this whole file.
begin;

create temporary table platform_owner_provisioning_input (
  email text not null
) on commit drop;

-- EDIT ONLY THE EMAIL ON THIS LINE:
insert into platform_owner_provisioning_input(email)
values ('REPLACE_WITH_YOUR_EMAIL');

do $$
declare
  owner_email text;
  owner_id uuid;
  matching_users integer;
begin
  select email into owner_email from platform_owner_provisioning_input;
  if owner_email = 'REPLACE_WITH_YOUR_EMAIL' then
    raise exception 'Replace REPLACE_WITH_YOUR_EMAIL on the marked line before running this script';
  end if;
  select count(*) into matching_users
    from auth.users where lower(email) = lower(owner_email);
  if matching_users <> 1 then
    raise exception 'Expected exactly one Auth user for %, found %', owner_email, matching_users;
  end if;
  select id into owner_id
    from auth.users where lower(email) = lower(owner_email);
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
join platform_owner_provisioning_input i on lower(i.email) = lower(u.email);

commit;
