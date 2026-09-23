# OmniSite milestone operations

This milestone is implemented and validated in a clean local Supabase stack. It
is not a claim that a remote Supabase project, DNS, or hosting provider has been
updated. The local validation used Supabase CLI 2.117.0, PostgreSQL 17, the real
`pg_jsonschema` 0.3.3 extension, Auth, PostgREST, and private Storage. See the
testing limits below before enabling customer sites.

## Data model and authorization

The existing `site_templates`, `team_sites`, `site_pages`, `site_assets`, and
`site_publications` remain authoritative. No parallel website model was added.
The existing mock subscription plans already grant OmniSite alone or within a
bundle; no live billing or new module entitlement was introduced.

- A template is a global, versioned starter configuration. The three existing
  layouts now have responsive typography, readable theme colors, keyboard focus,
  and structured rendering. Templates cannot contain tenant media. Creating a
  site copies its pages/theme under a team-row lock; retrying returns the existing
  site. Later catalog updates do not change that copy.
- `team_sites.settings` holds curated typography, favicon, social image, and SEO
  defaults. `enabled` permits incident-safe site suspension without deleting data.
- Saving the complete draft is one `save_site_draft` transaction with an expected
  revision. Browser table mutations have been revoked, including prior column
  UPDATE grants. `publish_site_revision` locks the same site and checks both draft
  revision and publication version; a stale save or publish must reload.
- A rollback copies a prior supported snapshot into a new publication. UPDATE of
  publication history is prohibited by a trigger. The active pointer is moved
  only by checked RPCs. Hidden pages/sections are not returned publicly.
- `site_domains` belongs to `(team_id, site_id)` through a composite FK. Hostnames
  are globally unique. `site_action_limits` is bounded to three counters per
  team/user. `site_catalog_writers` and `site_catalog_audit` are global platform
  records, not tenant records.
- Team operations require active membership, active team, current entitlement and
  MANAGE. VIEW can inspect and preview saved drafts. All state-changing RPCs
  recheck authority. Domain/media service functions also check the verified
  actor's membership and entitlement independently of the supplied IDs.
- Catalog writes require both platform-owner status and a separately provisioned
  `site_catalog_writers` row. An active support session disables catalog writes.
  Catalog access is never inferred from team OWNER or support permission.

Catalog writer provisioning is an explicit trusted operation. Use
`supabase/scripts/provision_site_catalog_writer.sql` with the intended platform
Auth UUID; do not batch-run the scripts directory. Existing platform-owner MFA
and broader platform security work remain outside this milestone.

## Content and publication compatibility

The private draft schema is version 2. Zod validates API input, template JSON,
drafts loaded for preview, and public snapshots. Frozen JSON Schemas in migration
`202609220001` are checked with Supabase `pg_jsonschema`; additional SQL validation
checks unique/reserved slugs, visible Home, heading structure, URLs and asset
ownership. Input is structured text, not HTML, CSS, JavaScript or template code.
The “Text” section uses heading/plain text; inline formatting is intentionally
not supported yet. Contact pages display owner-entered public information only;
there is no contact form, mail delivery, or import of private family data.

Safe version-1 snapshots remain readable with default settings. Legacy remote
image-URL sections and unsupported versions fail closed, rather than bypassing
current validation. Restore/rollback also validates against today's schema. For
an incompatible legacy draft, an operator must prepare a reviewed forward repair
using validated content; retain old publications for audit instead of modifying
history. Re-upload any legacy image that was not validated from bytes.

The public RPC strips team/site UUIDs and Storage keys, returning opaque image
handles. The renderer does not query draft tables or import other module records.

## Media lifecycle

`omnisite-assets` is now private. There are no browser Storage read/write policies.
Authenticated uploads go through the Node route `/api/omnisite/media`:

1. Authenticate and authorize the exact team/site, then enforce a database-backed
   upload rate limit. Bound the request stream to 2 MiB.
2. Decode the actual bytes with sharp. Accept only nonanimated PNG/JPEG/WebP with
   matching extension and MIME, 16–3000 pixels per dimension and bounded pixels.
3. Re-encode as WebP and strip metadata/trailing payloads. Generate a server UUID.
4. Reserve a PENDING metadata row before uploading to
   `{team_id}/{site_id}/{asset_id}.webp`, with overwrite disabled; mark READY only
   after upload succeeds. Interrupted uploads remain tracked for retry/cleanup.

Draft media requires cookie-authenticated VIEW and exact site/asset ownership.
Public media requires a handle referenced by the active public snapshot plus a
READY asset on the exact team/site. The response is streamed with `no-store`,
`nosniff`, and restrictive image CSP. No signed URL or public Storage key is
exposed. This makes taking a site offline or archiving a team effective on the
next request, at the cost of an application/Storage request for each image load.
It is deliberately not a CDN projection in this milestone.

