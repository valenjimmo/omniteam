import { SiteView } from "@/modules/omnisite/SiteView";
import {
  loadPublicSite,
  publicMetadata,
} from "@/modules/omnisite/server/public";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return publicMetadata((await params).slug);
}
export default async function PublicSite({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { site, basePath } = await loadPublicSite((await params).slug);
  return <SiteView site={site} basePath={basePath} />;
}
