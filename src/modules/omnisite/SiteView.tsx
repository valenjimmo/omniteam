import {
  contrastText,
  mediaUrl,
  type DisplaySnapshot,
  type SiteSection,
} from "./model";
import "./site.css";
function RichText({
  section,
  base,
}: {
  section: Extract<SiteSection, { type: "richText" }>;
  base: string;
}) {
  if (!section.blocks) return <p>{section.text}</p>;
  return section.blocks.map((block, blockIndex) => (
    <p key={blockIndex}>
      {block.children.map((span, spanIndex) => {
        let content: React.ReactNode = span.text;
        if (span.marks.includes("italic")) content = <em>{content}</em>;
        if (span.marks.includes("bold")) content = <strong>{content}</strong>;
        return span.href ? (
          <a key={spanIndex} href={localHref(span.href, base)}>
            {content}
          </a>
        ) : (
          <span key={spanIndex}>{content}</span>
        );
      })}
    </p>
  ));
}
function localHref(href: string, base: string) {
  return href.startsWith("/")
    ? `${base}${href === "/home" || href === "/" ? "/" : href}`
    : href;
}
function Section({
  section,
  site,
  base,
  preview,
  heroSeen,
}: {
  section: SiteSection;
  site: DisplaySnapshot;
  base: string;
  preview: boolean;
  heroSeen: boolean;
}) {
  if (section.type === "hero")
    return (
      <section className="os-hero">
        <span className="os-eyebrow">{site.siteName} • Find your lane</span>
        {heroSeen ? <h2>{section.heading}</h2> : <h1>{section.heading}</h1>}
        <p>{section.text}</p>
        <div className="os-waterlines" aria-hidden="true" />
      </section>
    );
  if (section.type === "richText")
    return (
      <section className="os-section">
        <h2>{section.heading}</h2>
        <RichText section={section} base={base} />
      </section>
    );
  if (section.type === "image")
    return (
      <section className="os-section">
        <img
          src={mediaUrl(site.slug, section.path, preview)}
          alt={section.alt}
          className="os-image"
          loading="lazy"
        />
      </section>
    );
  if (section.type === "cta")
    return (
      <section className="os-section os-cta">
        <h2>{section.heading}</h2>
        <a href={preview ? "#preview" : localHref(section.href, base)}>
          {section.label}
          <span aria-hidden="true"> ↗</span>
        </a>
      </section>
    );
  if (section.type === "newsList")
    return (
      <section className="os-section">
        <h2>{section.heading}</h2>
        <div className="os-feed">
          {section.items.map((item, i) => (
            <article key={i}>
              <time dateTime={item.publishedDate}>{item.publishedDate}</time>
              <h3>
                {item.href ? (
                  <a href={localHref(item.href, base)}>{item.title}</a>
                ) : (
                  item.title
                )}
              </h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>
    );
  if (section.type === "eventsList")
    return (
      <section className="os-section">
        <h2>{section.heading}</h2>
        <div className="os-feed os-events">
          {section.items.map((item, i) => (
            <article key={i}>
              <time
                dateTime={`${item.date}${item.time ? `T${item.time}` : ""}`}
              >
                {item.date}
                {item.time ? ` · ${item.time}` : ""}
              </time>
              <h3>
                {item.href ? (
                  <a href={localHref(item.href, base)}>{item.title}</a>
                ) : (
                  item.title
                )}
              </h3>
              {item.location && <p className="os-location">{item.location}</p>}
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>
    );
  return (
    <section className="os-section">
      <h2>{section.heading}</h2>
      <div className="os-cards">
        {section.items.map((item, i) => (
          <article key={i}>
            <span className="os-card-number" aria-hidden="true">
              0{i + 1}
            </span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function SiteView({
  site,
  pageSlug = "home",
  preview = false,
  basePath,
  onPage,
}: {
  site: DisplaySnapshot;
  pageSlug?: string;
  preview?: boolean;
  basePath?: string;
  onPage?: (slug: string) => void;
}) {
  const page = site.pages.find(
    (p) => p.slug === pageSlug && (preview || p.visible),
  );
  if (!page) return null;
  const base = basePath ?? `/sites/${site.slug}`;
  return (
    <div
      id="preview"
      className={`os-site os-${site.layout} os-${site.theme.surface} os-font-${site.settings.typography}`}
      style={
        {
          "--os-primary": site.theme.primary,
          "--os-secondary": site.theme.secondary,
          "--os-accent": site.theme.accent,
          "--os-on-primary": contrastText(site.theme.primary),
          "--os-on-secondary": contrastText(site.theme.secondary),
          "--os-on-accent": contrastText(site.theme.accent),
        } as React.CSSProperties
      }
    >
      <a className="os-skip" href="#site-content">
        Skip to content
      </a>
      <header className="os-header">
        <a href={preview ? "#preview" : base || "/"} className="os-brand">
          {site.logoPath && (
            <img src={mediaUrl(site.slug, site.logoPath, preview)} alt="" />
          )}
          {site.siteName}
        </a>
        <nav aria-label="Site navigation">
          {site.pages
            .filter((p) => p.visible)
            .slice()
            .sort((a, b) => a.navOrder - b.navOrder)
            .map((p) =>
              preview ? (
                <button
                  key={p.slug}
                  onClick={() => onPage?.(p.slug)}
                  aria-current={p.slug === pageSlug ? "page" : undefined}
                >
                  {p.title}
                </button>
              ) : (
                <a
                  key={p.slug}
                  aria-current={p.slug === pageSlug ? "page" : undefined}
                  href={p.slug === "home" ? base || "/" : `${base}/${p.slug}`}
                >
                  {p.title}
                </a>
              ),
            )}
        </nav>
      </header>
      {preview && (
        <div className="os-preview-banner">
          Private preview · Saved drafts are not public
        </div>
      )}
      <main id="site-content">
        {!page.sections.some((s) => s.type === "hero" && !s.hidden) && (
          <h1 className="os-page-title">{page.title}</h1>
        )}
        {page.sections
          .filter((s) => !s.hidden)
          .map((s, i) => (
            <Section
              key={i}
              section={s}
              site={site}
              base={base}
              preview={preview}
              heroSeen={page.sections
                .filter((s) => !s.hidden)
                .slice(0, i)
                .some((s) => s.type === "hero")}
            />
          ))}
      </main>
      <footer className="os-footer">
        <strong>{site.siteName}</strong>
        <span>
          © {new Date().getFullYear()} · Built for the water. Together.
        </span>
      </footer>
    </div>
  );
}
