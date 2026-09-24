"use client";

import { useEffect, useState } from "react";

interface PublicEvent {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
}

export function UpcomingEventsEmbed({
  orgSlug,
  omniAthleteUrl,
}: {
  orgSlug: string;
  omniAthleteUrl: string;
}) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const baseUrl = omniAthleteUrl.replace(/\/$/, "");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${baseUrl}/api/public/orgs/${encodeURIComponent(orgSlug)}/upcoming`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load events");
        return response.json() as Promise<{ events: PublicEvent[] }>;
      })
      .then(({ events: upcoming }) => {
        setEvents(upcoming);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [baseUrl, orgSlug]);

  if (status === "loading") return <p>Loading upcoming events…</p>;
  if (status === "error") return <p>Upcoming events are unavailable.</p>;
  if (!events.length) return <p>No upcoming events.</p>;

  return (
    <div className="omnisite-upcoming-events">
      {events.map((event) => (
        <article key={event.id}>
          <time dateTime={event.starts_at}>
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at))}
          </time>
          <h3>{event.title}</h3>
          {event.location && <p>{event.location}</p>}
          <div>
            <a href={`${baseUrl}/app/events/${event.id}`}>View event</a>{" "}
            <a href={`${baseUrl}/app/events/${event.id}?action=commit`}>Attend</a>{" "}
            <a href={`${baseUrl}/app/events/${event.id}?action=volunteer`}>Volunteer</a>
          </div>
        </article>
      ))}
    </div>
  );
}
