import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import type { HouseholdJob } from "./types";

export function YourJobsWidget({ jobs, earned, quota }: { jobs: HouseholdJob[]; earned: number; quota: number }) {
  const percent = quota === 0 ? 100 : Math.min(100, Math.round((earned / quota) * 100));
  return <section className="oa-your-jobs">
    <header><div><p className="oa-eyebrow">OMNIVOLUNTEER</p><h2>Your jobs</h2></div><BriefcaseBusiness/></header>
    <div className="oa-credit-row"><strong>{earned} / {quota} credits</strong><span>{percent}% of season requirement</span></div>
    <div className="oa-credit-bar" aria-label={`${percent}% of volunteer requirement complete`}><span style={{ width: `${percent}%` }}/></div>
    <div className="oa-home-jobs">{jobs.length ? jobs.map((job) => <Link key={job.id} href={`/app/events/${job.job_slots.event_id}?action=volunteer`}><b>{job.job_slots.title}</b><span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(job.job_slots.starts_at))}</span></Link>) : <p>No jobs claimed yet.</p>}</div>
  </section>;
}
