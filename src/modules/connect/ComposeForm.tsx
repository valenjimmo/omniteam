"use client";
import { useState,useTransition } from "react";
import { postAnnouncement } from "./actions";

export function ComposeForm({teamId,groups,events}:{teamId:string;groups:{id:string;name:string}[];events:{id:string;title:string}[]}){
 const [pending,start]=useTransition();const [audience,setAudience]=useState<"org"|"group"|"event">("org");const [message,setMessage]=useState("");
 return <form className="oa-connect-compose" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);start(async()=>{const result=await postAnnouncement({teamId,title:String(form.get("title")),body:String(form.get("body")),audience,targetId:String(form.get("targetId")||"")});if(result.error)setMessage(result.error);else{setMessage("Announcement posted to inbox and queued for email.");(e.target as HTMLFormElement).reset();setAudience("org");}})}}>
  <label>Title<input name="title" required maxLength={160}/></label><label>Message<textarea name="body" required maxLength={10000} rows={7}/></label>
  <label>Audience<select name="audience" value={audience} onChange={e=>setAudience(e.target.value as typeof audience)}><option value="org">Entire organization</option><option value="group">Group</option><option value="event">Event</option></select></label>
  {audience!=="org"&&<label>{audience==="group"?"Group":"Event"}<select name="targetId" required><option value="">Choose {audience}</option>{(audience==="group"?groups:events).map(item=><option key={item.id} value={item.id}>{"name" in item?item.name:item.title}</option>)}</select></label>}
  {message&&<p role="status">{message}</p>}<button disabled={pending}>{pending?"Posting…":"Post announcement"}</button>
 </form>;
}
