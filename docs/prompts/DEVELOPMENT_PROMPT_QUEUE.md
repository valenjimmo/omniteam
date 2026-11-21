# OmniTeam development prompt queue

Token-efficient, dependency-ordered prompts for Codex using `gpt-5.6-sol`.
This file tracks what ran, what remains, and which audit findings each run owns.

## Run contract

Every prompt below inherits this contract:

1. Read `AGENTS.md`, the referenced audit sections, and all canonical/reference
   documents those sections require.
2. Inspect current code before editing; the audit is evidence, not a substitute
   for checking the current branch.
3. Preserve unrelated changes. Use tracked Supabase migrations, server/database
   authorization, RLS, composite tenant keys, and two-team isolation tests.
4. Do not introduce Prisma. Keep the Supabase client/RPC architecture unless a
   prompt explicitly says otherwise.
5. Implement only the listed scope, run proportionate tests, and report files,
   migrations, tests, residual risks, and unresolved decisions.
6. If a product decision remains genuinely ambiguous, do not invent it. Mark
   the run `BLOCKED` with the exact decision needed.
7. On success, update this queue and the covered entries in
   `AUDIT_BACKLOG.md`; use `VERIFIED` only when acceptance criteria pass.

## Status values

`NOT RUN` · `IN PROGRESS` · `BLOCKED` · `DONE` · `VERIFIED` · `SKIPPED`

## Run tracker

| ID | Scope | Depends on | Status | Date | Commit/PR | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DEV-01 | Club model, constraints, plan mapping, generated types | — | DONE | 2026-11-18 | `46340d2` | Canonical team-owned club profile, trusted OWNER write boundary, plan mapping, generated shared types, and rollback-only database coverage; real local Supabase unavailable. |
| DEV-02 | Six-step club onboarding, validation, review, creation | DEV-01 | DONE | 2026-11-19 | `c0cdea2` | Six-stage onboarding, public-plan checkout, atomic retry-safe provisioning, editable review, and authorized setup shell; Docker-backed Supabase unavailable. |
| DEV-03 | Dashboard setup checklist and progress | DEV-01, DEV-02 | VERIFIED | 2026-11-19 | — | Compact dashboard card, focused setup editor, derived required completion, entitlement-aware progress, and two-team denial coverage; typecheck, 90 unit tests, and disposable PostgreSQL suite pass. |
| DEV-04 | Family/member baseline additions | DEV-01 | DONE | 2026-11-19 | — | Existing flow extended with legal-sex/contact validation and approval-time roster requests; typecheck, 91 unit tests, and disposable PostgreSQL suite pass; real browser/Supabase suite unavailable. |
| DEV-05 | Cross-feature regression, security, and audit closeout | DEV-02–04 | BLOCKED | 2026-11-20 | — | Unit, typecheck, broad lint, build, disposable PostgreSQL, and standalone Chromium checks pass; real Supabase family/browser integration is unverified because Docker/Podman and local API credentials are unavailable. |
| DEV-06 | Preserve staff roles during family approval and enforce configured intake | DEV-04 | NOT RUN | — | — | Covers AUD-08 and AUD-09. |
| DEV-07 | Generate and verify the complete Supabase TypeScript schema contract | DEV-06 | NOT RUN | — | — | Covers AUD-10; requires a fully migrated generation target. |
| DEV-08 | Reconcile subscription workflow reference documentation | DEV-02 | NOT RUN | — | — | Covers AUD-11; documentation-only. |

When starting a run, set its status and date. When finishing, record the commit
or PR if one exists and a one-line outcome. Never mark a run `VERIFIED` when
required staging/database checks were not executed.

## DEV-01 — Club model foundation

**Covers:** Step 4 and the storage/constraint portions of Prompt 3.

