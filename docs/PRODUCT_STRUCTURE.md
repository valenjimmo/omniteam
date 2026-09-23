# OmniTeam architecture baseline

The canonical module and feature hierarchy is in `OMNITEAM_STRUCTURE.md`. This file records what the code currently supports and where refactoring is needed. It does not redefine the product tree.

Multi-tenant isolation is a platform-wide requirement. `TENANT_ISOLATION.md` defines the rules every current and future module must follow.
The role, parent-registration, and two-owner model is recorded in `ACCESS_MODEL.md`.
The proposed OmniSite implementation and build prompt are in `OMNISITE_DESIGN.md` and `OMNISITE_CODEX_PROMPT.md`.
The simulated purchase flow is in `SUBSCRIPTION_WORKFLOW.md`; the guarded test reset API is in `ADMIN_API.md`.

## Current implementation against the product tree

| Module | Current implementation |
| --- | --- |
| OmniAthlete | Attendance demo UI; swimmers, groups, and families have schema, with parent registration, approval, family view, and contact pages. Its integrated OmniSchedule area has practice schedules, sessions, and exceptions in schema; pool schedules, calendar, and events remain unbuilt. Its integrated OmniVolunteer and OmniConnect areas remain unbuilt. |
| OmniMeet | Public `/omnimeet` overview linked from the homepage explains two planned features: online meet registration and standalone downloadable software that receives registration information. Registration, payments, downloads, and the data integration remain to be built. The overview introduces no operational access paths or new entitlements. |
| OmniSite | Local milestone: structured editor, private media delivery, revision-checked draft/publish/rollback, explicit template catalog authority, SEO, and managed/custom-host routing. Domain ownership and manual provider activation are separate. See `OMNISITE_OPERATIONS.md`; local role tests pass with a pg_jsonschema shim, while full Supabase/provider staging remains required. News, Events and contact forms are deferred. |
| OmniInsights | No implementation or landing card. |

Payments, fees, invoices, refunds, and financial reporting inputs are shared OmniTeam platform capabilities. They are surfaced inside the workflow that owns the transaction and are not a module entitlement or standalone product.

The README calls attendance `OmniAttendance`, but the canonical structure places Attendance within OmniAthlete. Use the canonical name and ownership in future work.

## Architecture findings

- `src/app/page.tsx` presents four customer products. OmniSchedule, OmniVolunteer, and OmniConnect appear as integrated OmniAthlete capabilities. The shared registry retains their internal keys for backward-compatible entitlement enforcement.
- `src/app/attendance/page.tsx` is a local-state demo with fixed swimmers, team, date, and save indicator. It does not call `src/services/attendance.ts`.
- `packages/domain` currently contains attendance rules only. It is not yet a general platform domain package or a set of independent modules.
- The mock subscription migration adds a small product catalog, simulated checkout, subscriptions, and bundle entitlement provisioning. Live billing, provider webhooks, invoices, and cancellation remain absent.
- Attendance records require a practice session and swimmer; practice sessions require a group. OmniSchedule now belongs to OmniAthlete, so its practice occurrence is the native scheduling source for attendance.
- The foundation migration adds OmniAthlete entitlement checks and composite tenant keys to athlete relationships. The tenant-integrity migration adds schedule relationship constraints and immutable tenant keys. Later migrations add team-member module grants, approved parent registration, one family login with multiple guardian contacts, and audited platform-owner support sessions.
- The attendance upsert service checks the active OmniAthlete entitlement, and database keys constrain swimmer and session to the requested team. The demo UI still does not use the service. Authentication UI, authorized team selection, and persistent save behavior remain to be built.

## Target boundaries

1. Platform core owns organizations/teams, users and memberships, shared identity contracts, authorization, product catalog, team entitlements, bundle composition, and audit events.
2. Each product owns its business rules, service/API boundary, UI, and product-specific storage. Integrated capability areas may keep internal service and entitlement boundaries without being marketed as separate products. Shared core contains only data required by all subscribed configurations.
3. Cross-module features use explicit interfaces or events. Each module has a usable standalone path when another module is absent.
4. Server operations enforce entitlements and roles. The database enforces tenant integrity. Navigation reflects access but is not the security boundary.

This can remain one Next.js deployment and one database initially. Independent modules do not require separate services or databases; clear ownership and optional dependencies are the important constraints.

## Product decisions to clarify before deeper refactoring

- Whether all purchases share OmniTeam login, team identity, and swimmer/family roster.
- Whether bundles are discounts over individual module entitlements or add bundle-only capabilities.
- Which module is the source of truth for overlapping concepts such as Events and meet/entry fees; the others can display or act on them through integrations.
