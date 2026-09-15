import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, CalendarDays, ChevronRight, ClipboardCheck, CreditCard, Globe2, HeartHandshake, Medal, Users } from "lucide-react";
import { OmniTeamLogo } from "./omniteam-logo";

const modules = [
  { name: "OmniAthlete", category: "SWIMMERS & FAMILIES", description: "Bring swimmers, families, groups, and attendance into one team home.", icon: Users, active: true },
  { name: "OmniSchedule", category: "PRACTICES & CALENDARS", description: "Make the next practice easy to find, plan, and run.", icon: CalendarDays },
  { name: "OmniMeet", category: "MEETS & EVENTS", description: "Bring entries, events, and meet days into one place.", icon: Medal },
  { name: "OmniVolunteer", category: "PEOPLE & HOURS", description: "Coordinate the people who make every event happen.", icon: HeartHandshake },
  { name: "OmniPay", category: "PAYMENTS & BILLING", description: "Give your team a clearer view of fees and payments.", icon: CreditCard },
  { name: "OmniConnect", category: "TEAM COMMUNICATION", description: "Keep families informed through announcements and messages.", icon: BellRing },
  { name: "OmniSite", category: "YOUR TEAM ONLINE", description: "Choose a template and build your team's website.", icon: Globe2, active: true },
  { name: "OmniInsights", category: "TEAM ANALYTICS", description: "See membership, meet, volunteer, and financial trends.", icon: BarChart3 },
];

export default function Home() {
  return <main className="landing">
    <div className="landing-glow" aria-hidden="true" />
    <header className="landing-header">
      <Link href="/" aria-label="OmniTeam home"><OmniTeamLogo light /></Link>
      <div className="header-right"><span className="header-status"><span /> One platform. Every part of your team.</span><Link className="header-link" href="/dashboard">Team dashboard <ArrowRight size={16} /></Link></div>
    </header>
    <section className="landing-hero">
      <div className="hero-copy"><div className="hero-kicker"><span className="kicker-line" /> BUILT FOR THE WHOLE TEAM</div><h1>Everything your<br />team needs, <em>together.</em></h1><p>From the pool deck to meet day and everything in between, OmniTeam brings your people, plans, and progress into one connected home.</p><div className="hero-actions"><Link className="hero-cta" href="/subscribe">Start a team website <ArrowRight size={19} /></Link><a className="hero-secondary" href="#modules">Explore the platform <ChevronRight size={17} /></a></div></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="hero-art-core"><svg viewBox="0 0 64 64" fill="none"><path d="M32 5.5 55 18.75v26.5L32 58.5 9 45.25v-26.5L32 5.5Z" stroke="currentColor" strokeWidth="2"/><path d="M20 25.5 32 18l12 7.5v13L32 46l-12-7.5v-13Z" fill="currentColor"/><path d="M32 18v28M20 25.5l24 13M44 25.5 20 38.5" stroke="#102b32" strokeWidth="3"/></svg></div><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /><span className="art-label label-one">ONE TEAM</span><span className="art-label label-two">EVERY MOMENT</span></div>
    </section>
    <section className="platform-section" id="modules"><div className="section-intro"><div><p className="section-kicker">THE OMNITEAM PLATFORM</p><h2>One home. Endless ways<br />to move forward.</h2></div><p>Explore OmniAthlete and the approved eight-module structure. Features are being built in stages.</p></div>
      <div className="modules-grid">{modules.map(({ name, category, description, icon: Icon, active }, index) => {
        const content = <><div className="module-card-top"><span className="module-icon"><Icon size={23} strokeWidth={1.8} /></span><span className="module-number">{String(index + 1).padStart(2, "0")} / {String(modules.length).padStart(2, "0")}</span></div><div className="module-card-body"><span className="module-category">{category}</span><h3>{name}</h3><p>{description}</p></div><div className="module-footer"><span className={active ? "module-ready" : "module-soon"}>{active ? "In development" : "Planned"}</span><span className={active ? "module-arrow" : "module-arrow module-arrow-disabled"}><ArrowRight size={19} /></span></div></>;
        return active ? <Link className="module-card module-card-active" href={name === "OmniSite" ? "/omnisite" : "/omniathlete"} key={name} aria-label={`Explore ${name}`}>{content}</Link> : <div className="module-card module-card-soon" key={name} aria-label={name + ", planned"}>{content}</div>;
      })}</div>
    </section>
    <section className="pricing-section" id="pricing"><div className="pricing-heading"><p className="section-kicker">START WITH THE MODULES YOU NEED</p><h2>Choose your OmniTeam setup.</h2><p>Try the complete subscription flow without entering payment information. Your selected modules appear on the team dashboard after activation.</p></div><div className="pricing-grid"><article><span>OMNISITE STARTER</span><h3>$29 <small>/ month</small></h3><p>Build and publish a branded team website with templates, pages, team colors, and your logo.</p><ul><li>OmniSite</li><li>30-day simulated trial</li><li>No payment collected</li></ul><Link href="/subscribe">Choose OmniSite <ArrowRight size={17}/></Link></article><article className="pricing-featured"><span>WEBSITE + TEAM MANAGEMENT</span><h3>$59 <small>/ month</small></h3><p>Build the website and connect it to swimmer, family, group, and attendance workflows.</p><ul><li>OmniSite</li><li>OmniAthlete</li><li>30-day simulated trial</li></ul><Link href="/subscribe">Choose the bundle <ArrowRight size={17}/></Link></article></div></section>
    <section className="landing-callout"><div className="callout-icon"><ClipboardCheck size={26} /></div><div><span>BUILDING OMNIATHLETE</span><h2>Start with your people.</h2><p>Explore family registration, team access, and the attendance demo.</p></div><Link href="/omniathlete">Explore OmniAthlete <ArrowRight size={18} /></Link></section>
    <footer className="landing-footer"><OmniTeamLogo light compact /><span>Built for every team, every day.</span><span><Link href="/platform/login">Owner sign in</Link> · © {new Date().getFullYear()} OmniTeam</span></footer>
  </main>;
}
