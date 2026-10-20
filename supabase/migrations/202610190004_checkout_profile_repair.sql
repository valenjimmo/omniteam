-- Auth users intentionally survive team hard deletion and application resets.
-- Repair the caller's global profile during onboarding when an older cleanup or
-- reset removed it; never create or modify a profile for another identity.
create or replace function public.begin_mock_checkout(
  selected_plan_id text, requested_team_name text, requested_timezone text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare checkout_id uuid;
begin
  if auth.uid() is null or not public.is_verified_user() then
    raise exception 'A verified account is required';
  end if;

  insert into public.profiles(id, first_name, last_name, email)
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''), 'Account'),
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''), 'Owner'),
    coalesce(u.email, '')
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Account profile could not be restored';
  end if;
  if length(trim(requested_team_name)) not between 2 and 120
    or length(trim(requested_timezone)) not between 1 and 80 then
    raise exception 'Invalid team name or timezone';
  end if;
  if not exists (select 1 from public.subscription_plans where id = selected_plan_id and active) then
    raise exception 'Subscription plan unavailable';
  end if;

  insert into public.mock_checkout_sessions(user_id, plan_id, team_name, timezone)
    values(auth.uid(), selected_plan_id, trim(requested_team_name), trim(requested_timezone))
    returning id into checkout_id;
  return checkout_id;
end;
$$;

revoke all on function public.begin_mock_checkout(text, text, text) from public, anon;
grant execute on function public.begin_mock_checkout(text, text, text) to authenticated;
