-- Configurable, full-fidelity OmniAthlete family registration.
-- Registration remains a request until an authorized team user approves it.

alter table public.team_registration_settings
  add column registration_configuration jsonb not null default '{
    "version":1,
    "title":"Family registration",
    "introduction":"Create your family account, add every swimmer, and review the information before submitting it to the team.",
    "collectInsurance":true,
    "collectPhysician":true,
    "collectSchool":true,
    "collectApparel":true,
    "collectDemographics":false,
    "programs":[],
    "questions":[],
    "agreements":[
      {"id":"medical-release","title":"Emergency medical authorization","body":"I authorize the team to obtain emergency medical care when a legal guardian cannot be reached.","required":true,"requireInitials":true},
      {"id":"liability-waiver","title":"Participation and liability waiver","body":"I acknowledge the risks of aquatic activities and agree to the team participation and liability terms.","required":true,"requireInitials":true},
      {"id":"code-of-conduct","title":"Codes of conduct","body":"Our family agrees to follow the team parent, guardian, and athlete codes of conduct.","required":true,"requireInitials":false},
      {"id":"media-consent","title":"Photo and media consent","body":"The team may use photographs or video in team communications and promotional material.","required":false,"requireInitials":false},
      {"id":"electronic-communications","title":"Electronic communications","body":"I consent to receive operational email and text messages according to the preferences provided.","required":true,"requireInitials":false}
    ]
  }'::jsonb,
  add constraint registration_configuration_object check (
    jsonb_typeof(registration_configuration) = 'object'
    and octet_length(registration_configuration::text) <= 100000
  );

alter table public.parent_registration_requests
  add column registration_payload jsonb,
  add column configuration_snapshot jsonb,
  add constraint registration_payload_object check (
    registration_payload is null or (
      jsonb_typeof(registration_payload) = 'object'
      and octet_length(registration_payload::text) <= 300000
    )
  );

create table public.family_registration_profiles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  family_id uuid not null,
  registration_request_id uuid not null,
  household jsonb not null check (jsonb_typeof(household) = 'object'),
  guardians jsonb not null check (jsonb_typeof(guardians) = 'array'),
  emergency_contacts jsonb not null check (jsonb_typeof(emergency_contacts) = 'array'),
  custom_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_answers) = 'object'),
  agreements jsonb not null default '{}'::jsonb check (jsonb_typeof(agreements) = 'object'),
  configuration_snapshot jsonb not null check (jsonb_typeof(configuration_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id), unique (team_id, family_id),
  foreign key (team_id, family_id) references public.families(team_id, id),
  foreign key (team_id, registration_request_id) references public.parent_registration_requests(team_id, id)
);

create table public.swimmer_registration_profiles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  swimmer_id uuid not null,
  registration_request_id uuid not null,
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id), unique (team_id, swimmer_id),
  foreign key (team_id, swimmer_id) references public.swimmers(team_id, id),
  foreign key (team_id, registration_request_id) references public.parent_registration_requests(team_id, id)
);

alter table public.family_registration_profiles enable row level security;
alter table public.swimmer_registration_profiles enable row level security;
create policy "family or athlete staff read registration profiles" on public.family_registration_profiles
  for select using (public.is_family_guardian(team_id, family_id)
    or public.can_access_team_module(team_id, 'omniathlete'));
create policy "athlete managers update registration profiles" on public.family_registration_profiles
  for update using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));
create policy "guardian or athlete staff read swimmer registration profiles" on public.swimmer_registration_profiles
  for select using (public.is_swimmer_guardian(team_id, swimmer_id)
    or public.can_access_team_module(team_id, 'omniathlete'));
