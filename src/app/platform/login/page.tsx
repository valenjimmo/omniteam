"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const router = useRouter();
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Use your individually provisioned OmniTeam owner account.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (!client) { setMessage("Supabase is not configured."); return; }
      const { data } = await client.auth.getUser();
      if (!data.user) return;
      const { data: isOwner } = await client.rpc("is_platform_owner");
      if (isOwner) router.replace("/platform");
    }
    void checkSession();
  }, [client, router]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setMessage(error.message); setBusy(false); return; }
    const { data: isOwner, error: ownerError } = await client.rpc("is_platform_owner");
    if (ownerError || !isOwner) {
      await client.auth.signOut();
      setMessage("This account is not provisioned as an OmniTeam platform owner.");
      setBusy(false);
      return;
    }
    router.replace("/platform");
    router.refresh();
  }

  return <main className="registration-page"><section className="registration-card">
    <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
    <p className="registration-kicker">PLATFORM OWNER</p>
    <h1>Sign in</h1>
    <p className="registration-intro">Manage teams and platform-owned templates from one protected account.</p>
    <form onSubmit={signIn}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="registration-message" role="status">{message}</p>
  </section></main>;
}
