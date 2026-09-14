"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

type RegistrationTeam = { team_id: string; slug: string };
type SwimmerName = { first_name: string; last_name: string };

function parseSwimmers(value: string): SwimmerName[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [first_name, ...last] = line.split(/\s+/);
    return { first_name, last_name: last.join(" ") };
  });
}

export default function ParentRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [team, setTeam] = useState<RegistrationTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [swimmerNames, setSwimmerNames] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  useEffect(() => {
    if (!client) {
      setMessage("Registration is not configured yet. Please contact your team.");
      setLoading(false);
      return;
    }
    client.from("team_registration_settings").select("team_id,slug")
      .eq("slug", slug).eq("registration_open", true).maybeSingle()
      .then(({ data, error }) => {
        setTeam(data);
        if (error || !data) setMessage("Registration is not open for this team.");
        setLoading(false);
      });
  }, [client, slug]);

  async function submitRequest(userId: string, selectedTeam: RegistrationTeam) {
    const swimmers = parseSwimmers(swimmerNames);
    if (swimmers.length < 1 || swimmers.length > 10 ||
      swimmers.some((swimmer) => !swimmer.first_name || !swimmer.last_name)) {
      setMessage("Enter each swimmer's first and last name on a separate line (up to 10).");
      return;
    }
    const { error } = await client!.from("parent_registration_requests").insert({
      team_id: selectedTeam.team_id,
      user_id: userId,
      family_name: familyName.trim(),
      swimmers,
    });
    if (error) {
      setMessage(error.code === "23505"
        ? "You have already submitted a registration for this team."
        : `Registration could not be submitted: ${error.message}`);
      return;
    }
    setMessage("Your family registration has been submitted for team approval. Once approved, visit /my-family to see your family.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !team || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/register/${slug}`)}` },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setMessage("Check your email to verify your account. Then return here, select ‘I already have an account’, and submit your family details.");
          return;
        }
        await submitRequest(data.user.id, team);
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await submitRequest(data.user.id, team);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="registration-page">
    <div className="registration-card">
      <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
      <p className="registration-kicker">OMNIATHLETE · FAMILY REGISTRATION</p>
      <h1>Join your swim team</h1>
      <p className="registration-intro">Register your family for {slug.replaceAll("-", " ")}.
        Your team will review the request before your family information becomes available.</p>
      {loading ? <p>Checking registration…</p> : team && <form onSubmit={onSubmit}>
        {mode === "signup" && <div className="registration-row">
          <label>First name<input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label>Last name<input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        </div>}
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input required type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Family name<input required maxLength={100} value={familyName} onChange={(event) => setFamilyName(event.target.value)} placeholder="e.g. The Chen family" /></label>
        <label>Swimmers <small>(one full name per line)</small>
          <textarea required rows={4} value={swimmerNames} onChange={(event) => setSwimmerNames(event.target.value)} placeholder={"Avery Chen\nJordan Chen"} />
        </label>
        <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit family registration"}</button>
        <button type="button" className="registration-toggle" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}>
          {mode === "signup" ? "I already have an account" : "Create a new account"}
        </button>
      </form>}
      {message && <p className="registration-message" role="status">{message}</p>}
    </div>
  </main>;
}
