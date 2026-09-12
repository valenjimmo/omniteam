"use client";

import { useState } from "react";
import Link from "next/link";
import { OmniTeamLogo } from "../omniteam-logo";
import {
  Activity, CalendarDays, ChevronDown, ClipboardCheck, Clock3, Download,
  LayoutDashboard, MoreHorizontal, Search, Settings2, SlidersHorizontal,
  Users, X,
} from "lucide-react";
import { calculateAttendancePercentage, formatAttendancePercentage, type AttendanceStatus } from "@omniteam/domain";

type Swimmer = { id: number; name: string; group: string; status: AttendanceStatus; initials: string };

const initialSwimmers: Swimmer[] = [
  { id: 1, name: "Amy Chan", group: "Age Group 1", status: "PRESENT", initials: "AC" },
  { id: 2, name: "Brian Wong", group: "Age Group 1", status: "PRESENT", initials: "BW" },
  { id: 3, name: "Chloe Lee", group: "Age Group 1", status: "ABSENT", initials: "CL" },
  { id: 4, name: "Daniel Wu", group: "Age Group 1", status: "PRESENT", initials: "DW" },
  { id: 5, name: "Eric Lam", group: "Age Group 1", status: "EXCUSED", initials: "EL" },
  { id: 6, name: "Fiona Ho", group: "Age Group 1", status: "PRESENT", initials: "FH" },
  { id: 7, name: "Grace Li", group: "Age Group 1", status: "PRESENT", initials: "GL" },
  { id: 8, name: "Henry Ma", group: "Age Group 1", status: "PRESENT", initials: "HM" },
];

const nav = [
  { label: "OmniTeam home", icon: LayoutDashboard, href: "/" }, { label: "Attendance", icon: ClipboardCheck, active: true, href: "/attendance" },
  { label: "Swimmers", icon: Users }, { label: "Groups", icon: SlidersHorizontal },
  { label: "Schedule", icon: CalendarDays }, { label: "Reports", icon: Activity },
];

function StatusPill({ status }: { status: AttendanceStatus }) {
  const labels = { PRESENT: "Present", ABSENT: "Absent", EXCUSED: "Excused", LATE: "Late", LEFT_EARLY: "Left early", NOT_SCHEDULED: "Not scheduled" };
  return <span className={`status-pill ${status.toLowerCase()}`}><span className="status-dot" />{labels[status]}</span>;
}

