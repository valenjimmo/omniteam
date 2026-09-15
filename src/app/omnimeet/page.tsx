import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, Globe2, Monitor, Waves } from "lucide-react";
import { OmniTeamLogo } from "../omniteam-logo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "OmniMeet | Online registration & downloadable meet software",
  description: "Explore OmniMeet: online swim meet registration connected to standalone, downloadable meet software for hosts.",
};

const registration = [
  "Publish meet details, announcements, events, and entry deadlines.",
  "Set qualifying standards, entry rules, and event limits.",
  "Collect swimmer information, team entries, event selections, and entry times.",
  "Accept entry fees and provide confirmation, with host tools for refunds and adjustments.",
];
const software = [
  "Download and install a dedicated application on your computer.",
  "Connect to your hosted meet’s online registration.",
  "Bring swimmer, team, event, entry-time, and payment-status information into the application.",
  "Use the collected entries for meet preparation, entry reports, and exports.",
];

export default function OmniMeetPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" aria-label="OmniTeam home"><OmniTeamLogo light compact /></Link>
      <nav aria-label="OmniMeet navigation"><a href="#registration">Registration</a><a href="#software">Meet software</a><Link href="/">All products <ArrowRight size={15} /></Link></nav>
    </header>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>OMNIMEET / BUILT FOR MEET HOSTS</p>
        <h1>From first entry<br />to <em>meet day.</em></h1>
        <p className={styles.intro}>Online registration. Downloadable meet software. Two connected parts of OmniMeet that bring your meet information from the web to your computer.</p>
        <div className={styles.actions}><a className={styles.primary} href="#features">Explore both features <ArrowRight size={18} /></a><a href="#connection">See how they connect <ArrowRight size={18} /></a></div>
        <p className={styles.status}><span /> In development · Product preview</p>
      </div>
      <div className={styles.diagram} aria-label="Online entries flow into downloadable OmniMeet software">
        <div className={styles.diagramHeading}><Waves size={23} /><span>ONE MEET. CONNECTED INFORMATION.</span></div>
        <div className={styles.diagramCard}><Globe2 size={29} /><div><small>01 / ONLINE</small><h2>Meet registration</h2><p>Swimmers · Events · Entry fees</p></div></div>
        <div className={styles.connector}><ArrowDownToLine size={22} /><span>Registration data flows into your software</span></div>
        <div className={styles.diagramCard}><Monitor size={29} /><div><small>02 / ON YOUR COMPUTER</small><h2>Meet software</h2><p>Connected entries, ready for the host</p></div></div>
        <p className={styles.diagramNote}>Designed to work together, from registration to preparation.</p>
      </div>
    </section>
    <section className={styles.features} id="features">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>TWO FEATURES. ONE OMNIMEET.</p><h2>A clear role for each part.</h2><p>Give entrants an online place to register, and give your meet staff a dedicated application to work with that information.</p></div>
      <div className={styles.grid}>
        <article className={styles.feature} id="registration"><div className={styles.featureTop}><Globe2 size={27} /><span>01 / IN YOUR BROWSER</span></div><h3>Online meet registration</h3><p>A familiar online meet-entry experience: find the meet, add swimmers, choose events, review entries, and pay in one place.</p><ul>{registration.map(item => <li key={item}><Check size={17} /><span>{item}</span></li>)}</ul><div className={styles.featureNote}>For families, coaches, and meet hosts.<br /><strong>Planned · Registration is not open yet.</strong></div></article>
        <article className={styles.feature} id="software"><div className={styles.featureTop}><Monitor size={27} /><span>02 / DOWNLOADABLE APPLICATION</span></div><h3>Standalone meet software</h3><p>A dedicated application for meet hosts, installed on your computer and connected to online registration so you can bring entry information into your meet workflow.</p><ul>{software.map(item => <li key={item}><Check size={17} /><span>{item}</span></li>)}</ul><div className={styles.featureNote}>For the staff preparing and running the hosted meet.<br /><strong>Planned · Downloads are not available yet.</strong></div></article>
      </div>
    </section>
    <section className={styles.flow} id="connection"><div className={styles.sectionHeading}><p className={styles.eyebrow}>HOW THEY CONNECT</p><h2>Register online. Bring the information with you.</h2><p>The planned integration carries registration information into the downloadable application, reducing manual entry for your meet staff.</p></div><ol className={styles.steps}>
      <li><span>01</span><h3>Set up registration</h3><p>The host defines meet details, events, entry rules, and fees online.</p></li>
      <li><span>02</span><h3>Collect meet entries</h3><p>Families and teams submit swimmer information, select events, and complete payment.</p></li>
      <li><span>03</span><h3>Connect the software</h3><p>The host connects the downloaded application to the meet and brings in registration data for preparation, reports, and exports.</p></li>
    </ol></section>
    <section className={styles.standalone}><div><p className={styles.eyebrow}>PART OF OMNITEAM. STANDS ON ITS OWN.</p><h2>Host a meet with the tools you need.</h2><p>OmniMeet is a standalone product. You can keep your existing team website and team-management tools. Entry payments are part of the registration workflow.</p></div><Link href="/#modules">Explore OmniTeam <ArrowRight size={18} /></Link></section>
    <footer className={styles.footer}><span>OmniMeet by OmniTeam</span><span>Online registration + downloadable meet software</span><Link href="/">Back to OmniTeam</Link></footer>
  </main>;
}
