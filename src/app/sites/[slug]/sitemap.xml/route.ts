import { loadPublicSite } from "@/modules/omnisite/server/public";
export const dynamic = "force-dynamic";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { site, canonicalBase } = await loadPublicSite(
    (await params).slug,
    "home",
    false,
  );
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site.pages
      .filter((p) => p.visible)
      .map(
        (p) =>
          `<url><loc>${escape(canonicalBase + (p.slug === "home" ? "/" : `/${p.slug}`))}</loc></url>`,
      )
      .join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
