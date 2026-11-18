# OmniTeam audit backlog

This document is the collection point for audit results that may be implemented
later. An audit records observed behavior and proposed follow-up work; it does
not by itself authorize a product, architecture, database, or entitlement
change.

Before implementing an item, confirm product names and ownership against
`OMNITEAM_STRUCTURE.md`, architecture guidance against `PRODUCT_STRUCTURE.md`,
tenant requirements against `TENANT_ISOLATION.md`, and database work against
`DATABASE_CHANGE_WORKFLOW.md`.

## Status definitions

- `AUDITED`: Findings recorded; no implementation has been approved or started.
- `READY`: Scope and acceptance criteria have been confirmed and a focused
  implementation prompt can be created.
- `IN PROGRESS`: Implementation is underway.
- `BLOCKED`: A documented product or technical decision is required.
- `VERIFIED`: The change is implemented and its acceptance checks pass.
- `CLOSED`: No change is required or the finding was intentionally declined.

## Audit index

| Step | Audit | Area | Status | Implementation prompt |
| --- | --- | --- | --- | --- |
| Prompt 3 | Club registration validation | Client, server, database | AUDITED | Source prompt captured |
| 4 | Club/team data model | Supabase schema, TypeScript types | AUDITED | Not created |
| Prompt 2 | Club subscribe flow | Client flow, Supabase RPCs, post-registration routing | AUDITED | Source prompt captured |
| Prompt 4 | Club registration review | Client review summary and step editing | AUDITED | Source prompt captured |
| Prompt 5 | Club creation boundary | Supabase RPCs, ownership, setup completion, redirect | AUDITED | Source prompt captured |
| Prompt 6 | Club setup checklist | Dashboard checklist and progress logic | AUDITED | Source prompt captured |
| Prompt 7 | Family/member join baseline | Family registration form, approval RPC, persisted roster data | AUDITED | Source prompt captured |

## Prompt 3: Club registration validation

### Objective

Inspect the current client and server validation for club registration and
identify which requested rules are missing. This entry records the audit only;
no implementation was performed.

### Relevant implementation

- `src/app/subscribe/page.tsx`
- `supabase/migrations/202610190004_checkout_profile_repair.sql`
- `supabase/migrations/202609150001_mock_subscriptions_and_test_reset.sql`
- `supabase/migrations/202609230004_omniathlete_phase0_shell.sql`

### Existing validation

- Owner account: first name, last name, and email are required in the client;
  password has a client-side minimum of eight characters.
- Team name: the client and server require 2-120 characters after trimming.
- Plan: the client requires a selected catalog plan; the server requires that
  the selected internal plan exists and is active.
- Timezone: the client exposes six fixed choices. The server only requires a
  trimmed value between 1 and 80 characters, so it does not establish that the
  value is a valid IANA timezone.
- Organization slug: the database already restricts non-null slugs to lowercase
  alphanumeric segments separated by hyphens and has a unique partial index.
  Club registration does not currently collect the slug, and the database rule
  does not enforce a 3-40 character length.
- `club_code`, `owner_phone`, `city`, and `state` are not currently collected by
  the club-registration flow.

### Rules to add or update

| Field | Required rule | Short error message | Current gap |
| --- | --- | --- | --- |
| `slug` | Unique; lowercase letters, numbers, and hyphens; 3-40 characters | Use 3-40 lowercase letters, numbers, or hyphens. | Format and uniqueness exist in the database, but length and registration-flow validation are missing. |
| `club_code` | Optional; when present, 2-5 uppercase alphanumeric characters | Use 2-5 uppercase letters or numbers. | Field and validation are absent. |
| `timezone` | Valid IANA timezone | Choose a valid timezone. | Server checks only string length. |
| `owner_phone` | Basic phone format | Enter a valid phone number. | Field and validation are absent. |
| `city` | Non-empty after trimming | Enter a city. | Field and validation are absent. |
| `state` | Non-empty after trimming | Enter a state. | Field and validation are absent. |
| `plan` | One of `website`, `management`, or `complete` | Choose a valid plan. | Current flow accepts active internal catalog IDs instead of this public value set. |

### Decisions required before implementation

- Confirm that `slug`, `club_code`, `owner_phone`, `city`, and `state` should be
  persisted as club-registration data, and identify the owning table for each.
