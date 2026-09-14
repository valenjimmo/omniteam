"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

type FamilyView = {
  id: string;
  teamId: string;
  name: string;
  swimmers: { id: string; firstName: string; lastName: string }[];
  contacts: { id: string; name: string; relationship: string | null; email: string | null }[];
};

export default function MyFamilyPage() {
  const [families, setFamilies] = useState<FamilyView[]>([]);
  const [message, setMessage] = useState("Loading your families…");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRelationship, setContactRelationship] = useState("");
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!client) { setMessage("Family access is not configured yet."); return; }
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) { setMessage("Please sign in through your team's registration page."); return; }
      const { data: memberships, error: membershipError } = await client
        .from("team_memberships").select("id,team_id").eq("user_id", auth.user.id).eq("status", "ACTIVE");
      if (membershipError) { setMessage("Your team access could not be loaded."); return; }
      const output: FamilyView[] = [];
      for (const membership of memberships ?? []) {
        const { data: links, error: linksError } = await client.from("family_guardians")
          .select("family_id").eq("team_id", membership.team_id).eq("membership_id", membership.id);
        if (linksError) { setMessage("Your family links could not be loaded."); return; }
        for (const link of links ?? []) {
          const { data: family, error: familyError } = await client.from("families")
            .select("id,name").eq("team_id", membership.team_id).eq("id", link.family_id).single();
          if (familyError || !family) continue;
          const { data: familySwimmers, error: swimmerLinkError } = await client.from("family_swimmers")
            .select("swimmer_id").eq("team_id", membership.team_id).eq("family_id", family.id);
          if (swimmerLinkError) { setMessage("Your swimmers could not be loaded."); return; }
          const swimmerIds = (familySwimmers ?? []).map((item) => item.swimmer_id);
          const { data: swimmers, error: swimmerError } = swimmerIds.length
            ? await client.from("swimmers").select("id,first_name,last_name")
              .eq("team_id", membership.team_id).in("id", swimmerIds)
            : { data: [], error: null };
          if (swimmerError) { setMessage("Your swimmers could not be loaded."); return; }
          const { data: contacts, error: contactsError } = await client.from("family_contacts")
            .select("id,name,relationship_label,email")
            .eq("team_id", membership.team_id).eq("family_id", family.id);
          if (contactsError) { setMessage("Your family contacts could not be loaded."); return; }
          output.push({ id: family.id, teamId: membership.team_id, name: family.name,
            swimmers: (swimmers ?? []).map((item) => ({ id: item.id,
              firstName: item.first_name, lastName: item.last_name })),
            contacts: (contacts ?? []).map((item) => ({ id: item.id, name: item.name,
              relationship: item.relationship_label, email: item.email })) });
        }
      }
      if (mounted) {
        setFamilies(output);
        setMessage(output.length ? "" : "No approved family is linked to your account yet.");
      }
    }
    void load();
    return () => { mounted = false; };
  }, [client]);

  async function addContact(family: FamilyView) {
    if (!client || !contactName.trim()) return;
    const { data, error } = await client.from("family_contacts")
      .insert({ team_id: family.teamId, family_id: family.id,
        name: contactName.trim(), relationship_label: contactRelationship.trim() || null,
        email: contactEmail.trim() || null })
      .select("id,name,relationship_label,email").single();
    if (error) { setMessage(error.message); return; }
    setFamilies((current) => current.map((item) => item.id === family.id && item.teamId === family.teamId
      ? { ...item, contacts: [...item.contacts, { id: data.id, name: data.name,
        relationship: data.relationship_label, email: data.email }] } : item));
    setContactName(""); setContactEmail(""); setContactRelationship("");
    setMessage("Guardian contact added.");
  }

  return <main className="registration-page"><section className="registration-card">
    <Link href="/" className="registration-brand">Omni<span>Team</span></Link>
    <p className="registration-kicker">OMNIATHLETE</p>
    <h1>My family</h1>
    {message && <p className="registration-message" role="status">{message}</p>}
    {families.map((family) => <article key={`${family.teamId}:${family.id}`} className="family-summary">
      <h2>{family.name}</h2>
      <p>Team ID: {family.teamId}</p>
      <h3>Swimmers</h3>
      <ul>{family.swimmers.map((swimmer) =>
        <li key={swimmer.id}>{swimmer.firstName} {swimmer.lastName}</li>)}</ul>
      <h3>Guardian contacts</h3>
      <ul>{family.contacts.map((contact) => <li key={contact.id}>{contact.name}
        {contact.relationship ? ` · ${contact.relationship}` : ""}
        {contact.email ? ` · ${contact.email}` : ""}</li>)}</ul>
      <div className="contact-form">
        <input aria-label="Guardian name" placeholder="Guardian name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <input aria-label="Relationship" placeholder="Relationship" value={contactRelationship} onChange={(e) => setContactRelationship(e.target.value)} />
        <input aria-label="Guardian email" type="email" placeholder="Email (optional)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <button type="button" onClick={() => addContact(family)}>Add contact</button>
      </div>
    </article>)}
  </section></main>;
}
