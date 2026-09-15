import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { snapshotSchema } from "@/modules/omnisite/model";
import { SiteView } from "@/modules/omnisite/SiteView";

async function getSite(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await client.rpc("get_public_site", { requested_slug: slug });
  if (error) return null;
  const parsed = snapshotSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{slug: string}> }): Promise<Metadata> {
  const { slug } = await params; const site = await getSite(slug);
  return { title: site?.siteName ?? "Site unavailable", description: site?.pages.find(p => p.slug === "home")?.seoDescription ?? "" };
}
export default async function PublicSite({ params }: { params: Promise<{slug: string}> }) {
  const { slug } = await params; const site = await getSite(slug);
  if (!site) notFound();
  return <SiteView site={site} />;
}