- Confirm whether `slug` is required during initial registration or may be
  assigned later. The existing database column permits null.
- Define the accepted basic phone pattern and whether values should be stored in
  a normalized form.
- Define whether state is free text, a subdivision code, or country-dependent.
- Confirm the public-plan mapping:
  - `website` -> `omnisite_starter`
  - `management` -> `team_manager`
  - `complete` -> `website_manager`
- Decide how server-side IANA timezone validation will be maintained and tested.

### Implementation acceptance criteria

- The same field rules are represented in shared client-facing validation and
  enforced independently by the trusted server operation.
- Client validation gives the short field-specific messages above.
- Direct server calls cannot bypass the rules.
- Slug uniqueness handles concurrent registrations and returns a clear conflict
  message.
- Any new persisted club-owned data follows the database change workflow and
  includes appropriate tenant constraints and isolation tests.
- Tests cover each boundary, malformed values, trimming behavior, omitted
  optional `club_code`, duplicate slugs, and all three allowed plans.
- Existing internal subscription plan IDs remain an implementation detail and
  are not accepted as untrusted public plan values unless explicitly intended.

## Step 4: Club/team data model

### Objective

Compare the current Supabase schema and TypeScript types with the minimum club
model: club name, slug, club code, location, timezone, owner phone, primary
facility, season type, plan, and owner identity. This entry records the audit
and proposed Supabase work only; no schema or application changes were made.

### Relevant implementation

- `supabase/migrations/202609110001_initial_schema.sql`
- `supabase/migrations/202609150001_mock_subscriptions_and_test_reset.sql`
- `supabase/migrations/202609230004_omniathlete_phase0_shell.sql`
- `src/app/dashboard/page.tsx`
- `src/app/platform/console-client.tsx`
- `src/app/platform/team-links.ts`

### Existing schema and types

- Club name is represented by required `organizations.name` and `teams.name`
  columns. The current onboarding flow creates one of each with the same name.
- `organizations.slug` has a URL-safe lowercase alphanumeric/hyphen constraint
  and a unique partial index, but remains nullable and has no 3-40 character
  limit.
- `teams.timezone` is required and defaults to `America/Los_Angeles`, but is not
  validated against the IANA timezone catalog.
- A team's subscription plan is normalized through
  `team_subscriptions.plan_id -> subscription_plans.id`.
- Club ownership is normalized through an active `team_memberships` row whose
  role is `OWNER`. Its `user_id` references `profiles.id`, which references
  `auth.users.id`.
- TypeScript uses page-local partial types for teams, plans, subscriptions, and
  links. There is no committed generated Supabase `Database` type covering the
  schema.

### Missing or incomplete model elements

| Field | Current state | Gap |
| --- | --- | --- |
| `club_name` | Required organization and team names exist. | Canonical ownership of the duplicated name should be confirmed; no new field is needed merely to rename it. |
| `slug` | Nullable `organizations.slug` is unique and URL-safe when present. | Required status and 3-40 character length are missing. |
| `club_code` | Absent. | Optional constrained value is missing. |
| `city` | Absent. | Required location value is missing. |
| `state` | Absent. | Required location value is missing. |
| `timezone` | Required text exists. | IANA validation is missing. |
| `owner_phone` | Absent. | Required phone value and its ownership/normalization decision are missing. |
| `primary_facility` | Absent. | Optional value is missing; a future facility entity may be preferable to permanent free text. |
| `season_type` | Absent. | Optional constrained value is missing. |
| `plan` | Normalized internal subscription plan exists. | Public values `website`, `management`, and `complete` are not modeled directly. |
| `owner_id` | OWNER membership relationship exists. | No direct club column; adding one would duplicate the existing authorization relationship. |
| TypeScript database types | Page-local partial types exist. | Generated row, insert, update, enum, relationship, and RPC types are missing. |

### Proposed Supabase changes

- Add `club_code`, `city`, `state`, `owner_phone`, `primary_facility`, and
  `season_type` to the confirmed club-owning table through a tracked migration.
  Do not choose `organizations` versus `teams` until their intended cardinality
  and ownership are confirmed.
- Constrain a non-null `club_code` to `^[A-Z0-9]{2,5}$`.
- Require non-empty trimmed `city` and `state` values after existing rows have
  been backfilled.
- Constrain a non-null `season_type` to `year_round`, `seasonal`, or `summer`.
- Define and enforce the accepted phone format and normalization policy before
  making `owner_phone` required.
