"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FindTeamRegistrationPage() {
  const [slug, setSlug] = useState("");
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = slug.trim().toLowerCase();
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) router.push(`/register/${value}`);
  }
  return <main className="registration-page"><section className="registration-card">
    <Link href="/omniathlete" className="registration-brand">Omni<span>Athlete</span></Link>
    <p className="registration-kicker">FAMILY REGISTRATION</p>
    <h1>Join an existing club</h1>
    <p className="registration-intro">Enter the registration link name provided by your club. You can create your OmniTeam account on the next screen and your membership will begin only after club approval.</p>
    <form onSubmit={submit}>
      <label>Team link name<input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="e.g. seaside-swim" autoComplete="off" /></label>
      <button type="submit">Continue</button>
    </form>
    <p className="registration-intro">Your club owner must open registration before the form is available. Don&apos;t have a club link? Ask the club administrator for its OmniTeam registration link.</p>
    <p className="registration-intro">Setting up a new organization? <Link href="/subscribe">Register your club</Link>.</p>
  </section></main>;
}
