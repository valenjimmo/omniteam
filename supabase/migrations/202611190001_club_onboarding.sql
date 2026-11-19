-- Six-stage club onboarding. Public plan keys are accepted at the trust
-- boundary; internal plan IDs remain normalized implementation details.

alter table public.subscription_plans add column public_key text;
update public.subscription_plans set public_key = case id
  when 'omnisite_starter' then 'website'
  when 'team_manager' then 'management'
  when 'website_manager' then 'complete'
end;
alter table public.subscription_plans
  add constraint subscription_plans_public_key_allowed check (
    public_key is null or public_key in ('website', 'management', 'complete')
  );
create unique index subscription_plans_public_key_key
  on public.subscription_plans(public_key) where public_key is not null;

alter table public.mock_checkout_sessions
  add column public_plan_key text,
  add column club_slug text,
  add column club_code text,
  add column city text,
  add column state text,
  add column owner_phone text,
  add column primary_facility text,
  add constraint mock_checkout_public_plan_allowed check (
    public_plan_key is null or public_plan_key in ('website', 'management', 'complete')
  ),
  add constraint mock_checkout_slug_format check (
    club_slug is null or (length(club_slug) between 3 and 40 and club_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
  ),
  add constraint mock_checkout_club_code_format check (
    club_code is null or club_code ~ '^[A-Z0-9]{2,5}$'
  ),
  add constraint mock_checkout_city_nonempty check (city is null or length(trim(city)) between 1 and 120),
  add constraint mock_checkout_state_nonempty check (state is null or length(trim(state)) between 1 and 120),
  add constraint mock_checkout_owner_phone_format check (
    owner_phone is null or (
      owner_phone = trim(owner_phone)
      and owner_phone ~ '^\+?[0-9][0-9 ()-]{7,23}[0-9]$'
      and length(regexp_replace(owner_phone, '[^0-9]', '', 'g')) between 10 and 15
    )
  ),
  add constraint mock_checkout_facility_nonempty check (
    primary_facility is null or length(trim(primary_facility)) between 1 and 160
  );

-- Legacy pending sessions lack the required club profile and cannot safely be
-- completed under the new contract. They remain visible to their owner as a
-- cancelled audit record and can be restarted.
update public.mock_checkout_sessions
set status = 'CANCELLED'
where status = 'PENDING';

drop function if exists public.begin_mock_checkout(text, text, text);
create function public.begin_mock_checkout(
  requested_public_plan text,
  requested_team_name text,
  requested_slug text,
  requested_club_code text,
  requested_city text,
  requested_state text,
  requested_timezone text,
  requested_owner_phone text,
  requested_primary_facility text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  checkout_id uuid;
  selected_internal_plan text;
  clean_name text := trim(requested_team_name);
  clean_slug text := trim(requested_slug);
  clean_code text := nullif(trim(requested_club_code), '');
  clean_city text := trim(requested_city);
  clean_state text := trim(requested_state);
  clean_timezone text := trim(requested_timezone);
  clean_phone text := trim(requested_owner_phone);
  clean_facility text := nullif(trim(requested_primary_facility), '');
begin
  if auth.uid() is null or not public.is_verified_user() then
    raise exception using errcode = '42501', message = 'A verified account is required';
  end if;

  insert into public.profiles(id, first_name, last_name, email)
  select u.id,
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''), 'Account'),
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''), 'Owner'),
    coalesce(u.email, '')
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Account profile could not be restored';
  end if;

  if length(clean_name) not between 2 and 120 then raise exception using errcode='22023', message='Enter your club name.'; end if;
  if length(clean_slug) not between 3 and 40 or clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception using errcode='22023', message='Use 3-40 lowercase letters, numbers, or hyphens.'; end if;
  if clean_code is not null and clean_code !~ '^[A-Z0-9]{2,5}$' then raise exception using errcode='22023', message='Use 2-5 uppercase letters or numbers.'; end if;
  if clean_city is null or clean_city = '' then raise exception using errcode='22023', message='Enter a city.'; end if;
  if clean_state is null or clean_state = '' then raise exception using errcode='22023', message='Enter a state.'; end if;
  if not exists(select 1 from pg_timezone_names where name=clean_timezone) then raise exception using errcode='22023', message='Choose a valid timezone.'; end if;
  if clean_phone !~ '^\+?[0-9][0-9 ()-]{7,23}[0-9]$'
    or length(regexp_replace(clean_phone, '[^0-9]', '', 'g')) not between 10 and 15
    then raise exception using errcode='22023', message='Enter a valid phone number.';
  end if;
  if clean_facility is not null and length(clean_facility)>160 then raise exception using errcode='22023', message='Use 160 characters or fewer.'; end if;
  if exists(select 1 from public.teams where slug=clean_slug) then raise exception using errcode='23505', message='Club slug is already in use.'; end if;

  selected_internal_plan := public.internal_plan_id(requested_public_plan);
  insert into public.mock_checkout_sessions(
    user_id, plan_id, public_plan_key, team_name, club_slug, club_code,
    city, state, timezone, owner_phone, primary_facility
  ) values (
    auth.uid(), selected_internal_plan, requested_public_plan, clean_name,
    clean_slug, clean_code, clean_city, clean_state, clean_timezone,
    clean_phone, clean_facility
  ) returning id into checkout_id;
  return checkout_id;
