import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { snapshotSchema } from "@/modules/omnisite/model";
import { SiteView } from "@/modules/omnisite/SiteView";
export const dynamic = "force-dynamic";
export default async function PublicSitePage({ params }: { params: Promise<{slug: string; pageSlug: string}> }) {
  const {slug,pageSlug}=await params;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) notFound();
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const {data,error}=await client.rpc("get_public_site",{requested_slug:slug});
  const parsed=snapshotSchema.safeParse(data);
  if(error || !parsed.success || !parsed.data.pages.some(p=>p.slug===pageSlug && p.visible)) notFound();
  return <SiteView site={parsed.data} pageSlug={pageSlug}/>;
}
