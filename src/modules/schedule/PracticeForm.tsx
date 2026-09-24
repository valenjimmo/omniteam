"use client";
import Link from "next/link";import React from "react";
export function PracticeForm(){const [repeat,setRepeat]=React.useState(false);const [saved,setSaved]=React.useState("");return <form className="oa-practice-form" onSubmit={e=>{e.preventDefault();setSaved(repeat?"8 weekly practices created.":"Practice created.")}}>
 <label>Practice name<input required defaultValue="Senior Development Practice"/></label><div className="oa-form-row"><label>Group<select defaultValue="senior"><option value="senior">Senior Development</option></select></label><label>Location<select defaultValue="harbor"><option value="harbor">Harbor Aquatic Center</option></select></label></div>
 <div className="oa-form-row"><label>Date<input required type="date" defaultValue="2026-09-25"/></label><label>Starts<input required type="time" defaultValue="17:30"/></label></div><label>Ends<input required type="time" defaultValue="19:00"/></label>
 <label className="oa-check"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/><span><b>Repeat weekly</b><small>Creates eight individual sessions, including this date.</small></span></label>
 <button type="submit">{repeat?"Create 8 practices":"Create practice"}</button>{saved&&<p className="oa-success" role="status">{saved}</p>}<Link className="oa-coach-link" href="/app/admin/sessions/wednesday/attendance">Open Wednesday attendance sheet →</Link>
 </form>}
