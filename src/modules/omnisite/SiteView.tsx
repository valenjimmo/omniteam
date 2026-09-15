import Link from "next/link";
import { contrastText, logoPublicUrl, type SiteSnapshot, type SiteSection } from "./model";
import "./site.css";

function Section({ section }: { section: SiteSection }) {
  if (section.type === "hero") return <section className="os-hero"><h1>{section.heading}</h1><p>{section.text}</p></section>;
  if (section.type === "richText") return <section className="os-section"><h2>{section.heading}</h2><p>{section.text}</p></section>;
  if (section.type === "image") return <section className="os-section"><img src={section.url} alt={section.alt} className="os-image" /></section>;
  if (section.type === "cta") return <section className="os-section os-cta"><h2>{section.heading}</h2><a href={section.href}>{section.label}</a></section>;
  return <section className="os-section"><h2>{section.heading}</h2><div className="os-cards">{section.items.map((item, i) => <article key={i}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>;
}
export function SiteView({ site, pageSlug = "home", preview = false }: { site: SiteSnapshot; pageSlug?: string; preview?: boolean }) {
  const page = site.pages.find((p) => p.slug === pageSlug && (preview || p.visible));
  if (!page) return null;
  const base = `/sites/${site.slug}`;
  const logo = logoPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", site.logoPath);
  return <div className={`os-site os-${site.layout} os-${site.theme.surface}`} style={{
    "--os-primary": site.theme.primary, "--os-secondary": site.theme.secondary,
    "--os-accent": site.theme.accent, "--os-on-primary": contrastText(site.theme.primary),
  } as React.CSSProperties}>
    <header className="os-header"><Link href={base} className="os-brand">{logo && <img src={logo} alt="" />}{site.siteName}</Link>
      <nav aria-label="Site navigation">{site.pages.filter((p) => preview || p.visible).sort((a, b) => a.navOrder - b.navOrder).map((p) =>
        <Link key={p.slug} href={p.slug === "home" ? base : `${base}/${p.slug}`}>{p.title}</Link>)}</nav></header>
    {preview && <div className="os-preview-banner">Draft preview — visitors cannot see these changes</div>}
    <main>{page.sections.map((section, i) => <Section key={i} section={section} />)}</main>
    <footer className="os-footer">© {new Date().getFullYear()} {site.siteName}</footer>
  </div>;
}
