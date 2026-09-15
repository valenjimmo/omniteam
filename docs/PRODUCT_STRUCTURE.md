# OmniTeam architecture baseline

The canonical module and feature hierarchy is in `OMNITEAM_STRUCTURE.md`. This file records what the code currently supports and where refactoring is needed. It does not redefine the product tree.

Multi-tenant isolation is a platform-wide requirement. `TENANT_ISOLATION.md` defines the rules every current and future module must follow.
The role, parent-registration, and two-owner model is recorded in `ACCESS_MODEL.md`.
The proposed OmniSite implementation and build prompt are in `OMNISITE_DESIGN.md` and `OMNISITE_CODEX_PROMPT.md`.
The simulated purchase flow is in `SUBSCRIPTION_WORKFLOW.md`; the guarded test reset API is in `ADMIN_API.md`.

## Current implementation against the product tree

| Module | Current implementation |
| --- | --- |
| OmniAthlete | Attendance demo UI; swimmers, groups, and families have schema, with parent registration, approval, family view, and contact pages. Full athlete management workflows remain to be built. |
| OmniSchedule | Practice schedules, sessions, and exceptions have schema only. Pool schedules, team calendar, and events have no implementation. |
| OmniMeet | Landing card only; no feature implementation. |
| OmniVolunteer | Landing card only; no feature implementation. |
| OmniPay | Landing card only; no feature implementation. |
| OmniConnect | No implementation or landing card. |
| OmniSite | Local first slice: shared template catalog, team branding and draft editor, snapshot publishing, and public site routes. Platform owners can locally sign in and provision an OmniSite-only team through migration `202609140009`. Migrations have not been applied to a live database; MFA, News, Events, custom domains, and rich page-builder controls remain. |
| OmniInsights | No implementation or landing card. |

The README calls attendance `OmniAttendance`, but the canonical structure places Attendance within OmniAthlete. Use the canonical name and ownership in future work.

## Architecture findings

- `src/app/page.tsx` hard-codes six module cards and availability. It omits OmniConnect and OmniInsights.
- `src/app/attendance/page.tsx` is a local-state demo with fixed swimmers, team, date, and save indicator. It does not call `src/services/attendance.ts`.
- `packages/domain` currently contains attendance rules only. It is not yet a general platform domain package or a set of independent modules.
- The mock subscription migration adds a small product catalog, simulated checkout, subscriptions, and bundle entitlement provisioning. Live billing, provider webhooks, invoices, and cancellation remain absent.
- Attendance records require a practice session and swimmer; practice sessions require a group. If OmniSchedule is optional, OmniAthlete attendance needs a minimal practice occurrence it can own or an optional scheduling adapter. Decide that boundary before implementing either module.
- The foundation migration adds OmniAthlete entitlement checks and composite tenant keys to athlete relationships. The tenant-integrity migration adds schedule relationship constraints and immutable tenant keys. Later migrations add team-member module grants, approved parent registration, one family login with multiple guardian contacts, and audited platform-owner support sessions.
- The attendance upsert service checks the active OmniAthlete entitlement, and database keys constrain swimmer and session to the requested team. The demo UI still does not use the service. Authentication UI, authorized team selection, and persistent save behavior remain to be built.

## Target boundaries

1. Platform core owns organizations/teams, users and memberships, shared identity contracts, authorization, product catalog, team entitlements, bundle composition, and audit events.
2. Each module owns its business rules, service/API boundary, UI, and module-specific storage. Shared core contains only data required by all subscribed configurations.
3. Cross-module features use explicit interfaces or events. Each module has a usable standalone path when another module is absent.
4. Server operations enforce entitlements and roles. The database enforces tenant integrity. Navigation reflects access but is not the security boundary.

This can remain one Next.js deployment and one database initially. Independent modules do not require separate services or databases; clear ownership and optional dependencies are the important constraints.

## Product decisions to clarify before deeper refactoring

- Whether all purchases share OmniTeam login, team identity, and swimmer/family roster.
- What Attendance uses to represent a practice when OmniSchedule is not purchased.
- Whether bundles are discounts over individual module entitlements or add bundle-only capabilities.
- Which module is the source of truth for overlapping concepts such as Events and meet/entry fees; the others can display or act on them through integrations.