```text
Read the Run contract in docs/prompts/DEVELOPMENT_PROMPT_QUEUE.md and audit
sections “Step 4: Club/team data model” and “Prompt 3: Club registration
validation”. Implement the smallest coherent Supabase foundation for the club
profile.

First resolve and document the organization-vs-team ownership decision from the
existing one-organization/one-team provisioning model. Then add a tracked,
backfill-safe migration for canonical club name/slug, club_code, city, state,
timezone, owner_phone, primary_facility, season_type, and public plan mapping.
Keep ownership authoritative through active OWNER membership; do not duplicate
owner_id. Enforce slug format/length/uniqueness, club_code and season_type
constraints, non-empty required fields, IANA timezone validation, and the
approved phone rule. Preserve normalized team_subscriptions and map website,
management, complete to active internal plans. Add/update RLS, trusted RPCs,
purge/hard-delete behavior, migration tests, and two-team isolation tests.
Generate and commit shared Supabase TypeScript Database types; replace only
incompatible local database-row casts touched by this work. Update architecture
docs with decisions. Do not change onboarding UI yet.

Verify migration ordering, typecheck, focused tests, and database tests available
locally. Update queue/backlog statuses and report anything not executed.
```

## DEV-02 — Club onboarding and creation

**Covers:** Prompts 2, 3, 4, and 5.

```text
Read the Run contract in docs/prompts/DEVELOPMENT_PROMPT_QUEUE.md and audit
Prompts 2–5. Confirm DEV-01 is complete. Extend the existing /subscribe flow;
do not replace working authentication, plan cards, review pricing, or atomic
Supabase provisioning.

Implement stages account → identity → location → plan → review → complete.
Identity collects club name, required unique slug, optional club_code. Location
collects city, state, valid IANA timezone, owner_phone, optional facility.
Validate client-side with the short audit messages and independently in trusted
Supabase RPCs. Accept only public plans website|management|complete and map them
server-side. Extend pending checkout storage and completion RPC atomically;
derive the owner only from auth.uid() and create one active OWNER membership.
Handle duplicate-slug races clearly and preserve checkout ownership/expiry,
entitlements, subscription, audit logging, rollback, and retry safety.

Keep the current review and add scannable Owner, Club, Location/contact, and
Plan sections with edit links and optional values omitted. Never show passwords
or internal IDs. Preserve state when editing. After success, use the returned
team ID to navigate to the authorized setup checklist destination. Implement
the minimum checklist route shell needed by DEV-03, not its full dashboard card.

Add boundary, malformed-value, direct-RPC bypass, duplicate/concurrent slug,
owner, plan, review-navigation, retry, and cross-team tests. Run typecheck and
focused integration tests; update queue/backlog statuses with evidence.
```

## DEV-03 — Setup checklist

**Covers:** Prompt 6 and the setup-completion portion of Prompt 5.

```text
Read the Run contract in docs/prompts/DEVELOPMENT_PROMPT_QUEUE.md and audit
Prompt 6 plus Prompt 5’s setup_complete requirements. Confirm DEV-01 and DEV-02
are complete. Add one compact setup-checklist card to the existing dashboard and
finish the team-scoped checklist destination without rebuilding the dashboard.

Required rows: club name & slug, timezone, owner phone, city + state.
Recommended rows: club code, primary facility, season type, logo, first practice
group. Compute state from persisted, server-authorized team data. Combined rows
require both values. Show completed count, overall percentage, required vs
recommended labels, and links to the smallest existing/focused edit destination.
Centralize tested progress logic. Define setup_complete from required rows only.
For recommended tasks unavailable under the current entitlement, show that
state and exclude them from the denominator. Treat logo as platform-level unless
canonical product guidance explicitly assigns it elsewhere; do not require
OmniSite for management-only teams. Define first practice group consistently
with the existing swim_groups model.

Test 0/partial/full progress, combined fields, unavailable items, refresh after
edits, multi-team switching, and cross-team denial. Preserve existing dashboard
content. Run typecheck and focused tests; update queue/backlog statuses.
```

## DEV-04 — Family/member baseline

**Covers:** Prompt 7.

