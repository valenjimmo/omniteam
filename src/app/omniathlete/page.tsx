import Link from "next/link";
import { ArrowRight, CalendarDays, HeartHandshake, MessageCircle, Users } from "lucide-react";

const features = [
  [Users, "One family account", "Keep every athlete together."],
  [CalendarDays, "One team calendar", "Practices and meets, side by side."],
  [HeartHandshake, "Easy volunteering", "Find open jobs without hunting."],
  [MessageCircle, "Team connection", "Announcements and event threads."],
] as const;

export default function OmniAthleteHome() {
  return <main className="oa-marketing">
    <header>
      <Link href="/omniathlete" className="oa-wordmark">Omni<span>Athlete</span></Link>
      <nav><Link href="/">OmniTeam</Link><Link href="/login">Sign in</Link><Link className="oa-primary" href="/signup">Get started</Link></nav>
    </header>
    <section className="oa-hero">
      <div><p className="oa-eyebrow">SWIM TEAM LIFE, TOGETHER</p><h1>One home for your whole swim family.</h1><p>Schedules, meet commitments, volunteer jobs, and team messages—organized around your family, not a maze of menus.</p><div><Link className="oa-primary" href="/signup">Create your account <ArrowRight size={18}/></Link><Link href="/join">Join Harbor Sharks</Link></div></div>
      <div className="oa-preview"><small>THIS WEEK</small><h2>Maya &amp; Theo</h2><div><CalendarDays/><p><strong>Everything in one place</strong><span>Your family&apos;s week, at a glance.</span></p></div></div>
    </section>
    <section className="oa-feature-grid">{features.map(([Icon, title, copy]) => <article key={title}><Icon/><h2>{title}</h2><p>{copy}</p></article>)}</section>
  </main>;
}
