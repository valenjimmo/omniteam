import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  assetPaths,
  objectPath,
  slugSchema,
  publicSnapshotSchema,
  mediaHandle,
} from "@/modules/omnisite/model";
import {
  apiError,
  createSupabaseAdminClient,
  siteAccess,
} from "@/modules/omnisite/server/access";
import { validateImage } from "@/modules/omnisite/server/media";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const url = new URL(request.url),
      teamId = z.string().uuid().parse(url.searchParams.get("teamId")),
      siteId = z.string().uuid().parse(url.searchParams.get("siteId"));
    const { client, userId } = await siteAccess(
      request,
      teamId,
      true,
      "upload",
    );
    const { data: site } = await client
      .from("team_sites")
      .select("id")
      .eq("team_id", teamId)
      .eq("id", siteId)
      .single();
    if (!site) throw new Error("Access denied");
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing image");
    let length = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2097152) {
        await reader.cancel();
        throw new Error("Use an image under 2 MB.");
      }
      chunks.push(value);
    }
    const file = await validateImage(
      Buffer.concat(chunks),
      request.headers.get("content-type") ?? "",
    );
    const extension = request.headers.get("x-file-extension")?.toLowerCase();
    if (
      !extension ||
      !["png", "jpg", "jpeg", "webp"].includes(extension) ||
      {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
      }[extension] !== request.headers.get("content-type")
    )
      throw new Error("Image extension must match its format.");
    const admin = createSupabaseAdminClient(),
      assetId = crypto.randomUUID();
    const args = { actor: userId, t: teamId, s: siteId, asset_id: assetId };
    const reserved = await admin.rpc("os_asset_operation", {
      ...args,
      operation: "reserve",
      asset_bytes: file.bytes.length,
      asset_width: file.width,
      asset_height: file.height,
    });
    if (reserved.error) throw reserved.error;
    const path = reserved.data as string;
    const upload = await admin.storage
      .from("omnisite-assets")
      .upload(path, file.bytes, { contentType: file.mime, upsert: false });
    if (upload.error) {
      await admin.rpc("os_asset_operation", { ...args, operation: "removed" });
      throw upload.error;
    }
    const ready = await admin.rpc("os_asset_operation", {
      ...args,
      operation: "ready",
    });
    if (ready.error) {
      const cleanup = await admin.storage
        .from("omnisite-assets")
        .remove([path]);
      if (!cleanup.error)
        await admin.rpc("os_asset_operation", {
          ...args,
          operation: "removed",
        });
      throw ready.error;
    }
    return Response.json(
      { path, assetId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const u = new URL(request.url),
      t = z.string().uuid().parse(u.searchParams.get("teamId")),
      s = z.string().uuid().parse(u.searchParams.get("siteId")),
      a = z.string().uuid().parse(u.searchParams.get("assetId"));
    const { userId } = await siteAccess(request, t);
    const admin = createSupabaseAdminClient();
    const args = { actor: userId, t, s, asset_id: a };
    const r = await admin.rpc("os_asset_operation", {
      ...args,
      operation: "delete",
    });
    if (r.error) throw new Error(r.error.message);
    const removed = await admin.storage
      .from("omnisite-assets")
      .remove([r.data]);
    if (removed.error) throw removed.error;
    const done = await admin.rpc("os_asset_operation", {
      ...args,
      operation: "removed",
    });
    if (done.error) throw done.error;
    return Response.json({ data: "Removed" });
  } catch (e) {
    return apiError(e);
  }
}
export async function GET(request: Request) {
  try {
    const u = new URL(request.url),
      slug = slugSchema.parse(u.searchParams.get("slug"));
    let path = u.searchParams.get("path") ?? "";
    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
        },
      },
    );
    if (u.searchParams.get("preview") === "1") {
      objectPath.parse(path);
      const teamId = path.split("/")[0],
        { client } = await siteAccess(request, teamId, false);
      const { data: site } = await client
        .from("team_sites")
        .select("id")
        .eq("team_id", teamId)
        .eq("slug", slug)
        .single();
      if (!site) throw new Error("Unavailable");
      const { data: a } = await client
        .from("site_assets")
        .select("id")
        .eq("team_id", teamId)
        .eq("site_id", site.id)
        .eq("object_path", path)
        .eq("state", "READY")
        .single();
      if (!a) throw new Error("Unavailable");
    } else {
      mediaHandle.parse(path);
      const r = await publicClient.rpc("get_public_site", {
          requested_slug: slug,
        }),
        v = publicSnapshotSchema.safeParse(r.data);
      if (
        r.error ||
        !v.success ||
        !assetPaths({
          ...v.data,
          pages: v.data.pages.filter((p) => p.visible),
        }).includes(path)
      )
        throw new Error("Unavailable");
      const resolved = await createSupabaseAdminClient().rpc(
        "os_public_media_path",
        { requested_slug: slug, handle: path },
      );
      if (resolved.error || typeof resolved.data !== "string")
        throw new Error("Unavailable");
      path = objectPath.parse(resolved.data);
    }
    const admin = createSupabaseAdminClient(),
      r = await admin.storage.from("omnisite-assets").download(path);
    if (r.error || !r.data) throw new Error("Unavailable");
    return new Response(r.data, {
      headers: {
        "Content-Type": r.data.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Unavailable", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
