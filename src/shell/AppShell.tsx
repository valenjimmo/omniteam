import Link from "next/link";
import { Bell, CalendarDays, HeartHandshake, Home, MessageCircle, UserRound } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tabs = [{ key:"home",label:"Home",href:"/app",icon:Home },{ key:"schedule",label:"Schedule",href:"/app/schedule",icon:CalendarDays },{ key:"volunteer",label:"Volunteer",href:"/app/admin/volunteer",icon:HeartHandshake,adminOnly:true },{ key:"connect",label:"Connect",href:"/app/connect",icon:MessageCircle,connectOnly:true },{ key:"account",label:"Account",href:"/app",icon:UserRound }];
export async function AppShell({ children, admin = false, active = "home" }: { children: React.ReactNode; admin?: boolean; active?: string }) {
  let connectEnabled=false,unread=0;
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(user){const {data:m}=await db.from("memberships").select("id,team_id").eq("profile_id",user.id).eq("status","active").limit(1).maybeSingle();if(m){const now=new Date().toISOString();const {data:f}=await db.from("team_module_entitlements").select("module_key").eq("team_id",m.team_id).eq("module_key","omniconnect").lte("starts_at",now).or(`ends_at.is.null,ends_at.gt.${now}`).maybeSingle();connectEnabled=Boolean(f);if(f){const {data:p}=await db.from("notification_preferences").select("last_inbox_seen_at").eq("team_id",m.team_id).eq("membership_id",m.id).maybeSingle();const {count}=await db.from("messages").select("id",{count:"exact",head:true}).eq("team_id",m.team_id).eq("recipient_membership_id",m.id).eq("channel","inbox").gt("created_at",p?.last_inbox_seen_at??"1900-01-01T00:00:00Z");unread=count??0;}}}}
  return <div className="oa-app"><header><Link href="/app" className="oa-wordmark">Omni<span>Athlete</span></Link><div><span className="oa-team">Harbor Sharks</span>{process.env.NODE_ENV === "development" && <RoleSwitcher />}<span className="oa-bell"><Bell size={20}/>{unread>0&&<i>{unread}</i>}</span></div></header>
    <main>{children}</main><nav aria-label="App navigation">{tabs.filter(tab=>(!tab.adminOnly||admin)&&(!tab.connectOnly||connectEnabled)).map(({key,label,href,icon:Icon})=><Link href={href} key={label} className={key===active?"active":""}><Icon size={21}/><span>{label}</span>{key==="connect"&&unread>0&&<i className="oa-nav-badge">{unread}</i>}</Link>)}</nav>
  </div>;
}
