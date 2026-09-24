import { AppShell } from "@/shell/AppShell";
import { WeekCalendar } from "@/modules/schedule/WeekCalendar";
import { NextMeetCard } from "@/modules/schedule/NextMeetCard";
import { YourJobsWidget } from "@/modules/volunteer/YourJobsWidget";
import { LatestUnreadCard } from "@/modules/connect/LatestUnreadCard";
import type { HouseholdJob } from "@/modules/volunteer/types";
import type { Announcement } from "@/modules/connect/types";
import { homeWidgets } from "@/shell/registries";
import { requireAppUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FamilyHome(){
  const user=await requireAppUser();let volunteerEnabled=false;let connectEnabled=false;let jobs:HouseholdJob[]=[];let earned=0;let quota=4;let latest:Announcement|null=null;
  if(user){const db=await createSupabaseServerClient();const {data:m}=await db.from("memberships").select("id,team_id,household_id,volunteer_quota").eq("profile_id",user.id).eq("status","active").limit(1).maybeSingle();if(m){quota=Number(m.volunteer_quota);const now=new Date().toISOString();const {data:flags}=await db.from("team_module_entitlements").select("module_key").eq("team_id",m.team_id).in("module_key",["omnivolunteer","omniconnect"]).lte("starts_at",now).or(`ends_at.is.null,ends_at.gt.${now}`);volunteerEnabled=Boolean(flags?.some(f=>f.module_key==="omnivolunteer"));connectEnabled=Boolean(flags?.some(f=>f.module_key==="omniconnect"));
    if(volunteerEnabled&&m.household_id){const [{data:s},{data:l}]=await Promise.all([db.from("job_signups").select("id,status,job_slots(id,title,starts_at,ends_at,event_id)").eq("team_id",m.team_id).eq("household_id",m.household_id).eq("status","claimed"),db.from("volunteer_ledger").select("credit").eq("team_id",m.team_id).eq("membership_id",m.id).eq("season_year",new Date().getFullYear())]);jobs=(s??[]) as unknown as HouseholdJob[];earned=(l??[]).reduce((sum,row)=>sum+Number(row.credit),0);}
    if(connectEnabled){const {data:p}=await db.from("notification_preferences").select("last_inbox_seen_at").eq("team_id",m.team_id).eq("membership_id",m.id).maybeSingle();const {data:d}=await db.from("messages").select("announcements(id,title,body,audience,published_at)").eq("team_id",m.team_id).eq("recipient_membership_id",m.id).eq("channel","inbox").gt("created_at",p?.last_inbox_seen_at??"1900-01-01T00:00:00Z").order("created_at",{ascending:false}).limit(1).maybeSingle();latest=(d?.announcements??null) as unknown as Announcement|null;}
  }}
  const widgets=homeWidgets([{key:"connect",enabled:connectEnabled&&Boolean(latest),content:latest?<LatestUnreadCard announcement={latest}/>:<></>},{key:"volunteer",enabled:volunteerEnabled,content:<YourJobsWidget jobs={jobs} earned={earned} quota={quota}/>}]);
  return <AppShell><section className="oa-home-head"><p className="oa-eyebrow">THIS WEEK</p><h1>Good morning, Alex</h1><div className="oa-athletes"><span>M</span><strong>Maya</strong><span>T</span><strong>Theo</strong></div></section><NextMeetCard/>{widgets.map(w=><div key={w.key}>{w.content}</div>)}<WeekCalendar/></AppShell>;
}
