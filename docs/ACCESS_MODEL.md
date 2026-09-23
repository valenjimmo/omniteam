# OmniTeam access model

This document records the owner's current product decisions and the implementation boundaries. Tenant isolation rules are in `TENANT_ISOLATION.md`.

## Owners and administrators

- **OmniTeam platform owner:** a separately provisioned `platform_owners` account. It can list teams and start a one-hour, read-only support session for a selected team. A reason is required and recorded in that team's audit log. The platform owner does not become a team member and cannot grant itself team subscriptions or write team data through ordinary RLS paths.
- **Swim team owner:** a team's `OWNER` membership. It can manage all modules the team has purchased, set member roles, delegate access assignment to selected admins, approve family registrations, and configure the team's registration link.
- **Team admin, coach, or parent:** a membership role is separate from module permissions. A parent or coach can be promoted to `ADMIN`; any guardian relationship remains attached. A delegated admin can assign access only for modules they have `MANAGE` access to. `VIEW` and `MANAGE` are the current permission levels.

## Parents and families

Parent registration starts at `/register/{team-slug}` when a team owner opens registration. The applicant creates or signs in to an individual account and submits family and swimmer names. No existing family link or team membership is granted by that submission. The owner or a delegated admin reviews it at `/team/access`; approval creates the family, swimmers, membership, and guardian link in one database transaction. The parent can then read their linked family at `/my-family`.

The owner's current preference is **one parent login per family**. Additional guardians are `family_contacts`, which are contact records without login rights. Do not share the parent account password with another person. If separate guardian access is requested later, use individual logins linked to the same family, with independent revocation and audit history; this is the stronger security model.

## Provisioning

Before use, reconcile and apply migrations according to [DATABASE_CHANGE_WORKFLOW.md](DATABASE_CHANGE_WORKFLOW.md). Create the initial team OWNER membership through a trusted process after the Auth user and profile exist. Provision the OmniTeam platform owner through a trusted database/service-role process by inserting the intended Auth user ID into `platform_owners`. Never expose the service-role key in a browser, and never offer public or team-admin writes to `platform_owners`.

## Platform-owner login

The OmniTeam owner uses an individual Supabase Auth identity in the application's own Supabase project. Store the login credential in Supabase Auth, ordinary contact/profile information in `profiles`, and platform authorization as a trusted `platform_owners.user_id` row. Never hard-code the owner's email, password, user ID, or privileged API key in the repository or Vercel environment variables. The owner's Supabase Dashboard login is a separate administrative identity for managing Supabase itself; it does not automatically grant access inside OmniTeam.

Provide a dedicated platform-owner sign-in route that authenticates through Supabase Auth, then checks server/database authorization before showing the support area. Require MFA for platform-owner support access and enforce its `aal2` assurance level in the database authorization functions, not only the page. Sign-out and session expiry should remove access. For troubleshooting, require the existing reason-recorded, time-limited team support session; do not grant a permanent unrestricted team membership. A team OWNER uses the normal team sign-in and remains scoped to that team.

`/platform/login` provides the dedicated platform-owner password sign-in and `/platform` is server-gated before rendering its owner console. The account must first be created in Supabase Auth and then granted platform-owner status through the trusted `supabase/scripts/provision_platform_owner.sql` operation. The owner dashboard can see all teams and subscription states, directly create an OmniSite team, apply mock plans, override module entitlements, archive/reactivate teams, and reach templates, audited support, and administration API tools. Its database mutations re-check platform-owner status and write team audit records. `/platform/mfa` enrolls or challenges a TOTP factor, and the shared database owner check requires `aal2` for every privileged operation.

The registration page requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The team owner configures a unique slug and opens registration at `/team/access`. Email confirmation should remain enabled; after verification the applicant returns to the registration page, signs in, and submits the request.

## Remaining security work before real teams

- Add explicit invitations/onboarding for coaches and additional staff. The current admin page can change permissions for existing team members but cannot create staff accounts.
- Add rate limits and abuse controls for public registration; add notifications for pending requests and approval results.
- Decide whether platform-owner support should ever permit writes. Current access is read-only.
- Review permission levels per action as OmniAthlete workflows are built. The current `MANAGE` level is broad within a module.