- Make the canonical club slug required and constrain it to 3-40 lowercase
  letters, numbers, and single hyphen-separated segments. Preserve database
  uniqueness for concurrency safety.
- Validate `teams.timezone` against PostgreSQL's IANA timezone catalog from a
  trusted database operation or trigger; do not rely on a string-length check.
- Keep `team_subscriptions.plan_id` as the normalized subscription source of
  truth. If the public values are required, add a constrained public package
  key or trusted mapping:
  - `website` -> `omnisite_starter`
  - `management` -> `team_manager`
  - `complete` -> `website_manager`
- Do not add a redundant `teams.owner_id` by default. Continue using an active
  OWNER membership, and expose an owner through a view or trusted RPC if a
  single-row projection is required.
- Generate Supabase TypeScript types after the migration and commit a shared
  `Database` type. Do not introduce Prisma.

### Decisions required before implementation

- Confirm whether a club is the `organization`, the `team`, or a one-to-one
  composition of both, and identify the canonical owner of club profile data.
- Confirm whether one team may have multiple OWNER memberships. If exactly one
  is required, define and enforce that invariant without adding conflicting
  authority sources.
- Decide whether `owner_phone` describes a person, a club contact number, or a
  registration-time snapshot. Personal data should not be duplicated across
  teams without a deliberate reason.
- Decide whether `primary_facility` is temporary free text or a relationship to
  a future team-owned facility table.
- Confirm whether public plan keys are an API contract or only UI labels.
- Plan the backfill for required fields on existing teams before applying
  `not null` constraints.

### Implementation acceptance criteria

- All schema changes are delivered in a tracked migration following
  `DATABASE_CHANGE_WORKFLOW.md`.
- The chosen club-profile storage preserves `team_id` as the security boundary,
  has appropriate RLS, and includes two-team isolation tests.
- Required fields are backfilled before `not null` constraints are applied.
- Slug format, length, and uniqueness are enforced by the database.
- Timezone values are rejected unless recognized IANA names.
- Club code and season type boundaries are covered by database tests.
- Subscription state remains normalized and public plan values cannot bypass
  active-plan checks or server-side entitlement provisioning.
- Owner authority continues to come from authenticated active membership, not
  a client-supplied user ID.
- Generated Supabase TypeScript types reflect the final schema and RPCs, and
  relevant application code no longer relies on incompatible handwritten
  database row types.
- No Prisma dependency or schema is introduced.

## Prompt 2: Club subscribe flow

### Objective

Compare the existing club registration and subscription journey with the
desired six-step flow. Record gaps only and identify the minimum changes needed
without rewriting the owner-account, plan, review, or provisioning behavior
that already works.

Desired flow:

1. Owner account: name, email, and password.
2. Club identity: name, slug, and optional club code.
3. Location and contact: city, state, timezone, owner phone, and optional
   facility.
4. Plan selection.
5. Review summary.
6. Success and redirect to a setup checklist.

### Relevant implementation

- `src/app/subscribe/page.tsx`
- `supabase/migrations/202609150001_mock_subscriptions_and_test_reset.sql`
- `supabase/migrations/202610190004_checkout_profile_repair.sql`
- `src/app/dashboard/page.tsx`

### Gaps only

- The current four-stage state machine is `account -> plan -> review ->
  complete`; it has no separate club-identity or location/contact stages.
- Club name is collected inside the combined plan stage instead of a dedicated
  identity stage.
- Club slug and optional club code are not collected, validated, stored in the
  pending checkout, or provisioned with the organization/team.
- City, state, owner phone, and optional primary facility are not collected,
  validated, stored in the pending checkout, or provisioned.
- Timezone is collected in the combined plan stage instead of the
  location/contact stage, and the server validates only its string length.
- The review summary shows team name, selected plan, price, and payment amount;
  it does not show the proposed identity, location, contact, or facility data.
- The completion stage requires another click and routes to `/dashboard`; no
  club setup-checklist page or route exists.
- `begin_mock_checkout` accepts only plan ID, team name, and timezone, so it
  cannot preserve the added fields between review and completion.
- `complete_mock_checkout` provisions only organization name, team name,
  timezone, owner membership, entitlements, and subscription. It cannot persist
  the missing club-profile fields or slug.
