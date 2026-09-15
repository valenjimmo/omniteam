"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OMNITEAM_MODULES, visibleModuleKeys, type ModuleKey } from "@/lib/modules";

type Membership={id:string;team_id:string;role:"OWNER"|"ADMIN"|"COACH"|"PARENT"};
type Team={id:string;name:string};
type Subscription={plan_id:string;status:string;trial_ends_at:string|null};
export default function TeamDashboard(){
 const router=useRouter();
 const client=useMemo(()=>{const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return u&&k?createBrowserClient(u,k):null},[]);
 const [memberships,setMemberships]=useState<Membership[]>([]),[teams,setTeams]=useState<Team[]>([]),[teamId,setTeamId]=useState("");
 const [enabled,setEnabled]=useState<ModuleKey[]>([]),[allowed,setAllowed]=useState<ModuleKey[]>([]),[subscription,setSubscription]=useState<Subscription|null>(null),[message,setMessage]=useState("Loading your team…");
 const loadTeam=useCallback(async(id:string,allMemberships:Membership[])=>{if(!client)return;const membership=allMemberships.find(m=>m.team_id===id);if(!membership)return;
  const [entitlements,permissions,subscriptionResult]=await Promise.all([
   client.from("team_module_entitlements").select("module_key").eq("team_id",id).lte("starts_at",new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
   client.from("team_member_module_permissions").select("module_key,access_level").eq("team_id",id).eq("membership_id",membership.id),
   client.from("team_subscriptions").select("plan_id,status,trial_ends_at").eq("team_id",id).in("status",["TRIALING","ACTIVE","PAST_DUE"]).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  const error=entitlements.error||permissions.error||subscriptionResult.error;if(error){setMessage(error.message);return}
  const purchased=(entitlements.data??[]).map(e=>e.module_key as ModuleKey);setEnabled(purchased);
  const permitted=visibleModuleKeys(purchased,membership.role,(permissions.data??[]).map(p=>p.module_key as ModuleKey));setAllowed(permitted);setSubscription(subscriptionResult.data as Subscription|null);setMessage("");
 },[client]);
 useEffect(()=>{async function init(){if(!client){setMessage("Supabase is not configured.");return}const auth=await client.auth.getUser();if(!auth.data.user){setMessage("Sign in or subscribe to open your team dashboard.");return}const m=await client.from("team_memberships").select("id,team_id,role").eq("user_id",auth.data.user.id).eq("status","ACTIVE");if(m.error){setMessage(m.error.message);return}const rows=(m.data??[]) as Membership[];if(!rows.length){setMessage("This account does not belong to an active team yet.");return}const t=await client.from("teams").select("id,name").in("id",rows.map(x=>x.team_id));if(t.error){setMessage(t.error.message);return}setMemberships(rows);setTeams((t.data??[]) as Team[]);setTeamId(rows[0].team_id)}void init()},[client]);
 useEffect(()=>{if(teamId&&memberships.length)void loadTeam(teamId,memberships)},[teamId,memberships,loadTeam]);
 async function signOut(){if(client)await client.auth.signOut();router.push("/");router.refresh()}
 const currentTeam=teams.find(t=>t.id===teamId);const role=memberships.find(m=>m.team_id===teamId)?.role;
 return <main className="team-dashboard"><header><Link href="/" className="registration-brand">Omni<span>Team</span></Link><div>{teams.length>0&&<select aria-label="Current team" value={teamId} onChange={e=>setTeamId(e.target.value)}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}<button onClick={signOut}>Sign out</button></div></header><section className="team-dashboard-hero"><p className="registration-kicker">TEAM DASHBOARD</p><h1>{currentTeam?.name??"Your OmniTeam account"}</h1>{role&&<p>{role} access</p>}{subscription&&<p className="subscription-pill">{subscription.status} · {subscription.plan_id.replaceAll("_"," ")}{subscription.trial_ends_at&&` · trial through ${new Date(subscription.trial_ends_at).toLocaleDateString()}`}</p>}</section>
 {message&&<p className="registration-message" role="status">{message} {!memberships.length&&<Link href="/subscribe">View subscription plans</Link>}</p>}
 {teamId&&<><section><div className="dashboard-section-title"><div><h2>Your modules</h2><p>Modules appear here after the team subscribes and you receive access.</p></div>{role==="OWNER"&&<Link href="/subscribe">View plans</Link>}</div><div className="dashboard-modules">{OMNITEAM_MODULES.filter(m=>allowed.includes(m.key)).map(module=><Link href={module.available?module.href:"#"} aria-disabled={!module.available} className="dashboard-module" key={module.key}><span>{module.name.slice(4,5)}</span><div><h3>{module.name}</h3><p>{module.description}</p><small>{module.available?"Open module":"Subscribed · module UI coming soon"}</small></div></Link>)}</div>{!allowed.length&&<div className="dashboard-empty">No module access has been assigned to this account.</div>}</section>
 {role!=="OWNER"&&enabled.includes("omniathlete")&&<section className="dashboard-shortcuts"><h2>Family access</h2><Link href="/my-family">Open my family</Link></section>}</>}
 </main>
}
