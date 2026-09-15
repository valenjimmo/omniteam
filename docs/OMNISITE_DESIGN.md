# OmniSite design

Status: first implementation slice exists locally, but its migration has not been executed against Supabase. News, Events, custom domains, additional page-builder controls, live database isolation tests, and automated Storage cleanup remain. The canonical feature names remain in [OMNITEAM_STRUCTURE.md](OMNITEAM_STRUCTURE.md). OmniSite is a separately purchasable module; every website belongs to one team.

## Goal and user journeys

An entitled team owner or delegated OmniSite manager chooses a predefined template, uploads a team logo, selects team colors, edits pages, previews the result, and publishes a public website. The same site can later display approved content from other purchased modules without requiring them. OmniTeam's platform owner can add templates to the shared catalog; teams cannot alter the shared template definitions.

Initial public URL: `/sites/{team-slug}`. Reserve a clean route/domain resolver so a team subdomain or verified custom domain can point to the same published site later. An archived team, expired OmniSite entitlement, or unpublished site must not expose its website. Define a safe unavailable response rather than falling back to another team's site.

## Template model

Separate **layout** from **template** from **team site**:

- A layout is a versioned, code-reviewed set of supported page sections and rendering rules. The first release can ship 2–3 responsive layouts, such as Classic, Bold, and Minimal. Adding a fundamentally new section or renderer requires code.
- A template is a platform-owned catalog record selecting a layout version and providing starter pages, section order, typography choices, default theme, and placeholder images. The platform owner can create, duplicate, edit, preview, publish/unpublish, and retire template records in an owner-only template manager. Creating a new template from supported layouts/sections needs no code deployment.
- A team site is a tenant-owned copy of a chosen template's editable content and settings. Changes to the global template never silently change an existing team's published site. A later template upgrade is an explicit preview-and-apply action, preserving team content and branding where possible.

Use a validated, versioned JSON section schema rather than arbitrary HTML or script injection. Supported first-release sections: hero, rich text, image, call to action, card grid, news list, and events list. Rich text accepts a restricted set of formatting and safe links. Template previews use sample data, never real tenant data.

## Team customization

- Branding: one primary logo, optional alternate logo for dark backgrounds, site name, favicon, primary/secondary/accent colors, and a light/dark surface choice. Store image files in private-to-edit, public-to-read paths namespaced by `team_id`, with type, size, dimension, and ownership validation. Public URLs must not permit directory listing or cross-team overwrite.
- Validate hex colors and calculate contrast for text, buttons, and navigation. Offer accessible defaults and a preview warning or automatic text-color selection when contrast fails. Use CSS custom properties for theme tokens so every supported layout responds consistently.
- Page builder: create, rename, reorder, duplicate, hide, and delete pages and sections; edit text, images, links, navigation, SEO title/description, and social preview image. Reserve system routes and unique slugs per team. Offer desktop/mobile preview and explicit save/publish controls.
- Publishing: drafts stay private to authorized team users; visitors see only a published snapshot. Publishing is atomic and auditable, with a previous version available for rollback. Keep a server-side publication boundary: do not expose draft rows through public RLS or client APIs.
- News and Events: OmniSite owns website-authored posts and events. If OmniSchedule/OmniMeet is purchased, an explicit adapter can publish approved event summaries; do not copy or reveal internal event/registration data automatically. If OmniAthlete is purchased, use only explicitly approved group data from `src/modules/omniathlete/site-integration.ts`; never publish swimmers, families, attendance, or contact details by default.

## Authorization and tenant data

Every site, page, revision, asset metadata row, post, event, and domain mapping carries non-null `team_id`. Relationships between them use composite `(team_id, id)` foreign keys; ordinary updates cannot change `team_id`. Team editors require active membership, active `omnisite` entitlement, and OmniSite `MANAGE` permission (team OWNER included). Public visitors can read only published projections for active entitled teams. A team user with `VIEW` can preview drafts but cannot publish. Platform template management uses platform-owner authorization and must not reuse tenant support-session reads as a write permission.

Suggested tables: global `site_layouts`/`site_templates` catalog (trusted writes only); tenant `team_sites`, `site_pages`, `site_assets`, `site_publications`, `site_posts`, `site_events`, and later `site_domains`. Use a unique `(team_id, page_slug)` index and a unique published hostname. Publication records should retain the exact validated content/theme snapshot and source revision. Store only storage object keys in the database, and partition files by team.

Any server function, revalidation job, cache key, image transform, search index, and domain lookup must resolve exactly one authorized team before loading content. Domain verification must prove control before activation and prevent two teams claiming the same hostname. Support team closure, test purge, and hard deletion by including OmniSite rows/assets in lifecycle cleanup; purge must not remove shared global templates.

## First delivery slice

1. Migration and RLS for template catalog, team sites/pages/assets/publications, plus storage policies and lifecycle cleanup. Follow [DATABASE_CHANGE_WORKFLOW.md](DATABASE_CHANGE_WORKFLOW.md); do not apply migrations implicitly during Vercel deployment.
2. Platform-owner template manager: create and duplicate template configurations from approved layouts/sections, preview with sample content, and publish/retire versions.
3. Team owner/editor flow: choose template, set colors, upload logo, edit Home/About/Contact starter pages, preview, publish, and roll back one publication.
4. Public site route with safe tenant resolution, responsive rendering, SEO metadata, and unpublished/archived behavior.
5. Two-team security tests, publication/draft tests, entitlement tests, and browser checks for mobile and desktop. Then add News, Events, custom domains, and cross-module content adapters in separate increments.

## Current implementation notes

Migration `202609140008_omnisite.sql` must be applied only after earlier migrations are reconciled and recorded as described in [DATABASE_CHANGE_WORKFLOW.md](DATABASE_CHANGE_WORKFLOW.md). It creates the initial template catalog and three starter layouts. `/omnisite/templates` is the platform-owner catalog editor; `/omnisite` is the team editor; `/sites/{slug}` renders only a published snapshot. An OmniSite-only team can use these flows. No remote database or Vercel project was changed by this implementation.

Logo files use the public `omnisite-assets` bucket. Its URLs are public to anyone who knows them, including before a page is published; do not use it for private documents or photographs. Files must be removed through the Storage API before test purge or hard team deletion. `supabase/scripts/cleanup_omnisite_assets.mjs` previews a team's files by default and requires `--delete` to remove them; the SQL cleanup function refuses to proceed while files remain. This avoids orphaned objects, but automated all-team asset cleanup is still needed.

The current editor covers starter-page titles, SEO description, visibility, section text, cards, and adding/reordering/removing supported sections. Full page creation, navigation ordering, image placement, template migration, domain verification, and a guarded public media workflow are later work. Template records can be added without deploying code, but a new renderer/section type still requires code.

`supabase/tests/omnisite_isolation.sql` is a rollback-only database smoke test for cross-team foreign keys, immutable team IDs, unpublished/archived visibility, and template/publication separation. It has not been executed because the local Docker daemon is unavailable and the remote project's migration history is not yet reconciled. Client model tests, typecheck, and build can run without a database; they do not replace live RLS tests with two authenticated teams.

## Decisions still open

- Exact starter layouts and visual direction. The first release can use three neutral, swim-team-oriented layouts and refine them with owner feedback.
- Whether platform-owned templates may include licensed photos; use original or licensed assets only.
- Whether team owners may use custom fonts or custom CSS. Default: curated fonts, no arbitrary CSS/JS.
- Custom domain verification and hosting provider flow; ship the route/domain abstraction now, activate custom domains later.
