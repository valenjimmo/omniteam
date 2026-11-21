-- DEV-06: preserve staff membership roles during family approval and enforce
-- the captured configurable-registration contract at the trusted boundary.

create function public.registration_valid_calendar_date(value text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  parsed date;
begin
  if value is null or value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  parsed := value::date;
  return to_char(parsed, 'YYYY-MM-DD') = value;
exception when datetime_field_overflow or invalid_datetime_format then
  return false;
end;
$$;

create function public.registration_answer_valid(answer jsonb, question jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  question_type text := question ->> 'type';
  required_answer boolean := coalesce((question ->> 'required')::boolean, false);
  option_value jsonb;
begin
  if answer is null or answer = 'null'::jsonb
    or (jsonb_typeof(answer) = 'string' and length(trim(answer #>> '{}')) = 0)
    or (jsonb_typeof(answer) = 'array' and jsonb_array_length(answer) = 0) then
    return not required_answer;
  end if;

  if question_type in ('short_text', 'long_text') then
    return jsonb_typeof(answer) = 'string';
  elsif question_type = 'yes_no' then
    return jsonb_typeof(answer) = 'boolean';
  elsif question_type = 'date' then
    return jsonb_typeof(answer) = 'string'
      and public.registration_valid_calendar_date(answer #>> '{}');
  elsif question_type = 'single_select' then
    return jsonb_typeof(answer) = 'string'
      and jsonb_typeof(question -> 'options') = 'array'
      and (question -> 'options') @> jsonb_build_array(answer);
  elsif question_type = 'multi_select' then
    if jsonb_typeof(answer) <> 'array' or jsonb_typeof(question -> 'options') <> 'array' then return false; end if;
    for option_value in select value from jsonb_array_elements(answer) loop
      if jsonb_typeof(option_value) <> 'string'
        or not ((question -> 'options') @> jsonb_build_array(option_value)) then return false; end if;
    end loop;
    return true;
  end if;
  return false;
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.registration_valid_calendar_date(text) from public, anon, authenticated;
revoke all on function public.registration_answer_valid(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.submit_family_registration(
  target_team_id uuid, registration_payload jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  settings_row public.team_registration_settings%rowtype;
  new_request_id uuid;
  family_data jsonb; swimmer_data jsonb; guardian_data jsonb; emergency_data jsonb;
  agreement_data jsonb; question_data jsonb; answer_data jsonb;
  requested_group text; requested_program text; optional_value text; question_id text;
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
    or not public.registration_valid_phone(family_data ->> 'primaryPhone')
    or not public.registration_valid_email(family_data ->> 'billingEmail') then
    raise exception 'Complete valid household information is required';
  end if;

  if jsonb_typeof(registration_payload -> 'guardians') <> 'array'
    or jsonb_array_length(registration_payload -> 'guardians') not between 1 and 10 then raise exception 'One to ten guardians are required'; end if;
  for guardian_data in select value from jsonb_array_elements(registration_payload -> 'guardians') loop
    if length(trim(coalesce(guardian_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(guardian_data ->> 'lastName',''))) not between 1 and 100
      or length(trim(coalesce(guardian_data ->> 'relationship',''))) not between 1 and 100
      or not public.registration_valid_email(guardian_data ->> 'email')
      or not public.registration_valid_phone(guardian_data ->> 'mobilePhone')
      or (nullif(trim(guardian_data ->> 'alternatePhone'),'') is not null and not public.registration_valid_phone(guardian_data ->> 'alternatePhone'))
      then raise exception 'Each guardian requires a valid name, relationship, email, and phone'; end if;
  end loop;

  if jsonb_typeof(registration_payload -> 'emergencyContacts') <> 'array'
    or jsonb_array_length(registration_payload -> 'emergencyContacts') not between 1 and 10 then raise exception 'One to ten emergency contacts are required'; end if;
  for emergency_data in select value from jsonb_array_elements(registration_payload -> 'emergencyContacts') loop
    if length(trim(coalesce(emergency_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(emergency_data ->> 'lastName',''))) not between 1 and 100
      or length(trim(coalesce(emergency_data ->> 'relationship',''))) not between 1 and 100
      or not public.registration_valid_phone(emergency_data ->> 'phone')
      or (nullif(trim(emergency_data ->> 'alternatePhone'),'') is not null and not public.registration_valid_phone(emergency_data ->> 'alternatePhone'))
      then raise exception 'Each emergency contact requires a valid name, relationship, and phone'; end if;
  end loop;

  if jsonb_typeof(registration_payload -> 'familyAnswers') <> 'object' then raise exception 'Family answers must be an object'; end if;
  if jsonb_typeof(registration_payload -> 'swimmers') <> 'array'
    or jsonb_array_length(registration_payload -> 'swimmers') not between 1 and 10 then raise exception 'One to ten swimmers are required'; end if;
  for swimmer_data in select value from jsonb_array_elements(registration_payload -> 'swimmers') loop
    if length(trim(coalesce(swimmer_data ->> 'firstName',''))) not between 1 and 100
      or length(trim(coalesce(swimmer_data ->> 'lastName',''))) not between 1 and 100
      or not public.registration_valid_calendar_date(swimmer_data ->> 'birthDate')
      or coalesce(swimmer_data ->> 'legalSex','') not in ('Female','Male','Intersex','Not specified')
      then raise exception 'Each swimmer requires a legal name, real birth date, and listed legal sex'; end if;
    if jsonb_typeof(swimmer_data -> 'answers') <> 'object' then raise exception 'Swimmer answers must be an object'; end if;
    foreach optional_value in array array[swimmer_data->>'mobilePhone', swimmer_data->>'physicianPhone', swimmer_data->>'dentistPhone', swimmer_data->>'insurancePhone'] loop
      if nullif(trim(optional_value),'') is not null and not public.registration_valid_phone(optional_value) then raise exception 'Swimmer phone values must be valid'; end if;
    end loop;
    optional_value := swimmer_data ->> 'email';
    if nullif(trim(optional_value),'') is not null and not public.registration_valid_email(optional_value) then raise exception 'Swimmer email must be valid'; end if;
    requested_group := nullif(trim(swimmer_data ->> 'requestedGroupId'),'');
    if requested_group is not null and (requested_group !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists (select 1 from public.swim_groups g where g.team_id=target_team_id and g.id=requested_group::uuid and g.status='ACTIVE')) then
      raise exception 'Requested roster group is unavailable';
    end if;
    if jsonb_array_length(coalesce(settings_row.registration_configuration -> 'programs','[]'::jsonb)) > 0 then
      requested_program := nullif(trim(swimmer_data ->> 'requestedProgramId'),'');
      if requested_program is null or not exists (
        select 1 from jsonb_array_elements(settings_row.registration_configuration -> 'programs') program
        where program ->> 'id' = requested_program
      ) then raise exception 'Requested program is unavailable'; end if;
    end if;
    for question_data in select value from jsonb_array_elements(coalesce(settings_row.registration_configuration -> 'questions','[]'::jsonb))
      where value ->> 'appliesTo' = 'swimmer' loop
      question_id := question_data ->> 'id';
      if question_id is null or question_id = '' then raise exception 'Registration question configuration is invalid'; end if;
      answer_data := swimmer_data -> 'answers' -> question_id;
      if not public.registration_answer_valid(answer_data, question_data) then raise exception 'A swimmer answer is missing or invalid'; end if;
    end loop;
  end loop;

  for question_data in select value from jsonb_array_elements(coalesce(settings_row.registration_configuration -> 'questions','[]'::jsonb))
    where value ->> 'appliesTo' = 'family' loop
    question_id := question_data ->> 'id';
    if question_id is null or question_id = '' then raise exception 'Registration question configuration is invalid'; end if;
    answer_data := registration_payload -> 'familyAnswers' -> question_id;
    if not public.registration_answer_valid(answer_data, question_data) then raise exception 'A family answer is missing or invalid'; end if;
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

revoke all on function public.submit_family_registration(uuid, jsonb) from public, anon;
grant execute on function public.submit_family_registration(uuid, jsonb) to authenticated;

-- Keep approval behavior unchanged except that an existing membership's role
-- is independent of family access and is therefore never replaced.
create or replace function public.review_parent_registration(
  target_team_id uuid, target_request_id uuid, approve boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  request_row public.parent_registration_requests%rowtype;
  new_family_id uuid; new_swimmer_id uuid; target_membership_id uuid;
  swimmer_item jsonb; guardian_item jsonb; emergency_item jsonb; payload jsonb;
  requested_group text;
begin
  select * into request_row from public.parent_registration_requests
  where team_id = target_team_id and id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'PENDING'
    or not public.can_review_family_registration(target_team_id) then raise exception 'Registration request unavailable'; end if;
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
      requested_group := nullif(trim(swimmer_item->>'requestedGroupId'),'');
      if requested_group is not null and requested_group ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and exists (select 1 from public.swim_groups g where g.team_id=request_row.team_id and g.id=requested_group::uuid and g.status='ACTIVE') then
        insert into public.group_memberships(team_id,swimmer_id,group_id,start_date)
        values(request_row.team_id,new_swimmer_id,requested_group::uuid,current_date);
      end if;
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
  update public.parent_registration_requests set status=case when approve then 'APPROVED' else 'REJECTED' end,
    reviewed_at=now(), reviewed_by_user_id=auth.uid() where team_id=target_team_id and id=target_request_id;
end;
$$;

revoke all on function public.review_parent_registration(uuid, uuid, boolean) from public, anon;
grant execute on function public.review_parent_registration(uuid, uuid, boolean) to authenticated;
