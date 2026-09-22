-- Forward-only hardening. Existing incompatible snapshots fail closed in the renderer.
alter table public.team_sites add column settings jsonb not null default '{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""}', add column enabled boolean not null default true;
alter table public.site_assets add column state text not null default 'READY' check(state in ('PENDING','READY','DELETING')), add column width integer, add column height integer;
alter table public.site_publications add column source_revision integer;
-- Remove every browser write path. Server RPCs still use the caller's JWT and check membership.
revoke insert,update,delete on public.team_sites,public.site_pages,public.site_assets,public.site_publications,public.site_templates from anon,authenticated;
revoke update(site_name,theme,logo_path,updated_at) on public.team_sites from authenticated;
revoke update(title,seo_description,nav_order,visible,sections,updated_at) on public.site_pages from authenticated;
alter table public.team_sites force row level security;
alter table public.site_pages force row level security;
alter table public.site_assets force row level security;
alter table public.site_publications force row level security;
update storage.buckets set public=false where id='omnisite-assets';
drop policy "omnisite team uploads" on storage.objects;
drop policy "omnisite team edits objects" on storage.objects;
drop policy "omnisite team deletes objects" on storage.objects;
-- No Storage SELECT policy: both public and preview delivery pass through the checked server endpoint.

create table public.site_catalog_writers(user_id uuid primary key references public.platform_owners(user_id));
alter table public.site_catalog_writers enable row level security;
create table public.site_catalog_audit(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),template_id uuid references public.site_templates(id),action text not null,created_at timestamptz not null default now());
alter table public.site_catalog_audit enable row level security;
create or replace function public.can_write_site_catalog() returns boolean language sql security definer stable set search_path=public as $$
 select public.is_platform_owner() and exists(select 1 from public.site_catalog_writers where user_id=auth.uid())
 and not exists(select 1 from public.platform_support_sessions where platform_user_id=auth.uid() and expires_at>now());
$$;
revoke all on function public.can_write_site_catalog() from public;
grant execute on function public.can_write_site_catalog() to authenticated;
create policy "catalog audit readers" on public.site_catalog_audit for select to authenticated using(public.can_write_site_catalog());

create or replace function public.os_safe_slug(s text) returns boolean language sql immutable as $$
 select s is not null and length(s) between 1 and 63 and s ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
 and s <> all(array['api','app','admin','support','auth','mail','status','assets','cdn','www','sites','omnisite','platform','robots','sitemap','login','_next']);
$$;
create or replace function public.os_paths(v jsonb) returns setof text language sql immutable as $$
 select distinct path from (
 select v->>'logoPath' path union all select v->'settings'->>'faviconPath' union all select v->'settings'->>'socialImagePath'
 union all select s->>'path' from jsonb_array_elements(v->'pages') p cross join lateral jsonb_array_elements(p->'sections') s where s->>'type'='image') paths where path is not null;