Deleting a saved-draft or historical-publication asset is blocked, preserving
rollback. Unreferenced/PENDING assets can be removed in Media. Deletion first
marks DELETING under the site lock, then removes Storage bytes, then metadata.
If interrupted, retry it. Replacing a logo does not automatically destroy the old
publication's logo. Each site is limited to 200 assets and 2 MiB per object.

The cleanup script and guarded test-reset API traverse nested team/site folders.
Archive retains bytes and metadata privately. Hard-delete/test purge still
require Storage removal first; SQL refuses deletion while team objects remain.
Domain rows and action limits are included in tenant cleanup. Global templates,
catalog audit, and Auth identities are preserved. An already downloaded or
previously cached legacy public image cannot be recalled by changing the bucket.

## Public routing and canonical addresses

`resolver.ts` is shared by middleware and public server loading. It normalizes
and validates the actual Host header, never arbitrary `X-Forwarded-Host`.

1. Exact app hosts in `OMNISITE_APP_HOSTS` or the hostname of
   `NEXT_PUBLIC_SITE_URL` serve platform routes, including `/sites/{slug}`.
2. A single nonreserved label beneath `OMNISITE_ROOT_DOMAIN` resolves its exact
   site slug only when `OMNISITE_MANAGED_DOMAINS_READY=true`.
3. Other hosts must match an active, ownership-verified, provider-ready
   `site_domains` row exactly. Unknown or malformed hosts fail closed.
4. Public server loading rechecks that the Host resolves to the requested site
   before loading the publication. It then checks team/entitlement/site activity.

Configure your proxy/provider to preserve the original Host, and restrict origin
access to that deployment. Include every intended Vercel preview hostname in the
explicit app-host allowlist. A caller cannot enable a host through forwarded
headers or query parameters. Custom hosts expose only public page routes,
robots/sitemap, and read-only public media; platform/auth APIs stay on app hosts.

Primary activated custom hosts are canonical. Otherwise the configured managed
subdomain is canonical when enabled, otherwise `/sites/{slug}` on
`NEXT_PUBLIC_SITE_URL`. Secondary/fallback addresses redirect only to a validated
active canonical host. Every page supplies title, description, canonical and
Open Graph metadata. Sitemaps list only visible published pages. Draft editor and
template routes are `noindex, nofollow` and private/no-store.

Database fetches and public responses are uncached (`no-store`); no ISR or shared
publication cache is used. Nonce-based script CSP requires dynamic page rendering.
The CSP excludes unsafe-eval, external scripts, external images and frames. Inline
styles remain permitted for validated theme tokens and existing styled-jsx;
arbitrary user styles cannot enter the schema. HSTS is opt-in via
`OMNISITE_HTTPS_READY`, without `includeSubDomains`.

## Domain ownership versus provider activation

Claiming uses IDNA ASCII normalization, lowercase, a single trailing-dot removal,
and the public suffix list via tldts. Schemes, paths, ports, wildcards, IPs,
private/internal suffixes, public-suffix-only hosts and reserved platform hosts
are rejected. Unicode lookalikes normalize to distinct punycode keys; they never
inherit another hostname's authority. The UI displays normalized ASCII for review.

The server generates a high-entropy TXT token. Verification uses bounded DNS TXT
queries to `_omnisite.{hostname}` and exact `omnisite-verification={token}` matching.
No HTTP request is made to a claimed domain, avoiding URL-fetch SSRF/rebinding.
Tokens expire after seven days and can be renewed; renewal takes the host offline.
Verification is limited to six domain actions per team/user/hour.

The provider interface ships with a manual adapter. There are no Vercel API
credentials or automatic deployment changes. After attaching a hostname to the
correct hosting project, configuring the provider's required DNS records, and
checking valid TLS/routing, the operator may add its exact name to the server-only
`OMNISITE_PROVIDER_READY_HOSTS` allowlist. Activation checks TXT again and requires
that attestation. Ownership alone stays provider-pending. Then the client may
choose the active domain as primary.

Detach removes routing and primary status immediately but retains the unique
claim/audit record until explicit tenant maintenance. A different team cannot
reclaim it automatically. Recovering a detached hostname is a reviewed support
operation with fresh ownership verification; there is no automatic reclamation
or token reuse. Detach before transferring/selling a domain or removing provider
configuration. Continuous background ownership re-verification is deferred;
operators must review domain ownership changes and stale configuration.

## Migration and administrator checklist

1. Back up the database and Storage independently. Reconcile existing migration
   history using `DATABASE_CHANGE_WORKFLOW.md` before any `db push`.
2. Apply prior migrations, then these forward-only migrations in order:
   - `202609220001_omnisite_schema.sql` (pg_jsonschema and frozen validators).
   - `202609220002_omnisite_operations.sql` (private bucket, RPC writes, revisions,
     settings, catalog authority/audit, immutable history).
   - `202609220003_omnisite_domains_media.sql` (domain lifecycle, media state and
     service-only operations, action counters and cleanup).
   - `202609220004_omnisite_public_projection.sql` (narrow public snapshot/media).
