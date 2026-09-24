import { CalendarDays, MapPin } from "lucide-react";
import { MeetCommitmentForm } from "./MeetCommitmentForm";
import type { ReactNode } from "react";
import { eventTabs } from "@/shell/registries";

export interface ScheduleEvent {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  team_id: string;
  commit_deadline?: string | null;
}

export function EventDetail({
  event, volunteer,
  action,
  athletes = [], sessions = [], commitments = [],
}: {
  event: ScheduleEvent;
  action?: string;
  athletes?: {id:string;first_name:string;last_name:string}[];
  sessions?: {id:string;name:string;starts_at:string;ends_at:string}[];
  commitments?: {athlete_id:string;response:"attend"|"decline";coach_note:string|null;commitment_sessions?:{event_session_id:string}[]}[];
  volunteer?: ReactNode;
}) {
  const tabs = eventTabs([{key:"volunteer", label:"Volunteer", enabled:Boolean(volunteer), content:volunteer}]);
  const active = tabs.some((tab)=>tab.key===action) ? action! : "details";
  const startsAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(event.starts_at));

  return (
    <section className="oa-event">
      <p className="oa-eyebrow">OMNISCHEDULE</p>
      <h1>{event.title}</h1>
      <div className="oa-event-meta">
        <span><CalendarDays size={18} />{startsAt}</span>
        {event.location && <span><MapPin size={18} />{event.location}</span>}
      </div>
      <nav className="oa-event-tabs" aria-label="Event sections">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={tab.key === "details" ? `/app/events/${event.id}` : `/app/events/${event.id}?action=${tab.key}`}
            aria-current={active === tab.key ? "page" : undefined}
          >
            {tab.label}
          </a>
        ))}
      </nav>
      <div className="oa-event-panel">
        {active === "details" ? (
          <><h2>Event details</h2><p>Your team will add more details here.</p></>
        ) : active === "commit" ? (
          <MeetCommitmentForm teamId={event.team_id} eventId={event.id} athletes={athletes} sessions={sessions} initial={commitments.map(c=>({athlete_id:c.athlete_id,response:c.response,coach_note:c.coach_note??"",session_ids:(c.commitment_sessions??[]).map(s=>s.event_session_id)}))}/>
        ) : active === "volunteer" ? volunteer : active === "thread" ? (
          <><h2>Thread</h2><p>The event conversation will be available in a later phase.</p></>
        ) : null}
      </div>
    </section>
  );
}