- Progress labels expose only four stages and do not represent the desired six
  steps.

### Minimal changes needed

- Keep the existing owner signup/sign-in form and authentication behavior.
- Expand the client stage union and progress indicator to six stages:
  `account`, `identity`, `location`, `plan`, `review`, and `complete`.
- Move the existing team-name input into `identity`; add slug and optional club
  code there. Retain the existing team-name validation.
- Move the existing timezone selector into `location`; add city, state, owner
  phone, and optional facility there.
- Keep the existing plan query and plan-selection UI, moving only the stage
  boundary around it.
- Extend the pending checkout schema and `begin_mock_checkout` RPC to accept,
  validate, and store the new values. Do not provision partially completed
  teams before final confirmation.
- Extend `complete_mock_checkout` to persist the confirmed club-profile values
  atomically with organization/team creation, OWNER membership, entitlements,
  and subscription.
- Extend the existing review summary with the new identity, location, contact,
  and facility values. Keep the current price and mock-payment summary.
- Add a team-scoped setup-checklist destination and redirect there after a
  successful completion. Use the team ID returned by `complete_mock_checkout`;
  do not trust a client-supplied team ID as authority.
- Preserve the existing verified-account checks, active-plan lookup, checkout
  ownership/expiry checks, OWNER membership creation, entitlement provisioning,
  subscription creation, and audit logging.

### Dependencies and decisions

- Resolve Step 4's decision about whether club-profile fields belong to
  `organizations`, `teams`, or a dedicated team-owned profile table before
  extending the RPCs.
- Apply the field rules and messages recorded in Prompt 3.
- Define the setup-checklist route, its initial checklist items, and the
  authorization rule for viewing it.
- Confirm whether email-confirmation users resume at `identity` and how
  unsubmitted client state is restored after the authentication callback.

### Implementation acceptance criteria

- Existing owner account creation/sign-in still behaves as before.
- Back and next navigation preserves entered values without creating a team
  before final confirmation.
- Each new field is validated in the client for usability and independently in
  the trusted database operation.
- The review step displays all submitted club details and the selected plan.
- Completion remains atomic and idempotent enough to prevent duplicate teams or
  subscriptions after retries.
- The returned team ID is used to navigate to an authorized setup checklist.
- Direct RPC calls cannot bypass field, plan, owner, or tenant checks.
- Existing plan selection, subscription provisioning, entitlement grants, and
  audit logging are retained rather than reimplemented.

## Prompt 4: Club registration review

### Objective

Check whether the club-registration flow has a review step and record only the
work needed to make it complete, minimal, scannable, and editable. This entry
does not authorize rewriting the existing review or implementing fields before
their data model and validation decisions are resolved.

### Relevant implementation

- `src/app/subscribe/page.tsx`

### Existing behavior to retain

- A `review` stage already exists before final provisioning.
- The summary already shows the team name, selected plan name, displayed monthly
  price, and `$0.00` payment-today amount.
- Final confirmation remains a separate user action and calls the existing
  `complete_mock_checkout` operation.

### Gaps only

- Owner name and email are not shown.
- Club slug and optional club code are not shown; these values are not yet
  collected by the current flow.
- City, state, and owner phone are not shown; these values are not yet collected.
- Timezone is collected but omitted from the review.
- Optional facility is not shown; it is not yet collected.
- The summary has no controls for returning directly to the relevant previous
  step.
- The review currently depends on a selected-plan lookup and has no explicit
  handling for a plan becoming unavailable before completion beyond the server
  error returned during provisioning.

### Minimal changes needed

- Keep the existing review stage, order-summary structure, selected-plan display,
  pricing, payment notice, and final confirmation action.
- Add a compact Owner section showing the authenticated owner's name and email,
  with an edit action returning to the owner-account step when that action is
  valid. For an already authenticated account, route profile changes through an
  appropriate account-edit path rather than reopening password signup.
- Add a Club section showing name, slug, and club code only when club code is
  set, with an edit action returning to the identity step.
- Add a Location and contact section showing city, state, timezone, owner phone,
  and facility only when facility is set, with an edit action returning to the
  location step.
- Keep the existing selected-plan summary and add an edit action returning to
  the plan step.
- Use labels and short value rows rather than duplicating full form controls in
  the review.
- Preserve all entered state when navigating back to edit and then returning to
  review.
