import { CalendarDays, MapPin } from "lucide-react";

export interface ScheduleEvent {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
}

const tabs = [
  { label: "Details", key: "details" },
  { label: "Attend", key: "commit" },
  { label: "Volunteer", key: "volunteer" },
  { label: "Thread", key: "thread" },
] as const;

export function EventDetail({
  event,
  action,
}: {
  event: ScheduleEvent;
  action?: string;
}) {
  const active = action === "commit" || action === "volunteer" || action === "thread" ? action : "details";
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
        ) : active === "thread" ? (
          <><h2>Thread</h2><p>The event conversation will be available in a later phase.</p></>
        ) : (
          <><h2>{active === "commit" ? "Attend" : "Volunteer"}</h2><p>This action will be available in a later phase.</p></>
        )}
      </div>
    </section>
  );
}
