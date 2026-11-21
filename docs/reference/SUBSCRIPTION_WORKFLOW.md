# Mock subscription workflow

`/subscribe` is a six-stage, simulated commercial onboarding flow. It does not
collect payment information or activate live billing. Non-secret draft values
are kept in browser session storage while the user authenticates or moves among
stages; the database remains authoritative.

1. **Owner account** — the user creates an individually verified Supabase Auth
   account or signs in. The stage collects first name, last name, email, and a
   password when authentication is required. A signed-in user can update their
   own first and last name through `update_own_profile_names`; passwords are
   never included in checkout storage or review.
2. **Club identity** — required club name and globally unique slug, plus an
   optional 2–5 character uppercase alphanumeric club code.
3. **Location and contact** — required city, state, IANA timezone, and
   team-scoped owner phone snapshot, plus an optional free-text primary
   facility. The phone must contain 10–15 digits and may use a leading `+` and
   display separators. The facility is limited to 160 characters.
4. **Plan** — one active catalog entry with a supported public plan key.
5. **Review** — Owner, Club, Location and contact, and Plan sections show the
   collected values and provide edit actions. Empty optional values are omitted.
   The order is explicitly labeled as a simulation, shows a $0 payment today,
   and states that completion starts a 30-day mock trial.
6. **Ready** — after trusted completion returns the new team ID, the browser
   replaces the route with `/dashboard/setup/[teamId]` after a short status
   display.

## Catalog and public-plan boundary

The browser reads active rows from `subscription_plans`, but submits only the
stable `public_key`. Trusted database code maps the three accepted public keys
to normalized internal plan IDs and rejects unsupported or inactive plans:

| Public key | Internal plan ID | Current package |
| --- | --- | --- |
| `website` | `omnisite_starter` | OmniSite Starter |
| `management` | `team_manager` | OmniTeam Manager |
| `complete` | `website_manager` | Website + Team Management |

`team_subscriptions.plan_id` continues to reference the internal catalog ID;
the browser cannot choose an internal ID or grant entitlements directly.
OmniTeam Manager includes OmniAthlete and OmniInsights. The retained internal
keys for OmniSchedule, OmniVolunteer, and OmniConnect represent integrated
OmniAthlete capability areas, not separate customer products. OmniMeet Host is
not one of these recurring mock plans. Payments are shared platform
infrastructure and are not a selectable module.

## Trusted checkout and canonical profile

`begin_mock_checkout` is an authenticated `SECURITY DEFINER` boundary. It
requires a verified caller, restores only that caller's missing global profile
when necessary, validates every submitted field independently of the client,
maps the public plan key through trusted database code, and writes a one-hour
pending `mock_checkout_sessions` row owned by `auth.uid()`. The pending row
holds the normalized internal plan ID, public plan key, and club profile values;
it does not reserve the slug. Existing slug conflicts are reported early, while
the unique `teams.slug` index remains the completion-time race boundary.

`teams` is the tenant boundary and canonical owner of the club profile:
`name`, `slug`, optional `club_code`, `city`, `state`, `timezone`,
`owner_phone`, and optional `primary_facility`. `owner_phone` is a contact
snapshot for this team, not global person identity. `organizations` is the
current provisioning/account container; its duplicated name is not profile
authority. Club ownership is derived from an active `OWNER` row in
`team_memberships`, never from a client-supplied owner ID or a `teams.owner_id`.

`complete_mock_checkout` accepts a checkout UUID but selects and locks only a
session owned by `auth.uid()`. It rejects expired, cancelled, incomplete, or
newly inactive-plan sessions and rechecks that the stored public key maps to the
same internal plan. In one database transaction it creates the organization and
team, creates the caller's active `OWNER` membership, provisions the catalog
module entitlements, creates the normalized `TRIALING` subscription with
`billing_mode = 'MOCK'` and a 30-day trial, marks the checkout complete, and
writes the subscription audit event. Any failure rolls the operation back.
Retrying an already completed checkout owned by the caller returns its original
team ID instead of provisioning a second team.

The completion response is only a team identifier; it does not confer access by
itself. `/dashboard/setup/[teamId]` gets the authenticated user on the server,
requires that user's active membership for the route team, reads the persisted
team, and calls the independently membership-authorized
`get_team_setup_checklist`. Missing authentication redirects to `/login` with
the setup route as `next`; missing membership, team data, or checklist access
redirects to `/dashboard`. The checklist and later profile updates remain
team-scoped. Setup completion is derived from persisted required profile rows,
not stored as an onboarding flag.

## Migration history

- `202609150001_mock_subscriptions_and_test_reset.sql` creates the original
  catalog, pending mock checkout, normalized team subscription, entitlement
  provisioning, audit event, and guarded test-reset model.
- `202610190004_checkout_profile_repair.sql` extends the original begin-checkout
  boundary so a surviving verified Auth user can restore only their own missing
  global profile after a reset or hard deletion.
- `202611180001_club_profile_foundation.sql` makes `teams` the canonical club
  profile, adds its validated fields and unique slug, and introduces the trusted
  public-to-internal plan mapper.
- `202611190001_club_onboarding.sql` adds catalog public keys and pending profile
  fields, replaces the old three-argument checkout RPC, cancels incompatible
  legacy pending sessions, and adds atomic, retry-safe completion for the
  six-stage flow.
- `202611190002_club_setup_checklist.sql` does not change the subscription row
  model; it supplies the membership-authorized, derived setup projection used by
  the post-completion destination and extends the team profile with its
  platform-level logo field.

Displayed prices remain placeholders. Live provider checkout, webhooks,
invoices, cancellation, retries, plan changes, and other live-billing behavior
are outside this mock workflow.
