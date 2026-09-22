import { SiteView } from "@/modules/omnisite/SiteView";
import {
  loadPublicSite,
  publicMetadata,
} from "@/modules/omnisite/server/public";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  return publicMetadata(slug, pageSlug);
}
export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const { site, basePath } = await loadPublicSite(slug, pageSlug);
  return <SiteView site={site} basePath={basePath} pageSlug={pageSlug} />;
}