create policy "athlete managers update swimmer registration profiles" on public.swimmer_registration_profiles
  for update using (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'))
  with check (public.can_access_team_module(team_id, 'omniathlete', 'MANAGE'));

create trigger family_registration_profiles_team_id_immutable before update on public.family_registration_profiles
  for each row execute function public.reject_team_id_change();
create trigger swimmer_registration_profiles_team_id_immutable before update on public.swimmer_registration_profiles
  for each row execute function public.reject_team_id_change();

create or replace function public.submit_family_registration(
  target_team_id uuid, registration_payload jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  settings_row public.team_registration_settings%rowtype;
  new_request_id uuid;
  family_data jsonb;
  swimmer_data jsonb;
  guardian_data jsonb;
  emergency_data jsonb;
  agreement_data jsonb;
begin
  if auth.uid() is null or not public.is_verified_user() then raise exception 'A verified account is required'; end if;
  select * into settings_row from public.team_registration_settings where team_id = target_team_id and registration_open;
  if settings_row.team_id is null then raise exception 'Registration is not open for this team'; end if;
  if jsonb_typeof(registration_payload) <> 'object' or octet_length(registration_payload::text) > 300000 then raise exception 'Invalid registration payload'; end if;
  family_data := registration_payload -> 'family';
  if jsonb_typeof(family_data) <> 'object'
    or length(trim(coalesce(family_data ->> 'familyName',''))) not between 1 and 100
    or length(trim(coalesce(family_data ->> 'address1',''))) not between 1 and 200
    or length(trim(coalesce(family_data ->> 'city',''))) not between 1 and 100
    or length(trim(coalesce(family_data ->> 'state',''))) not between 1 and 100
    or length(trim(coalesce(family_data ->> 'postalCode',''))) not between 1 and 30
    or length(trim(coalesce(family_data ->> 'primaryPhone',''))) not between 1 and 50
    or length(trim(coalesce(family_data ->> 'billingEmail',''))) not between 3 and 320 then
    raise exception 'Complete household information is required';
  end if;
  if jsonb_typeof(registration_payload -> 'guardians') <> 'array'
    or jsonb_array_length(registration_payload -> 'guardians') not between 1 and 10 then raise exception 'One to ten guardians are required'; end if;
  for guardian_data in select value from jsonb_array_elements(registration_payload -> 'guardians') loop
    if length(trim(coalesce(guardian_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(guardian_data ->> 'lastName',''))) not between 1 and 100
      or length(trim(coalesce(guardian_data ->> 'email',''))) not between 3 and 320
      or length(trim(coalesce(guardian_data ->> 'mobilePhone',''))) not between 1 and 50 then raise exception 'Each guardian requires a name, email, and phone'; end if;
  end loop;
  if jsonb_typeof(registration_payload -> 'emergencyContacts') <> 'array'
    or jsonb_array_length(registration_payload -> 'emergencyContacts') not between 1 and 10 then raise exception 'One to ten emergency contacts are required'; end if;
  for emergency_data in select value from jsonb_array_elements(registration_payload -> 'emergencyContacts') loop
    if length(trim(coalesce(emergency_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(emergency_data ->> 'lastName',''))) not between 1 and 100
      or length(trim(coalesce(emergency_data ->> 'phone',''))) not between 1 and 50 then raise exception 'Each emergency contact requires a name and phone'; end if;
  end loop;
  if jsonb_typeof(registration_payload -> 'swimmers') <> 'array'
    or jsonb_array_length(registration_payload -> 'swimmers') not between 1 and 10 then raise exception 'One to ten swimmers are required'; end if;
  for swimmer_data in select value from jsonb_array_elements(registration_payload -> 'swimmers') loop
    if length(trim(coalesce(swimmer_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(swimmer_data ->> 'lastName',''))) not between 1 and 100
      or coalesce(swimmer_data ->> 'birthDate','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Each swimmer requires a legal name and birth date'; end if;
  end loop;
  for agreement_data in select value from jsonb_array_elements(coalesce(settings_row.registration_configuration -> 'agreements','[]'::jsonb)) loop
    if coalesce((agreement_data ->> 'required')::boolean,false)
      and (coalesce((registration_payload #> array['agreements',agreement_data->>'id','accepted'])::text,'false') <> 'true'
        or (coalesce((agreement_data ->> 'requireInitials')::boolean,false)
          and length(trim(coalesce(registration_payload #>> array['agreements',agreement_data->>'id','initials'],''))) = 0)) then
      raise exception 'All required agreements must be accepted and signed';
    end if;
  end loop;
  insert into public.parent_registration_requests
    (team_id, user_id, family_name, swimmers, registration_payload, configuration_snapshot)
  values (target_team_id, auth.uid(), trim(family_data ->> 'familyName'),
    (select jsonb_agg(jsonb_build_object('first_name', value ->> 'firstName', 'last_name', value ->> 'lastName')) from jsonb_array_elements(registration_payload -> 'swimmers')),
    registration_payload, settings_row.registration_configuration)
  returning id into new_request_id;
  return new_request_id;
end;
$$;
grant execute on function public.submit_family_registration(uuid, jsonb) to authenticated;

drop function public.configure_team_registration(uuid, text, boolean);
create function public.configure_team_registration(
  target_team_id uuid, target_slug text, open_registration boolean,
  registration_config jsonb default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_team_member(target_team_id)
    or not exists (select 1 from public.team_memberships where team_id=target_team_id and user_id=auth.uid() and role='OWNER' and status='ACTIVE') then
    raise exception 'Only the team owner can configure registration';
  end if;
  if target_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid registration slug'; end if;
  if registration_config is not null and (jsonb_typeof(registration_config) <> 'object' or octet_length(registration_config::text) > 100000) then raise exception 'Invalid registration configuration'; end if;
  insert into public.team_registration_settings(team_id,slug,registration_open,registration_configuration)
  values(target_team_id,target_slug,open_registration,coalesce(registration_config,'{}'::jsonb))
  on conflict(team_id) do update set slug=excluded.slug, registration_open=excluded.registration_open,
    registration_configuration=coalesce(registration_config,team_registration_settings.registration_configuration), updated_at=now();
end;
$$;

create or replace function public.review_parent_registration(target_request_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  request_row public.parent_registration_requests%rowtype;
  new_family_id uuid; new_swimmer_id uuid; target_membership_id uuid;
  swimmer_item jsonb; guardian_item jsonb; emergency_item jsonb; payload jsonb;
begin
  select * into request_row from public.parent_registration_requests where id=target_request_id for update;
  if request_row.id is null or request_row.status <> 'PENDING' or not public.can_assign_team_access(request_row.team_id) then raise exception 'Registration request unavailable'; end if;
  if approve then
    payload := request_row.registration_payload;
    insert into public.families(team_id,name,primary_email,primary_phone)
    values(request_row.team_id,request_row.family_name,
      coalesce(payload #>> '{family,billingEmail}',(select email from public.profiles where id=request_row.user_id)),
      payload #>> '{family,primaryPhone}') returning id into new_family_id;
    for swimmer_item in select value from jsonb_array_elements(coalesce(payload->'swimmers',request_row.swimmers)) loop
      insert into public.swimmers(team_id,first_name,last_name,preferred_name,date_of_birth,external_id)
      values(request_row.team_id,trim(coalesce(swimmer_item->>'firstName',swimmer_item->>'first_name')),
        trim(coalesce(swimmer_item->>'lastName',swimmer_item->>'last_name')),nullif(trim(swimmer_item->>'preferredName'),''),
        nullif(swimmer_item->>'birthDate','')::date,nullif(trim(swimmer_item->>'usaSwimmingId'),'')) returning id into new_swimmer_id;
      insert into public.family_swimmers(team_id,family_id,swimmer_id) values(request_row.team_id,new_family_id,new_swimmer_id);
      if payload is not null then insert into public.swimmer_registration_profiles(team_id,swimmer_id,registration_request_id,profile) values(request_row.team_id,new_swimmer_id,request_row.id,swimmer_item); end if;
    end loop;
    insert into public.team_memberships(team_id,user_id,role) values(request_row.team_id,request_row.user_id,'PARENT')
      on conflict(team_id,user_id) do update set status='ACTIVE' returning id into target_membership_id;
    insert into public.family_guardians(team_id,family_id,membership_id) values(request_row.team_id,new_family_id,target_membership_id);
    if payload is not null then
      insert into public.family_registration_profiles(team_id,family_id,registration_request_id,household,guardians,emergency_contacts,custom_answers,agreements,configuration_snapshot)
      values(request_row.team_id,new_family_id,request_row.id,payload->'family',payload->'guardians',payload->'emergencyContacts',coalesce(payload->'familyAnswers','{}'),coalesce(payload->'agreements','{}'),coalesce(request_row.configuration_snapshot,'{}'));
      for guardian_item in select value from jsonb_array_elements(payload->'guardians') loop
        insert into public.family_contacts(team_id,family_id,name,relationship_label,email,phone)
        values(request_row.team_id,new_family_id,trim((guardian_item->>'firstName')||' '||(guardian_item->>'lastName')),guardian_item->>'relationship',guardian_item->>'email',guardian_item->>'mobilePhone');
      end loop;
      for emergency_item in select value from jsonb_array_elements(payload->'emergencyContacts') loop
        insert into public.family_contacts(team_id,family_id,name,relationship_label,phone)
        values(request_row.team_id,new_family_id,trim((emergency_item->>'firstName')||' '||(emergency_item->>'lastName')),'Emergency contact · '||coalesce(emergency_item->>'relationship',''),emergency_item->>'phone');
      end loop;
    end if;
  end if;
  update public.parent_registration_requests set status=case when approve then 'APPROVED' else 'REJECTED' end,reviewed_at=now(),reviewed_by_user_id=auth.uid() where id=target_request_id;
end;
$$;

-- Keep the central purge/hard-delete helper complete as new team-owned tables are added.
create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from storage.objects where bucket_id='omnisite-assets' and name like target_team_id::text||'/%') then raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team'; end if;
  delete from public.messages where team_id=target_team_id; delete from public.threads where team_id=target_team_id;
  delete from public.announcements where team_id=target_team_id; delete from public.notification_preferences where team_id=target_team_id;
  delete from public.team_sites where team_id=target_team_id; delete from public.volunteer_ledger where team_id=target_team_id;
  delete from public.job_signups where team_id=target_team_id; delete from public.job_slots where team_id=target_team_id; delete from public.job_templates where team_id=target_team_id;
  delete from public.events where team_id=target_team_id; delete from public.attendance where team_id=target_team_id; delete from public.session_rsvps where team_id=target_team_id; delete from public.sessions where team_id=target_team_id;
  delete from public.group_members where team_id=target_team_id; delete from public.groups where team_id=target_team_id; delete from public.locations where team_id=target_team_id;
  delete from public.join_requests where team_id=target_team_id; delete from public.household_members where team_id=target_team_id; delete from public.athletes where team_id=target_team_id;
  delete from public.swimmer_registration_profiles where team_id=target_team_id; delete from public.family_registration_profiles where team_id=target_team_id;
  delete from public.family_contacts where team_id=target_team_id; delete from public.family_guardians where team_id=target_team_id; delete from public.family_swimmers where team_id=target_team_id;
  delete from public.attendance_records where team_id=target_team_id; delete from public.self_checkin_tokens where team_id=target_team_id; delete from public.group_memberships where team_id=target_team_id;
  delete from public.practice_exceptions where team_id=target_team_id; delete from public.practice_sessions where team_id=target_team_id; delete from public.practice_schedules where team_id=target_team_id;
  delete from public.swim_groups where team_id=target_team_id; delete from public.swimmers where team_id=target_team_id; delete from public.families where team_id=target_team_id;
  delete from public.parent_registration_requests where team_id=target_team_id; delete from public.platform_support_sessions where team_id=target_team_id;
  delete from public.mock_checkout_sessions where team_id=target_team_id; delete from public.audit_logs where team_id=target_team_id;
  if include_account_access then
    delete from public.memberships where team_id=target_team_id; delete from public.households where team_id=target_team_id;
    delete from public.team_member_module_permissions where team_id=target_team_id; delete from public.team_module_entitlements where team_id=target_team_id;
    delete from public.team_registration_settings where team_id=target_team_id; delete from public.team_settings where team_id=target_team_id; delete from public.team_memberships where team_id=target_team_id;
  end if;
end $$;
revoke all on function public.clear_team_records(uuid,boolean) from public,anon,authenticated;
