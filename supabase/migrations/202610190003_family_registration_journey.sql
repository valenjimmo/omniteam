-- Complete the observable family-registration journey while keeping review
-- authorization and every relationship bound to the selected tenant.

create or replace function public.get_family_registration(target_slug text)
returns table (
  team_id uuid,
  registration_open boolean,
  registration_configuration jsonb
)
language sql security definer stable set search_path = public as $$
  select r.team_id, r.registration_open, r.registration_configuration
  from public.team_registration_settings r
  join public.teams t on t.id = r.team_id
  where r.slug = lower(trim(target_slug))
    and t.status = 'ACTIVE'
  limit 1;
$$;
revoke all on function public.get_family_registration(text) from public;
grant execute on function public.get_family_registration(text) to anon, authenticated;

create or replace function public.can_review_family_registration(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.team_memberships m
    where m.team_id = target_team_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and (
        m.role = 'OWNER'
        or (
          m.role = 'ADMIN'
          and m.can_assign_access
          and public.can_access_team_module(target_team_id, 'omniathlete', 'MANAGE')
        )
      )
  );
$$;
revoke all on function public.can_review_family_registration(uuid) from public, anon, authenticated;

drop policy "applicant or access manager reads registration" on public.parent_registration_requests;
create policy "applicant or registration reviewer reads registration" on public.parent_registration_requests
  for select using (user_id = auth.uid() or public.can_review_family_registration(team_id));

drop function public.review_parent_registration(uuid, boolean);
create function public.review_parent_registration(
  target_team_id uuid, target_request_id uuid, approve boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  request_row public.parent_registration_requests%rowtype;
  new_family_id uuid; new_swimmer_id uuid; target_membership_id uuid;
  swimmer_item jsonb; guardian_item jsonb; emergency_item jsonb; payload jsonb;
begin
  select * into request_row
  from public.parent_registration_requests
  where team_id = target_team_id and id = target_request_id
  for update;

  if request_row.id is null or request_row.status <> 'PENDING'
    or not public.can_review_family_registration(target_team_id) then
    raise exception 'Registration request unavailable';
  end if;

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
      if payload is not null then
        insert into public.swimmer_registration_profiles(team_id,swimmer_id,registration_request_id,profile)
        values(request_row.team_id,new_swimmer_id,request_row.id,swimmer_item);
      end if;
    end loop;
    insert into public.team_memberships(team_id,user_id,role) values(request_row.team_id,request_row.user_id,'PARENT')
      on conflict(team_id,user_id) do update set role='PARENT', status='ACTIVE' returning id into target_membership_id;
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

  update public.parent_registration_requests
  set status=case when approve then 'APPROVED' else 'REJECTED' end,
      reviewed_at=now(), reviewed_by_user_id=auth.uid()
  where team_id=target_team_id and id=target_request_id;
end;
$$;
revoke all on function public.review_parent_registration(uuid, uuid, boolean) from public, anon;
grant execute on function public.review_parent_registration(uuid, uuid, boolean) to authenticated;
