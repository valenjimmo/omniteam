"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TotpFactor = { id: string; status: string; friendly_name?: string };

function qrBlobUrl(dataUrl: string) {
  const [header, encoded] = dataUrl.split(",", 2);
  if (!header?.startsWith("data:image/") || !encoded) throw new Error("Authenticator QR code was invalid.");
  const mime = header.match(/^data:([^;]+)/)?.[1] ?? "image/svg+xml";
  const bytes = header.includes(";base64")
    ? Uint8Array.from(atob(encoded), character => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(encoded));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export default function PlatformMfaPage() {
  const router = useRouter();
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Checking your security settings…");

  useEffect(() => {
    return () => { if (qr.startsWith("blob:")) URL.revokeObjectURL(qr); };
  }, [qr]);

  useEffect(() => {
    async function prepare() {
      if (!client) { setMessage("Supabase is not configured."); setBusy(false); return; }
      const { data: user } = await client.auth.getUser();
      if (!user.user) { router.replace("/platform/login"); return; }
      const owner = await client.rpc("is_platform_owner_identity");
      if (owner.error || !owner.data) { await client.auth.signOut(); router.replace("/platform/login?error=owner_access_required"); return; }
      const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.data?.currentLevel === "aal2") { router.replace("/platform"); return; }
      const factors = await client.auth.mfa.listFactors();
      const verified = factors.data?.totp.find((factor: TotpFactor) => factor.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMessage("Enter the current code from your authenticator app.");
      } else {
        const incomplete = factors.data?.all.filter(factor => factor.factor_type === "totp" && factor.status !== "verified") ?? [];
        for (const factor of incomplete) await client.auth.mfa.unenroll({ factorId: factor.id });
        const enrollment = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "OmniTeam platform owner" });
        if (enrollment.error) { setMessage(enrollment.error.message); setBusy(false); return; }
        setFactorId(enrollment.data.id);
        setQr(qrBlobUrl(enrollment.data.totp.qr_code));
        setSecret(enrollment.data.totp.secret);
        setSetupUri(enrollment.data.totp.uri);
        setMessage("Scan the QR code, then enter the six-digit code to finish enrollment.");
      }
      setBusy(false);
    }
    void prepare();
  }, [client, router]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!client || !factorId) return;
    setBusy(true);
    const result = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (result.error) { setMessage(result.error.message); setBusy(false); return; }
    await client.auth.refreshSession();
    router.replace("/platform");
    router.refresh();
  }

  return <main className="registration-page"><section className="registration-card">
    <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
    <p className="registration-kicker">PLATFORM OWNER SECURITY</p>
    <h1>Two-step verification</h1>
    <p className="registration-intro">Platform access requires a time-based code from your authenticator app.</p>
    {qr && <div>
      <p><strong>Microsoft Authenticator:</strong> choose <em>Other account</em>, then <em>Scan QR code</em>.</p>
      <p><strong>Google Authenticator:</strong> choose <em>Add a code</em>, then <em>Scan a QR code</em>.</p>
      <img src={qr} alt="Authenticator enrollment QR code" width={220} height={220}/>
      <p>If the authenticator is on this device, <a href={setupUri}>open the setup directly</a>.</p>
      <p>Manual key: <code>{secret}</code> <button type="button" className="registration-toggle" onClick={async () => { await navigator.clipboard.writeText(secret); setMessage("Manual setup key copied. Choose time-based/TOTP when adding it."); }}>Copy key</button></p>
    </div>}
    <form onSubmit={verify}>
      <label>Six-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))}/></label>
      <button type="submit" disabled={busy || !factorId}>{busy ? "Checking…" : "Verify and continue"}</button>
    </form>
    <p className="registration-message" role="status">{message}</p>
  </section></main>;
}
