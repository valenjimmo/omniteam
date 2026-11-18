# Administration API

The OpenAPI 3.1 document is served at `/api/openapi.json`; `/developer/api` provides a short human-readable entry point. The first operation is a guarded reset for a dedicated test Supabase project:

- `GET /api/admin/purge?projectRef=<ref>` previews team, site, asset, and non-test-team counts.
- `DELETE /api/admin/purge` accepts JSON `{ "projectRef": "<ref>", "confirmation": "DELETE ALL TEST CLIENT DATA" }`.

Both operations require a current Supabase access token belonging to an OmniTeam platform owner, passed as `Authorization: Bearer <token>`, or the platform-owner session cookie when called from the application. The database marker must match the project reference. Every team must have `is_test_team = true`. The DELETE route removes OmniSite objects through the Storage API and then removes all teams, their subscriptions, sites, and tenant records.

The reset preserves Auth users, profiles, platform-owner grants, shared OmniSite templates, and subscription plans. It is unavailable until `SUPABASE_SERVICE_ROLE_KEY` is configured as a private, server-only Vercel variable; this key must never use a `NEXT_PUBLIC_` prefix. Preview does not need the service key.

This endpoint is not a customer-facing account deletion API and must never be enabled as a general production-data purge. Migration `202609150001_mock_subscriptions_and_test_reset.sql` enforces the test marker, exact project reference, platform-owner identity, confirmation phrase, and absence of non-test teams at the database layer.
