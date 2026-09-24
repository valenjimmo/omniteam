"use client";

import { useState, useTransition } from "react";
import { Clock, Users } from "lucide-react";
import { claimJob, releaseJob } from "./actions";
import { emit } from "./bus";
import type { VolunteerSlot } from "./types";

export function VolunteerTab({ teamId, eventId, householdId, slots }: { teamId: string; eventId: string; householdId: string | null; slots: VolunteerSlot[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const formatTime = (value: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));

  function change(kind: "claim" | "release", id: string) {
    setMessage("");
    startTransition(async () => {
      const result = kind === "claim" ? await claimJob(teamId, eventId, id) : await releaseJob(teamId, eventId, id);
      if (result.error) return setMessage(result.error);
      emit(kind === "claim" ? "job.claimed" : "job.released", { eventId, id });
      setMessage(kind === "claim" ? "Job claimed." : "Job released.");
    });
  }

  if (!slots.length) return <div className="oa-volunteer-empty"><h2>Volunteer</h2><p>No jobs have been posted for this event.</p></div>;
  return <section className="oa-volunteer-tab">
    <header><div><h2>Volunteer jobs</h2><p>Choose one job for your household at a time.</p></div></header>
    {message && <p className="oa-volunteer-message" role="status">{message}</p>}
    <div className="oa-job-grid">{slots.map((slot) => {
      const active = slot.job_signups.filter((signup) => signup.status === "claimed");
      const own = active.find((signup) => signup.household_id === householdId);
      const remaining = Math.max(0, slot.capacity - active.length);
      const closed = new Date(slot.signup_deadline) < new Date();
      return <article key={slot.id}>
        <div className="oa-job-card-head"><h3>{slot.title}</h3><span>{slot.credit_value} credit</span></div>
        {slot.description && <p>{slot.description}</p>}
        <div className="oa-job-meta"><span><Clock size={15}/>{formatTime(slot.starts_at)}–{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(slot.ends_at))}</span><span><Users size={15}/>{remaining} of {slot.capacity} remaining</span></div>
        <button disabled={pending || closed || (!own && remaining === 0) || !householdId} onClick={() => change(own ? "release" : "claim", own?.id ?? slot.id)} className={own ? "release" : ""}>
          {closed ? "Signup closed" : own ? "Release job" : remaining ? "Claim job" : "Job full"}
        </button>
      </article>;
    })}</div>
  </section>;
}