```text
Read the Run contract in docs/prompts/DEVELOPMENT_PROMPT_QUEUE.md and audit
Prompt 7. Extend the existing configurable family registration and approval
flow; do not rebuild its account, household, guardian, medical, agreement,
draft, review, or approval steps.

Reuse existing athlete first/last/preferred name and DOB fields. Resolve and
document which existing field satisfies baseline gender; avoid a third
overlapping field. Apply consistent client/RPC validation and typed persistence
only when operational queries require it. Add an optional same-team requested
roster-group selector backed by active swim_groups. Treat it as a request;
revalidate team ownership and availability during staff approval before creating
a composite-tenant-safe group_memberships row. Never trust the submitted ID.

Keep address/city/state/postal snapshots. Promote them to typed family storage
only if the audited edit/query/export requirement is confirmed; preserve the
immutable registration snapshot either way. Make primary email semantics clear
without duplicating billing email. Add shared email/basic-phone validation.
Keep additional guardians as contact records under one family login.

Test client and direct-RPC validation, stale/foreign group IDs, approval and
rejection, optional guardian behavior, persistence, parent privacy, and two-team
isolation. Run typecheck and family-registration integration tests; update
queue/backlog statuses.
```

## DEV-05 — Verification and closeout

**Covers:** all current audit entries.

```text
Read the Run contract in docs/prompts/DEVELOPMENT_PROMPT_QUEUE.md and every open
entry in AUDIT_BACKLOG.md. Do not add features. Review DEV-01–04 as one system:
schema/migration safety, RLS and tenant foreign keys, owner authority, public
plan mapping, checkout atomicity/idempotency, validation parity, checklist
authorization/progress, family privacy, purge/hard-delete coverage, generated
types, accessibility, and responsive behavior.

Run the broadest safe local test suite, typecheck, lint, build, migration/database
tests, and relevant browser/integration tests. Fix only regressions or incomplete
acceptance criteria caused by this work. Record checks that require staging as
unverified; do not claim them. Update each backlog entry to VERIFIED, BLOCKED,
or CLOSED with concise evidence, update this run tracker, and produce a short
residual-risk list.
```

## DEV-06 — Family approval role safety and trusted intake validation

**Covers:** AUD-08 and AUD-09.

```text
Read the Run contract, the 2026-11-20 DEV-01–04 audit, AUD-08, and AUD-09. Add a
forward migration; do not rewrite historical migrations or redesign the family
registration UI.

Preserve any existing OWNER, ADMIN, or COACH role when approving a registration,
reactivate an inactive membership without changing its role, and assign PARENT
only when creating a new membership. Keep family_guardians as the independent
family-access relationship. At submit_family_registration, enforce the current
captured registration configuration for required program selections and required
family/swimmer questions, including supported answer types/options. Reject birth
dates that are not real calendar dates before a pending request is created, and
mirror that date check in shared client validation.

Non-goals: new role types, separate guardian logins, program-to-roster mapping,
or new registration fields. Preserve tenant composite links, approval authority,
immutable snapshots, and stale roster-group behavior.

Acceptance: database tests cover new and existing OWNER/ADMIN/COACH/inactive
memberships, impossible dates, missing/invalid configured answers and programs,
valid submission/approval, and two-team isolation. Add focused unit tests, run
typecheck and the full disposable database suite, and update AUD-08/AUD-09 plus
this tracker with exact verification limits.
```

## DEV-07 — Complete generated Supabase types

**Covers:** AUD-10. **Depends on:** DEV-06.

```text
Read the Run contract, the 2026-11-20 DEV-01–04 audit, and AUD-10. Apply every
tracked migration to a clean generation target and generate the complete
Supabase TypeScript Database type without manually pruning tables, views,
functions, enums, composite types, or relationships. Add a documented,
reproducible generation/check command and replace only incompatible local casts
touched by the full contract.

Non-goals: schema redesign, Prisma, or broad application refactors. Do not claim
the artifact is generated if the required database target is unavailable.

Acceptance: representative platform, club, checkout, setup, family-registration,
and module schema/RPC symbols are present; immediate regeneration has no diff;
typecheck and focused consumers pass. Update AUD-10 and this tracker, recording
the exact database/generator versions and any unavailable environment.
```