- Do not display passwords, internal plan IDs, checkout IDs, team IDs, or other
  implementation details.

### Dependencies

- Prompt 2 supplies the identity and location/contact stages and the state that
  the review needs to display.
- Prompt 3 supplies validation for the reviewed values.
- Step 4 must resolve where the new club-profile values are persisted.

### Implementation acceptance criteria

- The review shows owner name and email; club name, slug, and optional club
  code; city, state, timezone, owner phone, optional facility; and selected
  plan.
- Optional values are omitted cleanly when empty rather than rendered as blank
  rows.
- Each editable section returns to the correct prior step without clearing
  other entered values.
- Returning to review reflects the edited values.
- Existing plan price, mock-payment information, and final confirmation behavior
  remain intact.
- The layout remains readable at narrow viewport sizes and uses semantic labels
  or description-list markup where practical.

## Prompt 5: Club creation boundary

### Objective

Inspect the trusted operation that creates a club and record what already works
and only the missing changes needed for complete validation, slug uniqueness,
authenticated ownership, administrative authority, setup status, and checklist
routing. This entry records an audit and proposed implementation scope; no
server or client behavior was changed.

### Relevant implementation

- `src/app/subscribe/page.tsx`
- `supabase/migrations/202609150001_mock_subscriptions_and_test_reset.sql`
- `supabase/migrations/202610190004_checkout_profile_repair.sql`
- `supabase/migrations/202609110001_initial_schema.sql`

### Existing behavior to retain

- There is no Next.js server action or API route for this flow. The browser uses
  the Supabase client to call the `begin_mock_checkout` and
  `complete_mock_checkout` database RPCs.
- `begin_mock_checkout` requires an authenticated, verified Supabase user and
  ensures that the caller's profile exists.
- It validates the current team-name and timezone length requirements and
  requires the selected internal subscription plan to exist and be active.
- The pending checkout is linked to `auth.uid()` and has an expiry time.
- `complete_mock_checkout` locks and loads only a pending, unexpired checkout
  owned by `auth.uid()`, preventing one user from completing another user's
  checkout.
- Completion creates the organization and team, then links `auth.uid()` through
  an active `team_memberships` row with role `OWNER`.
- `OWNER` already has full team-administration authority and broader access than
  `ADMIN`; creating a second ADMIN membership for the same user would conflict
  with the unique `(team_id, user_id)` membership and weaken the model.
- Completion provisions module entitlements, creates the team subscription,
  marks the checkout complete, writes an audit event, and returns the new team
  ID.
- Club provisioning occurs inside one database function, so an exception rolls
  back the transaction rather than leaving a partially created team.

### Missing pieces only

- The RPC contract does not accept or validate slug, club code, city, state,
  owner phone, or optional facility.
- Timezone is checked only for string length, not against valid IANA timezone
  names.
- The public plan values `website`, `management`, and `complete` are not the RPC
  contract; it currently accepts active internal catalog IDs.
- Completion does not assign or verify the canonical club slug, so its existing
  organization-level uniqueness index is not exercised during club creation.
- There is no `setup_complete` column or equivalent derived setup status.
- The successful client flow displays a completion stage and waits for another
  click to navigate to `/dashboard`; it does not redirect to a team-scoped setup
  checklist.
- There are no creation-path tests covering the full proposed model, duplicate
  slug races, setup status, or checklist destination.

### Minimal changes needed

- Keep the Supabase client and database-RPC architecture; do not add Prisma or a
  redundant Next.js creation endpoint.
- Extend the pending-checkout table and `begin_mock_checkout` RPC with the
  fields confirmed by Step 4, applying the validation rules from Prompt 3.
- Map the public plan key to an active internal subscription plan inside the
  trusted RPC. Do not let the browser grant entitlements or choose arbitrary
  module keys.
- Persist the canonical slug during `complete_mock_checkout`. Keep a database
  unique constraint/index as the final concurrency-safe uniqueness check, and
  translate a uniqueness violation into a short actionable error.
- Continue deriving the owner from `auth.uid()`. Never accept `owner_id` from
  the client as authority.
- Continue creating one active `OWNER` membership. Treat OWNER as satisfying
  the requirement that the owner can administer the team; do not add a
  duplicate or downgraded ADMIN membership.
