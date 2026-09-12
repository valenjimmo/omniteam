import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, ClipboardCheck, CreditCard, Globe2, HeartHandshake, Medal, Users } from "lucide-react";
import { OmniTeamLogo } from "./omniteam-logo";

const modules = [
  { name: "OmniAthlete", category: "ATHLETES & ATTENDANCE", description: "Keep your roster connected and every practice accounted for.", icon: Users, active: true },
  { name: "OmniSchedule", category: "PRACTICES & CALENDARS", description: "Make the next practice easy to find, plan, and run.", icon: CalendarDays },
  { name: "OmniMeet", category: "MEETS & EVENTS", description: "Bring entries, events, and meet days into one place.", icon: Medal },
  { name: "OmniVolunteer", category: "PEOPLE & HOURS", description: "Coordinate the people who make every event happen.", icon: HeartHandshake },
  { name: "OmniPay", category: "PAYMENTS & BILLING", description: "Give your team a clearer view of fees and payments.", icon: CreditCard },
  { name: "OmniSite", category: "YOUR TEAM ONLINE", description: "Give your community a welcoming home on the web.", icon: Globe2 },
];

export default function Home() {
  return <main className="landing">
    <div className="landing-glow" aria-hidden="true" />
    <header className="landing-header">
      <Link href="/" aria-label="OmniTeam home"><OmniTeamLogo light /></Link>
      <div className="header-right"><span className="header-status"><span /> One platform. Every part of your team.</span><Link className="header-link" href="/attendance">Open attendance <ArrowRight size={16} /></Link></div>
    </header>
    <section className="landing-hero">
      <div className="hero-copy"><div className="hero-kicker"><span className="kicker-line" /> BUILT FOR THE WHOLE TEAM</div><h1>Everything your<br />team needs, <em>together.</em></h1><p>From the pool deck to meet day and everything in between, OmniTeam brings your people, plans, and progress into one connected home.</p><div className="hero-actions"><Link className="hero-cta" href="/attendance">Go to attendance <ArrowRight size={19} /></Link><a className="hero-secondary" href="#modules">Explore the platform <ChevronRight size={17} /></a></div></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="hero-art-core"><svg viewBox="0 0 64 64" fill="none"><path d="M32 5.5 55 18.75v26.5L32 58.5 9 45.25v-26.5L32 5.5Z" stroke="currentColor" strokeWidth="2"/><path d="M20 25.5 32 18l12 7.5v13L32 46l-12-7.5v-13Z" fill="currentColor"/><path d="M32 18v28M20 25.5l24 13M44 25.5 20 38.5" stroke="#102b32" strokeWidth="3"/></svg></div><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /><span className="art-label label-one">ONE TEAM</span><span className="art-label label-two">EVERY MOMENT</span></div>
    </section>
    <section className="platform-section" id="modules"><div className="section-intro"><div><p className="section-kicker">THE OMNITEAM PLATFORM</p><h2>One home. Endless ways<br />to move forward.</h2></div><p>Each module is designed to work as part of a bigger picture. Start with attendance today; the rest of your toolkit is on its way.</p></div>
      <div className="modules-grid">{modules.map(({ name, category, description, icon: Icon, active }, index) => {
        const content = <><div className="module-card-top"><span className="module-icon"><Icon size={23} strokeWidth={1.8} /></span><span className="module-number">0{index + 1} / 06</span></div><div className="module-card-body"><span className="module-category">{category}</span><h3>{name}</h3><p>{description}</p></div><div className="module-footer"><span className={active ? "module-ready" : "module-soon"}>{active && <Check size={13} />}{active ? "Attendance is ready" : "Coming soon"}</span><span className={active ? "module-arrow" : "module-arrow module-arrow-disabled"}><ArrowRight size={19} /></span></div></>;
        return active ? <Link className="module-card module-card-active" href="/attendance" key={name} aria-label="Open OmniAthlete attendance">{content}</Link> : <div className="module-card module-card-soon" key={name} aria-label={name + ", coming soon"}>{content}</div>;
      })}</div>
    </section>
    <section className="landing-callout"><div className="callout-icon"><ClipboardCheck size={26} /></div><div><span>READY TO USE NOW</span><h2>Make every practice count.</h2><p>OmniAthlete attendance is live and ready for your team.</p></div><Link href="/attendance">Open attendance <ArrowRight size={18} /></Link></section>
    <footer className="landing-footer"><OmniTeamLogo light compact /><span>Built for every team, every day.</span><span>© {new Date().getFullYear()} OmniTeam</span></footer>
  </main>;
}
