"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Team = { team_id: string; team_name: string };

export default function PlatformConsolePage() {
  const router = useRouter();
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [message, setMessage] = useState("Checking platform-owner access…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!client) { setMessage("Supabase is not configured."); return; }
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) { router.replace("/platform/login"); return; }
    const { data: isOwner, error: ownerError } = await client.rpc("is_platform_owner");
    if (ownerError || !isOwner) { setMessage("Platform-owner access required."); return; }
    const { data, error } = await client.rpc("list_platform_teams");
    if (error) { setMessage(error.message); return; }
    setTeams((data ?? []) as Team[]);
    setMessage("");
  }, [client, router]);

  useEffect(() => { void load(); }, [load]);

  async function createTeam(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    const { data: teamId, error } = await client.rpc("create_platform_omnisite_team", {
      requested_team_name: teamName.trim(), requested_timezone: timezone,
    });
    if (error) { setMessage(error.message); setBusy(false); return; }
    setMessage(`Team created with OmniSite enabled. Team ID: ${teamId}`);
    setTeamName("");
    await load();
    setBusy(false);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    router.replace("/platform/login");
    router.refresh();
  }

  return <main className="access-page"><div className="access-wrap">
    <div className="platform-heading"><div><Link href="/" className="registration-brand">Omni<span>Team</span></Link><p className="registration-kicker">PLATFORM OWNER</p><h1>Platform console</h1></div><button onClick={signOut} className="access-muted-button">Sign out</button></div>
    {message && <p className="registration-message" role="status">{message}</p>}
    <section className="access-section">
      <h2>Create an OmniSite team</h2>
      <p>This creates an isolated organization and team, makes you that team's OWNER, and enables OmniSite.</p>
      <form className="platform-team-form" onSubmit={createTeam}>
        <label>Team name<input required minLength={2} maxLength={120} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Example Swim Club" /></label>
        <label>Timezone<select value={timezone} onChange={e => setTimezone(e.target.value)}><option>America/Los_Angeles</option><option>America/Denver</option><option>America/Chicago</option><option>America/New_York</option><option>Pacific/Honolulu</option><option>America/Anchorage</option></select></label>
        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create team"}</button>
      </form>
    </section>
    <section className="access-section"><div className="platform-section-heading"><div><h2>Teams</h2><p>{teams.length} team{teams.length === 1 ? "" : "s"}</p></div><div><Link href="/omnisite">Open OmniSite builder</Link><Link href="/omnisite/templates">Manage templates</Link><Link href="/platform/support">Team support</Link></div></div>
      {teams.length === 0 ? <p>No teams have been created.</p> : <div className="platform-team-list">{teams.map(team => <article key={team.team_id}><div><strong>{team.team_name}</strong><small>{team.team_id}</small></div><Link href="/omnisite">Build site</Link></article>)}</div>}
    </section>
  </div></main>;
}
