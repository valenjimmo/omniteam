-- Minimal public-link metadata for the MFA-gated platform-owner console.
-- This intentionally exposes no draft content, registration payloads, or domain tokens.
create or replace function public.list_platform_team_usable_links()
returns table(
  team_id uuid,
  site_slug text,
  site_enabled boolean,
  site_published boolean,
  site_available boolean,
  primary_hostname text,
  primary_domain_type text,
  registration_slug text,
  registration_open boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_platform_owner() then
    raise exception 'Platform owner access required';
  end if;

  return query
    select
      t.id,
      s.slug,
      s.enabled,
      (s.published_version is not null and published.version is not null),
      coalesce((
        s.enabled
        and s.published_version is not null
        and published.version is not null
        and public.is_public_omnisite(t.id)
      ), false),
      case when
        s.enabled
        and s.published_version is not null
        and published.version is not null
        and public.is_public_omnisite(t.id)
        then primary_domain.hostname
      end,
      case when
        s.enabled
        and s.published_version is not null
        and published.version is not null
        and public.is_public_omnisite(t.id)
        then primary_domain.type
      end,
      registration.slug,
      registration.registration_open
    from public.teams t
    left join public.team_sites s on s.team_id = t.id
    left join public.site_publications published
      on published.team_id = s.team_id
      and published.site_id = s.id
      and published.version = s.published_version
      and public.os_supported_snapshot(published.snapshot)
    left join lateral (
      select d.hostname, d.type
      from public.site_domains d
      where d.team_id = s.team_id
        and d.site_id = s.id
        and d.active
        and d.is_primary
        and d.detached_at is null
        and d.verification_status = 'VERIFIED'
        and d.provider_status = 'READY'
      limit 1
    ) primary_domain on true
    left join public.team_registration_settings registration
      on registration.team_id = t.id
    order by t.created_at desc, t.id;
end;
$$;

revoke all on function public.list_platform_team_usable_links() from public, anon;
grant execute on function public.list_platform_team_usable_links() to authenticated;