$$;
create or replace function public.os_validate_content(v jsonb) returns void language plpgsql set search_path=public as $$
declare page_data jsonb; section_data jsonb; link text;
begin
 if pg_column_size(v)>500000 or not public.os_valid_snapshot(v) or not public.os_safe_slug(v->>'slug') then raise exception 'Invalid website content'; end if;
 if (select count(*) from jsonb_array_elements(v->'pages')) <> (select count(distinct p->>'slug') from jsonb_array_elements(v->'pages') p)
 or not exists(select 1 from jsonb_array_elements(v->'pages') p where p->>'slug'='home' and (p->>'visible')::boolean) then raise exception 'Unique pages and visible Home required'; end if;
 for page_data in select value from jsonb_array_elements(v->'pages') loop
  if not public.os_safe_slug(page_data->>'slug') or (select count(*) from jsonb_array_elements(page_data->'sections') s where s->>'type'='hero' and not coalesce((s->>'hidden')::boolean,false))>1 then raise exception 'Invalid page'; end if;
  for section_data in select value from jsonb_array_elements(page_data->'sections') loop
   if section_data->>'type'='cta' then
    link:=section_data->>'href';
    if link ~ '[[:space:]\\]' or link ~* '%(0[0-9a-f]|1[0-9a-f]|7f|5c|2f)' or not (link ~ '^/([a-zA-Z0-9/-]*)(#[a-zA-Z0-9-]+)?$' and link !~ '^//' or link ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?([/?#][^[:space:]\\]*)?$') then raise exception 'Unsafe link'; end if;
   end if;
  end loop;
 end loop;
 if exists(select 1 from public.os_paths(v) path where path not like (v->>'teamId')||'/%') then raise exception 'Invalid asset ownership'; end if;
end;
$$;
create or replace function public.os_assert_assets(v jsonb) returns void language plpgsql set search_path=public as $$
begin
 if exists(select 1 from public.os_paths(v) path where not exists(select 1 from public.site_assets a where a.team_id=(v->>'teamId')::uuid and a.site_id=(v->>'siteId')::uuid and a.object_path=path and a.state='READY')) then raise exception 'Asset unavailable'; end if;
end;
$$;
create or replace function public.os_draft(t uuid,s uuid) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('schemaVersion',2,'teamId',t,'siteId',s,'slug',x.slug,'siteName',x.site_name,'layout',x.layout_key,'theme',x.theme,'logoPath',x.logo_path,'settings',x.settings,
 'pages',coalesce((select jsonb_agg(jsonb_build_object('slug',p.slug,'title',p.title,'seoDescription',p.seo_description,'navOrder',p.nav_order,'visible',p.visible,'sections',p.sections) order by p.nav_order,p.slug) from public.site_pages p where p.team_id=t and p.site_id=s),'[]')) from public.team_sites x where x.team_id=t and x.id=s;
$$;
revoke all on function public.os_draft(uuid,uuid) from public,anon,authenticated;

create or replace function public.create_team_site(target_team_id uuid,selected_template_id uuid,requested_slug text,requested_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare tpl public.site_templates%rowtype; sid uuid; p jsonb; v jsonb;
begin
 if not public.can_manage_omnisite(target_team_id) then raise exception 'Access denied'; end if;
 if not public.os_take_limit(target_team_id,'write') then raise exception 'Too many requests'; end if;
 perform 1 from public.teams where id=target_team_id for update;
 select id into sid from public.team_sites where team_id=target_team_id;
 if sid is not null then return sid; end if;
 select * into tpl from public.site_templates where id=selected_template_id and status='PUBLISHED';
 if tpl.id is null then raise exception 'Template unavailable'; end if;
 insert into public.team_sites(team_id,template_id,slug,site_name,layout_key,theme) values(target_team_id,tpl.id,requested_slug,requested_name,tpl.layout_key,tpl.default_theme) returning id into sid;
 for p in select value from jsonb_array_elements(tpl.starter_pages) loop
  insert into public.site_pages(team_id,site_id,slug,title,seo_description,nav_order,visible,sections) values(target_team_id,sid,p->>'slug',p->>'title',coalesce(p->>'seoDescription',''),(p->>'navOrder')::integer,coalesce((p->>'visible')::boolean,true),p->'sections');
 end loop;
 v:=public.os_draft(target_team_id,sid); perform public.os_validate_content(v); perform public.os_assert_assets(v);
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action) values(target_team_id,auth.uid(),'site',sid,'SITE_CREATED');
 return sid;
end;
$$;
create or replace function public.save_site_draft(target_team_id uuid,target_site_id uuid,expected_revision integer,content jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare r public.team_sites%rowtype; p jsonb;
begin
 if not public.can_manage_omnisite(target_team_id) then raise exception 'Access denied'; end if;
 if not public.os_take_limit(target_team_id,'write') then raise exception 'Too many requests'; end if;
 select * into r from public.team_sites where team_id=target_team_id and id=target_site_id for update;
 if r.id is null or r.draft_revision is distinct from expected_revision then raise exception 'Draft changed. Reload before saving.'; end if;
 perform public.os_validate_content(content); perform public.os_assert_assets(content);
 if content->>'teamId' <> target_team_id::text or content->>'siteId' <> target_site_id::text or content->>'slug' <> r.slug or content->>'layout'<>r.layout_key or content->>'schemaVersion'<>'2' then raise exception 'Invalid identity'; end if;
 update public.team_sites set site_name=content->>'siteName',theme=content->'theme',logo_path=content->>'logoPath',settings=content->'settings',draft_revision=draft_revision+1,updated_at=now() where id=r.id;
 delete from public.site_pages where team_id=target_team_id and site_id=target_site_id;
 for p in select value from jsonb_array_elements(content->'pages') loop
  insert into public.site_pages(team_id,site_id,slug,title,seo_description,nav_order,visible,sections) values(target_team_id,target_site_id,p->>'slug',p->>'title',p->>'seoDescription',(p->>'navOrder')::integer,(p->>'visible')::boolean,p->'sections');
 end loop;
 return expected_revision+1;
end;
$$;
drop function public.publish_team_site(uuid,uuid);
drop function public.rollback_team_site(uuid,uuid,integer);
create or replace function public.publish_site_revision(target_team_id uuid,target_site_id uuid,expected_revision integer,expected_version integer,source_version integer default null)
returns integer language plpgsql security definer set search_path=public as $$
declare r public.team_sites%rowtype; v jsonb; n integer;
begin
 if not public.can_manage_omnisite(target_team_id) then raise exception 'Access denied'; end if;
 if not public.os_take_limit(target_team_id,'write') then raise exception 'Too many requests'; end if;
 select * into r from public.team_sites where team_id=target_team_id and id=target_site_id for update;
 if r.id is null or r.draft_revision is distinct from expected_revision or coalesce(r.published_version,0) is distinct from expected_version then raise exception 'Website changed. Reload before publishing.'; end if;
 if source_version is null then v:=public.os_draft(target_team_id,target_site_id);
 else select snapshot into v from public.site_publications where team_id=target_team_id and site_id=target_site_id and version=source_version; end if;
 if v is null then raise exception 'Publication unavailable'; end if;
 -- Version 1 is accepted only when it passes today's safe schema; never downgrade validation.
 v:=v||jsonb_build_object('schemaVersion',2,'settings',coalesce(v->'settings',r.settings));
 perform public.os_validate_content(v); perform public.os_assert_assets(v);
 v:=jsonb_set(v,'{pages}',(select jsonb_agg(p) from jsonb_array_elements(v->'pages') p where (p->>'visible')::boolean));
 select coalesce(max(version),0)+1 into n from public.site_publications where team_id=target_team_id and site_id=target_site_id;
 insert into public.site_publications(team_id,site_id,version,snapshot,published_by,source_revision) values(target_team_id,target_site_id,n,v,auth.uid(),expected_revision);
 update public.team_sites set published_version=n where team_id=target_team_id and id=target_site_id;
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values) values(target_team_id,auth.uid(),'site',target_site_id,case when source_version is null then 'SITE_PUBLISHED' else 'SITE_ROLLED_BACK' end,jsonb_build_object('version',n,'sourceVersion',source_version));
 return n;
end;
$$;
create or replace function public.set_site_enabled(target_team_id uuid,target_site_id uuid,active boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_omnisite(target_team_id) or active is null then raise exception 'Access denied'; end if;
 update public.team_sites set enabled=active where team_id=target_team_id and id=target_site_id;
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values) values(target_team_id,auth.uid(),'site',target_site_id,'SITE_VISIBILITY_CHANGED',jsonb_build_object('enabled',active));
end;
$$;
create or replace function public.get_public_site(requested_slug text) returns jsonb language sql security definer stable set search_path=public as $$
 select p.snapshot from public.team_sites s join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version
 where s.slug=requested_slug and s.enabled and public.is_public_omnisite(s.team_id) limit 1;
$$;
create or replace function public.save_site_template(template_id uuid,expected_version integer,content jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; current_version integer; p jsonb;
begin
 if not public.can_write_site_catalog() then raise exception 'Catalog write access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.site_catalog_audit where user_id=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Too many requests'; end if;
 if pg_column_size(content)>500000 or not public.os_valid_template(content) then raise exception 'Invalid template'; end if;
 perform public.os_validate_content(jsonb_build_object('schemaVersion',2,'teamId','00000000-0000-4000-8000-000000000001','siteId','00000000-0000-4000-8000-000000000002','slug','sample','siteName',content->>'name','layout',content->>'layout_key','theme',content->'default_theme','logoPath',null,'settings','{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""}'::jsonb,'pages',content->'starter_pages'));
 if exists(select 1 from jsonb_array_elements(content->'starter_pages') p cross join lateral jsonb_array_elements(p->'sections') s where s->>'type'='image') then raise exception 'Tenant images cannot be template assets'; end if;
 if template_id is null then
  insert into public.site_templates(name,layout_key,default_theme,starter_pages,status) values(content->>'name',content->>'layout_key',content->'default_theme',content->'starter_pages',content->>'status') returning id into tid;
 else
  select version into current_version from public.site_templates where id=template_id for update;
  if current_version is distinct from expected_version then raise exception 'Template changed. Reload.'; end if;
  update public.site_templates set name=content->>'name',layout_key=content->>'layout_key',default_theme=content->'default_theme',starter_pages=content->'starter_pages',status=content->>'status',version=version+1,updated_at=now() where id=template_id returning id into tid;
 end if;
 insert into public.site_catalog_audit(user_id,template_id,action) values(auth.uid(),tid,'TEMPLATE_'||(content->>'status'));
 return tid;
end;
$$;
revoke all on function public.save_site_draft(uuid,uuid,integer,jsonb),public.publish_site_revision(uuid,uuid,integer,integer,integer),public.set_site_enabled(uuid,uuid,boolean),public.save_site_template(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_site_draft(uuid,uuid,integer,jsonb),public.publish_site_revision(uuid,uuid,integer,integer,integer),public.set_site_enabled(uuid,uuid,boolean),public.save_site_template(uuid,integer,jsonb) to authenticated;

create or replace function public.os_immutable_publication() returns trigger language plpgsql as $$
begin raise exception 'Publication history is immutable'; end;
$$;
create trigger os_immutable_publication before update on public.site_publications for each row execute function public.os_immutable_publication();
