import type { SupabaseClient } from "@supabase/supabase-js";
// List recursively without mutating pagination. Team prefix is validated by each caller.
export async function listSiteObjects(
  client: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage
      .from("omnisite-assets")
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) paths.push(path);
      else paths.push(...(await listSiteObjects(client, path)));
    }
    if ((data ?? []).length < 1000) break;
  }
  return paths;
}