export default function Home() {
  const [swimmers, setSwimmers] = useState(initialSwimmers);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(true);
  const present = swimmers.filter((swimmer) => swimmer.status === "PRESENT").length;
  const absent = swimmers.filter((swimmer) => swimmer.status === "ABSENT").length;
  const excused = swimmers.filter((swimmer) => swimmer.status === "EXCUSED").length;
  const percentage = calculateAttendancePercentage({ eligiblePractices: 20, present: 18, absent: 1, excused: 1, countExcusedAgainstAttendance: false }).percentage;
  const filtered = swimmers.filter((swimmer) => swimmer.name.toLowerCase().includes(query.toLowerCase()));

  function setStatus(id: number, status: AttendanceStatus) {
    setSaved(false);
    setSwimmers((current) => current.map((swimmer) => swimmer.id === id ? { ...swimmer, status } : swimmer));
    window.setTimeout(() => setSaved(true), 500);
  }

  function markAll(status: AttendanceStatus) {
    setSaved(false);
    setSwimmers((current) => current.map((swimmer) => ({ ...swimmer, status })));
    window.setTimeout(() => setSaved(true), 500);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="OmniTeam home"><OmniTeamLogo compact /><small>OMNIATHLETE</small></Link>
      <div className="team-switcher"><div className="team-avatar">S</div><div><b>SSF Aquatics</b><small>Team workspace</small></div><ChevronDown size={15} /></div>
      <nav>{nav.map(({ label, icon: Icon, active, href }) => href ? <Link className={active ? "active" : ""} href={href} key={label}><Icon size={18} /><span>{label}</span></Link> : <span className="sidebar-nav-soon" key={label} aria-label={label + ", coming soon"}><Icon size={18} /><span>{label}</span><small>Soon</small></span>)}</nav>
      <div className="sidebar-bottom"><a href="#"><Settings2 size={18} />Settings</a><div className="profile"><div className="profile-avatar">JD</div><div><b>Jimmy Diaz</b><small>Owner</small></div><MoreHorizontal size={17} /></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div className="breadcrumb"><span>OmniAthlete</span><b>/</b><strong>Attendance</strong></div><div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="help">?</button><div className="mini-avatar">JD</div></div></header>
      <div className="page-wrap">
        <div className="page-heading"><div><p className="eyebrow">TUESDAY, SEPTEMBER 10, 2026</p><h1>Attendance</h1><p className="muted">Keep today&apos;s practices moving with a quick, focused check-in.</p></div><button className="outline-button"><Download size={16} /> Export report</button></div>
        <section className="practice-banner"><div className="practice-icon"><Clock3 size={22} /></div><div className="practice-meta"><div className="practice-title"><h2>Age Group 1</h2><span className="live-tag">● LIVE</span></div><p>Today, 4:00 PM – 5:30 PM <span>·</span> Main Pool</p></div><div className="practice-stats"><div><small>EXPECTED</small><b>{swimmers.length}</b></div><div><small>PRESENT</small><b className="green-text">{present}</b></div><div><small>ABSENT</small><b className="red-text">{absent}</b></div><div><small>EXCUSED</small><b className="yellow-text">{excused}</b></div></div><button className="finish-button">Finish attendance <span>↗</span></button></section>
        <div className="section-heading"><div><h2>Mark attendance</h2><p className="muted">Changes save automatically as you make them.</p></div><div className="save-state"><span className={saved ? "saved-dot" : "saving-dot"} />{saved ? "All changes saved" : "Saving changes..."}</div></div>
        <div className="toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search swimmers..." />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</div><button className="bulk-button" onClick={() => markAll("PRESENT")}><span className="check-square">✓</span> Mark all present</button><button className="filter-button"><SlidersHorizontal size={16} /> Filter <span className="filter-count">1</span></button></div>
        <div className="roster-card"><div className="roster-head"><span>SWIMMER <small>({filtered.length})</small></span><span>ATTENDANCE STATUS</span><span>LAST UPDATED</span></div>{filtered.map((swimmer) => <div className="roster-row" key={swimmer.id}><div className="swimmer-cell"><div className={`swimmer-avatar avatar-${swimmer.id % 4}`}>{swimmer.initials}</div><div><b>{swimmer.name}</b><small>{swimmer.group}</small></div></div><div className="status-control"><StatusPill status={swimmer.status} /><select value={swimmer.status} onChange={(event) => setStatus(swimmer.id, event.target.value as AttendanceStatus)} aria-label={`Attendance status for ${swimmer.name}`}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option><option value="LATE">Late</option></select><ChevronDown size={14} /></div><span className="updated">Just now</span></div>)}</div>
        <div className="bottom-grid"><div className="insight-card"><div className="card-heading"><div><p className="eyebrow">TEAM SNAPSHOT</p><h3>This month&apos;s attendance</h3></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="attendance-score"><strong>{formatAttendancePercentage(percentage)}</strong><span className="trend">↗ 2.4%</span><p>Across all active groups</p></div><div className="progress"><span style={{ width: `${percentage}%` }} /></div><div className="legend"><span><i className="legend-present" />Present <b>92%</b></span><span><i className="legend-excused" />Excused <b>4%</b></span><span><i className="legend-absent" />Absent <b>4%</b></span></div></div><div className="upcoming-card"><div className="card-heading"><div><p className="eyebrow">UP NEXT</p><h3>Today&apos;s practices</h3></div><a href="#">View schedule →</a></div><div className="upcoming-row"><span className="time-block">5:45 <small>PM</small></span><div><b>Senior Prep</b><small>North Pool · 20 swimmers</small></div><span className="upcoming-pill">Upcoming</span></div><div className="upcoming-row"><span className="time-block">6:30 <small>PM</small></span><div><b>Senior</b><small>North Pool · 14 swimmers</small></div><span className="upcoming-pill">Upcoming</span></div></div></div>
      </div>
    </section>
  </main>;
}
