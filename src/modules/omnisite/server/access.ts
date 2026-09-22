import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-auth";
import { z } from "zod";
export { createSupabaseAdminClient };
export async function siteAccess(
  request: Request,
  teamId: string,
  manage = true,
  limit: "write" | "upload" | "dns" = "write",
) {
  z.string().uuid().parse(teamId);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (
    request.method !== "GET" &&
    !token &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    throw new Error("Access denied");
  const client = token
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        },
      )
    : await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to continue.");
  const check = await client.rpc(
    manage ? "can_manage_omnisite" : "can_view_omnisite",
    { target_team_id: teamId },
  );
  if (check.error || !check.data) throw new Error("Access denied");
  if (request.method !== "GET") {
    const r = await client.rpc("os_take_limit", {
      target_team_id: teamId,
      action_name: limit,
    });
    if (r.error || !r.data)
      throw new Error("Too many requests. Try again later.");
  }
  return { client, userId: data.user.id };
}
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 500000) {
      await reader.cancel();
      throw new Error("Request too large.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function apiError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const message =
    /Draft changed|Website changed|Template changed|Asset is retained|Domain limit|Media limit|Verify DNS|Verification expired/.test(
      raw,
    )
      ? raw
      : error instanceof z.ZodError
        ? error.issues[0]?.message
        : /Access denied|Sign in|Too many|under 2 MB|static PNG|too large|hostname|reserved/.test(
              raw,
            )
          ? raw
          : "The request could not be completed. Check your input and access, then try again.";
  console.warn(
    JSON.stringify({
      event: "omnisite_request_rejected",
      kind: error instanceof z.ZodError ? "validation" : "operation",
    }),
  );
  return Response.json(
    { error: message },
    {
      status: /Access denied/.test(raw)
        ? 403
        : /Sign in/.test(raw)
          ? 401
          : /changed/.test(raw)
            ? 409
            : /Too many/.test(raw)
              ? 429
              : 400,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
