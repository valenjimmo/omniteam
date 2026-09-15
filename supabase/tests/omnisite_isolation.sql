-- Transactional database smoke test. Run only after 202609140008 is applied.
-- Rollback prevents persistent test teams/sites.
begin;
do $$
declare
  org_id uuid; a uuid; b uuid; template_id uuid; site_a uuid; site_b uuid;
  page_id uuid; published jsonb;
begin
  insert into public.organizations(name) values('OmniSite isolation test') returning id into org_id;
  insert into public.teams(organization_id,name) values(org_id,'Site A') returning id into a;
  insert into public.teams(organization_id,name) values(org_id,'Site B') returning id into b;
  insert into public.team_module_entitlements(team_id,module_key) values(a,'omnisite'),(b,'omnisite');
  select id into template_id from public.site_templates where status='PUBLISHED' limit 1;
  insert into public.team_sites(team_id,template_id,slug,site_name,layout_key,theme)
    values(a,template_id,'omnisite-test-a','Site A','classic',
      '{"primary":"#164e63","secondary":"#0e7490","accent":"#f59e0b","surface":"light"}') returning id into site_a;
  insert into public.team_sites(team_id,template_id,slug,site_name,layout_key,theme)
    values(b,template_id,'omnisite-test-b','Site B','classic',
      '{"primary":"#164e63","secondary":"#0e7490","accent":"#f59e0b","surface":"light"}') returning id into site_b;
  insert into public.site_pages(team_id,site_id,slug,title,sections)
    values(a,site_a,'home','Home','[]') returning id into page_id;
  begin
    insert into public.site_pages(team_id,site_id,slug,title,sections)
      values(b,site_a,'about','Wrong team','[]');
    raise exception 'Cross-team page relationship was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.site_pages set team_id=b where id=page_id;
    raise exception 'Changing team_id was accepted';
  exception when raise_exception then
    if sqlerrm='Changing team_id was accepted' then raise; end if;
  end;
  if public.get_public_site('omnisite-test-a') is not null then
    raise exception 'Unpublished site was public';
  end if;
  insert into public.site_publications(team_id,site_id,version,snapshot)
    values(a,site_a,1,jsonb_build_object('slug','omnisite-test-a','marker','original'));
  update public.team_sites set published_version=1 where id=site_a;
  published:=public.get_public_site('omnisite-test-a');
  if published->>'marker' <> 'original' then raise exception 'Published site unavailable'; end if;
  update public.site_templates set name='Changed global template' where id=template_id;
  if public.get_public_site('omnisite-test-a')->>'marker' <> 'original' then
    raise exception 'Template edit changed published content';
  end if;
  update public.teams set status='INACTIVE' where id=a;
  if public.get_public_site('omnisite-test-a') is not null then
    raise exception 'Archived site was public';
  end if;
end;
$$;
set local role anon;
do $$
begin
  if has_table_privilege('anon','public.site_pages','select')
    and exists (select 1 from public.site_pages where slug='home') then
    raise exception 'Anonymous visitor read a draft page';
  end if;
end;
$$;
reset role;
rollback;
