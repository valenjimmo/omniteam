"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

type Team = { team_id: string; team_name: string };
type SupportData = { table: string; rows: Record<string, unknown>[] }[];
const readableTables = ["teams", "team_memberships", "team_module_entitlements",
  "families", "family_contacts", "family_guardians", "family_swimmers",
  "swimmers", "swim_groups", "group_memberships", "practice_sessions",
  "attendance_records", "parent_registration_requests", "audit_logs"];

export default function PlatformSupportPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [reason, setReason] = useState("");
  const [data, setData] = useState<SupportData>([]);
  const [message, setMessage] = useState("Checking platform access…");
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  useEffect(() => {
    async function loadTeams() {
      if (!client) { setMessage("Platform support is not configured yet."); return; }
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { setMessage("Sign in with your OmniTeam platform-owner account."); return; }
      const { data: result, error } = await client.rpc("list_platform_teams");
      if (error) { setMessage("This account does not have platform-owner access."); return; }
      setTeams((result ?? []) as Team[]);
      setMessage("Choose a team and enter a troubleshooting reason to start a one-hour read-only session.");
    }
    void loadTeams();
  }, [client]);

  async function startSession() {
    if (!client || !teamId || reason.trim().length < 10) return;
    const { error } = await client.rpc("start_platform_support_session", {
      target_team_id: teamId, support_reason: reason.trim(),
    });
    if (error) { setMessage(error.message); return; }
    const results: SupportData = [];
    for (const table of readableTables) {
      const { data: rows, error: readError } = await client.from(table)
        .select("*").eq(table === "teams" ? "id" : "team_id", teamId).limit(100);
      if (readError) { setMessage(`Session started, but ${table} could not be loaded: ${readError.message}`); return; }
      results.push({ table, rows: (rows ?? []) as Record<string, unknown>[] });
    }
    setData(results);
    setMessage("Read-only support session started. The reason was recorded in the team's audit log.");
  }

  return <main className="access-page"><div className="access-wrap">
    <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
    <p className="registration-kicker">PLATFORM OWNER</p>
    <h1>Team support</h1>
    {message && <p className="registration-message" role="status">{message}</p>}
    {teams.length > 0 && <section className="access-section">
      <label>Team<select value={teamId} onChange={(e) => { setTeamId(e.target.value); setData([]); }}>
        <option value="">Select a team</option>
        {teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
      </select></label>
      <label>Reason for access<textarea value={reason} onChange={(e) => setReason(e.target.value)}
        minLength={10} maxLength={500} rows={3} placeholder="Describe the issue being investigated" /></label>
      <button onClick={startSession} disabled={!teamId || reason.trim().length < 10}>Start read-only session</button>
    </section>}
    {data.map((section) => <section className="access-section" key={section.table}>
      <h2>{section.table.replaceAll("_", " ")} ({section.rows.length})</h2>
      <pre className="support-data">{JSON.stringify(section.rows, null, 2)}</pre>
    </section>)}
  </div></main>;
}
