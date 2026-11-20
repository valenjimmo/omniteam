import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {SetupEditor} from "./setup-editor";
import type {SetupChecklistState} from "@/modules/club-setup/progress";

export default async function ClubSetupShell({params}:{params:Promise<{teamId:string}>}){
 const {teamId}=await params,db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect(`/login?next=${encodeURIComponent(`/dashboard/setup/${teamId}`)}`);
 const {data:membership}=await db.from("team_memberships").select("team_id,role").eq("team_id",teamId).eq("user_id",user.id).eq("status","ACTIVE").maybeSingle();
 if(!membership)redirect("/dashboard");
 const [{data:team},{data:checklist,error:checklistError}]=await Promise.all([
  db.from("teams").select("*").eq("id",membership.team_id).maybeSingle(),
  db.rpc("get_team_setup_checklist",{target_team_id:membership.team_id}),
 ]);
 if(!team)redirect("/dashboard");
 if(checklistError||!checklist)redirect("/dashboard");
 return <main className="team-dashboard"><header><Link href="/" className="registration-brand">Omni<span>Team</span></Link><Link href="/dashboard">Team dashboard</Link></header><section className="team-dashboard-hero"><p className="registration-kicker">CLUB SETUP</p><h1>Set up {team.name}</h1><p>Required details determine setup completion. Recommended tasks improve your workspace.</p></section><SetupEditor team={team} role={membership.role} checklist={checklist as unknown as SetupChecklistState}/></main>
}
