import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ status: "not_configured" }, { status: 503 });

  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("team_registration_settings").select("team_id").limit(1);
    if (error) return NextResponse.json({ status: "database_unavailable" }, { status: 503 });
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "database_unavailable" }, { status: 503 });
  }
}
