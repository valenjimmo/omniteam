-- Platform owner console: audited control of teams, plans, and module entitlements.
create or replace function public.list_platform_team_overview()
returns table(
  team_id uuid, team_name text, team_status public.record_status, is_test_team boolean,
  created_at timestamptz, plan_id text, plan_name text, subscription_status text, billing_mode text
) language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  return query
    select t.id,t.name,t.status,t.is_test_team,t.created_at,s.plan_id,p.name,s.status,s.billing_mode
    from public.teams t
    left join lateral (select ts.* from public.team_subscriptions ts where ts.team_id=t.id order by ts.created_at desc limit 1) s on true
    left join public.subscription_plans p on p.id=s.plan_id
    order by t.created_at desc,t.id;
end;
$$;
revoke all on function public.list_platform_team_overview() from public,anon;
grant execute on function public.list_platform_team_overview() to authenticated;

create or replace function public.list_platform_team_modules()
returns table(team_id uuid,module_key text,enabled boolean)
language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  return query
    select t.id,m.module_key,(e.team_id is not null and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()))
    from public.teams t cross join (values ('omniathlete'),('omnischedule'),('omnimeet'),('omnivolunteer'),
      ('omniconnect'),('omnisite'),('omniinsights')) m(module_key)
    left join public.team_module_entitlements e on e.team_id=t.id and e.module_key=m.module_key
    order by t.id,m.module_key;
end;
$$;
revoke all on function public.list_platform_team_modules() from public,anon;
grant execute on function public.list_platform_team_modules() to authenticated;

create or replace function public.platform_set_team_module(target_team_id uuid,target_module text,enable_module boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  if target_module not in ('omniathlete','omnischedule','omnimeet','omnivolunteer','omniconnect','omnisite','omniinsights')
    then raise exception 'Unknown OmniTeam module'; end if;
  if not exists(select 1 from public.teams where id=target_team_id) then raise exception 'Team not found'; end if;
  if enable_module then
    insert into public.team_module_entitlements(team_id,module_key,starts_at,ends_at)
      values(target_team_id,target_module,now(),null)
      on conflict(team_id,module_key) do update set starts_at=now(),ends_at=null;
  else
    delete from public.team_module_entitlements where team_id=target_team_id and module_key=target_module;
  end if;
  insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values)
    values(target_team_id,auth.uid(),'module_entitlement',target_team_id,'PLATFORM_MODULE_OVERRIDE',
      jsonb_build_object('moduleKey',target_module,'enabled',enable_module));
end;
$$;
revoke all on function public.platform_set_team_module(uuid,text,boolean) from public,anon;
grant execute on function public.platform_set_team_module(uuid,text,boolean) to authenticated;

create or replace function public.platform_set_team_plan(target_team_id uuid,target_plan_id text)
returns void language plpgsql security definer set search_path=public as $$
declare plan_row public.subscription_plans%rowtype; module_key text;
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  select * into plan_row from public.subscription_plans where id=target_plan_id and active;
  if plan_row.id is null then raise exception 'Plan unavailable'; end if;
  if not exists(select 1 from public.teams where id=target_team_id) then raise exception 'Team not found'; end if;
  if exists(select 1 from public.team_subscriptions where team_id=target_team_id and billing_mode='LIVE'
    and status in ('TRIALING','ACTIVE','PAST_DUE')) then raise exception 'Cannot replace a live subscription with a mock plan'; end if;
  update public.team_subscriptions set status='CANCELLED',cancelled_at=now()
    where team_id=target_team_id and billing_mode='MOCK' and status in ('TRIALING','ACTIVE','PAST_DUE');
  insert into public.team_subscriptions(team_id,plan_id,status,billing_mode,trial_ends_at)
    values(target_team_id,target_plan_id,'TRIALING','MOCK',now()+interval '30 days');
  delete from public.team_module_entitlements where team_id=target_team_id;
  foreach module_key in array plan_row.module_keys loop
    insert into public.team_module_entitlements(team_id,module_key) values(target_team_id,module_key);
  end loop;
  insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values)
    values(target_team_id,auth.uid(),'subscription',target_team_id,'PLATFORM_PLAN_CHANGED',
      jsonb_build_object('planId',target_plan_id,'billingMode','MOCK'));
end;
$$;
revoke all on function public.platform_set_team_plan(uuid,text) from public,anon;
grant execute on function public.platform_set_team_plan(uuid,text) to authenticated;

create or replace function public.platform_set_team_status(target_team_id uuid,activate boolean)
returns void language plpgsql security definer set search_path=public as $$
declare current_name text;
begin
  if not public.is_platform_owner() then raise exception 'Platform owner access required'; end if;
  select name into current_name from public.teams where id=target_team_id for update;
  if current_name is null then raise exception 'Team not found'; end if;
  if activate then
    update public.teams set status='ACTIVE',archived_at=null,updated_at=now() where id=target_team_id;
  else
    update public.team_registration_settings set registration_open=false,updated_at=now() where team_id=target_team_id;
    update public.teams set status='INACTIVE',archived_at=coalesce(archived_at,now()),updated_at=now() where id=target_team_id;
  end if;
  insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values)
    values(target_team_id,auth.uid(),'team',target_team_id,
      case when activate then 'PLATFORM_TEAM_REACTIVATED' else 'PLATFORM_TEAM_ARCHIVED' end,
      jsonb_build_object('teamName',current_name));
end;
$$;
revoke all on function public.platform_set_team_status(uuid,boolean) from public,anon;
grant execute on function public.platform_set_team_status(uuid,boolean) to authenticated;
