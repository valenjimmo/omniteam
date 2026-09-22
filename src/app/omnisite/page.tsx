"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { SiteView } from "@/modules/omnisite/SiteView";
import {
  DEFAULT_SETTINGS,
  contrastText,
  mediaUrl,
  pageSchema,
  slugSchema,
  snapshotSchema,
  templateSchema,
  type SiteSnapshot,
  type SiteSection,
  type SitePage,
} from "@/modules/omnisite/model";
import "@/modules/omnisite/editor.css";

type Team = { id: string; name: string; manage: boolean };
type Template = {
  id: string;
  name: string;
  layout_key: SiteSnapshot["layout"];
  default_theme: SiteSnapshot["theme"];
  starter_pages: SitePage[];
};
type Asset = { id: string; object_path: string; state: string; bytes: number };
type Publication = {
  version: number;
  published_at: string;
  source_revision: number;
};
type Domain = {
  id: string;
  hostname: string;
  verification_token: string;
  verification_status: string;
  provider_status: string;
  active: boolean;
  is_primary: boolean;
  detached_at: string | null;
  last_error: string | null;
};
const tabs = [
  "Pages",
  "Navigation",
  "Theme",
  "Media",
  "SEO",
  "Preview",
  "Publishing",
  "Domains",
] as const;
type Tab = (typeof tabs)[number];
const sample = (t: Template): SiteSnapshot => ({
  schemaVersion: 2,
  teamId: "00000000-0000-4000-8000-000000000001",
  siteId: "00000000-0000-4000-8000-000000000002",
  slug: "sample",
  siteName: t.name,
  layout: t.layout_key,
  theme: t.default_theme,
  logoPath: null,
  settings: DEFAULT_SETTINGS,
  pages: t.starter_pages,
});
export default function OmniSiteEditor() {
  const client = useMemo(() => {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL,
      k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return u && k ? createBrowserClient(u, k) : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]),
    [teamId, setTeamId] = useState(""),
    [templates, setTemplates] = useState<Template[]>([]),
    [templateId, setTemplateId] = useState("");
  const [draft, setDraft] = useState<SiteSnapshot | null>(null),
    [saved, setSaved] = useState(""),
    [revision, setRevision] = useState(1),
    [version, setVersion] = useState(0),
    [enabled, setEnabled] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]),
    [history, setHistory] = useState<Publication[]>([]),
    [domains, setDomains] = useState<Domain[]>([]);
  const [tab, setTab] = useState<Tab>("Pages"),
    [selected, setSelected] = useState("home"),
    [width, setWidth] = useState("100%");
  const [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [hostname, setHostname] = useState(""),
    [pageName, setPageName] = useState(""),
    [pageSlug, setPageSlug] = useState("");
  const [message, setMessage] = useState("Loading your websites…"),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const generation = useRef(0),
    currentTeam = useRef(teamId);
  currentTeam.current = teamId;
  const dirty = !!draft && JSON.stringify(draft) !== saved,
    manage = teams.find((t) => t.id === teamId)?.manage ?? false;
  const current = draft?.pages.find((p) => p.slug === selected),
    template = templates.find((t) => t.id === templateId);
  useEffect(() => {
    const warning = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warning);
    return () => window.removeEventListener("beforeunload", warning);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    async function init() {
      if (!client) {
        setMessage("Configure Supabase to open the website editor.");
        return;
      }
      const { data } = await client.auth.getUser();
      if (!data.user) {
        setMessage("Sign in with your team account to open OmniSite.");
        return;
      }
      const memberships = await client
        .from("team_memberships")
        .select("team_id")
        .eq("user_id", data.user.id)
        .eq("status", "ACTIVE");
      const allowed: Team[] = [];
      for (const m of memberships.data ?? []) {
        const [view, write, t] = await Promise.all([
          client.rpc("can_view_omnisite", { target_team_id: m.team_id }),
          client.rpc("can_manage_omnisite", { target_team_id: m.team_id }),
          client.from("teams").select("id,name").eq("id", m.team_id).single(),
        ]);
        if (view.data && t.data)
          allowed.push({ ...t.data, manage: !!write.data });
      }
      const list = await client
        .from("site_templates")
        .select("*")
        .eq("status", "PUBLISHED");
      const safe: Template[] = [];
      for (const t of list.data ?? []) {
        const parsed = templateSchema.safeParse({
          name: t.name,
          layout_key: t.layout_key,
          default_theme: t.default_theme,
          starter_pages: t.starter_pages,
          status: t.status,
        });
        if (parsed.success) safe.push({ id: t.id, ...parsed.data });
      }
      if (active) {
        setTeams(allowed);
        setTeamId(allowed[0]?.id ?? "");
        setTemplates(safe);
        setTemplateId(safe[0]?.id ?? "");
        setMessage(
          allowed.length
            ? ""
            : "No active OmniSite access. Ask your team owner or choose an OmniSite plan.",
        );
      }
    }
    void init().catch(() =>
      setMessage("Unable to load OmniSite. Check your connection."),
    );
    return () => {
      active = false;
    };
  }, [client]);
  async function refreshMedia(t: string, s: string) {
    if (!client) return;
    const r = await client
      .from("site_assets")
      .select("id,object_path,state,bytes")
      .eq("team_id", t)
      .eq("site_id", s);
    if (!r.error && currentTeam.current === t) setAssets(r.data ?? []);
  }
  const load = useCallback(
    async (t: string, isActive: () => boolean = () => true) => {
      if (!client) return;
      const gen = ++generation.current;
      setLoaded(false);
      const r = await client
        .from("team_sites")
        .select("*")
        .eq("team_id", t)
        .maybeSingle();
      if (gen !== generation.current || !isActive()) return;
      if (r.error) throw new Error("Could not load the website.");
      if (!r.data) {
        setDraft(null);
        setSaved("");
        setLoaded(true);
        return;
      }
      const s = r.data;
      const [p, a, h, d] = await Promise.all([
        client
          .from("site_pages")
          .select("*")
          .eq("team_id", t)
          .eq("site_id", s.id)
          .order("nav_order"),
        client
          .from("site_assets")
          .select("id,object_path,state,bytes")
          .eq("team_id", t)
          .eq("site_id", s.id),
        client
          .from("site_publications")
          .select("version,published_at,source_revision")
          .eq("team_id", t)
          .eq("site_id", s.id)
          .order("version", { ascending: false }),
        client
          .from("site_domains")
          .select("*")
          .eq("team_id", t)
          .eq("site_id", s.id)
          .order("created_at"),
      ]);
      if (gen !== generation.current || !isActive()) return;
      if (p.error || a.error || h.error || d.error)
        throw new Error(
          "Could not load website details. Confirm the OmniSite migrations are applied.",
        );
      const parsed = snapshotSchema.safeParse({
        schemaVersion: 2,
        teamId: t,
        siteId: s.id,
        slug: s.slug,
        siteName: s.site_name,
        layout: s.layout_key,
        theme: s.theme,
        logoPath: s.logo_path,
        settings: s.settings ?? DEFAULT_SETTINGS,
        pages: (p.data ?? []).map((x) => ({
          slug: x.slug,
          title: x.title,
          seoDescription: x.seo_description,
          navOrder: x.nav_order,
          visible: x.visible,
          sections: x.sections,
        })),
      });
      if (!parsed.success)
        throw new Error(
          "This draft uses unsupported content. An administrator must migrate it before editing.",
        );
      setDraft(parsed.data);
      setSaved(JSON.stringify(parsed.data));
      setRevision(s.draft_revision);
      setVersion(s.published_version ?? 0);
      setEnabled(s.enabled);
      setAssets(a.data ?? []);
      setHistory(h.data ?? []);
      setDomains(d.data ?? []);
      setSelected((old) =>
        parsed.data.pages.some((p) => p.slug === old) ? old : "home",
      );
      setLoaded(true);
    },
    [client],
  );
  useEffect(() => {
    let active = true;
    if (teamId) {
      setDraft(null);
      setAssets([]);
      setHistory([]);
      setDomains([]);
      void load(teamId, () => active).catch((e) => {
        if (active) setMessage(e.message);
      });
    }
    return () => {
      active = false;
    };
  }, [teamId, load]);
  async function authHeaders() {
    const session = await client?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error("Sign in to continue.");
    return { Authorization: `Bearer ${token}` };
  }
  async function command(body: unknown) {
    const r = await fetch("/api/omnisite", {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    return result.data;
  }
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  function update(patch: Partial<SiteSnapshot>) {
    if (draft && manage) setDraft({ ...draft, ...patch });
  }
  function updatePage(patch: Partial<SitePage>) {
    if (current && draft)
      update({
        pages: draft.pages.map((p) =>
          p.slug === selected ? { ...p, ...patch } : p,
        ),
      });
  }
  function sectionChange(i: number, s: SiteSection) {
    if (current)
      updatePage({
        sections: current.sections.map((old, n) => (n === i ? s : old)),
      });
  }
  function moveSection(i: number, delta: number) {
    if (!current) return;
    const next = [...current.sections],
      target = i + delta;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    updatePage({ sections: next });
  }
  function addSection(type: SiteSection["type"]) {
    if (!current) return;
    const path = assets.find((a) => a.state === "READY")?.object_path;
    if (type === "image" && !path) {
      setMessage("Upload an image in Media first.");
      return;
    }
    const s: SiteSection =
      type === "hero"
        ? {
            type,
            heading: "Welcome to our team",
            text: "A place to grow, together.",
          }
        : type === "richText"
          ? { type, heading: "Our community", text: "Tell your story." }
          : type === "cta"
            ? {
                type,
                heading: "Ready to join us?",
                label: "Contact us",
                href: "/contact",
              }
            : type === "image"
              ? { type, path: path!, alt: "Describe this image" }
              : {
                  type,
                  heading: "Our programs",
                  items: [
                    {
                      title: "Find your lane",
                      text: "Introduce your program.",
                    },
                  ],
                };
    updatePage({ sections: [...current.sections, s] });
  }
  function addPage(duplicate = false) {
    if (!draft) return;
    const parsed = pageSchema.safeParse({
      slug: pageSlug,
      title: pageName,
      seoDescription: "",
      navOrder: draft.pages.length,
      visible: true,
      sections:
        duplicate && current
          ? structuredClone(current.sections)
          : [{ type: "richText", heading: pageName, text: "" }],
    });
    if (!parsed.success || draft.pages.some((p) => p.slug === pageSlug)) {
      setMessage(
        "Enter a unique page address and title. System addresses are reserved.",
      );
      return;
    }
    update({ pages: [...draft.pages, parsed.data] });
    setSelected(pageSlug);
    setPageName("");
    setPageSlug("");
  }
  async function domainOp(operation: string, domainId?: string) {
    if (!draft) return;
    await perform(async () => {
      const result = await command({
        action: "domain",
        teamId,
        siteId: draft.siteId,
        operation,
        ...(domainId ? { domainId } : { hostname }),
      });
      const d = await client!
        .from("site_domains")
        .select("*")
        .eq("team_id", teamId)
        .eq("site_id", draft.siteId);
      setDomains(d.data ?? []);
      setMessage(
        typeof result === "string" && !/^[0-9a-f-]{36}$/.test(result)
          ? result
          : "Domain updated.",
      );
    });
  }
  const mediaSelect = (
    label: string,
    value: string | null,
    onChange: (s: string | null) => void,
  ) => (
    <label>
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">None</option>
        {assets
          .filter((a) => a.state === "READY")
          .map((a, i) => (
            <option key={a.id} value={a.object_path}>
              Image {i + 1} · {Math.round(a.bytes / 1024)} KB
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <div className="oe">
      <header className="oe-top">
        <div>
          <Link href="/dashboard">OmniTeam / OmniSite</Link>
          <h1>{draft?.siteName ?? "Build your team’s home on the web"}</h1>
          <small>
            {dirty
              ? "Unsaved changes"
              : draft
                ? `Draft revision ${revision} · ${version ? `Published v${version}` : "Not published"}`
                : "Choose a starting point. Make it yours."}
          </small>
        </div>
        <div className="oe-actions">
          {teams.length > 0 && (
            <select
              aria-label="Team"
              disabled={busy}
              value={teamId}
              onChange={(e) => {
                if (
                  !dirty ||
                  confirm("Discard unsaved changes and switch teams?")
                )
                  setTeamId(e.target.value);
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {draft && manage && (
            <button
              className="primary"
              disabled={busy || !dirty}
              onClick={() =>
                perform(async () => {
                  const content = snapshotSchema.parse(draft);
                  await command({
                    action: "save",
                    teamId,
                    siteId: draft.siteId,
                    revision,
                    content,
                  });
                  await load(teamId);
                  setMessage(
                    "Draft saved. Your public website has not changed.",
                  );
                })
              }
            >
              Save draft
            </button>
          )}
        </div>
      </header>
      <div className="oe-status" role="status" aria-live="polite">
        {busy
          ? "Working…"
          : message ||
            (manage
              ? "Your website, your team."
              : "Read-only access: you can inspect and preview saved drafts.")}
      </div>
      {!draft && loaded && (
        <div className="oe-content">
          <h2>1. Choose your starting point</h2>
          <p>
            Three responsive designs, with safe sample content. Your site is a
            separate copy.
          </p>
          <div className="oe-grid">
            {templates.map((t) => (
              <button
                className="oe-template"
                key={t.id}
                aria-pressed={templateId === t.id}
                onClick={() => setTemplateId(t.id)}
              >
                <div
                  className="swatch"
                  style={{
                    background: t.default_theme.primary,
                    color: contrastText(t.default_theme.primary),
                  }}
                >
                  {t.name}
                </div>
                <div className="caption">
                  {t.layout_key} · Home, About & Contact
                </div>
              </button>
            ))}
          </div>
          <div className="oe-panel" style={{ marginTop: "1rem" }}>
            <h2>2. Make it yours</h2>
            <fieldset disabled={!manage || busy}>
              <label>
                Website name
                <input
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Website address
                <input
                  value={slug}
                  maxLength={63}
                  placeholder="your-swim-team"
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                />
              </label>
              <p>/sites/{slug || "your-swim-team"}</p>
              <button
                className="primary"
                onClick={() =>
                  perform(async () => {
                    await command({
                      action: "create",
                      teamId,
                      templateId,
                      name,
                      slug,
                    });
                    await load(teamId);
                    setMessage("Your private draft is ready.");
                  })
                }
              >
                Create website draft
              </button>
            </fieldset>
          </div>
          {template && (
            <>
              <PreviewWidth width={width} setWidth={setWidth} />
              <div className="oe-preview">
                <div
                  className="oe-preview-frame"
                  style={{ width, maxWidth: "100%" }}
                >
                  <SiteView site={sample(template)} preview />
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {draft && (
        <div className="oe-body">
          <aside className="oe-sidebar" aria-label="Website editor">
            {tabs.map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </aside>
          <div className="oe-content">
            <h2>{tab}</h2>
            {tab === "Pages" && (
              <>
                <div className="oe-panel">
                  <label>
                    Page
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {draft.pages.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title}
                          {p.visible ? "" : " (hidden)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset disabled={!manage || busy}>
                    {current && (
                      <>
                        <label>
                          Page title
                          <input
                            maxLength={120}
                            value={current.title}
                            onChange={(e) =>
                              updatePage({ title: e.target.value })
                            }
                          />
                        </label>
                        <p className="oe-note">
                          Address: /
                          {current.slug === "home" ? "" : current.slug}
                        </p>
                        {current.slug !== "home" && (
                          <label>
                            Page address
                            <input
                              key={current.slug}
                              defaultValue={current.slug}
                              maxLength={63}
                              onBlur={(e) => {
                                const next = e.target.value;
                                if (next === current.slug) return;
                                if (
                                  !slugSchema.safeParse(next).success ||
                                  draft.pages.some((p) => p.slug === next)
                                ) {
                                  setMessage(
                                    "Use a unique, non-reserved page address.",
                                  );
                                  e.target.value = current.slug;
                                  return;
                                }
                                update({
                                  pages: draft.pages.map((p) =>
                                    p.slug === current.slug
                                      ? { ...p, slug: next }
                                      : p,
                                  ),
                                });
                                setSelected(next);
                              }}
                            />
                          </label>
                        )}
                        <div className="oe-actions">
                          <button
                            disabled={current.slug === "home"}
                            className="danger"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete ${current.title} from the draft? Publication history is retained.`,
                                )
                              ) {
                                update({
                                  pages: draft.pages.filter(
                                    (p) => p.slug !== selected,
                                  ),
                                });
                                setSelected("home");
                              }
                            }}
                          >
                            Delete page
                          </button>
                          <button
                            disabled={current.slug === "home"}
                            onClick={() =>
                              updatePage({ visible: !current.visible })
                            }
                          >
                            {current.visible ? "Hide page" : "Show page"}
                          </button>
                        </div>
                        {current.sections.map((s, i) => (
                          <div className="oe-section" key={i}>
                            <div className="oe-row">
                              <strong>
                                {i + 1}. {s.type}
                              </strong>
                              <div className="oe-actions">
                                <button
                                  aria-label={`Move section ${i + 1} up`}
                                  disabled={i === 0}
                                  onClick={() => moveSection(i, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  aria-label={`Move section ${i + 1} down`}
                                  disabled={i === current.sections.length - 1}
                                  onClick={() => moveSection(i, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() =>
                                    sectionChange(i, {
                                      ...s,
                                      hidden: !s.hidden,
                                    })
                                  }
                                >
                                  {s.hidden ? "Show" : "Hide"}
                                </button>
                                <button
                                  onClick={() =>
                                    updatePage({
                                      sections: [
                                        ...current.sections.slice(0, i + 1),
                                        {
                                          ...structuredClone(s),
                                          hidden:
                                            s.type === "hero" ? true : s.hidden,
                                        },
                                        ...current.sections.slice(i + 1),
                                      ],
                                    })
                                  }
                                >
                                  Duplicate
                                </button>
                                <button
                                  className="danger"
                                  onClick={() => {
                                    if (confirm("Remove this section?"))
                                      updatePage({
                                        sections: current.sections.filter(
                                          (_, n) => n !== i,
                                        ),
                                      });
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {"heading" in s && (
                              <label>
                                Heading
                                <input
                                  value={s.heading}
                                  maxLength={160}
                                  onChange={(e) =>
                                    sectionChange(i, {
                                      ...s,
                                      heading: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            )}
                            {"text" in s && (
                              <label>
                                Text
                                <textarea
                                  value={s.text}
                                  maxLength={s.type === "hero" ? 1000 : 5000}
                                  onChange={(e) =>
                                    sectionChange(i, {
                                      ...s,
                                      text: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            )}
                            {s.type === "cta" && (
                              <>
                                <label>
                                  Button text
                                  <input
                                    value={s.label}
                                    maxLength={80}
                                    onChange={(e) =>
                                      sectionChange(i, {
                                        ...s,
                                        label: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Link
                                  <input
                                    value={s.href}
                                    maxLength={500}
                                    onChange={(e) =>
                                      sectionChange(i, {
                                        ...s,
                                        href: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                            {s.type === "image" && (
                              <>
                                {mediaSelect("Image", s.path, (path) => {
                                  if (path) sectionChange(i, { ...s, path });
                                })}
                                <label>
                                  Image description (alt text)
                                  <input
                                    value={s.alt}
                                    maxLength={160}
                                    onChange={(e) =>
                                      sectionChange(i, {
                                        ...s,
                                        alt: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                            {s.type === "cards" && (
                              <>
                                {s.items.map((item, n) => (
                                  <div className="oe-section" key={n}>
                                    <label>
                                      Card title
                                      <input
                                        value={item.title}
                                        maxLength={100}
                                        onChange={(e) =>
                                          sectionChange(i, {
                                            ...s,
                                            items: s.items.map((x, j) =>
                                              j === n
                                                ? {
                                                    ...x,
                                                    title: e.target.value,
                                                  }
                                                : x,
                                            ),
                                          })
                                        }
                                      />
                                    </label>
                                    <label>
                                      Card text
                                      <textarea
                                        value={item.text}
                                        maxLength={400}
                                        onChange={(e) =>
                                          sectionChange(i, {
                                            ...s,
                                            items: s.items.map((x, j) =>
                                              j === n
                                                ? { ...x, text: e.target.value }
                                                : x,
                                            ),
                                          })
                                        }
                                      />
                                    </label>
                                    <button
                                      disabled={s.items.length === 1}
                                      onClick={() =>
                                        sectionChange(i, {
                                          ...s,
                                          items: s.items.filter(
                                            (_, j) => j !== n,
                                          ),
                                        })
                                      }
                                    >
                                      Remove card
                                    </button>
                                  </div>
                                ))}
                                <button
                                  disabled={s.items.length >= 8}
                                  onClick={() =>
                                    sectionChange(i, {
                                      ...s,
                                      items: [
                                        ...s.items,
                                        { title: "New card", text: "" },
                                      ],
                                    })
                                  }
                                >
                                  Add card
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        <div className="oe-actions">
                          {(
                            [
                              "hero",
                              "richText",
                              "image",
                              "cta",
                              "cards",
                            ] as const
                          ).map((t) => (
                            <button
                              key={t}
                              disabled={
                                current.sections.length >= 30 ||
                                (t === "hero" &&
                                  current.sections.some(
                                    (s) => s.type === "hero",
                                  ))
                              }
                              onClick={() => addSection(t)}
                            >
                              + {t === "richText" ? "Text" : t}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </fieldset>
                </div>
                <div className="oe-panel">
                  <h3>Add a page</h3>
                  <fieldset
                    disabled={!manage || busy || draft.pages.length >= 50}
                  >
                    <div className="oe-grid">
                      <label>
                        Title
                        <input
                          value={pageName}
                          onChange={(e) => {
                            setPageName(e.target.value);
                            setPageSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-|-$/g, ""),
                            );
                          }}
                        />
                      </label>
                      <label>
                        Address
                        <input
                          value={pageSlug}
                          onChange={(e) => setPageSlug(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="oe-actions">
                      <button onClick={() => addPage()}>Create page</button>
                      <button onClick={() => addPage(true)}>
                        Duplicate selected page
                      </button>
                    </div>
                  </fieldset>
                </div>
              </>
            )}
            {tab === "Navigation" && (
              <div className="oe-panel">
                <p>
                  Order pages and choose which are public. Hidden pages are
                  excluded from navigation, sitemap, and public rendering.
                </p>
                <fieldset disabled={!manage || busy}>
                  {draft.pages.map((p, i) => (
                    <div className="oe-row oe-nav-row" key={p.slug}>
                      <strong>{p.title}</strong>
                      <label>
                        <input
                          type="checkbox"
                          checked={p.visible}
                          disabled={p.slug === "home"}
                          onChange={(e) =>
                            update({
                              pages: draft.pages.map((x) =>
                                x.slug === p.slug
                                  ? { ...x, visible: e.target.checked }
                                  : x,
                              ),
                            })
                          }
                        />{" "}
                        Public
                      </label>
                      <div className="oe-actions">
                        {[-1, 1].map((delta) => (
                          <button
                            key={delta}
                            aria-label={`Move ${p.title} ${delta < 0 ? "up" : "down"}`}
                            disabled={
                              i + delta < 0 || i + delta >= draft.pages.length
                            }
                            onClick={() => {
                              const ps = [...draft.pages];
                              [ps[i], ps[i + delta]] = [ps[i + delta], ps[i]];
                              update({
                                pages: ps.map((x, n) => ({
                                  ...x,
                                  navOrder: n,
                                })),
                              });
                            }}
                          >
                            {delta < 0 ? "↑" : "↓"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </fieldset>
              </div>
            )}
            {tab === "Theme" && (
              <div className="oe-panel">
                <fieldset disabled={!manage || busy}>
                  <label>
                    Site name
                    <input
                      value={draft.siteName}
                      maxLength={120}
                      onChange={(e) => update({ siteName: e.target.value })}
                    />
                  </label>
                  <div className="oe-grid">
                    {(["primary", "secondary", "accent"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          type="color"
                          value={draft.theme[k]}
                          onChange={(e) =>
                            update({
                              theme: { ...draft.theme, [k]: e.target.value },
                            })
                          }
                        />
                        <span
                          style={{
                            display: "block",
                            padding: ".5rem",
                            background: draft.theme[k],
                            color: contrastText(draft.theme[k]),
                          }}
                        >
                          Automatic readable text
                        </span>
                      </label>
                    ))}
                  </div>
                  <label>
                    Surface
                    <select
                      value={draft.theme.surface}
                      onChange={(e) =>
                        update({
                          theme: {
                            ...draft.theme,
                            surface: e.target.value as "light" | "dark",
                          },
                        })
                      }
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label>
                    Typography
                    <select
                      value={draft.settings.typography}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...draft.settings,
                            typography: e.target.value as
                              "sans" | "serif" | "humanist",
                          },
                        })
                      }
                    >
                      <option value="sans">Modern sans</option>
                      <option value="serif">Editorial serif</option>
                      <option value="humanist">Friendly humanist</option>
                    </select>
                  </label>
                  {mediaSelect("Logo", draft.logoPath, (logoPath) =>
                    update({ logoPath }),
                  )}
                </fieldset>
                <p>
                  Text colors are selected automatically for readable contrast.
                </p>
              </div>
            )}
            {tab === "Media" && (
              <>
                <div className="oe-panel">
                  <p>
                    Private until used by a publication. PNG, JPEG, or WebP, up
                    to 2 MB, 16–3000 pixels. Images are re-encoded and metadata
                    is removed.
                  </p>
                  <label>
                    Upload an image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={!manage || busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f)
                          void perform(async () => {
                            if (f.size > 2097152)
                              throw new Error("Use an image under 2 MB.");
                            const r = await fetch(
                              `/api/omnisite/media?teamId=${teamId}&siteId=${draft.siteId}`,
                              {
                                method: "POST",
                                headers: {
                                  ...(await authHeaders()),
                                  "Content-Type": f.type,
                                  "X-File-Extension":
                                    f.name.split(".").pop() ?? "",
                                },
                                body: f,
                              },
                            );
                            const result = await r.json();
                            if (!r.ok) throw new Error(result.error);
                            await refreshMedia(teamId, draft.siteId);
                            setMessage(
                              "Image uploaded. Choose it in Theme, SEO, or an image section.",
                            );
                          });
                      }}
                    />
                  </label>
                </div>
                <div className="oe-grid">
                  {assets.map((a, i) => (
                    <article className="oe-panel oe-media" key={a.id}>
                      {a.state === "READY" && (
                        <img
                          src={mediaUrl(draft.slug, a.object_path, true)}
                          alt={`Uploaded image ${i + 1}`}
                        />
                      )}
                      <p>
                        Image {i + 1} · {Math.round(a.bytes / 1024)} KB ·{" "}
                        {a.state.toLowerCase()}
                      </p>
                      <button
                        disabled={!manage || busy}
                        className="danger"
                        onClick={() => {
                          if (
                            confirm(
                              "Delete this image? Images used in saved drafts or publication history are retained.",
                            )
                          )
                            void perform(async () => {
                              const r = await fetch(
                                `/api/omnisite/media?teamId=${teamId}&siteId=${draft.siteId}&assetId=${a.id}`,
                                {
                                  method: "DELETE",
                                  headers: await authHeaders(),
                                },
                              );
                              const result = await r.json();
                              if (!r.ok) throw new Error(result.error);
                              await refreshMedia(teamId, draft.siteId);
                              setMessage("Image removed.");
                            });
                        }}
                      >
                        Delete image
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
            {tab === "SEO" && (
              <div className="oe-panel">
                <fieldset disabled={!manage || busy}>
                  <label>
                    Home search title
                    <input
                      value={draft.settings.seoTitle}
                      maxLength={120}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...draft.settings,
                            seoTitle: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Site description
                    <textarea
                      value={draft.settings.seoDescription}
                      maxLength={300}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...draft.settings,
                            seoDescription: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  {mediaSelect(
                    "Favicon",
                    draft.settings.faviconPath,
                    (faviconPath) =>
                      update({ settings: { ...draft.settings, faviconPath } }),
                  )}
                  {mediaSelect(
                    "Social sharing image",
                    draft.settings.socialImagePath,
                    (socialImagePath) =>
                      update({
                        settings: { ...draft.settings, socialImagePath },
                      }),
                  )}
                  <label>
                    Page
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {draft.pages.map((p) => (
                        <option value={p.slug} key={p.slug}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {current && (
                    <label>
                      Page description
                      <textarea
                        value={current.seoDescription}
                        maxLength={300}
                        onChange={(e) =>
                          updatePage({ seoDescription: e.target.value })
                        }
                      />
                    </label>
                  )}
                </fieldset>
                <p>
                  Page titles are used as search titles. Contact details are
                  public only when you write them here; no family records are
                  imported.
                </p>
              </div>
            )}
            {tab === "Preview" && (
              <>
                <p>This private preview includes your unsaved changes.</p>
                <PreviewWidth width={width} setWidth={setWidth} />
                <div className="oe-preview">
                  <div
                    className="oe-preview-frame"
                    style={{ width, maxWidth: "100%" }}
                  >
                    {snapshotSchema.safeParse(draft).success ? (
                      <SiteView
                        site={draft}
                        pageSlug={selected}
                        preview
                        onPage={setSelected}
                      />
                    ) : (
                      <p>Fix validation errors before previewing this draft.</p>
                    )}
                  </div>
                </div>
              </>
            )}
            {tab === "Publishing" && (
              <>
                <div className="oe-panel">
                  <h3>
                    {version ? `Publication ${version}` : "Ready when you are"}
                  </h3>
                  <p>
                    <a
                      href={`/sites/${draft.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open website ↗
                    </a>
                  </p>
                  <p>
                    {dirty
                      ? "Save your draft before publishing."
                      : "Publishing makes the saved content visible atomically."}
                  </p>
                  <div className="oe-actions">
                    <button
                      className="primary"
                      disabled={!manage || busy || dirty}
                      onClick={() =>
                        perform(async () => {
                          const v = await command({
                            action: "publish",
                            teamId,
                            siteId: draft.siteId,
                            revision,
                            version,
                          });
                          await load(teamId);
                          setMessage(`Published version ${v}.`);
                        })
                      }
                    >
                      Publish saved draft
                    </button>
                    <button
                      disabled={!manage || busy}
                      onClick={() => {
                        if (
                          confirm(
                            enabled
                              ? "Take the website offline? Retained content stays private."
                              : "Make the active publication available again?",
                          )
                        )
                          void perform(async () => {
                            await command({
                              action: "enabled",
                              teamId,
                              siteId: draft.siteId,
                              enabled: !enabled,
                            });
                            setEnabled(!enabled);
                            setMessage("Website availability updated.");
                          });
                      }}
                    >
                      {enabled ? "Take offline" : "Enable website"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          !dirty ||
                          confirm("Discard unsaved changes and reload?")
                        )
                          void perform(() => load(teamId));
                      }}
                    >
                      Reload saved draft
                    </button>
                  </div>
                </div>
                <div className="oe-panel">
                  <h3>Publication history</h3>
                  {history.length === 0 ? (
                    <p>No publications yet.</p>
                  ) : (
                    history.map((p) => (
                      <div className="oe-row oe-nav-row" key={p.version}>
                        <span>
                          <strong>Version {p.version}</strong> ·{" "}
                          {new Date(p.published_at).toLocaleString()} · Draft{" "}
                          {p.source_revision ?? "legacy"}
                        </span>
                        <button
                          disabled={!manage || busy || dirty}
                          onClick={() => {
                            if (
                              confirm(
                                `Publish a new copy of version ${p.version}? Your saved draft stays as it is.`,
                              )
                            )
                              void perform(async () => {
                                await command({
                                  action: "publish",
                                  teamId,
                                  siteId: draft.siteId,
                                  revision,
                                  version,
                                  sourceVersion: p.version,
                                });
                                await load(teamId);
                                setMessage(
                                  "Earlier publication restored as a new version.",
                                );
                              });
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            {tab === "Domains" && (
              <>
                <div className="oe-panel">
                  <h3>Connect your domain</h3>
                  <p>
                    Your fallback address is /sites/{draft.slug}. Managed
                    subdomains become available after your platform
                    administrator configures the hosting domain.
                  </p>
                  <label>
                    Custom hostname
                    <input
                      disabled={!manage || busy}
                      placeholder="www.example-swim.org"
                      value={hostname}
                      onChange={(e) => setHostname(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!manage || busy || dirty}
                    onClick={() => domainOp("claim")}
                  >
                    Claim domain
                  </button>
                  <p>
                    Ownership verification and hosting activation are separate
                    steps. Both must complete before visitors can use the
                    domain.
                  </p>
                </div>
                {domains.map((d) => (
                  <div className="oe-panel" key={d.id}>
                    <h3>
                      {d.hostname}
                      {d.is_primary ? " · Primary" : ""}
                    </h3>
                    <p>
                      {d.detached_at
                        ? "Detached (claim retained for safety)"
                        : `${d.verification_status.toLowerCase()} ownership · ${d.provider_status.toLowerCase()} hosting · ${d.active ? "active" : "inactive"}`}
                    </p>
                    {!d.detached_at && (
                      <>
                        <p>Create a DNS TXT record:</p>
                        <p>
                          <code>_omnisite.{d.hostname}</code>
                        </p>
                        <p>
                          <code>
                            omnisite-verification={d.verification_token}
                          </code>
                        </p>
                        <p className="oe-note">
                          Use the exact record name your DNS provider expects.
                          DNS changes may take time. Ask your administrator to
                          attach this domain and confirm TLS, then activate.
                        </p>
                        {d.last_error && <p>{d.last_error}</p>}
                        <div className="oe-actions">
                          {(
                            [
                              "verify",
                              "renew",
                              "activate",
                              "primary",
                              "detach",
                            ] as const
                          ).map((op) => (
                            <button
                              key={op}
                              disabled={!manage || busy || dirty}
                              onClick={() => {
                                if (
                                  !["renew", "detach"].includes(op) ||
                                  confirm(
                                    `${op === "detach" ? "Detach this domain" : "Replace its verification token"}? This takes the domain offline.`,
                                  )
                                )
                                  void domainOp(op, d.id);
                              }}
                            >
                              {
                                {
                                  verify: "Check TXT",
                                  renew: "New token",
                                  activate: "Activate",
                                  primary: "Set primary",
                                  detach: "Detach",
                                }[op]
                              }
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
      {!teamId && (
        <div className="oe-empty">
          <Link href="/subscribe">Choose an OmniSite plan</Link> ·{" "}
          <Link href="/dashboard">Sign in / Dashboard</Link>
        </div>
      )}
    </div>
  );
}
function PreviewWidth({
  width,
  setWidth,
}: {
  width: string;
  setWidth: (s: string) => void;
}) {
  return (
    <div className="oe-actions" aria-label="Preview size">
      {[
        ["100%", "Desktop"],
        ["768px", "Tablet"],
        ["375px", "Mobile"],
      ].map(([value, label]) => (
        <button
          key={value}
          aria-pressed={width === value}
          onClick={() => setWidth(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
