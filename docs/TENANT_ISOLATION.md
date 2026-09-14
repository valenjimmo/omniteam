# OmniTeam tenant isolation requirements

OmniTeam hosts an unknown number of swim teams in one platform. A team is the data-security boundary. The number of teams must not be assumed in schema, code, seeds, URLs, or tests.

## Non-negotiable invariants

1. Every team-owned record has a non-null `team_id` referencing `teams`. Global identity records such as `profiles` are exceptions and must be accessed only through authorized team membership or the user's own identity.
2. Team authority comes from the authenticated user and active membership, plus module entitlement and role where applicable. A requested `team_id` is a selector, never proof of access.
3. Every team-owned table has row-level security. Read, insert, update, and delete policies are reviewed separately. Server actions and background jobs enforce the same tenant and module boundary, especially when using a service-role client that bypasses RLS.
4. Every relationship between team-owned records uses a composite foreign key including `team_id`. An ordinary UUID foreign key alone can permit a team A row to reference team B data despite RLS.
5. A row's `team_id` does not change through ordinary updates. Any team transfer is a deliberate, audited migration of the entire related data set.
6. Queries, caches, object-storage paths, exports, search indexes, event payloads, logs, and integrations carry and filter by tenant identity. A module-to-module handoff is authorized for the same team and only when both modules are entitled.
7. Public OmniSite data is an explicit, minimal publication projection. Private swimmer, family, attendance, and payment records stay private by default. Public access must never inherit staff access merely because the same team owns both modules.
8. Add isolation tests with at least two teams, including a user who belongs to both, a user who belongs to only one, and mismatched parent/child IDs. Test allowed same-team behavior and denied cross-team behavior.

## Ownership and support exception

The OmniTeam platform owner is separate from every swim team's OWNER membership. Platform-owner status is provisioned by a trusted process, not self-assigned. To inspect another team's data, the platform owner starts a one-hour support session for that team with a reason recorded in its audit log. Current support access is read-only. This deliberate exception must not be reused for ordinary staff, parents, public OmniSite visitors, or background jobs. The platform owner needs a separate decision and audited operation before changing team data.

Account closure archives the team by default: `teams.status` becomes `INACTIVE`, registration closes, and active-member checks reject ordinary access. Records remain while the owner decides a retention/deletion policy. Hard deletion is a separate trusted maintenance action; it does not erase Auth users or profiles that may be shared with other teams.

Team owners can manage their own purchased modules and assign team admins. A delegated admin can grant access only to modules they themselves manage. A parent can also be an admin while retaining a guardian link, but ordinary parents see only their linked family. Registration requests require owner or delegated-admin approval before creating family and team membership records.

## Current implementation status

The initial schema uses `team_id` and membership-based RLS. The OmniAthlete foundation migration adds entitlement checks and composite keys for family, group-membership, and attendance relationships. `202609140002_tenant_integrity.sql` adds composite keys for practice schedules, sessions, exceptions, and check-in tokens, and blocks ordinary `team_id` updates.

These migrations have not yet been exercised against a running PostgreSQL/Supabase instance in this workspace. Before using real team data, run the full migrations and two-team isolation tests. Service-role job boundaries, object storage, and public site publishing still require implementation and review.
