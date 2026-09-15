-- OmniSite: shared templates, tenant drafts, immutable published snapshots.
create table public.site_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout_key text not null check (layout_key in ('classic','bold','minimal')),
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','RETIRED')),
  starter_pages jsonb not null default '[]'::jsonb check (jsonb_typeof(starter_pages) = 'array'),
  default_theme jsonb not null default '{}'::jsonb check (jsonb_typeof(default_theme) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_templates enable row level security;
create policy "published templates visible" on public.site_templates for select
  using (status = 'PUBLISHED' or public.is_platform_owner());
create policy "platform owner manages templates" on public.site_templates for all
  using (public.is_platform_owner()) with check (public.is_platform_owner());

create table public.team_sites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id),
  template_id uuid references public.site_templates(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  site_name text not null,
  layout_key text not null check (layout_key in ('classic','bold','minimal')),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  logo_path text,
  draft_revision integer not null default 1,
  published_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  unique (team_id, slug),
  check (logo_path is null or logo_path like team_id::text || '/%')
);
create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  site_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  seo_description text not null default '',
  nav_order integer not null default 0,
  visible boolean not null default true,
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  unique (team_id, site_id, slug),
  foreign key (team_id, site_id) references public.team_sites(team_id, id) on delete cascade
);
create table public.site_assets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  site_id uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  bytes integer not null check (bytes between 1 and 2097152),
  created_at timestamptz not null default now(),
  unique (team_id, id),
  foreign key (team_id, site_id) references public.team_sites(team_id, id) on delete cascade,
  check (object_path like team_id::text || '/%')
);
create table public.site_publications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  site_id uuid not null,
  version integer not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  published_by uuid references public.profiles(id),
  published_at timestamptz not null default now(),
  unique (team_id, site_id, version),
  foreign key (team_id, site_id) references public.team_sites(team_id, id) on delete cascade
);
create or replace function public.omnisite_immutable_team_id()
returns trigger language plpgsql as $$
begin
  if new.team_id is distinct from old.team_id then raise exception 'OmniSite team_id cannot change'; end if;
  return new;
end;
$$;
create trigger team_sites_immutable_team_id before update on public.team_sites
  for each row execute function public.omnisite_immutable_team_id();
create trigger site_pages_immutable_team_id before update on public.site_pages
  for each row execute function public.omnisite_immutable_team_id();
create trigger site_assets_immutable_team_id before update on public.site_assets
  for each row execute function public.omnisite_immutable_team_id();
create trigger site_publications_immutable_team_id before update on public.site_publications
  for each row execute function public.omnisite_immutable_team_id();
alter table public.team_sites add constraint team_sites_publication_fk
  foreign key (team_id, id, published_version)
  references public.site_publications(team_id, site_id, version) deferrable initially deferred;

