import type { AttendanceStatus } from "@omniteam/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AttendanceUpdate {
  teamId: string;
  practiceSessionId: string;
  swimmerId: string;
  status: AttendanceStatus;
  recordedByUserId?: string;
}

/** Idempotent write boundary shared by coach UI, imports, and future self check-in. */
export async function upsertAttendance(update: AttendanceUpdate) {
  const supabase = await createSupabaseServerClient();
  return supabase.from("attendance_records").upsert({
    team_id: update.teamId,
    practice_session_id: update.practiceSessionId,
    swimmer_id: update.swimmerId,
    status: update.status,
    checkin_method: update.recordedByUserId ? "COACH" : "IMPORT",
    recorded_by_user_id: update.recordedByUserId ?? null,
    checked_in_at: update.status === "PRESENT" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "practice_session_id,swimmer_id" });
}