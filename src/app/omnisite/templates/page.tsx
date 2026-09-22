"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  templateSchema,
  type SitePage,
  type SiteTheme,
} from "@/modules/omnisite/model";
import { SiteView } from "@/modules/omnisite/SiteView";
import "@/modules/omnisite/editor.css";
type Template = {
  id: string;
  name: string;
  layout_key: "classic" | "bold" | "minimal";
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  starter_pages: SitePage[];
  default_theme: SiteTheme;
  version: number;
};
const starter: SitePage[] = [
  {
    slug: "home",
    title: "Home",
    navOrder: 0,
    seoDescription: "",
    visible: true,
    sections: [
      {
        type: "hero",
        heading: "Swim together. Grow together.",
        text: "A welcoming community, in and out of the water.",
      },
    ],
  },
  {
    slug: "about",
    title: "About",
    navOrder: 1,
    seoDescription: "",
    visible: true,
    sections: [
      { type: "richText", heading: "Our team", text: "Introduce your team." },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    navOrder: 2,
    seoDescription: "",
    visible: true,
    sections: [
      {
        type: "richText",
        heading: "Get in touch",
        text: "Add public team contact information.",
      },
    ],
  },
];
export default function TemplateManager() {
  const client = useMemo(() => {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL,
      k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return u && k ? createBrowserClient(u, k) : null;
  }, []);
  const [list, setList] = useState<Template[]>([]),
    [selected, setSelected] = useState<Template | null>(null),
    [json, setJson] = useState(""),
    [message, setMessage] = useState("Checking catalog access…"),
    [allowed, setAllowed] = useState(false),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [width, setWidth] = useState("100%"),
    [baseline, setBaseline] = useState("");
  const dirty = !!selected && JSON.stringify({ selected, json }) !== baseline;
  const refresh = useCallback(async () => {
    if (!client) return;
    const r = await client
      .from("site_templates")
      .select("*")
      .order("created_at");
    if (r.error) throw new Error("Unable to load templates.");
    setList(r.data ?? []);
  }, [client]);
  useEffect(() => {
    async function init() {
      if (!client) return;
      const r = await client.rpc("can_write_site_catalog");
      if (r.error || !r.data) {
        setMessage(
          "Explicit platform catalog-write access is required. End any read-only support session before editing the catalog.",
        );
        return;
      }
      setAllowed(true);
      await refresh();
      setMessage(
        "Shared templates use sample content only. Existing team sites are never changed.",
      );
    }
    void init().catch((e) => setMessage(e.message));
  }, [client, refresh]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  function choose(t: Template) {
    if (dirty && !confirm("Discard unsaved template changes?")) return;
    setSelected(t);
    const text = JSON.stringify(t.starter_pages, null, 2);
    setJson(text);
    setBaseline(JSON.stringify({ selected: t, json: text }));
  }
  function content() {
    return selected
      ? templateSchema.parse({
          name: selected.name,
          layout_key: selected.layout_key,
          status: selected.status,
          default_theme: selected.default_theme,
          starter_pages: JSON.parse(json),
        })
      : null;
  }
  async function save(status?: Template["status"]) {
    if (!client || !selected) return;
    setBusy(true);
    try {
      const value = content();
      if (!value) return;
      const session = await client.auth.getSession();
      const r = await fetch("/api/omnisite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "template",
          templateId: selected.id || null,
          version: selected.version,
          content: { ...value, status: status ?? selected.status },
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await refresh();
      const row = await client
        .from("site_templates")
        .select("*")
        .eq("id", result.data)
        .single();
      if (row.error) throw row.error;
      setSelected(row.data);
      const text = JSON.stringify(row.data.starter_pages, null, 2);
      setJson(text);
      setBaseline(JSON.stringify({ selected: row.data, json: text }));
      setMessage("Template saved. Existing sites are unchanged.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Fix template content and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  let valid: ReturnType<typeof content> = null;
  try {
    valid = content();
  } catch {}
  return (
    <div className="oe">
      <header className="oe-top">
        <Link href="/platform">← Platform console</Link>
        <h1>OmniSite template catalog</h1>
      </header>
      <div className="oe-status" role="status">
        {message}
      </div>
      {allowed && (
        <div className="oe-content">
          <div className="oe-panel">
            <label>
              Template
              <select
                value={selected?.id ?? ""}
                onChange={(e) => {
                  const t = list.find((t) => t.id === e.target.value);
                  if (t) choose(t);
                }}
              >
                <option value="">Select template</option>
                {list.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.status.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="oe-actions">
              <button
                onClick={() =>
                  choose({
                    id: "",
                    name: "New swim team template",
                    layout_key: "classic",
                    status: "DRAFT",
                    starter_pages: starter,
                    default_theme: DEFAULT_THEME,
                    version: 0,
                  })
                }
              >
                Create template
              </button>
              <button
                disabled={!selected}
                onClick={() => {
                  if (selected)
                    choose({
                      ...selected,
                      id: "",
                      name: `${selected.name} copy`,
                      status: "DRAFT",
                      version: 0,
                    });
                }}
              >
                Duplicate
              </button>
            </div>
          </div>
          {selected && (
            <div className="oe-panel">
              <fieldset disabled={busy}>
                <label>
                  Name
                  <input
                    value={selected.name}
                    maxLength={120}
                    onChange={(e) =>
                      setSelected({ ...selected, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Layout
                  <select
                    value={selected.layout_key}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        layout_key: e.target.value as Template["layout_key"],
                      })
                    }
                  >
                    {["classic", "bold", "minimal"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <div className="oe-grid">
                  {(["primary", "secondary", "accent"] as const).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="color"
                        value={selected.default_theme[k]}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            default_theme: {
                              ...selected.default_theme,
                              [k]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Starter pages (validated JSON)
                  <textarea
                    rows={20}
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                  />
                </label>
                <p>
                  Only supported structured sections are allowed. Shared
                  templates cannot reference tenant images.
                </p>
                <div className="oe-actions">
                  <button onClick={() => save()}>Save</button>
                  <button className="primary" onClick={() => save("PUBLISHED")}>
                    Publish
                  </button>
                  <button onClick={() => save("DRAFT")}>Unpublish</button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Retire this template from the catalog? Existing sites are retained.",
                        )
                      )
                        void save("RETIRED");
                    }}
                  >
                    Retire
                  </button>
                  <button
                    disabled={!valid}
                    onClick={() => setPreview(!preview)}
                  >
                    Preview
                  </button>
                </div>
              </fieldset>
            </div>
          )}
          {preview && valid && (
            <>
              <div className="oe-actions">
                {[
                  ["100%", "Desktop"],
                  ["768px", "Tablet"],
                  ["375px", "Mobile"],
                ].map(([w, label]) => (
                  <button
                    key={w}
                    aria-pressed={width === w}
                    onClick={() => setWidth(w)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="oe-preview">
                <div
                  className="oe-preview-frame"
                  style={{ width, maxWidth: "100%" }}
                >
                  <SiteView
                    site={{
                      schemaVersion: 2,
                      slug: "sample",
                      siteName: valid.name,
                      layout: valid.layout_key,
                      theme: valid.default_theme,
                      settings: DEFAULT_SETTINGS,
                      logoPath: null,
                      pages: valid.starter_pages,
                    }}
                    preview
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