create or replace function public.can_manage_omnisite(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.can_access_team_module(target_team_id, 'omnisite', 'MANAGE');
$$;
create or replace function public.can_view_omnisite(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.can_access_team_module(target_team_id, 'omnisite', 'VIEW');
$$;
create or replace function public.is_public_omnisite(target_team_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.teams t join public.team_module_entitlements e on e.team_id=t.id
    where t.id=target_team_id and t.status='ACTIVE' and e.module_key='omnisite'
    and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()));
$$;

alter table public.team_sites enable row level security;
alter table public.site_pages enable row level security;
alter table public.site_assets enable row level security;
alter table public.site_publications enable row level security;
create policy "editors read site drafts" on public.team_sites for select using (public.can_view_omnisite(team_id));
create policy "editors manage site drafts" on public.team_sites for all using (public.can_manage_omnisite(team_id)) with check (public.can_manage_omnisite(team_id));
create policy "editors read pages" on public.site_pages for select using (public.can_view_omnisite(team_id));
create policy "editors manage pages" on public.site_pages for all using (public.can_manage_omnisite(team_id)) with check (public.can_manage_omnisite(team_id));
create policy "editors read assets" on public.site_assets for select using (public.can_view_omnisite(team_id));
create policy "editors manage assets" on public.site_assets for all using (public.can_manage_omnisite(team_id)) with check (public.can_manage_omnisite(team_id));
create policy "editors read publications" on public.site_publications for select using (public.can_view_omnisite(team_id));
-- Editors can modify content, but only trusted publish functions may move the live pointer.
revoke update on public.team_sites from authenticated;
grant update (site_name,theme,logo_path,updated_at) on public.team_sites to authenticated;
revoke update on public.site_pages from authenticated;
grant update (title,seo_description,nav_order,visible,sections,updated_at) on public.site_pages to authenticated;
-- Public reads go through this definer function; no direct public table policy exposes drafts.
create or replace function public.get_public_site(requested_slug text)
returns jsonb language sql security definer stable set search_path = public as $$
  select p.snapshot from public.team_sites s
  join public.site_publications p on p.team_id=s.team_id and p.site_id=s.id and p.version=s.published_version
  where s.slug=requested_slug and public.is_public_omnisite(s.team_id)
  limit 1;
$$;
revoke all on function public.get_public_site(text) from public;
grant execute on function public.get_public_site(text) to anon, authenticated;

create or replace function public.create_team_site(target_team_id uuid, selected_template_id uuid, requested_slug text, requested_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare template_row public.site_templates%rowtype; new_site_id uuid; page jsonb;
begin
  if not public.can_manage_omnisite(target_team_id) then raise exception 'OmniSite manage access required'; end if;
  if requested_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(requested_slug)>63
    or length(trim(requested_name)) not between 1 and 120 then raise exception 'Invalid site name or slug'; end if;
  select * into template_row from public.site_templates where id=selected_template_id and status='PUBLISHED';
  if template_row.id is null then raise exception 'Template unavailable'; end if;
  insert into public.team_sites(team_id, template_id, slug, site_name, layout_key, theme)
    values(target_team_id, template_row.id, requested_slug, trim(requested_name), template_row.layout_key, template_row.default_theme)
    returning id into new_site_id;
  for page in select value from jsonb_array_elements(template_row.starter_pages) loop
    insert into public.site_pages(team_id,site_id,slug,title,seo_description,nav_order,sections)
      values(target_team_id,new_site_id,page->>'slug',page->>'title',coalesce(page->>'seoDescription',''),
        coalesce((page->>'navOrder')::integer,0),coalesce(page->'sections','[]'::jsonb));
  end loop;
  return new_site_id;
end;
$$;
revoke all on function public.create_team_site(uuid,uuid,text,text) from public;
grant execute on function public.create_team_site(uuid,uuid,text,text) to authenticated;

create or replace function public.publish_team_site(target_team_id uuid, target_site_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare site_row public.team_sites%rowtype; next_version integer; page_data jsonb;
begin
  if not public.can_manage_omnisite(target_team_id) then raise exception 'OmniSite manage access required'; end if;
  select * into site_row from public.team_sites where team_id=target_team_id and id=target_site_id for update;
  if site_row.id is null then raise exception 'Site not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'title',title,'seoDescription',seo_description,
    'navOrder',nav_order,'visible',visible,'sections',sections) order by nav_order,slug),'[]'::jsonb)
    into page_data from public.site_pages where team_id=target_team_id and site_id=target_site_id and visible;
  if not exists (select 1 from public.site_pages where team_id=target_team_id and site_id=target_site_id and slug='home' and visible)
    then raise exception 'A visible Home page is required'; end if;
  next_version := coalesce(site_row.published_version,0)+1;
  insert into public.site_publications(team_id,site_id,version,snapshot,published_by)
    values(target_team_id,target_site_id,next_version,
      jsonb_build_object('schemaVersion',1,'teamId',target_team_id,'siteId',target_site_id,'slug',site_row.slug,
        'siteName',site_row.site_name,'layout',site_row.layout_key,'theme',site_row.theme,
        'logoPath',site_row.logo_path,'pages',page_data),auth.uid());
  update public.team_sites set published_version=next_version,updated_at=now() where id=target_site_id;
  return next_version;
end;
$$;

insert into public.site_templates(name,layout_key,status,default_theme,starter_pages) values
('Classic Swim Team','classic','PUBLISHED','{"primary":"#164e63","secondary":"#0e7490","accent":"#f59e0b","surface":"light"}',
 '[{"slug":"home","title":"Home","navOrder":0,"sections":[{"type":"hero","heading":"Welcome to our team","text":"Train together. Grow together."},{"type":"cards","heading":"What we offer","items":[{"title":"Community","text":"A place for every swimmer."},{"title":"Progress","text":"Practice with purpose."}]}]},{"slug":"about","title":"About","navOrder":1,"sections":[{"type":"richText","heading":"Our story","text":"Tell visitors about your team."}]},{"slug":"contact","title":"Contact","navOrder":2,"sections":[{"type":"richText","heading":"Get in touch","text":"Add your team contact information here."}]}]'),
('Bold Swim Team','bold','PUBLISHED','{"primary":"#1e3a8a","secondary":"#2563eb","accent":"#f97316","surface":"light"}',
 '[{"slug":"home","title":"Home","navOrder":0,"sections":[{"type":"hero","heading":"Make waves","text":"Your team. Your goals. Your season."}]},{"slug":"about","title":"About","navOrder":1,"sections":[{"type":"richText","heading":"About us","text":"Share your team mission."}]},{"slug":"contact","title":"Contact","navOrder":2,"sections":[{"type":"richText","heading":"Contact","text":"Add your team contact information here."}]}]'),
