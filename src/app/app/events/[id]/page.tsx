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
    .select("id,title,starts_at,location")
    .eq("id", id)
    .single<ScheduleEvent>();
  if (error || !data) notFound();

  return <AppShell><EventDetail event={data} action={action} /></AppShell>;
}

