"use client";
import React from "react";
import Link from "next/link";
import { publishMeet } from "./actions";

export function MeetPublishForm(){const [message,setMessage]=React.useState("");const [eventId,setEventId]=React.useState("");return <form className="oa-practice-form oa-meet-form" onSubmit={async e=>{e.preventDefault();setMessage("Publishing…");const form=new FormData(e.currentTarget);const result=await publishMeet({title:String(form.get("title")),location:String(form.get("location")),deadline:String(form.get("deadline")),sessions:[1,2].map((n,i)=>({name:String(form.get(`session_${n}_name`)),starts_at:String(form.get(`session_${n}_starts`)),ends_at:String(form.get(`session_${n}_ends`)),sort_order:i}))});setMessage(result.error??"Meet published to the team calendar.");setEventId(result.eventId??"")}}>
  <label>Meet name<input name="title" required defaultValue="Fall Splash Invitational" /></label>
  <div className="oa-form-row"><label>Location<input name="location" required defaultValue="Bay City Aquatic Center" /></label><label>Commit deadline<input name="deadline" required type="datetime-local" defaultValue="2026-10-02T20:00" /></label></div>
  <h2>Sessions</h2>
  <div className="oa-session-editor"><b>Session 1</b><input name="session_1_name" aria-label="Session 1 name" defaultValue="Saturday Morning"/><input name="session_1_starts" aria-label="Session 1 starts" type="datetime-local" defaultValue="2026-10-10T08:00"/><input name="session_1_ends" aria-label="Session 1 ends" type="datetime-local" defaultValue="2026-10-10T12:00"/></div>
  <div className="oa-session-editor"><b>Session 2</b><input name="session_2_name" aria-label="Session 2 name" defaultValue="Saturday Afternoon"/><input name="session_2_starts" aria-label="Session 2 starts" type="datetime-local" defaultValue="2026-10-10T13:00"/><input name="session_2_ends" aria-label="Session 2 ends" type="datetime-local" defaultValue="2026-10-10T17:00"/></div>
  <button type="submit">Publish meet</button>{message&&<p className="oa-success" role="status">{message} {eventId&&<Link href={`/app/admin/events/${eventId}/commitments`}>View commitment board →</Link>}</p>}
 </form>}
