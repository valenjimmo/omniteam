"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function claimJob(teamId: string, eventId: string, slotId: string) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("claim_job_slot", { target_team_id: teamId, target_slot_id: slotId });
  if (error) return { error: error.message };
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  revalidatePath("/app/admin/volunteer");
  return { ok: true };
}

export async function releaseJob(teamId: string, eventId: string, signupId: string) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("release_job_signup", { target_team_id: teamId, target_signup_id: signupId });
  if (error) return { error: error.message };
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  revalidatePath("/app/admin/volunteer");
  return { ok: true };
}
