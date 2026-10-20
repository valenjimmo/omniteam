"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OMNITEAM_MODULES, type ModuleKey } from "@/lib/modules";
import {
  teamUsableLinks,
  type PlatformTeamLinkRow,
  type UsableLink,
} from "./team-links";
type Team = {
  team_id: string;
  team_name: string;
  team_status: "ACTIVE" | "INACTIVE";
  is_test_team: boolean;
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  billing_mode: string | null;
};
type TeamModule = { team_id: string; module_key: ModuleKey; enabled: boolean };
type Plan = { id: string; name: string };
type DeletePreview = {
  teamId: string;
  teamName: string;
  recordCount: number;
  assetCount: number;
  records: Record<string, number>;
  preserves: string[];
};
function LinkControls({
  link,
  onCopy,
}: {
  link: UsableLink;
  onCopy: (url: string) => void;
}) {
  return (
    <div className="owner-link-controls">
      {link.url ? (
        <>
          <a href={link.url} target="_blank" rel="noreferrer">
            Open
          </a>
          <button type="button" onClick={() => onCopy(link.url!)}>
            Copy
          </button>
        </>
      ) : (
        <span>{link.status}</span>
      )}
    </div>
  );
}
export default function PlatformConsole({
  siteOrigin,
}: {
  siteOrigin: string;
}) {
  const router = useRouter();
  const client = useMemo(() => {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL,
      k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return u && k ? createBrowserClient(u, k) : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]),
    [modules, setModules] = useState<TeamModule[]>([]),
    [links, setLinks] = useState<PlatformTeamLinkRow[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [teamName, setTeamName] = useState(""),
    [timezone, setTimezone] = useState("America/Los_Angeles"),
    [message, setMessage] = useState("Loading OmniTeam…"),
    [busy, setBusy] = useState(""),
    [deleting, setDeleting] = useState<Team | null>(null),
    [preview, setPreview] = useState<DeletePreview | null>(null),
    [confirmName, setConfirmName] = useState(""),
    [confirmPhrase, setConfirmPhrase] = useState("");
  const load = useCallback(async () => {
    if (!client) return;
    const [overview, moduleRows, linkRows, planRows] = await Promise.all([
      client.rpc("list_platform_team_overview"),
      client.rpc("list_platform_team_modules"),
      client.rpc("list_platform_team_usable_links"),
      client
        .from("subscription_plans")
        .select("id,name")
        .eq("active", true)
        .order("display_order"),
    ]);
    const error =
      overview.error || moduleRows.error || linkRows.error || planRows.error;
    if (error) {
      setMessage(error.message);
      return;
    }
    setTeams((overview.data ?? []) as Team[]);
    setModules((moduleRows.data ?? []) as TeamModule[]);
    setLinks((linkRows.data ?? []) as PlatformTeamLinkRow[]);
    setPlans((planRows.data ?? []) as Plan[]);
    setMessage("");
  }, [client]);
  useEffect(() => {
    void load();
  }, [load]);
  async function createTeam(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy("create");
    const r = await client.rpc("create_platform_omnisite_team", {
      requested_team_name: teamName.trim(),
      requested_timezone: timezone,
    });
    setMessage(r.error?.message || "Team created with OmniSite enabled.");
    if (!r.error) {
      setTeamName("");
      await load();
    }
    setBusy("");
  }
  async function toggleModule(
    teamId: string,
    key: ModuleKey,
    enabled: boolean,
  ) {
    if (!client) return;
    setBusy(`${teamId}:${key}`);
    const r = await client.rpc("platform_set_team_module", {
      target_team_id: teamId,
      target_module: key,
      enable_module: enabled,
    });
    setMessage(
      r.error?.message || `${key} ${enabled ? "enabled" : "disabled"}.`,
    );
    if (!r.error) await load();
    setBusy("");
  }
  async function setPlan(teamId: string, planId: string) {
    if (!client || !planId) return;
    setBusy(`${teamId}:plan`);
    const r = await client.rpc("platform_set_team_plan", {
      target_team_id: teamId,
      target_plan_id: planId,
    });
    setMessage(
      r.error?.message || "Mock plan and module entitlements updated.",
    );
    if (!r.error) await load();
    setBusy("");
  }
  async function setStatus(team: Team) {
    if (!client) return;
    setBusy(`${team.team_id}:status`);
    const activating = team.team_status !== "ACTIVE";
    const r = await client.rpc("platform_set_team_status", {
      target_team_id: team.team_id,
      activate: activating,
    });
    setMessage(
      r.error?.message || `Team ${activating ? "reactivated" : "archived"}.`,
    );
    if (!r.error) await load();
    setBusy("");
  }
  async function openDelete(team: Team) {
    setDeleting(team);
    setPreview(null);
    setConfirmName("");
    setConfirmPhrase("");
    setBusy(`${team.team_id}:preview`);
    const response = await fetch(
      `/api/platform/teams/${team.team_id}/hard-delete`,
    );
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Preview failed");
      setDeleting(null);
    } else setPreview(data);
    setBusy("");
  }
  async function permanentlyDelete() {
    if (!deleting) return;
    setBusy(`${deleting.team_id}:delete`);
    const response = await fetch(
      `/api/platform/teams/${deleting.team_id}/hard-delete`,
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamName: confirmName,
          confirmation: confirmPhrase,
        }),
      },
    );
    const data = await response.json();
    setMessage(
      response.ok
        ? `Team permanently deleted. ${data.removedAssets} OmniSite asset(s) removed.`
        : (data.error ?? "Deletion failed"),
    );
    if (response.ok) {
      setDeleting(null);
      setPreview(null);
      await load();
    }
    setBusy("");
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    router.replace("/platform/login");
    router.refresh();
  }
  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage(
        "Could not copy the link. You can open it and copy it from the address bar.",
      );
    }
  }
  const active = teams.filter((t) => t.team_status === "ACTIVE").length,
    sites = modules.filter(
      (m) => m.module_key === "omnisite" && m.enabled,
    ).length,
    trials = teams.filter((t) => t.subscription_status === "TRIALING").length;
  return (
    <main className="owner-dashboard">
      <aside>
        <Link href="/" className="registration-brand">
          Omni<span>Team</span>
        </Link>
        <p>OWNER CONTROL</p>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#teams">Teams</a>
          <Link href="/omnisite/templates">Templates</Link>
          <Link href="/platform/support">Support access</Link>
          <Link href="/developer/api">Admin API</Link>
        </nav>
        <button onClick={signOut}>Sign out</button>
      </aside>
      <div className="owner-main">
        <header>
          <div>
            <p className="registration-kicker">OMNITEAM OWNER</p>
            <h1>Platform dashboard</h1>
          </div>
          <Link href="/subscribe">View client subscription flow</Link>
        </header>
        {message && (
          <p className="registration-message" role="status">
            {message}
          </p>
        )}
        <section id="overview" className="owner-stats">
          <article>
            <span>Total teams</span>
            <strong>{teams.length}</strong>
          </article>
          <article>
            <span>Active teams</span>
            <strong>{active}</strong>
          </article>
          <article>
            <span>OmniSite teams</span>
            <strong>{sites}</strong>
          </article>
          <article>
            <span>Mock trials</span>
            <strong>{trials}</strong>
          </article>
        </section>
        <section className="owner-panel">
          <h2>Create a team directly</h2>
          <p>
            For testing or support setup. The public client flow is available
            under Subscriptions.
          </p>
          <form className="platform-team-form" onSubmit={createTeam}>
            <label>
              Team name
              <input
                required
                minLength={2}
                maxLength={120}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </label>
            <label>
              Timezone
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option>America/Los_Angeles</option>
                <option>America/Denver</option>
                <option>America/Chicago</option>
                <option>America/New_York</option>
              </select>
            </label>
            <button disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Create OmniSite team"}
            </button>
          </form>
        </section>
        <section id="teams" className="owner-panel">
          <div className="owner-panel-heading">
            <div>
              <h2>Teams and subscriptions</h2>
              <p>
                Plan changes reset entitlements to that plan. Individual
                switches are audited owner overrides.
              </p>
            </div>
          </div>
          {teams.length === 0 ? (
            <p>No teams yet.</p>
          ) : (
            <div className="owner-team-list">
              {teams.map((team) => {
                const usable = teamUsableLinks(
                  links.find((link) => link.team_id === team.team_id),
                  siteOrigin,
                );
                return (
                  <article key={team.team_id}>
                    <div className="owner-team-heading">
                      <div>
                        <h3>{team.team_name}</h3>
                        <p>
                          {team.team_status} ·{" "}
                          {team.is_test_team ? "Test team" : "Non-test team"} ·{" "}
                          {team.plan_name ?? "Direct provisioning"}{" "}
                          {team.subscription_status &&
                            `· ${team.subscription_status}`}
                        </p>
                        <small>{team.team_id}</small>
                      </div>
                      <div className="owner-team-actions">
                        <button
                          onClick={() => setStatus(team)}
                          disabled={busy === `${team.team_id}:status`}
                        >
                          {team.team_status === "ACTIVE"
                            ? "Archive"
                            : "Reactivate"}
                        </button>
                        <button
                          className="danger"
                          onClick={() => void openDelete(team)}
                          disabled={busy === `${team.team_id}:preview`}
                        >
                          Permanently delete
                        </button>
                      </div>
                    </div>
                    <div className="owner-plan">
                      <label>
                        Mock subscription plan
                        <select
                          defaultValue=""
                          onChange={(e) =>
                            void setPlan(team.team_id, e.target.value)
                          }
                        >
                          <option value="">Choose plan…</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="owner-module-switches">
                      {OMNITEAM_MODULES.map((module) => {
                        const enabled = modules.some(
                          (m) =>
                            m.team_id === team.team_id &&
                            m.module_key === module.key &&
                            m.enabled,
                        );
                        return (
                          <label key={module.key}>
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={
                                busy === `${team.team_id}:${module.key}`
                              }
                              onChange={(e) =>
                                void toggleModule(
                                  team.team_id,
                                  module.key,
                                  e.target.checked,
                                )
                              }
                            />
                            <span>{module.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="owner-usable-links">
                      <article>
                        <div>
                          <strong>Team website</strong>
                          <span>
                            {usable.website.label} · {usable.website.status}
                          </span>
                          {usable.website.url && (
                            <small>{usable.website.url}</small>
                          )}
                        </div>
                        <LinkControls link={usable.website} onCopy={copyUrl} />
                      </article>
                      <article>
                        <div>
                          <strong>Family registration</strong>
                          <span>
                            {usable.registration.label} ·{" "}
                            {usable.registration.status}
                          </span>
                          {usable.registration.url && (
                            <small>{usable.registration.url}</small>
                          )}
                        </div>
                        <LinkControls
                          link={usable.registration}
                          onCopy={copyUrl}
                        />
                      </article>
                    </div>
                    <div className="owner-team-links">
                      <Link href="/dashboard">Team dashboard</Link>
                      {modules.some(
                        (m) =>
                          m.team_id === team.team_id &&
                          m.module_key === "omnisite" &&
                          m.enabled,
                      ) && <Link href="/omnisite">OmniSite builder</Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {deleting && (
        <div className="delete-backdrop" role="presentation">
          <section
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">Permanently delete {deleting.team_name}?</h2>
            {!preview ? (
              <p>Loading affected records and assets…</p>
            ) : (
              <>
                <p>This is separate from archiving and cannot be undone.</p>
                <div className="delete-summary">
                  <strong>{preview.recordCount} database records</strong>
                  <strong>{preview.assetCount} OmniSite assets</strong>
                </div>
                <details>
                  <summary>Records by table</summary>
                  <ul>
                    {Object.entries(preview.records).map(([name, count]) => (
                      <li key={name}>
                        {name}: {count}
                      </li>
                    ))}
                  </ul>
                </details>
                <p>Preserved: {preview.preserves.join(", ")}.</p>
                <label>
                  Type the exact team name
                  <input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Type DELETE PERMANENTLY
                  <input
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    autoComplete="off"
                  />
                </label>
              </>
            )}
            <div className="delete-actions">
              <button
                onClick={() => setDeleting(null)}
                disabled={busy === `${deleting.team_id}:delete`}
              >
                Cancel
              </button>
              <button
                className="danger"
                onClick={() => void permanentlyDelete()}
                disabled={
                  !preview ||
                  confirmName !== deleting.team_name ||
                  confirmPhrase !== "DELETE PERMANENTLY" ||
                  busy === `${deleting.team_id}:delete`
                }
              >
                {busy === `${deleting.team_id}:delete`
                  ? "Deleting…"
                  : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
