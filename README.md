# OmniTeam / OmniAthlete / Attendance

OmniAthlete is the first module being built in OmniTeam. Its Attendance screen is currently a mobile-friendly prototype for swim coaches; the screen still uses local demo data. The canonical product hierarchy is in `docs/OMNITEAM_STRUCTURE.md`, and the current architecture assessment is in `docs/PRODUCT_STRUCTURE.md`.

The code inventory and add/remove candidates are in `docs/CURRENT_STRUCTURE.md`. Supabase/Vercel setup, test-data purge, and team archival are in `docs/SUPABASE_VERCEL_SETUP.md`.

## Stack

Next.js App Router, TypeScript, React, Supabase PostgreSQL/Auth/RLS, Vitest, and Tailwind-compatible CSS tokens. The current demo screen runs without Supabase credentials; the migration and service boundary are ready for wiring to a project.

## Local development

1. Install Node.js 20+ and npm.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in Supabase values.
4. Apply migrations in filename order to the intended Supabase project, following `docs/SUPABASE_VERCEL_SETUP.md`. Use `seed.sql` only for a disposable demo project.
5. Start the app with `npm run dev`.

Useful checks are `npm run typecheck`, `npm test`, and `npm run build`.

## Architecture

`src/app` owns routes and composition. `packages/domain` currently contains attendance rules and types. `src/modules/omniathlete` contains the first explicit cross-module contract for OmniSite. Supabase migrations contain the tenant-scoped relational model, and `src/services/*` is the server-side data boundary.

Every business record carries `team_id`. The OmniAthlete foundation migration adds team module entitlements, families, and composite tenant keys for core athlete relationships. Swimmers are deactivated rather than deleted, memberships preserve group history, and attendance has an idempotent unique key on `(practice_session_id, swimmer_id)`.

## Attendance rules

Cancelled practice sessions are excluded from eligible practice counts. `calculateAttendancePercentage` is centralized in `packages/domain` and supports the team setting for whether excused absences count against the denominator. Attendance writes should use an upsert through the attendance service, with optimistic UI and an explicit retry state.

## Supabase and initial owner

Create the first Auth user in Supabase, insert a profile if needed, then add an `OWNER` row in `team_memberships` through a trusted process. Provision the OmniTeam platform owner separately in `platform_owners`. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. The owner and parent access design is in `docs/ACCESS_MODEL.md`; the multi-tenant requirements are in `docs/TENANT_ISOLATION.md`.

## Reporting and OmniTeam integration strategy

Reporting should query sessions and attendance through a shared report service, then feed the same result into print, CSV, XLSX, and PDF adapters. The stable UUIDs map cleanly into OmniTeam core entities: `organizations` and `teams` remain platform entities; `swimmers`, `group_memberships`, `practice_schedules`, `practice_sessions`, and `attendance_records` belong to OmniAthlete, with scheduling kept as an internal capability boundary. `external_id` supports import reconciliation. Audit logs should remain append-only during migration.

## Future work

Wire Supabase Auth and server actions, finish CRUD routes for swimmers/groups/schedules, add session generation and exceptions, implement report exports, and add QR self-check-in through `self_checkin_tokens`. Parent accounts, notifications, billing, meets, volunteer hours, and OmniSite can then reuse the same organization/team/membership foundations.
