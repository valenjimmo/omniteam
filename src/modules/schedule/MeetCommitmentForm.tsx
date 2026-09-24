"use client";

import React from "react";
import { saveCommitments, type CommitmentChoice } from "./actions";

type Athlete = { id: string; first_name: string; last_name: string };
type Session = { id: string; name: string; starts_at: string; ends_at: string };

export function MeetCommitmentForm({ teamId, eventId, athletes, sessions, initial = [] }: { teamId: string; eventId: string; athletes: Athlete[]; sessions: Session[]; initial?: CommitmentChoice[] }) {
  const [choices, setChoices] = React.useState<Record<string, CommitmentChoice>>(() => Object.fromEntries(athletes.map(a => [a.id, initial.find(c => c.athlete_id === a.id) ?? { athlete_id:a.id, response:"attend", session_ids:sessions.map(s => s.id), coach_note:"" }])));
  const [message, setMessage] = React.useState("");
  const update = (id: string, patch: Partial<CommitmentChoice>) => setChoices(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  return <form className="oa-commit-form" onSubmit={async e => { e.preventDefault(); setMessage("Saving…"); const result = await saveCommitments(teamId,eventId,Object.values(choices)); setMessage(result.error ?? "Commitments saved."); }}>
    <div className="oa-commit-intro"><h2>Declare your athletes</h2><p>Set everyone’s plans, then save the household once.</p></div>
    {athletes.map(athlete => { const choice=choices[athlete.id]; return <article key={athlete.id}>
      <div className="oa-athlete-title"><span>{athlete.first_name[0]}</span><strong>{athlete.first_name} {athlete.last_name}</strong></div>
      <div className="oa-decision" role="group" aria-label={`${athlete.first_name} attendance`}><button type="button" className={choice.response==="attend"?"selected":""} onClick={()=>update(athlete.id,{response:"attend"})}>Attend</button><button type="button" className={choice.response==="decline"?"selected decline":""} onClick={()=>update(athlete.id,{response:"decline",session_ids:[]})}>Decline</button></div>
      {choice.response === "attend" && <fieldset><legend>Sessions</legend>{sessions.map(session => <label key={session.id}><input type="checkbox" checked={choice.session_ids.includes(session.id)} onChange={e=>update(athlete.id,{session_ids:e.target.checked?[...choice.session_ids,session.id]:choice.session_ids.filter(id=>id!==session.id)})}/><span><b>{session.name}</b><small>{new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(session.starts_at))}</small></span></label>)}</fieldset>}
      <label className="oa-note">Note for coach <textarea maxLength={1000} rows={2} value={choice.coach_note} onChange={e=>update(athlete.id,{coach_note:e.target.value})} placeholder="Optional" /></label>
    </article>})}
    <button className="oa-save-commitments" type="submit">Save all athletes</button>{message&&<p className="oa-success" role="status">{message}</p>}
  </form>;
}

