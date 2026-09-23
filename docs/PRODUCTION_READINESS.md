# Production security and release runbook

## Required controls

Platform-owner access requires a password session plus a verified TOTP factor
(`aal2`). The password login routes provisioned owners to `/platform/mfa`; every
privileged database function continues through `is_platform_owner()`, which now
rejects `aal1`. Each owner must use an individual account and keep its documented
recovery process outside the application repository. Removing or resetting a factor is a
Supabase Auth administrator action and must be recorded in the incident log.

The daily `Production operations` GitHub workflow performs three controls:

1. It removes Storage objects and metadata for asset rows left in `PENDING` or
   `DELETING` for more than two hours. It never removes a `READY` asset.
2. It rechecks active custom-domain TXT ownership every 30 days. A failed check
   immediately disables that hostname and records a critical security event.
3. It emits a structured production snapshot and runs public authentication,
   error-route, and security-header smoke checks.

Configure repository secrets `PRODUCTION_SUPABASE_URL` and
`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`. Configure variable
`PRODUCTION_SMOKE_URL`; optionally set `PRODUCTION_SMOKE_SITE_SLUG` to a stable
published test site. Protect workflow changes with required review. GitHub Actions
failure notifications are the initial alert channel; the on-call release owner
must subscribe to failed-workflow notifications. JSON lines in the job log and
`security_events` are the structured evidence. Retain security events for at
least 180 days and review critical events at the start of each business day.

Publication snapshots are immutable and retained indefinitely by default so a
team can roll back and an incident can be reconstructed. Any future pruning must
first identify every referenced asset, preserve the current publication and the
minimum agreed rollback history, and ship as a separately reviewed migration and
maintenance operation. Draft-referenced or publication-referenced assets must
never be deleted. Database backups alone do not contain Storage bytes; backup and
restore both systems together.

## Incident ownership

The platform owner on call owns triage, containment, customer communication, and
the incident timeline. The release owner owns application rollback or forward
fixes, database migration decisions, and post-recovery smoke tests. The Supabase
operator owns database/Auth/Storage restore; the Vercel/DNS operator owns routing,
TLS, WAF, and domain detachment. One person may hold several roles, but the log
must name who performed each action.

For suspected tenant exposure, disable the affected site or domain first, revoke
compromised sessions and service keys, preserve logs, then determine the affected
teams and time range. For a bad application release, use Vercel's prior deployment
rollback and run `npm run smoke:production`. For a bad additive migration, prefer
a reviewed forward migration. Restore the database and `omnisite-assets` from the
same recovery point only when a forward repair is unsafe, then verify publication
and asset references before re-enabling traffic. Never use the test reset command
against production.

## Release gate

Every production release follows this order:

1. Confirm the intended branch and inspect the complete diff, including generated
   or untracked files. Do not deploy a dirty working tree.
2. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, and the
   local Supabase integration suite when database behavior changed.
3. Commit the reviewed change set. Record that commit SHA in the deployment.
4. Verify the linked Supabase project, run `supabase db push --dry-run`, apply
   pending migrations, and confirm local/remote migration history matches.
5. Deploy the exact reviewed commit to Vercel. Run `npm run smoke:production` and
   inspect the production security snapshot.
6. Confirm platform login requires TOTP, one published site renders, an unknown
   site returns 404, private media stays private, and the operations workflow can
   be dispatched successfully.

Stop the release if any check fails. Record the commit, migration versions,
deployment URL, operator, start/end time, checks, and rollback decision in the
release log. Domain and asset policy exceptions require a dated owner decision.
