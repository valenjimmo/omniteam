# OmniTeam repository guidance

Read `docs/OMNITEAM_STRUCTURE.md` before changing product names, routes, feature ownership, or module boundaries. It is the owner's canonical, editable hierarchy. Read `docs/PRODUCT_STRUCTURE.md` for implementation findings and architecture guidance.

OmniTeam is the platform. Swim teams subscribe to individual products or bundles. A module must work when it is the only purchased module, while shared integrations should activate when the relevant modules are available. Do not treat the names currently hard-coded on the landing page as the authoritative product tree or add new module names based on guesses.

Keep shared identity, team tenancy, authorization, and subscription entitlements in platform core. Put module-specific workflows and data ownership behind module boundaries. Enforce entitlements in server-side operations and database access, not just navigation. Preserve team isolation across all relationships.

OmniTeam is a multi-tenant service for an unknown number of teams. Treat `team_id` as a mandatory security boundary for every team-owned row, query, mutation, integration, job, and export. Read `docs/TENANT_ISOLATION.md` before adding data models or access paths. Never infer tenant authority from a client-supplied ID alone. New team-owned relationships need composite tenant foreign keys, RLS coverage, and tests proving team A cannot read, write, or link team B data. Cross-module integration must remain within one authorized team unless the owner explicitly defines a cross-team feature.

There are two owner concepts: OmniTeam's platform owner has audited, time-limited support access across teams; each swim team has its own OWNER membership and controls that team's admins. Guardian/family relationships are separate from staff role and module permissions. Parent registration requires team approval. A parent reads only linked family data unless explicitly granted broader module access. The current product choice is one login per family, with additional guardians stored as contact records; never share credentials between people.

Account closure archives a team and blocks ordinary access by default. Keep retained data isolated. Do not hard-delete team rows or global Auth users as part of account closure; hard deletion is a separate, explicit maintenance operation. Future module tables must be included in test purge and hard-delete behavior.

Before implementing a new module or changing the product hierarchy, confirm its name, ownership, dependencies, and integration behavior against `docs/OMNITEAM_STRUCTURE.md`. Update that file when the owner changes the structure; keep implementation notes in `docs/PRODUCT_STRUCTURE.md`.

For database changes, follow `docs/DATABASE_CHANGE_WORKFLOW.md`. Schema changes belong in tracked migrations; `supabase/scripts/` contains manual operations and must never be batch-run as deployment steps.
