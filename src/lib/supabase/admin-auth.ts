import 'server-only';
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";

export async function requirePlatformOwner(authorization: string | null): Promise<{ client: SupabaseClient; userId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const client = bearer
    ? createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } })
    : await createSupabaseServerClient();
  const { data: auth, error: authError } = await client.auth.getUser(bearer);
  if (authError || !auth.user) throw new Error("Authentication required");
  const { data: isOwner, error: ownerError } = await client.rpc("is_platform_owner");
  if (ownerError || !isOwner) throw new Error("Platform-owner access required");
  return { client, userId: auth.user.id };
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Server-side Supabase administration is not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
