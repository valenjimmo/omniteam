import { notFound } from "next/navigation";
import { AppShell } from "@/shell/AppShell";
import { requireAppUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventDetail, type ScheduleEvent } from "@/modules/schedule/EventDetail";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  await requireAppUser();
  const [{ id }, { action }] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("events")
    .select("id,team_id,title,starts_at,location,commit_deadline")
    .eq("id", id)
    .single<ScheduleEvent>();
  if (error || !data) notFound();

  const [{data:sessions},{data:athletes},{data:commitments}]=await Promise.all([
    db.from("event_sessions").select("id,name,starts_at,ends_at").eq("event_id",id).order("sort_order"),
    db.from("athletes").select("id,first_name,last_name").eq("team_id",data.team_id).eq("status","active"),
    db.from("commitments").select("athlete_id,response,coach_note,commitment_sessions(event_session_id)").eq("event_id",id),
  ]);
  return <AppShell><EventDetail event={data} action={action} athletes={athletes??[]} sessions={sessions??[]} commitments={(commitments??[]) as never} /></AppShell>;
}