3. Run `supabase/tests/omnisite_milestone.sql` on disposable/local Supabase. It is
   rollback-only. Inspect existing drafts/publications for legacy incompatible
   images. Do not deploy the old editor after revoking its direct write paths.
4. Configure `.env.example` variables and a server-only service-role key. Keep
   secrets out of the client, templates, logs and Git. No provider token is needed.
5. Provision catalog-write authority for the intended platform owner if needed.
6. Enable OmniSite through the existing mock plan or platform entitlement console.
   Ensure the intended user is an active team OWNER or OmniSite MANAGE member.
7. Choose a template, create a site, edit pages, upload a logo, save, preview and
   publish. Check `/sites/{slug}`, hidden content, media, metadata and rollback.
8. For managed subdomains, choose the root domain; attach its wildcard to hosting,
   add the exact DNS records required by that provider, verify TLS, then enable
   `OMNISITE_MANAGED_DOMAINS_READY`. The bare root is not a customer site.
9. For custom domains, follow the separate client DNS checklist, verify TXT, attach
   hosting, attest readiness, activate, and set primary. Check secondary redirects.
10. Test VIEW-only and unrelated-team users before onboarding real customer data.

If a release fails, take the site offline or detach affected domains; keep retained
content private. Prefer a forward fix. Do not reverse the bucket to public or
restore broad table-write grants. Database backups contain immutable publication
snapshots but not the Storage image bytes needed to reproduce them. Restore both,
then verify asset metadata/references and hosting configuration before enabling.

## Verification and remaining operational limits

- `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` are the
  application checks. Lint targets the OmniSite changes; Next build also checks
  the broader app. The old interactive `next lint` entry was replaced by ESLint.
- `npm run test:db` applies all tracked migrations to a disposable PGlite PostgreSQL
  instance and runs the rollback role/security suite. **PGlite lacks pg_jsonschema;
  the runner visibly substitutes that one function.** This proves SQL execution,
  RLS/privileges, tenant keys, revision conflict checks and domain/media transitions,
  not the extension's behavior or multi-connection race behavior.
- Phase 1 was also run against a clean Supabase CLI stack with `supabase db reset`.
  All tracked migrations and the seed applied twice from clean state. Both
  rollback SQL suites passed with the real `pg_jsonschema` extension. The local
  integration test used real Auth JWTs and separate concurrent REST clients to
  prove one-winner revision saves and publishes. It also proved private Storage,
  denied direct browser writes/anonymous reads, controlled draft/public media,
  referenced and unused deletion behavior, purge refusal while objects remain,
  successful cleanup/hard-delete, and preservation of Auth users and shared
  templates. Run it with the local variables returned by
  `supabase status -o env`, a production build configured for those local values,
  and the app running at `OMNISITE_TEST_APP_URL`. No remote DB tests were run.
- Phase 2 adds renderer schema v3 with structured rich text, OmniSite-owned news
  and public events. `supabase/tests/omnisite_jsonschema.sql` is the real
  `pg_jsonschema` suite for these shapes and hostile marks. The local integration
  test also publishes v3 content and reconciles stale `PENDING` media through the
  authenticated application endpoint.
- Phase 3 was run against the explicitly marked test project
  `pasfnxtnhytzpiexkjvk`. Remote migration history and schema matched a clean
  shadow build, all rollback SQL suites passed, and `npm run test:staging`
  exercised four real Auth identities, checkout provisioning, editing, private
  media, preview/publication/rollback, cross-team denials, lifecycle failures,
  incompatible snapshots, authenticated responsive/keyboard/confirmation/error
  UX, axe checks, database and Storage recovery, purge, and hard deletion. The
  suite removes its teams, Storage objects, and Auth users after each run.
- `npm run test:browser` runs Chromium against an isolated renderer fixture, not a
  live Supabase account. Install Playwright Chromium or set `CHROME_PATH` to a local
  Chrome binary. It checks all three layouts, both surfaces, three viewport widths,
  keyboard skip links, hidden content, overflow, mobile preview container layout,
  and axe WCAG A/AA rules. Live Auth/Storage/provider integration still needs staging.
- Rate limits are database-backed for team operations and catalog writes. Enforce
  provider/WAF request and bandwidth limits for public pages/media and failed
  authentication; application code does not attempt an unreliable in-memory
  distributed public-IP limiter.
- External news/events feeds, contact forms, template upgrade merges, automatic
  provider API attachment, automated domain rechecks, detached
  domain self-service recovery, publication pruning and public CDN media delivery
  are explicitly deferred. No private module data is published.

Primary technical references: [Supabase JSON schema validation](https://supabase.com/docs/guides/database/extensions/pg_jsonschema),
[Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy).
