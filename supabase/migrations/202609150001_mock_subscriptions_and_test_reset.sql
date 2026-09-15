-- Mock subscription onboarding and guarded platform-owner test reset.
create table public.subscription_plans (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  module_keys text[] not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (module_keys <@ array['omniathlete','omnischedule','omnimeet','omnivolunteer','omniconnect','omnisite','omniinsights']::text[])
);
alter table public.subscription_plans enable row level security;
create policy "active subscription plans visible" on public.subscription_plans
  for select using (active);

insert into public.subscription_plans(id,name,description,monthly_price_cents,module_keys,display_order) values
  ('omnisite_starter','OmniSite Starter','Team website, templates, page builder, logo, and team colors.',2900,array['omnisite'],10),
  ('team_manager','OmniTeam Manager','Swimmers, schedules, volunteers, communication, and team insights.',9900,array['omniathlete','omnischedule','omnivolunteer','omniconnect','omniinsights'],20),
  ('website_manager','Website + Team Management','OmniSite plus the complete OmniTeam Manager bundle.',11900,array['omnisite','omniathlete','omnischedule','omnivolunteer','omniconnect','omniinsights'],30);

create table public.mock_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  plan_id text not null references public.subscription_plans(id),
  team_name text not null check (length(trim(team_name)) between 2 and 120),
  timezone text not null,
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETED','CANCELLED')),
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour')
);
alter table public.mock_checkout_sessions enable row level security;
create policy "users read own mock checkouts" on public.mock_checkout_sessions
  for select using (user_id = auth.uid());
-- All writes use checked functions.

create table public.team_subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null check (status in ('TRIALING','ACTIVE','PAST_DUE','CANCELLED')),
  billing_mode text not null default 'MOCK' check (billing_mode in ('MOCK','LIVE')),
  starts_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_id, id)
);
alter table public.team_subscriptions enable row level security;
create policy "team members read subscription" on public.team_subscriptions
  for select using (public.is_active_team_member(team_id));

create or replace function public.begin_mock_checkout(
  selected_plan_id text, requested_team_name text, requested_timezone text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare checkout_id uuid;
begin
  if auth.uid() is null or not public.is_verified_user()
    or not exists (select 1 from public.profiles where id=auth.uid()) then
    raise exception 'A verified account is required';
  end if;
  if length(trim(requested_team_name)) not between 2 and 120
    or length(trim(requested_timezone)) not between 1 and 80 then
    raise exception 'Invalid team name or timezone';
  end if;
  if not exists (select 1 from public.subscription_plans where id=selected_plan_id and active) then
    raise exception 'Subscription plan unavailable';
  end if;
  insert into public.mock_checkout_sessions(user_id,plan_id,team_name,timezone)
    values(auth.uid(),selected_plan_id,trim(requested_team_name),trim(requested_timezone))
    returning id into checkout_id;
  return checkout_id;
end;
$$;
revoke all on function public.begin_mock_checkout(text,text,text) from public,anon;
grant execute on function public.begin_mock_checkout(text,text,text) to authenticated;

create or replace function public.complete_mock_checkout(target_checkout_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare checkout_row public.mock_checkout_sessions%rowtype; plan_row public.subscription_plans%rowtype;
  organization_id uuid; new_team_id uuid; module_key text; mark_as_test boolean;
begin
  select * into checkout_row from public.mock_checkout_sessions
    where id=target_checkout_id and user_id=auth.uid() for update;
  if checkout_row.id is null or checkout_row.status<>'PENDING' or checkout_row.expires_at<=now() then
    raise exception 'Checkout is unavailable or expired';
  end if;
  select * into plan_row from public.subscription_plans where id=checkout_row.plan_id and active;
  if plan_row.id is null then raise exception 'Subscription plan unavailable'; end if;
  select coalesce((select test_project from public.project_maintenance_settings where singleton),false)
    into mark_as_test;
  insert into public.organizations(name) values(checkout_row.team_name) returning id into organization_id;
  insert into public.teams(organization_id,name,timezone,is_test_team)
    values(organization_id,checkout_row.team_name,checkout_row.timezone,mark_as_test) returning id into new_team_id;
  insert into public.team_memberships(team_id,user_id,role,status)
    values(new_team_id,auth.uid(),'OWNER','ACTIVE');
  foreach module_key in array plan_row.module_keys loop
    insert into public.team_module_entitlements(team_id,module_key) values(new_team_id,module_key);
  end loop;
  insert into public.team_subscriptions(team_id,plan_id,status,billing_mode,trial_ends_at)
    values(new_team_id,plan_row.id,'TRIALING','MOCK',now()+interval '30 days');
  update public.mock_checkout_sessions set status='COMPLETED',team_id=new_team_id,completed_at=now()
    where id=checkout_row.id;
  insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values)
    values(new_team_id,auth.uid(),'subscription',new_team_id,'MOCK_SUBSCRIPTION_STARTED',
      jsonb_build_object('planId',plan_row.id,'billingMode','MOCK'));
  return new_team_id;
end;
$$;
revoke all on function public.complete_mock_checkout(uuid) from public,anon;
grant execute on function public.complete_mock_checkout(uuid) to authenticated;

create or replace function public.preview_test_project_reset(expected_project_ref text)
returns table(team_count bigint, site_count bigint, asset_count bigint, non_test_team_count bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  if not exists (select 1 from public.project_maintenance_settings where singleton and test_project
    and supabase_project_ref=expected_project_ref) then
    raise exception 'This database is not marked as the matching test project';
  end if;
  return query select
    (select count(*) from public.teams),
    (select count(*) from public.team_sites),
    (select count(*) from storage.objects where bucket_id='omnisite-assets'),
    (select count(*) from public.teams where not is_test_team);
end;
$$;
revoke all on function public.preview_test_project_reset(text) from public,anon;
grant execute on function public.preview_test_project_reset(text) to authenticated;

create or replace function public.reset_all_test_client_data(expected_project_ref text, confirmation text)
returns integer language plpgsql security definer set search_path = public as $$
declare removed_count integer;
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  if confirmation is distinct from 'DELETE ALL TEST CLIENT DATA' then raise exception 'Confirmation phrase does not match'; end if;
  if not exists (select 1 from public.project_maintenance_settings where singleton and test_project
    and supabase_project_ref=expected_project_ref) then
    raise exception 'This database is not marked as the matching test project';
  end if;
  if exists (select 1 from public.teams where not is_test_team) then
    raise exception 'Every team must be marked as a test team';
  end if;
  if exists (select 1 from storage.objects where bucket_id='omnisite-assets') then
    raise exception 'Remove OmniSite files through the Storage API before resetting the database';
  end if;
  select count(*)::integer into removed_count from public.teams;
  delete from public.mock_checkout_sessions;
  delete from public.teams;
  delete from public.organizations o where not exists(select 1 from public.teams t where t.organization_id=o.id);
  return removed_count;
end;
$$;
revoke all on function public.reset_all_test_client_data(text,text) from public,anon;
grant execute on function public.reset_all_test_client_data(text,text) to authenticated;
