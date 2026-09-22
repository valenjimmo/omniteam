create table public.site_domains (
 id uuid primary key default gen_random_uuid(), team_id uuid not null, site_id uuid not null,
 hostname text not null unique check(length(hostname)<=253 and hostname=lower(hostname) and hostname ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]+$'),
 display_hostname text not null check(length(display_hostname)<=253), type text not null default 'CUSTOM' check(type in ('CUSTOM','MANAGED')),
 verification_status text not null default 'PENDING' check(verification_status in ('PENDING','VERIFIED')),
 provider_status text not null default 'PENDING' check(provider_status in ('PENDING','READY')),
 verification_token text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),
 token_expires_at timestamptz not null default now()+interval '7 days', verified_at timestamptz,
 active boolean not null default false, is_primary boolean not null default false,
 detached_at timestamptz, last_error text, last_checked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(team_id,id),foreign key(team_id,site_id) references public.team_sites(team_id,id) on delete cascade,
 check(not active or (verification_status='VERIFIED' and provider_status='READY' and detached_at is null)), check(not is_primary or active)
);
create unique index site_domains_one_primary on public.site_domains(team_id,site_id) where is_primary;
alter table public.site_domains enable row level security;
alter table public.site_domains force row level security;
create policy "omnisite domain readers" on public.site_domains for select to authenticated using(public.can_view_omnisite(team_id));
create trigger site_domains_immutable_team_id before update on public.site_domains for each row execute function public.reject_team_id_change();
revoke insert,update,delete on public.site_domains from anon,authenticated;
create table public.site_action_limits(team_id uuid not null references public.teams(id) on delete cascade,user_id uuid not null references auth.users(id),action text not null,window_at timestamptz not null,count integer not null,primary key(team_id,user_id,action));
alter table public.site_action_limits enable row level security;
create or replace function public.os_take_limit(target_team_id uuid,action_name text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer; bucket timestamptz;
begin
 if not public.can_view_omnisite(target_team_id) or action_name not in ('write','dns','upload') then return false; end if;
 bucket:=date_trunc(case when action_name='dns' then 'hour' else 'minute' end,now());
 insert into public.site_action_limits(team_id,user_id,action,window_at,count) values(target_team_id,auth.uid(),action_name,bucket,1)
 on conflict(team_id,user_id,action) do update set window_at=excluded.window_at,count=case when site_action_limits.window_at=excluded.window_at then site_action_limits.count+1 else 1 end returning count into n;
 return n<=case when action_name='dns' then 6 when action_name='upload' then 10 else 60 end;
end;
$$;
revoke all on function public.os_take_limit(uuid,text) from public,anon;
grant execute on function public.os_take_limit(uuid,text) to authenticated;
-- Service-only actor check: never infer authority from a supplied team ID.
create or replace function public.os_actor_manage(actor uuid,t uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_public_omnisite(t) and exists(select 1 from public.team_memberships m left join public.team_member_module_permissions p on p.team_id=m.team_id and p.membership_id=m.id and p.module_key='omnisite' where m.team_id=t and m.user_id=actor and m.status='ACTIVE' and (m.role='OWNER' or p.access_level='MANAGE'));
$$;
revoke all on function public.os_actor_manage(uuid,uuid) from public,anon,authenticated;
create or replace function public.os_domain_operation(actor uuid,t uuid,s uuid,operation text,domain_id uuid default null,requested_host text default null,display_host text default null,proof_token text default null,provider_ready boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare d public.site_domains%rowtype; did uuid;
begin
 if not public.os_actor_manage(actor,t) then raise exception 'Access denied'; end if;
 perform 1 from public.team_sites where team_id=t and id=s for update;
 if not found then raise exception 'Site unavailable'; end if;
 if operation='claim' then
  if (select count(*) from public.site_domains where team_id=t and site_id=s and detached_at is null)>=10 then raise exception 'Domain limit reached'; end if;
  insert into public.site_domains(team_id,site_id,hostname,display_hostname) values(t,s,requested_host,display_host) returning id into did;
 else
  select * into d from public.site_domains where team_id=t and site_id=s and id=domain_id for update;
  if d.id is null or d.detached_at is not null then raise exception 'Domain unavailable'; end if;
  did:=d.id;
  if operation='verify' then
   if proof_token is distinct from d.verification_token or d.token_expires_at<=now() then raise exception 'Verification expired'; end if;
   update public.site_domains set verification_status='VERIFIED',verified_at=now(),last_checked_at=now(),last_error=null,provider_status=case when provider_ready then 'READY' else 'PENDING' end where id=did;
  elsif operation='failed' then
   update public.site_domains set last_checked_at=now(),last_error='DNS verification did not match.',active=false,is_primary=false,verification_status='PENDING',provider_status='PENDING' where id=did;
  elsif operation='renew' then
   update public.site_domains set verification_token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),token_expires_at=now()+interval '7 days',verification_status='PENDING',provider_status='PENDING',active=false,is_primary=false where id=did;
  elsif operation='activate' then
   if d.verification_status<>'VERIFIED' or d.verified_at<now()-interval '1 hour' or not provider_ready then raise exception 'Verify DNS and configure hosting before activation'; end if;
   update public.site_domains set provider_status='READY',active=true where id=did;
  elsif operation='primary' then
   if not d.active then raise exception 'Activate the domain first'; end if;
   update public.site_domains set is_primary=false where team_id=t and site_id=s;
   update public.site_domains set is_primary=true where id=did;
  elsif operation='detach' then
   update public.site_domains set active=false,is_primary=false,detached_at=now(),provider_status='PENDING',verification_status='PENDING' where id=did;
  else raise exception 'Invalid domain operation'; end if;
  update public.site_domains set updated_at=now() where id=did;
 end if;
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action) values(t,actor,'site_domain',did,'DOMAIN_'||upper(operation));
 return did;
end;
$$;
revoke all on function public.os_domain_operation(uuid,uuid,uuid,text,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.os_domain_operation(uuid,uuid,uuid,text,uuid,text,text,text,boolean) to service_role;
create or replace function public.resolve_site_hostname(requested_host text) returns text language sql security definer stable set search_path=public as $$
 select s.slug from public.site_domains d join public.team_sites s on s.team_id=d.team_id and s.id=d.site_id
 where d.hostname=requested_host and d.active and d.detached_at is null and d.verification_status='VERIFIED' and d.provider_status='READY' and s.enabled and s.published_version is not null and public.is_public_omnisite(s.team_id);
$$;
create or replace function public.public_site_primary(requested_slug text) returns text language sql security definer stable set search_path=public as $$
 select d.hostname from public.team_sites s join public.site_domains d on d.team_id=s.team_id and d.site_id=s.id where s.slug=requested_slug and s.enabled and s.published_version is not null and public.is_public_omnisite(s.team_id) and d.active and d.is_primary and d.detached_at is null;
$$;
revoke all on function public.resolve_site_hostname(text),public.public_site_primary(text) from public;
grant execute on function public.resolve_site_hostname(text),public.public_site_primary(text) to anon,authenticated;
create or replace function public.os_asset_operation(actor uuid,t uuid,s uuid,operation text,asset_id uuid,asset_bytes integer default null,asset_width integer default null,asset_height integer default null)
returns text language plpgsql security definer set search_path=public as $$
declare path text; v jsonb;
begin
 if not public.os_actor_manage(actor,t) then raise exception 'Access denied'; end if;
 perform 1 from public.team_sites where team_id=t and id=s for update;
 if not found then raise exception 'Site unavailable'; end if;
 if operation='reserve' then
  if (select count(*) from public.site_assets where team_id=t and site_id=s)>=200 then raise exception 'Media limit reached'; end if;
  path:=t::text||'/'||s::text||'/'||asset_id::text||'.webp';
  insert into public.site_assets(id,team_id,site_id,object_path,mime_type,bytes,state,width,height) values(asset_id,t,s,path,'image/webp',asset_bytes,'PENDING',asset_width,asset_height);
 else
  select object_path into path from public.site_assets where id=asset_id and team_id=t and site_id=s for update;
  if path is null then raise exception 'Asset unavailable'; end if;
  if operation='ready' then
   update public.site_assets set state='READY' where id=asset_id and state='PENDING';
  elsif operation='delete' then
   v:=public.os_draft(t,s);
   if path in (select public.os_paths(v)) or exists(select 1 from public.site_publications p where p.team_id=t and p.site_id=s and path in (select public.os_paths(p.snapshot))) then raise exception 'Asset is retained by a draft or publication'; end if;
   update public.site_assets set state='DELETING' where id=asset_id;
  elsif operation='removed' then
   delete from public.site_assets where id=asset_id and state in ('PENDING','DELETING');
  else raise exception 'Invalid asset operation'; end if;
 end if;
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action) values(t,actor,'site_asset',asset_id,'ASSET_'||upper(operation));
 return path;
end;
$$;
revoke all on function public.os_asset_operation(uuid,uuid,uuid,text,uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.os_asset_operation(uuid,uuid,uuid,text,uuid,integer,integer,integer) to service_role;
-- Limits belong to the tenant and are removed in both test purge and hard deletion.
create or replace function public.os_clear_limits() returns trigger language plpgsql set search_path=public as $$
begin delete from public.site_action_limits where team_id=old.team_id; return old; end;
$$;
create trigger os_clear_site_limits before delete on public.team_sites for each row execute function public.os_clear_limits();
