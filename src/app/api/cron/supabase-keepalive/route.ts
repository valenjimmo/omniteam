import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (let query = 0; query < 3; query++) {
    const { error } = await supabase
      .from("team_registration_settings")
      .select("team_id")
      .limit(1);

    if (error) {
      console.error("Supabase keep-alive query failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json({ error: "Supabase query failed" }, { status: 503 });
    }
  }

  return Response.json({ ok: true, queries: 3 });
}
