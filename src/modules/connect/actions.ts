"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function postAnnouncement(input:{teamId:string;title:string;body:string;audience:"org"|"group"|"event";targetId?:string}) {
  const db=await createSupabaseServerClient();
  const {data,error}=await db.rpc("post_announcement",{target_team_id:input.teamId,announcement_title:input.title,announcement_body:input.body,target_audience:input.audience,target_id:input.targetId||null});
  if(error)return {error:error.message};
  revalidatePath("/app");revalidatePath("/app/connect");return {ok:true,id:data as string};
}
export async function postEventMessage(teamId:string,eventId:string,body:string){
  const db=await createSupabaseServerClient();
  const {error}=await db.rpc("post_event_message",{target_team_id:teamId,target_event_id:eventId,message_body:body});
  if(error)return {error:error.message};revalidatePath(`/app/events/${eventId}`);return {ok:true};
}
export async function markInboxSeen(teamId:string,membershipId:string,organizationId:string){
  const db=await createSupabaseServerClient();
  const {error}=await db.from("notification_preferences").upsert({team_id:teamId,membership_id:membershipId,organization_id:organizationId,last_inbox_seen_at:new Date().toISOString()},{onConflict:"team_id,membership_id"});
  if(error)throw new Error(error.message);revalidatePath("/app");revalidatePath("/app/connect");
}
