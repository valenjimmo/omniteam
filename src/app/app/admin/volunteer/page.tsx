import { AppShell } from "@/shell/AppShell";
import { requireAppUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CoveragePage } from "@/modules/volunteer/CoveragePage";

export default async function VolunteerCoverage(){const user=await requireAppUser(true);const db=await createSupabaseServerClient();const {data:m}=await db.from("memberships").select("team_id").eq("profile_id",user!.id).eq("status","active").in("role",["team_admin","volunteer_coord"]).limit(1).single();const {data}=await db.from("job_slots").select("id,title,capacity,event:events(title),job_signups(status)").eq("team_id",m!.team_id).order("starts_at");return <AppShell admin active="volunteer"><CoveragePage slots={(data??[]) as never}/></AppShell>}
