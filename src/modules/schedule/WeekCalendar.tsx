"use client";
import React from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { demoAthletes, demoSessions } from "./demo";
type Reply = "yes"|"no"|"maybe";
export function WeekCalendar(){
 const [rsvps,setRsvps]=React.useState<Record<string,Reply>>({});
 return <section className="oa-schedule"><header><div><p className="oa-eyebrow">YOUR FAMILY</p><h1>This week</h1><p>Sep 21–27 · Maya &amp; Theo</p></div><CalendarDays size={28}/></header>
 <div className="oa-session-list">{demoSessions.map(s=><article key={s.id}><div className="oa-date-tile"><b>{s.day}</b><span>{s.date}</span></div><div className="oa-session-info"><strong>{s.title}</strong><p>{s.time}</p><small><MapPin size={14}/>{s.location}</small></div><div className="oa-rsvp-grid">{demoAthletes.map(a=>{const k=`${s.id}-${a}`;return <div key={a}><strong>{a.split(" ")[0]}</strong><span>{(["yes","no","maybe"] as Reply[]).map(v=><button key={v} className={rsvps[k]===v?"selected":""} onClick={()=>setRsvps(x=>({...x,[k]:v}))}>{v[0].toUpperCase()+v.slice(1)}</button>)}</span></div>})}</div></article>)}</div>
 </section>
}