('Minimal Swim Team','minimal','PUBLISHED','{"primary":"#155e75","secondary":"#0e7490","accent":"#eab308","surface":"light"}',
 '[{"slug":"home","title":"Home","navOrder":0,"sections":[{"type":"hero","heading":"Swim with us","text":"A welcoming place to train and compete."}]},{"slug":"about","title":"About","navOrder":1,"sections":[{"type":"richText","heading":"Who we are","text":"Introduce your coaches and community."}]},{"slug":"contact","title":"Contact","navOrder":2,"sections":[{"type":"richText","heading":"Say hello","text":"Add your team contact information here."}]}]');
revoke all on function public.publish_team_site(uuid,uuid) from public;
grant execute on function public.publish_team_site(uuid,uuid) to authenticated;

create or replace function public.rollback_team_site(target_team_id uuid,target_site_id uuid,source_version integer)
returns integer language plpgsql security definer set search_path = public as $$
declare old_snapshot jsonb; next_version integer;
begin
  if not public.can_manage_omnisite(target_team_id) then raise exception 'OmniSite manage access required'; end if;
  perform 1 from public.team_sites where team_id=target_team_id and id=target_site_id for update;
  if not found then raise exception 'Site not found'; end if;
  select snapshot into old_snapshot from public.site_publications
    where team_id=target_team_id and site_id=target_site_id and version=source_version;
  if old_snapshot is null then raise exception 'Publication not found'; end if;
  select coalesce(max(version),0)+1 into next_version from public.site_publications
    where team_id=target_team_id and site_id=target_site_id;
  insert into public.site_publications(team_id,site_id,version,snapshot,published_by)
    values(target_team_id,target_site_id,next_version,old_snapshot,auth.uid());
  update public.team_sites set published_version=next_version where team_id=target_team_id and id=target_site_id;
  return next_version;
end;
$$;
revoke all on function public.rollback_team_site(uuid,uuid,integer) from public;
grant execute on function public.rollback_team_site(uuid,uuid,integer) to authenticated;

-- Public logo assets; writes require the team's OmniSite MANAGE grant.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('omnisite-assets','omnisite-assets',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy "omnisite team uploads" on storage.objects for insert to authenticated
  with check (bucket_id='omnisite-assets' and array_length(storage.foldername(name),1)=1
    and public.can_manage_omnisite((split_part(name,'/',1))::uuid));
create policy "omnisite team edits objects" on storage.objects for update to authenticated
  using (bucket_id='omnisite-assets' and array_length(storage.foldername(name),1)=1
    and public.can_manage_omnisite((split_part(name,'/',1))::uuid))
  with check (bucket_id='omnisite-assets' and array_length(storage.foldername(name),1)=1
    and public.can_manage_omnisite((split_part(name,'/',1))::uuid));
create policy "omnisite team deletes objects" on storage.objects for delete to authenticated
  using (bucket_id='omnisite-assets' and array_length(storage.foldername(name),1)=1
    and public.can_manage_omnisite((split_part(name,'/',1))::uuid));

-- Site rows cascade on hard team deletion. Test purges also remove site rows.
create or replace function public.clear_team_records(target_team_id uuid, include_account_access boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from storage.objects where bucket_id='omnisite-assets'
    and name like target_team_id::text || '/%') then
    raise exception 'Remove OmniSite assets through the Storage API before purging or deleting this team';
  end if;
  delete from public.team_sites where team_id=target_team_id;
  delete from public.family_contacts where team_id = target_team_id;
  delete from public.family_guardians where team_id = target_team_id;
  delete from public.family_swimmers where team_id = target_team_id;
  delete from public.attendance_records where team_id = target_team_id;
  delete from public.self_checkin_tokens where team_id = target_team_id;
  delete from public.group_memberships where team_id = target_team_id;
  delete from public.practice_exceptions where team_id = target_team_id;
  delete from public.practice_sessions where team_id = target_team_id;
  delete from public.practice_schedules where team_id = target_team_id;
  delete from public.swim_groups where team_id = target_team_id;
  delete from public.swimmers where team_id = target_team_id;
  delete from public.families where team_id = target_team_id;
  delete from public.parent_registration_requests where team_id = target_team_id;
  delete from public.platform_support_sessions where team_id = target_team_id;
  delete from public.audit_logs where team_id = target_team_id;
  if include_account_access then
    delete from public.team_member_module_permissions where team_id = target_team_id;
    delete from public.team_module_entitlements where team_id = target_team_id;
    delete from public.team_registration_settings where team_id = target_team_id;
    delete from public.team_settings where team_id = target_team_id;
    delete from public.team_memberships where team_id = target_team_id;
  end if;
end;
$$;