## DEV-08 — Subscription workflow reference reconciliation

**Covers:** AUD-11. **Depends on:** DEV-02.

```text
Read canonical product guidance, the current /subscribe implementation and RPCs,
the 2026-11-20 DEV-01–04 audit, and AUD-11. Update only
docs/reference/SUBSCRIPTION_WORKFLOW.md to describe the six-stage mock onboarding,
public-plan mapping, canonical team-owned profile, atomic completion, and
authorized setup-checklist redirect. Identify the migrations that extend the
original subscription model.

Non-goals: product naming changes, pricing decisions, live billing design, or
product-code changes. Acceptance: every described field, trust boundary, and
route matches current code and canonical module ownership. Update AUD-11 and this
tracker after a documentation diff review.
```

## Recurring post-check-in audit standard

Run AUDIT-01 after a meaningful set of development check-ins (typically a
feature slice, migration series, or 3–5 related commits). Run AUDIT-02 after
several dated audits or before planning the next implementation batch.

Store outputs in `docs/prompts/audits/YYYY-MM-DD-<scope>.md`. Audit files are
evidence snapshots; durable open work is deduplicated into `AUDIT_BACKLOG.md`.

### Audit run tracker

| Date | Range/scope | Audit file | Backlog updated | Result |
| --- | --- | --- | --- | --- |
| 2026-11-20 | `a487e17..07734fc` (DEV-01–04), checked against `cf86088` | `audits/2026-11-20-dev-01-04.md` | AUD-08–AUD-11 | CONSOLIDATED; DEV-06 is next runnable |

### AUDIT-01 — Post-check-in audit

```text
Audit the OmniTeam changes in <commit range or feature scope>. Read AGENTS.md,
docs/README.md, canonical docs, and relevant references. Inspect diffs plus
current code; do not modify product code.

Check correctness, regressions, incomplete requirements, validation parity,
auth/RLS, team isolation and composite tenant links, entitlements, migration and
backfill safety, purge/hard-delete coverage, generated types, accessibility,
responsive behavior, tests, and documentation drift. Verify findings with file
and line evidence; omit speculation and already-fixed issues.

Create docs/prompts/audits/YYYY-MM-DD-<scope>.md with: scope/commits, checks run,
existing safeguards, findings ordered by severity, required decisions, minimal
fixes, acceptance tests, and verification limits. Add only new/durable findings
to AUDIT_BACKLOG.md, deduplicated against existing entries. Update the audit run
tracker in DEVELOPMENT_PROMPT_QUEUE.md. Report only findings and changed docs.
```

### AUDIT-02 — Audit consolidation and next queue

```text
Read all unprocessed files in docs/prompts/audits/, AUDIT_BACKLOG.md, and the
DEVELOPMENT_PROMPT_QUEUE.md tracker. Do not modify product code.

Deduplicate findings by root cause, close findings disproven or already fixed,
preserve evidence links, identify blocking product decisions, and order remaining
work by dependency and risk. Update AUDIT_BACKLOG.md statuses and create or
revise the smallest standalone implementation prompts in this queue. Each prompt
must name scope, non-goals, dependencies, acceptance criteria, required tests,
and status-tracking updates. Do not create duplicate prompts for overlapping UI,
RPC, and schema findings. Mark processed audit files in the tracker and report
the next runnable prompt IDs.
```

## Audit file minimum format

```markdown
# Audit: <scope>

- Date: YYYY-MM-DD
- Commits/scope: <range or description>
- Status: OPEN | CONSOLIDATED | CLOSED
- Checks run: <commands and inspections>
- Verification limits: <anything not run>

## Existing safeguards
## Findings
### [severity] Finding title
- Evidence:
- Impact:
- Minimal fix:
- Acceptance tests:
## Decisions required
## Backlog changes
```
