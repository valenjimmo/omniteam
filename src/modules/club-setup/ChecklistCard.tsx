import Link from "next/link";
import { calculateSetupProgress, type SetupChecklistState } from "./progress";

export function ChecklistCard({ teamId, state, compact = false }: { teamId: string; state: SetupChecklistState; compact?: boolean }) {
  const progress = calculateSetupProgress(state);
  return <section className={`setup-checklist ${compact ? "setup-checklist-compact" : ""}`} aria-labelledby={`setup-title-${teamId}`}>
    <div className="setup-checklist-head"><div><p className="registration-kicker">CLUB SETUP</p><h2 id={`setup-title-${teamId}`}>Setup checklist</h2>
      <p>{progress.completed} of {progress.total} available tasks complete · {progress.percentage}%</p></div>
      <div className="setup-counts"><strong className={progress.setupComplete ? "setup-ready" : ""}>{progress.requiredCompleted}/{progress.requiredTotal} required</strong><small>{progress.recommendedCompleted}/{progress.recommendedTotal} recommended</small></div></div>
    <div className="setup-progress" role="progressbar" aria-label="Overall club setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><span style={{ width: `${progress.percentage}%` }} /></div>
    <ul>{progress.items.map((item) => <li key={item.key} className={!item.available ? "setup-unavailable" : ""}>
      <span aria-hidden="true">{!item.available ? "—" : item.complete ? "✓" : "○"}</span>
      <div><strong>{item.label}</strong><small>{item.kind === "required" ? "Required" : "Recommended"}{!item.available ? " · Not available with current plan" : ""}</small></div>
      {item.available && !item.complete && <Link href={`/dashboard/setup/${encodeURIComponent(teamId)}#${item.key === "practiceGroup" ? "practice-group" : "club-profile"}`}>Complete</Link>}
    </li>)}</ul>
    {compact && <Link className="setup-open" href={`/dashboard/setup/${encodeURIComponent(teamId)}`}>Open setup checklist</Link>}
  </section>;
}
