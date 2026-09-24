import { NextResponse } from "next/server";
import { publicClient } from "@/modules/omnisite/resolver";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const publicHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slugPattern.test(slug))
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404, headers: publicHeaders },
    );

  const db = publicClient();
  if (!db)
    return NextResponse.json(
      { error: "Public events are unavailable" },
      { status: 503, headers: publicHeaders },
    );

  const { data, error } = await db
    .from("vw_public_upcoming_events")
    .select("id,title,starts_at,location")
    .eq("org_slug", slug)
    .order("starts_at", { ascending: true })
    .limit(10);

  if (error)
    return NextResponse.json(
      { error: "Public events are unavailable" },
      { status: 503, headers: publicHeaders },
    );

  return NextResponse.json({ events: data ?? [] }, { headers: publicHeaders });
}

