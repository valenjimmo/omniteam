-- Remove internal tenant/site identity and private object keys from the public RPC.
create or replace function public.os_public_snapshot(v jsonb) returns jsonb language plpgsql immutable set search_path=public as $$
declare result jsonb; p jsonb; s jsonb; pages jsonb:='[]'; sections jsonb; settings jsonb;
begin
 if v is null then return null; end if;
 result:=v-'teamId'-'siteId';
 result:=jsonb_set(result,'{logoPath}',coalesce(to_jsonb(regexp_replace(v->>'logoPath','^.*/','')),'null'));
 settings:=coalesce(v->'settings','{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""}'::jsonb);
 settings:=jsonb_set(settings,'{faviconPath}',coalesce(to_jsonb(regexp_replace(settings->>'faviconPath','^.*/','')),'null'));
 settings:=jsonb_set(settings,'{socialImagePath}',coalesce(to_jsonb(regexp_replace(settings->>'socialImagePath','^.*/','')),'null'));
 result:=jsonb_set(result,'{settings}',settings);
 for p in select value from jsonb_array_elements(v->'pages') loop
  if coalesce((p->>'visible')::boolean,true) then
   sections:='[]';
   for s in select value from jsonb_array_elements(p->'sections') where not coalesce((value->>'hidden')::boolean,false) loop
    if s->>'type'='image' then s:=jsonb_set(s,'{path}',coalesce(to_jsonb(regexp_replace(s->>'path','^.*/','')),'null')); end if;
    sections:=sections||jsonb_build_array(s);
   end loop;
   pages:=pages||jsonb_build_array(jsonb_set(p,'{sections}',sections));
  end if;
 end loop;
 return jsonb_set(result,'{pages}',pages);
end;
$$;
create or replace function public.get_public_site(requested_slug text) returns jsonb language sql security definer stable set search_path=public as $$
 select public.os_public_snapshot(p.snapshot) from public.team_sites s join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version
 where s.slug=requested_slug and s.enabled and public.is_public_omnisite(s.team_id) limit 1;
$$;
create or replace function public.os_public_media_path(requested_slug text,handle text) returns text language sql security definer stable set search_path=public as $$
 select path from public.team_sites s join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version
 cross join lateral public.os_paths(p.snapshot) path
 where s.slug=requested_slug and s.enabled and public.is_public_omnisite(s.team_id) and regexp_replace(path,'^.*/','')=handle
 and exists(select 1 from public.site_assets a where a.team_id=s.team_id and a.site_id=s.id and a.object_path=path and a.state='READY') limit 1;
$$;
revoke all on function public.os_public_media_path(text,text) from public,anon,authenticated;
grant execute on function public.os_public_media_path(text,text) to service_role;
-- Incompatible historical snapshots are unavailable even through the raw public RPC.
create or replace function public.os_supported_snapshot(v jsonb) returns boolean language plpgsql stable set search_path=public as $$
begin
 if v is null then return false; end if;
 perform public.os_validate_content(v||jsonb_build_object('settings',coalesce(v->'settings','{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""}'::jsonb)));
 return true;
exception when others then return false;
end;
$$;
create or replace function public.get_public_site(requested_slug text) returns jsonb language sql security definer stable set search_path=public as $$
 select public.os_public_snapshot(p.snapshot) from public.team_sites s join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version
 where s.slug=requested_slug and s.enabled and public.is_public_omnisite(s.team_id) and public.os_supported_snapshot(p.snapshot) limit 1;
$$;
revoke all on function public.is_public_omnisite(uuid) from public,anon,authenticated;
