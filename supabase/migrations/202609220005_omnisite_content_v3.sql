-- Renderer schema v3. Requires Supabase's pg_jsonschema extension.
create extension if not exists pg_jsonschema with schema extensions;
create or replace function public.os_valid_snapshot(value jsonb) returns boolean language sql immutable set search_path=public,extensions as $fn$
 select value is not null and extensions.jsonb_matches_schema($schema${"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"schemaVersion":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2},{"type":"number","const":3}]},"teamId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"siteId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"slug":{"type":"string","minLength":1,"maxLength":63,"pattern":"^[a-z0-9]+(-[a-z0-9]+)*$"},"siteName":{"type":"string","minLength":1,"maxLength":120},"layout":{"type":"string","enum":["classic","bold","minimal"]},"theme":{"type":"object","properties":{"primary":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"secondary":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"accent":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"surface":{"type":"string","enum":["light","dark"]}},"required":["primary","secondary","accent","surface"],"additionalProperties":false},"logoPath":{"anyOf":[{"type":"string","maxLength":250,"pattern":"^[0-9a-f-]{36}\\/(?:[0-9a-f-]{36}\\/)?[0-9a-f-]{36}\\.(?:png|jpg|webp)$"},{"type":"null"}]},"settings":{"default":{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""},"type":"object","properties":{"typography":{"default":"sans","type":"string","enum":["sans","serif","humanist"]},"faviconPath":{"default":null,"anyOf":[{"type":"string","maxLength":250,"pattern":"^[0-9a-f-]{36}\\/(?:[0-9a-f-]{36}\\/)?[0-9a-f-]{36}\\.(?:png|jpg|webp)$"},{"type":"null"}]},"socialImagePath":{"default":null,"anyOf":[{"type":"string","maxLength":250,"pattern":"^[0-9a-f-]{36}\\/(?:[0-9a-f-]{36}\\/)?[0-9a-f-]{36}\\.(?:png|jpg|webp)$"},{"type":"null"}]},"seoTitle":{"default":"","type":"string","maxLength":120},"seoDescription":{"default":"","type":"string","maxLength":300}},"required":["typography","faviconPath","socialImagePath","seoTitle","seoDescription"],"additionalProperties":false},"pages":{"minItems":1,"maxItems":50,"type":"array","items":{"type":"object","properties":{"slug":{"type":"string","minLength":1,"maxLength":63,"pattern":"^[a-z0-9]+(-[a-z0-9]+)*$"},"title":{"type":"string","minLength":1,"maxLength":120},"seoDescription":{"default":"","type":"string","maxLength":300},"navOrder":{"type":"integer","minimum":0,"maximum":1000},"visible":{"default":true,"type":"boolean"},"sections":{"maxItems":30,"type":"array","items":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","const":"hero"},"hidden":{"type":"boolean"},"heading":{"type":"string","minLength":1,"maxLength":160},"text":{"type":"string","maxLength":1000}},"required":["type","heading","text"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"richText"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"text":{"type":"string","maxLength":5000},"blocks":{"minItems":1,"maxItems":30,"type":"array","items":{"type":"object","properties":{"type":{"type":"string","const":"paragraph"},"children":{"minItems":1,"maxItems":40,"type":"array","items":{"type":"object","properties":{"text":{"type":"string","minLength":1,"maxLength":1000},"marks":{"default":[],"maxItems":2,"type":"array","items":{"type":"string","enum":["bold","italic"]}},"href":{"type":"string","maxLength":500}},"required":["text","marks"],"additionalProperties":false}}},"required":["type","children"],"additionalProperties":false}}},"required":["type","heading"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"image"},"hidden":{"type":"boolean"},"alt":{"type":"string","minLength":1,"maxLength":160},"path":{"type":"string","maxLength":250,"pattern":"^[0-9a-f-]{36}\\/(?:[0-9a-f-]{36}\\/)?[0-9a-f-]{36}\\.(?:png|jpg|webp)$"}},"required":["type","alt","path"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"cta"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"label":{"type":"string","minLength":1,"maxLength":80},"href":{"type":"string","maxLength":500}},"required":["type","heading","label","href"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"cards"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":8,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":100},"text":{"type":"string","maxLength":400}},"required":["title","text"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"newsList"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":12,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":120},"summary":{"type":"string","maxLength":600},"publishedDate":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"href":{"type":"string","maxLength":500}},"required":["title","summary","publishedDate"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"eventsList"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":12,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":120},"summary":{"type":"string","maxLength":600},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"time":{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"},"location":{"type":"string","maxLength":160},"href":{"type":"string","maxLength":500}},"required":["title","summary","date"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false}]}}},"required":["slug","title","seoDescription","navOrder","visible","sections"],"additionalProperties":false}}},"required":["schemaVersion","teamId","siteId","slug","siteName","layout","theme","logoPath","settings","pages"],"additionalProperties":false}$schema$::json,value);
$fn$;

-- Content v3 adds structured rich text, team-authored news, and public events.
-- Links are constrained again in SQL so validation remains safe if the JSON schema changes.
create or replace function public.os_safe_link(link text) returns boolean language sql immutable as $$
 select link is not null and length(link)<=500 and link !~ '[[:space:]\\]' and link !~* '%(0[0-9a-f]|1[0-9a-f]|7f|5c|2f)'
 and ((link ~ '^/([a-zA-Z0-9/-]*)(#[a-zA-Z0-9-]+)?$' and link !~ '^//') or link ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?([/?#][^[:space:]\\]*)?$');
$$;

create or replace function public.os_validate_content(v jsonb) returns void language plpgsql set search_path=public as $$
declare page_data jsonb; section_data jsonb; item jsonb; block jsonb; span_data jsonb;
begin
 if pg_column_size(v)>500000 or not public.os_valid_snapshot(v) or not public.os_safe_slug(v->>'slug') then raise exception 'Invalid website content'; end if;
 if (select count(*) from jsonb_array_elements(v->'pages')) <> (select count(distinct p->>'slug') from jsonb_array_elements(v->'pages') p)
 or not exists(select 1 from jsonb_array_elements(v->'pages') p where p->>'slug'='home' and (p->>'visible')::boolean) then raise exception 'Unique pages and visible Home required'; end if;
 for page_data in select value from jsonb_array_elements(v->'pages') loop
  if not public.os_safe_slug(page_data->>'slug') or (select count(*) from jsonb_array_elements(page_data->'sections') s where s->>'type'='hero' and not coalesce((s->>'hidden')::boolean,false))>1 then raise exception 'Invalid page'; end if;
  for section_data in select value from jsonb_array_elements(page_data->'sections') loop
   if section_data->>'type'='cta' and not public.os_safe_link(section_data->>'href') then raise exception 'Unsafe link'; end if;
   if section_data->>'type' in ('newsList','eventsList') then
    for item in select value from jsonb_array_elements(section_data->'items') loop
     if item ? 'href' and not public.os_safe_link(item->>'href') then raise exception 'Unsafe link'; end if;
    end loop;
   elsif section_data->>'type'='richText' and section_data ? 'blocks' then
    for block in select value from jsonb_array_elements(section_data->'blocks') loop
     for span_data in select value from jsonb_array_elements(block->'children') loop
      if span_data ? 'href' and not public.os_safe_link(span_data->>'href') then raise exception 'Unsafe link'; end if;
     end loop;
    end loop;
   end if;
  end loop;
 end loop;
 if exists(select 1 from public.os_paths(v) path where path not like (v->>'teamId')||'/%') then raise exception 'Invalid asset ownership'; end if;
end;
$$;

create or replace function public.os_draft(t uuid,s uuid) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('schemaVersion',3,'teamId',t,'siteId',s,'slug',x.slug,'siteName',x.site_name,'layout',x.layout_key,'theme',x.theme,'logoPath',x.logo_path,'settings',x.settings,
 'pages',coalesce((select jsonb_agg(jsonb_build_object('slug',p.slug,'title',p.title,'seoDescription',p.seo_description,'navOrder',p.nav_order,'visible',p.visible,'sections',p.sections) order by p.nav_order,p.slug) from public.site_pages p where p.team_id=t and p.site_id=s),'[]')) from public.team_sites x where x.team_id=t and x.id=s;
$$;
revoke all on function public.os_draft(uuid,uuid) from public,anon,authenticated;

create or replace function public.save_site_draft(target_team_id uuid,target_site_id uuid,expected_revision integer,content jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare r public.team_sites%rowtype; p jsonb;
begin
 if not public.can_manage_omnisite(target_team_id) then raise exception 'Access denied'; end if;
 if not public.os_take_limit(target_team_id,'write') then raise exception 'Too many requests'; end if;
 select * into r from public.team_sites where team_id=target_team_id and id=target_site_id for update;
 if r.id is null or r.draft_revision is distinct from expected_revision then raise exception 'Draft changed. Reload before saving.'; end if;
 perform public.os_validate_content(content); perform public.os_assert_assets(content);
 if content->>'teamId' <> target_team_id::text or content->>'siteId' <> target_site_id::text or content->>'slug' <> r.slug or content->>'layout'<>r.layout_key or content->>'schemaVersion'<>'3' then raise exception 'Invalid identity'; end if;
 update public.team_sites set site_name=content->>'siteName',theme=content->'theme',logo_path=content->>'logoPath',settings=content->'settings',draft_revision=draft_revision+1,updated_at=now() where id=r.id;
 delete from public.site_pages where team_id=target_team_id and site_id=target_site_id;
 for p in select value from jsonb_array_elements(content->'pages') loop
  insert into public.site_pages(team_id,site_id,slug,title,seo_description,nav_order,visible,sections) values(target_team_id,target_site_id,p->>'slug',p->>'title',p->>'seoDescription',(p->>'navOrder')::integer,(p->>'visible')::boolean,p->'sections');
 end loop;
 return expected_revision+1;
end;
$$;

create or replace function public.publish_site_revision(target_team_id uuid,target_site_id uuid,expected_revision integer,expected_version integer,source_version integer default null)
returns integer language plpgsql security definer set search_path=public as $$
declare r public.team_sites%rowtype; v jsonb; n integer;
begin
 if not public.can_manage_omnisite(target_team_id) then raise exception 'Access denied'; end if;
 if not public.os_take_limit(target_team_id,'write') then raise exception 'Too many requests'; end if;
 select * into r from public.team_sites where team_id=target_team_id and id=target_site_id for update;
 if r.id is null or r.draft_revision is distinct from expected_revision or coalesce(r.published_version,0) is distinct from expected_version then raise exception 'Website changed. Reload before publishing.'; end if;
 if source_version is null then v:=public.os_draft(target_team_id,target_site_id); else select snapshot into v from public.site_publications where team_id=target_team_id and site_id=target_site_id and version=source_version; end if;
 if v is null then raise exception 'Publication unavailable'; end if;
 v:=v||jsonb_build_object('schemaVersion',3,'settings',coalesce(v->'settings',r.settings));
 perform public.os_validate_content(v); perform public.os_assert_assets(v);
 v:=jsonb_set(v,'{pages}',(select jsonb_agg(p) from jsonb_array_elements(v->'pages') p where (p->>'visible')::boolean));
 select coalesce(max(version),0)+1 into n from public.site_publications where team_id=target_team_id and site_id=target_site_id;
 insert into public.site_publications(team_id,site_id,version,snapshot,published_by,source_revision) values(target_team_id,target_site_id,n,v,auth.uid(),expected_revision);
 update public.team_sites set published_version=n where team_id=target_team_id and id=target_site_id;
 insert into public.audit_logs(team_id,user_id,entity_type,entity_id,action,new_values) values(target_team_id,auth.uid(),'site',target_site_id,case when source_version is null then 'SITE_PUBLISHED' else 'SITE_ROLLED_BACK' end,jsonb_build_object('version',n,'sourceVersion',source_version));
 return n;
end;
$$;

-- Service-only discovery for a bounded, explicit Storage reconciliation pass.
create or replace function public.os_stale_assets(actor uuid,t uuid,s uuid)
returns table(id uuid,object_path text) language plpgsql security definer set search_path=public as $$
begin
 if not public.os_actor_manage(actor,t) then raise exception 'Access denied'; end if;
 perform 1 from public.team_sites site where site.team_id=t and site.id=s;
 if not found then raise exception 'Site unavailable'; end if;
 return query select a.id,a.object_path from public.site_assets a where a.team_id=t and a.site_id=s
 and ((a.state='PENDING' and a.created_at < now()-interval '1 hour') or a.state='DELETING') order by a.created_at limit 100;
end;
$$;
revoke all on function public.os_stale_assets(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.os_stale_assets(uuid,uuid,uuid) to service_role;
grant execute on function public.save_site_draft(uuid,uuid,integer,jsonb),public.publish_site_revision(uuid,uuid,integer,integer,integer) to authenticated;
create or replace function public.os_valid_template(value jsonb) returns boolean language sql immutable set search_path=public,extensions as $fn$
 select value is not null and extensions.jsonb_matches_schema($schema${"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":120},"layout_key":{"type":"string","enum":["classic","bold","minimal"]},"default_theme":{"type":"object","properties":{"primary":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"secondary":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"accent":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"},"surface":{"type":"string","enum":["light","dark"]}},"required":["primary","secondary","accent","surface"],"additionalProperties":false},"starter_pages":{"minItems":1,"maxItems":50,"type":"array","items":{"type":"object","properties":{"slug":{"type":"string","minLength":1,"maxLength":63,"pattern":"^[a-z0-9]+(-[a-z0-9]+)*$"},"title":{"type":"string","minLength":1,"maxLength":120},"seoDescription":{"default":"","type":"string","maxLength":300},"navOrder":{"type":"integer","minimum":0,"maximum":1000},"visible":{"default":true,"type":"boolean"},"sections":{"maxItems":30,"type":"array","items":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","const":"hero"},"hidden":{"type":"boolean"},"heading":{"type":"string","minLength":1,"maxLength":160},"text":{"type":"string","maxLength":1000}},"required":["type","heading","text"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"richText"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"text":{"type":"string","maxLength":5000},"blocks":{"minItems":1,"maxItems":30,"type":"array","items":{"type":"object","properties":{"type":{"type":"string","const":"paragraph"},"children":{"minItems":1,"maxItems":40,"type":"array","items":{"type":"object","properties":{"text":{"type":"string","minLength":1,"maxLength":1000},"marks":{"default":[],"maxItems":2,"type":"array","items":{"type":"string","enum":["bold","italic"]}},"href":{"type":"string","maxLength":500}},"required":["text","marks"],"additionalProperties":false}}},"required":["type","children"],"additionalProperties":false}}},"required":["type","heading"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"image"},"hidden":{"type":"boolean"},"alt":{"type":"string","minLength":1,"maxLength":160},"path":{"type":"string","maxLength":250,"pattern":"^[0-9a-f-]{36}\\/(?:[0-9a-f-]{36}\\/)?[0-9a-f-]{36}\\.(?:png|jpg|webp)$"}},"required":["type","alt","path"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"cta"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"label":{"type":"string","minLength":1,"maxLength":80},"href":{"type":"string","maxLength":500}},"required":["type","heading","label","href"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"cards"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":8,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":100},"text":{"type":"string","maxLength":400}},"required":["title","text"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"newsList"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":12,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":120},"summary":{"type":"string","maxLength":600},"publishedDate":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"href":{"type":"string","maxLength":500}},"required":["title","summary","publishedDate"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"eventsList"},"hidden":{"type":"boolean"},"heading":{"type":"string","maxLength":160},"items":{"minItems":1,"maxItems":12,"type":"array","items":{"type":"object","properties":{"title":{"type":"string","minLength":1,"maxLength":120},"summary":{"type":"string","maxLength":600},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"time":{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"},"location":{"type":"string","maxLength":160},"href":{"type":"string","maxLength":500}},"required":["title","summary","date"],"additionalProperties":false}}},"required":["type","heading","items"],"additionalProperties":false}]}}},"required":["slug","title","seoDescription","navOrder","visible","sections"],"additionalProperties":false}},"status":{"type":"string","enum":["DRAFT","PUBLISHED","RETIRED"]}},"required":["name","layout_key","default_theme","starter_pages","status"],"additionalProperties":false}$schema$::json,value);
$fn$;
