"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CommitmentChoice = { athlete_id: string; response: "attend" | "decline"; session_ids: string[]; coach_note: string };

export async function saveCommitments(teamId: string, eventId: string, choices: CommitmentChoice[]) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("save_household_commitments", { target_team_id: teamId, target_event_id: eventId, choices });
  if (error) return { error: error.message };
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function publishMeet(input: { title:string; location:string; deadline:string; sessions:{name:string;starts_at:string;ends_at:string;sort_order:number}[] }) {
  const db=await createSupabaseServerClient();
  const { data:{ user } }=await db.auth.getUser();
  if(!user) return {error:"Sign in required."};
  const {data:membership}=await db.from("memberships").select("team_id").eq("profile_id",user.id).eq("status","active").in("role",["team_admin","coach"]).limit(1).single();
  if(!membership) return {error:"Coach access required."};
  const {data,error}=await db.rpc("publish_meet",{target_team_id:membership.team_id,meet_title:input.title,meet_location:input.location,deadline:input.deadline,sessions:input.sessions});
  if(error)return {error:error.message};
  revalidatePath("/app/schedule");return {ok:true,eventId:data as string};
}
