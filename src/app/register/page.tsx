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
    <h1>Find your team</h1>
    <p className="registration-intro">Enter the team link name provided by your swim team to start family registration.</p>
    <form onSubmit={submit}>
      <label>Team link name<input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="e.g. seaside-swim" autoComplete="off" /></label>
      <button type="submit">Continue</button>
    </form>
    <p className="registration-intro">Your team owner must open registration before the form is available.</p>
  </section></main>;
}
