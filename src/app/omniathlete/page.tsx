import Link from "next/link";
import { ArrowRight, ClipboardCheck, Users, UsersRound, Layers3, Settings2 } from "lucide-react";
import { OmniTeamLogo } from "../omniteam-logo";

const areas = [
  { name: "Swimmers", detail: "Swimmer roster and profiles", icon: Users, status: "In development" },
  { name: "Families", detail: "Parent registration, approval, and family access", icon: UsersRound, status: "Registration flow available", href: "/register" },
  { name: "Groups", detail: "Training groups and membership", icon: Layers3, status: "In development" },
  { name: "Attendance", detail: "Practice check-in", icon: ClipboardCheck, status: "Demo screen", href: "/attendance" },
];

export default function OmniAthleteHome() {
  return <main className="athlete-home">
    <header className="athlete-header">
      <Link href="/"><OmniTeamLogo compact /></Link>
      <Link href="/">All OmniTeam modules</Link>
    </header>
    <section className="athlete-hero">
      <p className="athlete-kicker">OMNITEAM / OMNIATHLETE</p>
      <h1>One place for your swimmers and families.</h1>
      <p>Build your roster, keep families connected, organize groups, and record attendance. OmniAthlete is being built as a standalone module that can later share approved data with OmniSite.</p>
      <div className="athlete-actions">
        <Link href="/register">Register a family <ArrowRight size={17} /></Link>
        <Link href="/my-family">View my family <ArrowRight size={17} /></Link>
      </div>
    </section>
    <section className="athlete-section">
      <div><p className="athlete-kicker">MODULE AREAS</p><h2>OmniAthlete structure</h2></div>
      <div className="athlete-grid">{areas.map(({ name, detail, icon: Icon, status, href }) => {
        const content = <><div className="athlete-card-icon"><Icon size={24} /></div><h3>{name}</h3><p>{detail}</p><small>{status}</small>{href && <ArrowRight className="athlete-card-arrow" size={19} />}</>;
        return href ? <Link className="athlete-card" href={href} key={name}>{content}</Link>
          : <div className="athlete-card athlete-card-soon" key={name}>{content}</div>;
      })}</div>
    </section>
    <section className="athlete-tools">
      <div><Settings2 size={21} /><div><h2>Managing a team?</h2><p>Review family registrations and assign each member&apos;s module access.</p></div></div>
      <Link href="/team/access">Team access <ArrowRight size={17} /></Link>
    </section>
    <p className="athlete-note">Registration and family pages need a configured Supabase project. Attendance currently uses sample data and does not save to the database.</p>
  </main>;
}