- Add setup status to the confirmed team-owned club profile or derive it from
  required setup records. If stored, default it to `false` and allow only a
  trusted team-owner/admin operation to mark it complete after checklist
  requirements are satisfied.
- After `complete_mock_checkout` returns the new team ID, replace the extra
  success-button hop with navigation to the authorized team setup checklist.
  The returned ID is a selector; checklist access must still be authorized from
  the authenticated membership.
- Add database/integration tests for invalid fields, invalid or inactive plans,
  duplicate slugs including concurrent attempts, unauthenticated callers,
  checkout ownership, OWNER membership, setup status, atomic rollback, and
  retry behavior.

### Decisions required before implementation

- Resolve Step 4's storage decision before changing the checkout and completion
  RPC signatures.
- Clarify the statement "setup_complete is false if optional fields are
  missing." A field cannot remain optional while also being necessary for
  completion unless the checklist explicitly defines it as a recommended setup
  task. Define the exact checklist conditions and whether setup status is stored
  or derived.
- Confirm the checklist route and whether successful completion should redirect
  immediately or briefly show an accessible success announcement first.
- Confirm whether the canonical club slug is the existing organization slug or
  a new team-owned slug; do not confuse it with OmniSite or family-registration
  slugs.

### Implementation acceptance criteria

- Direct RPC calls enforce every required model field and allowed plan value.
- Duplicate canonical slugs cannot be committed, including under concurrent
  requests, and produce a clear client-facing conflict message.
- The created club is linked only to the authenticated caller through one active
  OWNER membership, which provides administrative authority.
- No client-supplied owner identity can assign ownership to another user.
- Setup status follows documented checklist conditions and defaults safely for
  newly created clubs.
- Successful creation routes to a checklist that independently authorizes the
  authenticated user's access to the returned team.
- Organization/team creation, ownership, entitlements, subscription, checkout
  completion, setup status, and audit logging succeed or roll back together.
- Existing Supabase client and RPC architecture remains in place; Prisma is not
  introduced.

## Prompt 6: Club setup checklist

### Objective

Inspect the post-registration club dashboard and record only the missing setup
checklist and progress behavior. The dashboard shell, team selector,
subscription display, module cards, and existing authorization model are out of
scope for redesign.

### Relevant implementation

- `src/app/dashboard/page.tsx`
- `src/app/globals.css`
- `supabase/migrations/202609110001_initial_schema.sql`
- `supabase/migrations/202609230004_omniathlete_phase0_shell.sql`
- `supabase/migrations/202609230006_omniathlete_phase2_schedule.sql`
- OmniSite team-site and media migrations under `supabase/migrations/`

### Existing behavior to retain

- `/dashboard` loads the authenticated user's active team memberships and lets
  the user select a current team.
- It displays the team name, membership role, active subscription, entitled
  module cards, and links to subscription management.
- Team and subscription reads are filtered by the selected `team_id` and rely on
  existing RLS/membership authorization.
- Club name and timezone already exist in the schema. Organization slug, team
  sites/assets, swim groups, and practice-related data exist in separate schema
  areas, although they are not combined into onboarding progress.

### Missing pieces only

- No setup checklist or progress indicator exists on the club dashboard.
- The current dashboard team query selects only `id` and `name`; it does not
  load the profile values needed to evaluate setup.
- Owner phone, city, state, club code, primary facility, and season type do not
  yet exist in the confirmed club-profile schema.
- The canonical club slug has not yet been resolved between organization,
  registration, and OmniSite slugs.
- Logo completion is not represented by a stable club-profile field; available
  logo/media state is currently associated with OmniSite content.
- There is no shared query or trusted projection that evaluates whether the
  selected team has its first practice group.
- No progress formula distinguishes required items from recommended items.
- There are no direct edit/setup links for individual checklist items.

### Minimal changes needed

- Add one compact setup-checklist card to the existing dashboard; do not change
  the surrounding header, subscription summary, or module grid.
- Group checklist rows into:
  - Required: club name and canonical slug, timezone, owner phone, and city plus
    state.
  - Recommended: club code, primary facility, season type, logo, and first
    practice group.
- Treat combined rows atomically: `Club name & slug` is complete only when both
  values are present; `City + state` is complete only when both are present.
- Compute completion from persisted server-authorized data for the selected
  team, not from registration form state or client-supplied booleans.
