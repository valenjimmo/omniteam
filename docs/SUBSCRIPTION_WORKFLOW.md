# Mock subscription workflow

The home page presents the initial plans and links directly to `/subscribe`. That route simulates the commercial onboarding flow without collecting payment information. A user creates or signs into an individually verified Supabase Auth account, selects an active plan, enters the team name and timezone, reviews a clearly labeled mock order, and starts a 30-day simulated trial. Completion creates an organization and isolated team, assigns that user as the team OWNER, records a mock subscription, and enables the plan's module entitlements. The user then opens `/dashboard`; it shows only modules that are actively entitled for the selected team and allowed for that user. From there the owner can open `/omnisite` to choose a template and build the website.

The initial plans are OmniSite Starter and OmniSite + OmniAthlete. Displayed prices are placeholders. `subscription_plans` is the catalog; `mock_checkout_sessions` records an account's temporary checkout; `team_subscriptions` records the resulting team subscription with `billing_mode = MOCK`. No card fields, payment tokens, invoices, or external payment processor are involved.

When live billing is added, use a trusted server-created checkout session and verified provider webhooks as the source of subscription state. Do not let the browser directly grant module entitlements. Preserve the same completion boundary: subscription state changes first, then a trusted idempotent process updates team entitlements. Add cancellation, retry, duplicate-webhook, and plan-change handling before changing `billing_mode` to `LIVE`.

Migration `202609150001_mock_subscriptions_and_test_reset.sql` creates this model. It has not been applied to a remote database.
