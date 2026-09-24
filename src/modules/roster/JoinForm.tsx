"use client";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function JoinForm(){
 const client=useMemo(createSupabaseBrowserClient,[]); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);if(!client){setMessage("Supabase is not configured.");setBusy(false);return}
  const {data:{user}}=await client.auth.getUser();if(!user){setMessage("Sign in first, then return here.");setBusy(false);return}
  const f=new FormData(e.currentTarget);const slug=String(f.get("team")||"").trim().toLowerCase();
  const {data,error:lookupError}=await client.rpc("find_joinable_organization",{target_slug:slug}).single();
  const org=data as {organization_id:string;team_id:string}|null;
  if(lookupError||!org){setMessage("We couldn't find an open team with that code.");setBusy(false);return}
  const names=String(f.get("athletes")||"").split(",").map(v=>v.trim()).filter(Boolean);
  const {error}=await client.from("join_requests").insert({organization_id:org.organization_id,team_id:org.team_id,profile_id:user.id,household_name:String(f.get("household")),athlete_names:names,note:String(f.get("note")||"")||null});
  setMessage(error?.message??"Request sent. A team admin will review it.");setBusy(false);
 }
 return <form onSubmit={submit}><label>Team code<input name="team" defaultValue="harbor-sharks" required/></label><label>Household name<input name="household" placeholder="Morgan Family" required/></label><label>Athletes <small>Separate names with commas</small><input name="athletes" placeholder="Maya Morgan, Theo Morgan" required/></label><label>Note <small>Optional</small><textarea name="note" rows={3}/></label><button disabled={busy}>{busy?"Sending…":"Request to join"}</button>{message&&<p className="oa-notice" role="status">{message}</p>}</form>;
}
