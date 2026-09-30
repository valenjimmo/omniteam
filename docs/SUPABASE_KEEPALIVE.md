# Daily Supabase keep-alive

Vercel calls `/api/cron/supabase-keepalive` once each day at 16:23 UTC. The
route makes three small, anonymous, read-only queries through the Supabase Data
API. Row-level security remains in effect, so the job cannot read tenant data.
There are no schema changes, writes, Edge Function invocations, or storage
objects.

This produces approximately 90–93 tiny queries per month. The requests still
count toward applicable Vercel and Supabase usage.

## Enable

Configure these environment variables for the Vercel production deployment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key; RLS remains enforced |
| `CRON_SECRET` | Random server-side secret of at least 16 characters |

`CRON_SECRET` must not use the `NEXT_PUBLIC_` prefix. Vercel automatically sends
it as a bearer token when invoking configured cron routes. Redeploy the production
deployment after setting or changing these values; Vercel registers the schedule
from `vercel.json` only for production deployments.

To verify the job, open **Vercel project → Settings → Cron Jobs** after the
production deployment and inspect the job or its function logs. An HTTP 200 with
`{"ok":true,"queries":3}` means all three Supabase requests succeeded. Vercel
does not automatically retry a failed cron invocation.

## Limits

Supabase describes a few user database requests per day as typically sufficient
to prevent inactivity pausing. **Three daily queries are a best-effort measure,
not a documented guarantee.** A paid Supabase plan removes inactivity pausing.
If the project is already paused, resume it in Supabase first; this job cannot
resume it. Vercel Hobby cron schedules can run at any time during the configured
hour.

References:

- [Supabase pause policy](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)
