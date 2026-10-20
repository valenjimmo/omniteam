"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const client = useMemo(createSupabaseBrowserClient, []);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Checking your reset link…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) {
      setMessage("Password recovery is not configured.");
      return;
    }
    void client.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setMessage("This reset link is invalid or has expired. Request a new one.");
        return;
      }
      setReady(true);
      setMessage("");
    });
  }, [client]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    setMessage("Password updated. Redirecting you to create your team…");
    router.replace("/subscribe");
    router.refresh();
  }

  return <main className="oa-auth"><section>
    <Link href="/" className="oa-wordmark">Omni<span>Team</span></Link>
    <h1>Choose a new password</h1>
    <p>Use at least eight characters. Afterward, you can create a new team with your existing account.</p>
    {ready && <form onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <button disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
    </form>}
    {message && <p className="oa-notice" role="status">{message}</p>}
    {!ready && <footer><Link href="/forgot-password">Request a new reset link</Link></footer>}
  </section></main>;
}