end;
$$;
revoke all on function public.begin_mock_checkout(text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.begin_mock_checkout(text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.complete_mock_checkout(target_checkout_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  checkout_row public.mock_checkout_sessions%rowtype;
  plan_row public.subscription_plans%rowtype;
  organization_id uuid;
  new_team_id uuid;
  module_key text;
  mark_as_test boolean;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='A verified account is required'; end if;
  select * into checkout_row from public.mock_checkout_sessions
    where id=target_checkout_id and user_id=auth.uid() for update;
  if checkout_row.id is null then raise exception using errcode='42501', message='Checkout is unavailable or expired'; end if;
  if checkout_row.status='COMPLETED' and checkout_row.team_id is not null then return checkout_row.team_id; end if;
  if checkout_row.status<>'PENDING' or checkout_row.expires_at<=now() then raise exception using errcode='22023', message='Checkout is unavailable or expired'; end if;
  if checkout_row.public_plan_key is null or checkout_row.club_slug is null
    or checkout_row.city is null or checkout_row.state is null or checkout_row.owner_phone is null
    then raise exception using errcode='22023', message='Checkout is missing required club details';
  end if;

  select * into plan_row from public.subscription_plans
  where id=public.internal_plan_id(checkout_row.public_plan_key)
    and id=checkout_row.plan_id and active;
  if plan_row.id is null then raise exception using errcode='22023', message='Choose a valid plan.'; end if;

  select coalesce((select test_project from public.project_maintenance_settings where singleton),false) into mark_as_test;
  insert into public.organizations(name) values(checkout_row.team_name) returning id into organization_id;
  insert into public.teams(
    organization_id,name,slug,club_code,city,state,timezone,owner_phone,primary_facility,is_test_team
  ) values (
    organization_id,checkout_row.team_name,checkout_row.club_slug,checkout_row.club_code,
    checkout_row.city,checkout_row.state,checkout_row.timezone,checkout_row.owner_phone,
    checkout_row.primary_facility,mark_as_test
  ) returning id into new_team_id;
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
      jsonb_build_object('publicPlan',checkout_row.public_plan_key,'planId',plan_row.id,'billingMode','MOCK'));
  return new_team_id;
exception when unique_violation then
  raise exception using errcode='23505', message='Club slug is already in use.';
end;
$$;
revoke all on function public.complete_mock_checkout(uuid) from public, anon;
grant execute on function public.complete_mock_checkout(uuid) to authenticated;

comment on column public.subscription_plans.public_key is 'Stable public checkout contract; internal id remains the subscription FK.';
comment on column public.mock_checkout_sessions.club_slug is 'Unprovisioned canonical team slug reserved only when completion commits.';

create function public.update_own_profile_names(requested_first_name text, requested_last_name text)
returns void language plpgsql security definer set search_path = public as $$
declare clean_first text:=trim(requested_first_name); clean_last text:=trim(requested_last_name);
begin
  if auth.uid() is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if length(clean_first) not between 1 and 80 or length(clean_last) not between 1 and 80
    then raise exception using errcode='22023', message='Enter the owner''s first and last name.';
  end if;
  update public.profiles set first_name=clean_first,last_name=clean_last,updated_at=now() where id=auth.uid();
  if not found then raise exception 'Account profile is missing'; end if;
end;
$$;
revoke all on function public.update_own_profile_names(text,text) from public,anon;
grant execute on function public.update_own_profile_names(text,text) to authenticated;