- Expose the smallest authorized Supabase query/RPC projection needed for the
  checklist. It should return completion booleans or the minimal underlying
  fields and must enforce active team membership and team isolation.
- Render complete/incomplete state, required/recommended labeling, a completed
  item count, and a progress percentage.
- Link incomplete rows to the existing relevant settings/module screen where
  one exists. Add only a focused club-setup screen for fields that have no edit
  destination; do not embed all settings forms in the dashboard card.
- Refresh checklist state after returning from a setup destination or changing
  the selected team.
- Keep progress calculation in one tested helper so the dashboard presentation
  and any stored `setup_complete` status cannot drift.

### Proposed progress logic

- Use all nine displayed checklist rows as the onboarding-progress denominator:
  `floor(completed_items / 9 * 100)`.
- Show required completion separately from overall onboarding progress so a
  missing recommended item does not incorrectly make the club invalid.
- Define `setup_complete` from the four required rows only, unless the product
  owner explicitly decides that recommended items are completion blockers.
- If logo or practice-group setup is unavailable because the relevant product
  is not entitled, mark the item `Not available with current plan` and exclude
  it from the denominator rather than presenting an impossible task. Confirm
  this entitlement behavior before implementation.

### Dependencies and decisions

- Step 4 must establish the canonical storage for club-profile fields.
- Prompt 5 must define whether `setup_complete` is stored or derived and how it
  is updated safely.
- Confirm which slug is the canonical club slug shown by the checklist.
- Confirm whether a logo is a platform-level club asset or an OmniSite-owned
  asset. OmniSite cannot be required for management-only customers.
- Confirm whether `first practice group` means the existence of a `swim_groups`
  row or a group with at least one practice schedule.
- Confirm whether overall progress includes unavailable recommended items; the
  proposed behavior excludes them.

### Implementation acceptance criteria

- The existing dashboard gains one checklist card without restructuring other
  dashboard content.
- Required and recommended items appear in the specified order with accurate
  completion states for the selected team.
- Progress is deterministic, handles combined fields correctly, and updates
  when setup data changes.
- Required completion and overall onboarding progress are not conflated.
- A user cannot read another team's checklist by changing a client-supplied
  team ID.
- A user who belongs to multiple teams sees independent progress for each team.
- Management-only and website-only plans do not receive impossible checklist
  tasks because of unavailable modules.
- Tests cover zero, partial, and full completion; combined rows; unavailable
  recommended items; team switching; and cross-team denial.

## Prompt 7: Family/member join baseline

### Objective

Compare the existing family-registration and member-join journey with the
GoMotion baseline plus the requested improvements. Record what is already
collected and propose only the additions needed; the existing configurable
registration, medical, agreement, review, and approval workflow should not be
replaced.

### Relevant implementation

- `src/app/register/[slug]/page.tsx`
- `src/modules/omniathlete/registration/model.ts`
- `supabase/migrations/202610010001_configurable_family_registration.sql`
- `supabase/migrations/202610190003_family_registration_journey.sql`
- `supabase/migrations/202609110001_initial_schema.sql`

### Already collected

#### Athlete

- `first_name`: collected as required legal first name, validated by the client
  and submission RPC, and persisted to `swimmers.first_name` after approval.
- `last_name`: collected as required legal last name, validated by the client
  and submission RPC, and persisted to `swimmers.last_name` after approval.
- `preferred_name`: collected optionally and persisted to
  `swimmers.preferred_name` after approval.
- `dob`: collected as required birth date, validated for presence/date shape by
  the client and RPC, and persisted to `swimmers.date_of_birth` after approval.
- Gender-related information: optional legal-sex and gender-identity/pronoun
  inputs are collected in the payload and retained in the private swimmer
  registration profile.
- A configurable requested-program selection exists when a team defines
  registration programs. It is retained in the registration profile but is not
  equivalent to an authorized roster-group assignment.

#### Family

- `address`: required street address plus optional second line are collected and
  server-validated; the full household object is retained in the private family
  registration profile.
- `city`: required, client- and server-validated, and retained in the household
  profile.
- `state`: required, client- and server-validated, and retained in the household
  profile.
- `zip`: required as postal code, client- and server-validated, and retained in
  the household profile.
- `primary_email`: the equivalent value is collected as required billing email
  and persisted to `families.primary_email` after approval.
- `guardian1_name`: the first guardian's first and last names are required,
  validated, and persisted as a family contact after approval.
