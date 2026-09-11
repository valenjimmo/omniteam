# OmniTeam / OmniAthlete / Attendance

OmniAttendance is the first working module in OmniTeam: a mobile-friendly attendance workflow for swim coaches. The app is deliberately organized around reusable domain logic so future modules such as OmniMeet, OmniVolunteer, and OmniPay can share types, authorization helpers, reporting rules, and UI primitives.

## Stack

Next.js App Router, TypeScript, React, Supabase PostgreSQL/Auth/RLS, Vitest, and Tailwind-compatible CSS tokens. The current demo screen runs without Supabase credentials; the migration and service boundary are ready for wiring to a project.

## Local development

1. Install Node.js 20+ and npm.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in Supabase values.
4. Run the migration and seed with the Supabase CLI: `supabase db reset`.
5. Start the app with `npm run dev`.

Useful checks are `npm run typecheck`, `npm test`, and `npm run build`.

## Architecture

`src/app` owns routes and composition. `packages/domain` contains product-neutral attendance rules and types; it is intended to become a shared workspace package consumed by every OmniTeam product. Supabase migrations contain the tenant-scoped relational model, and future `src/services/*` modules should be the only place UI code talks to Supabase.

Every business record carries `team_id`. Membership-based RLS uses `is_active_team_member` so a URL or modified request cannot cross tenant boundaries. Swimmers are deactivated rather than deleted, memberships preserve group history, and attendance has an idempotent unique key on `(practice_session_id, swimmer_id)`.

## Attendance rules

Cancelled practice sessions are excluded from eligible practice counts. `calculateAttendancePercentage` is centralized in `packages/domain` and supports the team setting for whether excused absences count against the denominator. Attendance writes should use an upsert through the attendance service, with optimistic UI and an explicit retry state.

## Supabase and initial owner

Create the first Auth user in Supabase, insert a profile, then add an `OWNER` row in `team_memberships`. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Production routes should use `@supabase/ssr` server clients and validate the active team membership before mutations.

## Reporting and OmniTeam integration strategy

Reporting should query sessions and attendance through a shared report service, then feed the same result into print, CSV, XLSX, and PDF adapters. The stable UUIDs map cleanly into OmniTeam core entities: `organizations` and `teams` remain platform entities, `swimmers` and `group_memberships` map to OmniAthlete, `practice_schedules` and `practice_sessions` map to OmniSchedule, and `attendance_records` remains the OmniAthlete attendance event ledger. `external_id` supports import reconciliation. Audit logs should remain append-only during migration.

## Future work

Wire Supabase Auth and server actions, finish CRUD routes for swimmers/groups/schedules, add session generation and exceptions, implement report exports, and add QR self-check-in through `self_checkin_tokens`. Parent accounts, notifications, billing, meets, volunteer hours, and OmniSite can then reuse the same organization/team/membership foundations.