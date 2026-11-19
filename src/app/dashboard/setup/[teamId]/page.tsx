import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export default async function ClubSetupShell({params}:{params:Promise<{teamId:string}>}){
 const {teamId}=await params,db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect(`/login?next=${encodeURIComponent(`/dashboard/setup/${teamId}`)}`);
 const {data:membership}=await db.from("team_memberships").select("team_id,role").eq("team_id",teamId).eq("user_id",user.id).eq("status","ACTIVE").maybeSingle();
 if(!membership)redirect("/dashboard");
 const {data:team}=await db.from("teams").select("name").eq("id",membership.team_id).maybeSingle();
 if(!team)redirect("/dashboard");
 return <main className="team-dashboard"><header><Link href="/" className="registration-brand">Omni<span>Team</span></Link></header><section className="subscribe-card setup-shell"><p className="registration-kicker">CLUB SETUP</p><h1>Set up {team.name}</h1><p>Your club workspace is ready. The complete setup checklist will appear here in the next implementation step.</p><Link href="/dashboard">Open team dashboard</Link></section></main>
}