- `guardian1_phone`: the first guardian's mobile phone is required, validated,
  and persisted as a family contact after approval.
- Optional second guardian: the form supports adding up to ten guardians; only
  the first is present by default, and additional guardians are optional contact
  records rather than shared-login identities.

### Missing or incomplete baseline elements

- Athlete `gender` is not a single required, defined baseline field. The two
  existing optional inputs have unclear semantics, no constrained values, and
  are not promoted to a typed column on `swimmers`.
- Optional `roster_group` is not implemented as a relationship to the team's
  roster/swim groups. Requested program IDs are configurable registration
  preferences and approval does not create a `group_memberships` row.
- Family address, city, state, and postal code are preserved in the registration
  profile JSON but are not typed columns on the core `families` table. This is
  sufficient for archival intake but incomplete if these values must support
  normal family queries, edits, exports, or integrations.
- `primary_email` is labeled and modeled as billing email in the intake payload,
  which may be semantically narrower than the requested family primary email.
- Server validation checks non-empty/length boundaries for email and phone but
  does not establish valid email or basic phone formats.
- Approval stores all guardian contacts but links only the authenticated account
  as the family guardian membership, which is intentional under the one-login-
  per-family model and should not be changed to shared credentials.

### Additions needed only

- Define the baseline `gender` meaning and allowed values. Reuse either legal
  sex or gender identity if one matches the product requirement; do not add a
  third overlapping input without a decision. Then require and validate that
  chosen value in both the client and submission RPC, and persist it as a typed
  swimmer attribute only if operational queries need it.
- Add an optional requested roster-group selector backed by authorized,
  same-team `swim_groups` IDs. Keep it distinct from marketing/program
  configuration unless a deliberate mapping is defined.
- On approval, validate the requested group still belongs to the same team and
  is active before creating a composite-tenant-safe `group_memberships` row.
  Treat a stale or unavailable optional request as a review decision rather
  than trusting the submitted ID.
- Promote address, city, state, and postal code to typed family-owned storage
  only if normal post-approval querying/editing requires it. Preserve the
  registration-profile snapshot for audit history rather than replacing it.
- Rename the family input to `Primary email` or explicitly document that billing
  email is the canonical family primary email; do not collect a duplicate value
  unless the two concepts must diverge.
- Add shared email and basic-phone validation to the existing client validation
  and `submit_family_registration` RPC while retaining the current required
  field checks.

### Decisions required before implementation

- Confirm whether baseline `gender` means legal sex, gender identity, or another
  constrained registration value, including privacy and reporting needs.
- Confirm whether `roster_group` is a requested placement pending approval or an
  immediate assignment selected by the family. Family input should normally be
  treated as a request, with staff retaining placement authority.
- Confirm whether requested registration programs map one-to-one to
  `swim_groups` or remain a separate intake concept.
- Confirm whether family location fields need typed columns or whether the
  existing private registration profile is the intended source of truth.

### Implementation acceptance criteria

- Existing athlete name, preferred name, birth date, household, guardian, and
  configurable registration fields are reused rather than duplicated.
- The chosen gender field has documented semantics, consistent client/server
  validation, and appropriate private access controls.
- Any roster-group request is scoped to the registration team, cannot link to
  another team's group, and is revalidated during staff approval.
- Optional second and later guardians remain contact records under the
  one-login-per-family model.
- Primary email has one clear source of truth.
- If family location fields are promoted, the migration includes backfill,
  tenant-safe access, approval mapping, edit behavior, export behavior, and
  two-team isolation tests.
- Existing medical, emergency-contact, agreement, draft, review, and team-
  approval behavior remains intact.

## Template for the next audit

Copy this section for each new audit and add it to the index.

### Step N: Audit name

**Status:** `AUDITED`

**Objective:** What was inspected and why.

**Relevant implementation:** Files, routes, operations, tables, and tests that
were inspected.

**Existing behavior:** Validation or safeguards already present.

**Findings:** Only missing, incorrect, or inconsistent behavior. Include a short
user-facing error message where applicable.

**Decisions required:** Product, ownership, persistence, compatibility, or
security questions that must be settled before implementation.

**Acceptance criteria:** Observable behavior and tests required to mark the item
`VERIFIED`.

**Implementation prompt:** Add the prompt or a link after the audit is moved to
`READY`.
