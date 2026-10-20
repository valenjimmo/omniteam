"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/site-url";

export default function ForgotPasswordPage() {
  const client = useMemo(createSupabaseBrowserClient, []);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (!client) {
      setMessage("Password recovery is not configured.");
      setBusy(false);
      return;
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authCallbackUrl("/reset-password"),
    });
    setMessage(error?.message ?? "If an account exists for that email, a password-reset link has been sent.");
    setBusy(false);
  }

  return <main className="oa-auth"><section>
    <Link href="/" className="oa-wordmark">Omni<span>Team</span></Link>
    <h1>Reset your password</h1>
    <p>Enter the email used for your OmniTeam account. We’ll send a secure link to choose a new password.</p>
    <form onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <button disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
    {message && <p className="oa-notice" role="status">{message}</p>}
    <footer><Link href="/login">Return to sign in</Link></footer>
  </section></main>;
}
