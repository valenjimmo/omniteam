# Daily Supabase keep-alive

The GitHub Actions workflow in `.github/workflows/supabase-keepalive.yml` runs
`SELECT 1;` once each day at 16:23 UTC (9:23 a.m. Pacific daylight time or
8:23 a.m. Pacific standard time). It returns one number without accessing tables.
There are no schema changes, writes, Edge Function invocations, or storage objects.
This is approximately 30–31 tiny queries per month, plus any manual runs. Connection
and query traffic still count toward applicable usage; this is not zero usage.
GitHub Actions runner usage is separate from Supabase usage.

## Enable

1. In Supabase, open **Connect → Session pooler**. Use the host and user from
   that panel, with port **5432**. The pooler supports IPv4 GitHub runners.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions**
   and add these repository secrets:

   | Secret | Value |
   | --- | --- |
   | `SUPABASE_KEEPALIVE_HOST` | Session pooler hostname only |
   | `SUPABASE_KEEPALIVE_USER` | Pooler username, including the project suffix |
   | `SUPABASE_KEEPALIVE_PASSWORD` | Database password, not an API key |

   Keep credentials out of source control. A dedicated database login with only
   connection permission is sufficient for `SELECT 1`; no table grants are needed.
3. Push the workflow to the repository's default branch and enable GitHub Actions.
4. Under **Actions → Supabase daily keep-alive**, select **Run workflow** once
   and confirm success. Subsequent scheduled runs happen automatically.

The job uses TLS, read-only transactions, a 15-second connection timeout, a
10-second statement timeout, and a two-minute job limit. It does not retry.
Disable the workflow in GitHub Actions to stop the schedule.

## Limits

Supabase describes a few user database requests per day as typically sufficient
to prevent inactivity pausing. **One daily `SELECT 1` is a best-effort measure,
not a documented guarantee.** A paid plan removes inactivity pausing. If the
project is already paused, resume it in Supabase first; this job cannot resume it.

GitHub schedules can be delayed or dropped under load. In public repositories,
scheduled workflows are disabled after 60 days without repository activity.
Check workflow results if warnings continue.

References:

- [Supabase pause policy](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
