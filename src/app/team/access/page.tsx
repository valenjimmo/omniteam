"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

type Membership = { id: string; team_id: string; user_id: string;
  role: "OWNER" | "ADMIN" | "COACH" | "PARENT"; can_assign_access: boolean };
type Permission = { membership_id: string; module_key: string; access_level: "VIEW" | "MANAGE" };
type Entitlement = { module_key: string };
type Request = { id: string; family_name: string; swimmers: { first_name: string; last_name: string }[] };
type Profile = { id: string; first_name: string; last_name: string; email: string };

export default function TeamAccessPage() {
  const [ownMemberships, setOwnMemberships] = useState<Membership[]>([]);
  const [teamId, setTeamId] = useState("");
  const [members, setMembers] = useState<Membership[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [slug, setSlug] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [message, setMessage] = useState("Loading team access…");
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  const loadTeam = useCallback(async (selectedTeamId: string) => {
    if (!client) return;
    const [memberResult, permissionResult, entitlementResult, requestResult, settingResult] = await Promise.all([
      client.from("team_memberships").select("id,team_id,user_id,role,can_assign_access").eq("team_id", selectedTeamId),
      client.from("team_member_module_permissions").select("membership_id,module_key,access_level").eq("team_id", selectedTeamId),
      client.from("team_module_entitlements").select("module_key").eq("team_id", selectedTeamId),
      client.from("parent_registration_requests").select("id,family_name,swimmers").eq("team_id", selectedTeamId).eq("status", "PENDING"),
      client.from("team_registration_settings").select("slug,registration_open").eq("team_id", selectedTeamId).maybeSingle(),
    ]);
    const error = memberResult.error || permissionResult.error || entitlementResult.error || requestResult.error || settingResult.error;
    if (error) { setMessage(`Team access could not be loaded: ${error.message}`); return; }
    const nextMembers = (memberResult.data ?? []) as Membership[];
    const ids = nextMembers.map((member) => member.user_id);
    const profileResult = ids.length
      ? await client.from("profiles").select("id,first_name,last_name,email").in("id", ids)
      : { data: [], error: null };
    if (profileResult.error) { setMessage(`Profiles could not be loaded: ${profileResult.error.message}`); return; }
    setMembers(nextMembers);
    setProfiles((profileResult.data ?? []) as Profile[]);
    setPermissions((permissionResult.data ?? []) as Permission[]);
    setEntitlements((entitlementResult.data ?? []) as Entitlement[]);
    setRequests((requestResult.data ?? []) as Request[]);
    setSlug(settingResult.data?.slug ?? "");
    setRegistrationOpen(settingResult.data?.registration_open ?? false);
    setMessage("");
  }, [client]);

  useEffect(() => {
    async function loadOwn() {
      if (!client) { setMessage("Team access is not configured yet."); return; }
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { setMessage("Sign in before managing team access."); return; }
      const { data, error } = await client.from("team_memberships")
        .select("id,team_id,user_id,role,can_assign_access")
        .eq("user_id", auth.user.id).eq("status", "ACTIVE");
      if (error) { setMessage(error.message); return; }
      const available = ((data ?? []) as Membership[]).filter((m) => m.role === "OWNER"
        || (m.role === "ADMIN" && m.can_assign_access));
      setOwnMemberships(available);
      if (!available.length) { setMessage("You do not have permission to manage team access."); return; }
      setTeamId(available[0].team_id);
    }
    void loadOwn();
  }, [client]);

  useEffect(() => { if (teamId) void loadTeam(teamId); }, [teamId, loadTeam]);

  async function setPermission(memberId: string, moduleKey: string, level: string) {
    if (!client) return;
    const { error } = await client.rpc("set_team_member_module_permission", {
      target_team_id: teamId, target_membership_id: memberId,
      target_module: moduleKey, target_level: level || null,
    });
    setMessage(error ? error.message : "Module access updated.");
    if (!error) await loadTeam(teamId);
  }

  async function setRole(memberId: string, role: Membership["role"], canAssign: boolean) {
    if (!client) return;
    const { error } = await client.rpc("set_team_member_role", {
      target_team_id: teamId, target_membership_id: memberId,
      target_role: role, allow_access_assignment: canAssign,
    });
    setMessage(error ? error.message : "Role updated.");
    if (!error) await loadTeam(teamId);
  }

  async function review(requestId: string, approve: boolean) {
    if (!client) return;
    const { error } = await client.rpc("review_parent_registration", {
      target_request_id: requestId, approve,
    });
    setMessage(error ? error.message : approve ? "Family approved." : "Registration declined.");
    if (!error) await loadTeam(teamId);
  }

  async function saveRegistration() {
    if (!client) return;
    const { error } = await client.rpc("configure_team_registration", {
      target_team_id: teamId, target_slug: slug.trim().toLowerCase(),
      open_registration: registrationOpen,
    });
    setMessage(error ? error.message : "Registration settings saved.");
    if (!error) await loadTeam(teamId);
  }

  const isOwner = ownMemberships.some((m) => m.team_id === teamId && m.role === "OWNER");
  return <main className="access-page"><div className="access-wrap">
    <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
    <p className="registration-kicker">TEAM SETTINGS</p>
    <h1>People and access</h1>
    {ownMemberships.length > 1 && <label>Team <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
      {ownMemberships.map((m) => <option key={m.team_id} value={m.team_id}>{m.team_id}</option>)}
    </select></label>}
    {message && <p className="registration-message" role="status">{message}</p>}
    {teamId && <>
      {isOwner && <section className="access-section"><h2>Parent registration</h2>
        <p>Share the link with families after opening registration.</p>
        <div className="access-controls"><label>Team link name <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="team-name" /></label>
          <label><input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} /> Open registration</label>
          <button onClick={saveRegistration}>Save</button></div>
        {slug && <p>Registration link: <code>/register/{slug}</code></p>}
      </section>}
      <section className="access-section"><h2>Pending families</h2>
        {requests.length === 0 && <p>No pending registrations.</p>}
        {requests.map((request) => <div className="access-person" key={request.id}>
          <div><strong>{request.family_name}</strong><small>{request.swimmers.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}</small></div>
          <button onClick={() => review(request.id, true)}>Approve</button>
          <button className="access-muted-button" onClick={() => review(request.id, false)}>Decline</button>
        </div>)}
      </section>
      <section className="access-section"><h2>Team members</h2>
        <p>Module access is granted per person. Owners can manage every purchased module.</p>
        {members.map((member) => {
          const profile = profiles.find((p) => p.id === member.user_id);
          return <div className="access-person" key={member.id}>
            <div><strong>{profile ? `${profile.first_name} ${profile.last_name}` : member.user_id}</strong>
              <small>{profile?.email ?? ""}</small></div>
            <div className="access-member-controls"><label>Role <select value={member.role} disabled={!isOwner || member.role === "OWNER"}
              onChange={(e) => setRole(member.id, e.target.value as Membership["role"], false)}>
              <option value="OWNER">Owner</option><option value="ADMIN">Admin</option>
              <option value="COACH">Coach</option><option value="PARENT">Parent</option>
            </select></label>
            {isOwner && member.role === "ADMIN" && <label><input type="checkbox" checked={member.can_assign_access}
              onChange={(e) => setRole(member.id, "ADMIN", e.target.checked)} /> Can assign access</label>}
            {member.role !== "OWNER" && entitlements.map((entitlement) => {
              const permission = permissions.find((p) => p.membership_id === member.id && p.module_key === entitlement.module_key);
              return <label key={entitlement.module_key}>{entitlement.module_key}
                <select value={permission?.access_level ?? ""}
                  onChange={(e) => setPermission(member.id, entitlement.module_key, e.target.value)}>
                  <option value="">None</option><option value="VIEW">View</option><option value="MANAGE">Manage</option>
                </select></label>;
            })}</div>
          </div>;
        })}
      </section>
    </>}
  </div></main>;
}
