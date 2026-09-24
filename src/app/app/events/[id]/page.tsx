import { notFound } from "next/navigation";
import { AppShell } from "@/shell/AppShell";
import { requireAppUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventDetail, type ScheduleEvent } from "@/modules/schedule/EventDetail";
import { VolunteerTab } from "@/modules/volunteer/VolunteerTab";
import type { VolunteerSlot } from "@/modules/volunteer/types";
import { ThreadTab } from "@/modules/connect/ThreadTab";
import type { ThreadMessage } from "@/modules/connect/types";

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

  const {data:{user}}=await db.auth.getUser();
  const now=new Date().toISOString();
  const [{data:sessions},{data:athletes},{data:commitments},{data:membership},{data:entitlement},{data:connectEntitlement}]=await Promise.all([
    db.from("event_sessions").select("id,name,starts_at,ends_at").eq("event_id",id).order("sort_order"),
    db.from("athletes").select("id,first_name,last_name").eq("team_id",data.team_id).eq("status","active"),
    db.from("commitments").select("athlete_id,response,coach_note,commitment_sessions(event_session_id)").eq("event_id",id),
    db.from("memberships").select("household_id").eq("team_id",data.team_id).eq("profile_id",user!.id).eq("status","active").single(),
    db.from("team_module_entitlements").select("module_key").eq("team_id",data.team_id).eq("module_key","omnivolunteer").lte("starts_at",now).or(`ends_at.is.null,ends_at.gt.${now}`).maybeSingle(),
    db.from("team_module_entitlements").select("module_key").eq("team_id",data.team_id).eq("module_key","omniconnect").lte("starts_at",now).or(`ends_at.is.null,ends_at.gt.${now}`).maybeSingle(),
  ]);
  let slots: VolunteerSlot[]=[];
  if(entitlement){const result=await db.from("job_slots").select("id,title,description,starts_at,ends_at,signup_deadline,capacity,credit_value,job_signups(id,household_id,membership_id,status)").eq("team_id",data.team_id).eq("event_id",id).order("starts_at");slots=(result.data??[]) as VolunteerSlot[];}
  const volunteer=entitlement?<VolunteerTab teamId={data.team_id} eventId={id} householdId={membership?.household_id??null} slots={slots}/>:undefined;
  let threadMessages:ThreadMessage[]=[];
  if(connectEntitlement){const {data:thread}=await db.from("threads").select("id").eq("team_id",data.team_id).eq("event_id",id).maybeSingle();if(thread){const {data:posted}=await db.from("messages").select("id,body,created_at,author_id,profiles!messages_author_id_fkey(first_name,last_name)").eq("team_id",data.team_id).eq("thread_id",thread.id).eq("kind","thread").order("created_at");threadMessages=(posted??[]) as unknown as ThreadMessage[];}}
  const thread=connectEntitlement?<ThreadTab teamId={data.team_id} eventId={id} messages={threadMessages}/>:undefined;
  return <AppShell><EventDetail event={data} action={action} athletes={athletes??[]} sessions={sessions??[]} commitments={(commitments??[]) as never} volunteer={volunteer} thread={thread}/></AppShell>;
}
