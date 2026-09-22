import { loadPublicSite } from "@/modules/omnisite/server/public";
export const dynamic = "force-dynamic";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { canonicalBase } = await loadPublicSite(
    (await params).slug,
    "home",
    false,
  );
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${canonicalBase}/sitemap.xml\n`,
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
