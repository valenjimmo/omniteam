# Current OmniTeam code structure

The approved product hierarchy is `OMNITEAM_STRUCTURE.md`. This document is the **implemented repository inventory**, so it can be compared with that hierarchy before adding or removing code.

```text
omniteam/
├── AGENTS.md                         Codex guardrails and canonical-doc links
├── docs/
│   ├── OMNITEAM_STRUCTURE.md         approved products and platform capabilities
│   ├── PRODUCT_STRUCTURE.md          architecture and implementation status
│   ├── TENANT_ISOLATION.md           multi-tenant security requirements
│   ├── ACCESS_MODEL.md               platform/team owners, parents, permissions
│   ├── CURRENT_STRUCTURE.md          this inventory
│   └── SUPABASE_VERCEL_SETUP.md      deployment and test setup
├── packages/domain/src/              attendance calculations only
├── src/app/
│   ├── page.tsx                       public OmniTeam landing page (hard-coded cards)
│   ├── omniathlete/page.tsx            OmniAthlete module home and feature status
│   ├── attendance/page.tsx            local-data attendance prototype
│   ├── dashboard/page.tsx             authenticated entitlement-aware team dashboard
│   ├── subscribe/page.tsx             simulated subscription and team onboarding
│   ├── register/page.tsx              parent team-link entry
│   ├── register/[slug]/page.tsx       parent application form
│   ├── my-family/page.tsx             approved guardian family view/contacts
│   ├── team/access/page.tsx           team owner/admin approval and access UI
│   ├── platform/page.tsx              server-protected platform owner dashboard
│   ├── platform/login/page.tsx        platform-owner sign-in
│   ├── platform/support/page.tsx      platform-owner support UI
│   ├── developer/api/page.tsx         administration API entry point
│   ├── api/admin/purge/route.ts       guarded test-project reset API
│   ├── api/openapi.json/route.ts      OpenAPI 3.1 specification
│   ├── auth/callback/route.ts         email verification session exchange
│   └── api/health/supabase/route.ts   database connection check
├── src/modules/omniathlete/           OmniSite data-sharing contract only
├── src/services/attendance.ts         server-side attendance upsert boundary
├── src/lib/supabase/server.ts         server Supabase client
└── supabase/
    ├── migrations/                  initial schema, entitlements, isolation,
    │                                 access, parent approval, support, lifecycle
    ├── scripts/                     test purge, team archive, hard-delete examples
    └── seed.sql                     one demo organization/team/groups
```

## Product coverage

| Product | Implemented now | Main missing pieces |
| --- | --- | --- |
| OmniAthlete | Family registration/approval, family view, schema for swimmers/groups/attendance, attendance demo | Real-data roster and group CRUD, family editing, attendance UI persistence, reporting, parent account lifecycle |
| OmniSchedule | Practice tables | Independent scheduling workflows and UI |
| OmniMeet | Standalone hosted-meet product definition and landing card | Host configuration, online entry, fees/refunds, exports, and reports |
| OmniVolunteer | Landing card | All volunteer workflows |
| OmniConnect | No UI | All communication workflows |
| OmniSite | Templates, branding, page editing, snapshots, public routes, mock subscription provisioning | Live RLS execution, custom domains, News, Events, richer builder controls |
| OmniInsights | No UI | All analytics workflows |

Payment and fee handling belongs to OmniTeam platform infrastructure and will appear inside the product workflows that use it. It is not a module or subscription choice.

## Candidates to add next

1. A real OmniAthlete roster and group UI backed by Supabase, with authenticated team selection and role checks. The current attendance page still uses hard-coded swimmers and only simulates a save.
2. Extend the shared module registry and entitlement-aware team dashboard as each planned module gains a real route.
3. Real two-team database tests for RLS, foreign keys, parent scope, delegated admin scope, platform support, purge, and team deletion before storing real family data.
4. Staff invitation, subscription provisioning, rate limits, and notifications for pending parent approvals.
5. A defined practice-occurrence model so OmniAthlete Attendance works without OmniSchedule.

## Candidates to consolidate or remove

- Keep the public module cards and shared dashboard registry synchronized until the landing page also consumes the registry directly.
- Replace demo data and the simulated “saved” indicator in `/attendance` when real attendance writes are connected.
- Remove the legacy `OmniAttendance` wording in remaining docs/UI; Attendance belongs to OmniAthlete.
- Move the hard-coded landing-page module list to a single approved product catalog.

No product modules should be removed from the approved hierarchy based on the current code's incompleteness.
