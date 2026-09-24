"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const client = useMemo(createSupabaseBrowserClient, []);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    if (!client) { setMessage("Supabase is not configured."); setBusy(false); return; }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (mode === "login") {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { setMessage(error.message); setBusy(false); return; }
      router.replace("/app"); router.refresh();
    } else {
      const firstName = String(data.get("firstName") ?? "").trim();
      const lastName = String(data.get("lastName") ?? "").trim();
      const { error } = await client.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: `${location.origin}/auth/callback?next=/join` } });
      setMessage(error?.message ?? "Check your email to confirm your account, then join your team."); setBusy(false);
    }
  }
  return <main className="oa-auth"><section>
    <Link href="/" className="oa-wordmark">Omni<span>Athlete</span></Link>
    <p className="oa-eyebrow">HARBOR SHARKS</p><h1>{mode === "login" ? "Welcome back" : "Create your family account"}</h1>
    <p>{mode === "login" ? "Sign in to your team home." : "One login keeps your whole household together."}</p>
    <form onSubmit={submit}>
      {mode === "signup" && <div className="oa-form-row"><label>First name<input name="firstName" required /></label><label>Last name<input name="lastName" required /></label></div>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
      <button disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    {message && <p className="oa-notice" role="status">{message}</p>}
    <footer>{mode === "login" ? <>New here? <Link href="/signup">Create an account</Link></> : <>Already registered? <Link href="/login">Sign in</Link></>}</footer>
  </section></main>;
}
