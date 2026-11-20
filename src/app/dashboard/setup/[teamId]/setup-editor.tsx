"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { ChecklistCard } from "@/modules/club-setup/ChecklistCard";
import type { SetupChecklistState } from "@/modules/club-setup/progress";
import type { Tables } from "@/lib/supabase/database.types";

export function SetupEditor({ team, role, checklist }: { team: Tables<"teams">; role: string; checklist: SetupChecklistState }) {
  const router = useRouter();
  const client = useMemo(() => { const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return u&&k?createBrowserClient(u,k):null; }, []);
  const [form,setForm]=useState({name:team.name,slug:team.slug,clubCode:team.club_code??"",city:team.city,state:team.state,timezone:team.timezone,ownerPhone:team.owner_phone,facility:team.primary_facility??"",seasonType:team.season_type??"",logoUrl:team.logo_url??""});
  const [groupName,setGroupName]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const owner=role==="OWNER";
  async function saveProfile(e:React.FormEvent){e.preventDefault();if(!client)return;setBusy(true);const {error}=await client.rpc("update_club_profile",{target_team_id:team.id,requested_name:form.name,requested_slug:form.slug,requested_club_code:form.clubCode||null,requested_city:form.city,requested_state:form.state,requested_timezone:form.timezone,requested_owner_phone:form.ownerPhone,requested_primary_facility:form.facility||null,requested_season_type:form.seasonType||null,requested_logo_url:form.logoUrl||null});setMessage(error?.message??"Club profile saved.");setBusy(false);if(!error)router.refresh()}
  async function createGroup(e:React.FormEvent){e.preventDefault();if(!client||!groupName.trim())return;setBusy(true);const {error}=await client.from("swim_groups").insert({team_id:team.id,name:groupName.trim(),status:"ACTIVE"});setMessage(error?.message??"First practice group created.");setBusy(false);if(!error){setGroupName("");router.refresh()}}
  const field=(key:keyof typeof form,value:string)=>setForm({...form,[key]:value});
  return <><ChecklistCard teamId={team.id} state={checklist}/>
    <section className="setup-editor" id="club-profile"><h2>Club profile</h2><p>These values are shared platform details for this team.</p>
      {!owner?<p>Only an active team owner can edit the club profile.</p>:<form onSubmit={saveProfile}>
        <label>Club name <input required value={form.name} onChange={e=>field("name",e.target.value)}/></label>
        <label>Club slug <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e=>field("slug",e.target.value)}/></label>
        <label>Club code <input maxLength={5} value={form.clubCode} onChange={e=>field("clubCode",e.target.value.toUpperCase())}/></label>
        <label>City <input required value={form.city} onChange={e=>field("city",e.target.value)}/></label>
        <label>State <input required value={form.state} onChange={e=>field("state",e.target.value)}/></label>
        <label>Timezone <input required value={form.timezone} onChange={e=>field("timezone",e.target.value)}/></label>
        <label>Owner phone <input required type="tel" value={form.ownerPhone} onChange={e=>field("ownerPhone",e.target.value)}/></label>
        <label>Primary facility <input value={form.facility} onChange={e=>field("facility",e.target.value)}/></label>
        <label>Season type <select value={form.seasonType} onChange={e=>field("seasonType",e.target.value)}><option value="">Not selected</option><option value="year_round">Year-round</option><option value="seasonal">Seasonal</option><option value="summer">Summer</option></select></label>
        <label>Logo URL <input type="url" placeholder="https://…" value={form.logoUrl} onChange={e=>field("logoUrl",e.target.value)}/><small>Platform-level club logo; OmniSite is not required.</small></label>
        <button disabled={busy}>Save club profile</button>
      </form>}
    </section>
    {checklist.practiceGroupAvailable&&<section className="setup-editor" id="practice-group"><h2>First practice group</h2><p>An active group in the existing swim group roster completes this task.</p>{owner&& !checklist.practiceGroup&&<form onSubmit={createGroup}><label>Group name <input required value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Senior group"/></label><button disabled={busy}>Create practice group</button></form>}{checklist.practiceGroup&&<p className="setup-ready-text">Your club has an active practice group.</p>}</section>}
    {message&&<p className="registration-message" role="status">{message}</p>}
  </>;
}
