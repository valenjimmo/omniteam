import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, requirePlatformOwner } from "@/lib/supabase/admin-auth";

const projectRefSchema = z.string().regex(/^[a-z0-9]+$/).min(5).max(40);
const deleteSchema = z.object({
  projectRef: projectRefSchema,
  confirmation: z.literal("DELETE ALL TEST CLIENT DATA"),
}).strict();

function statusFor(message: string) {
  return /Authentication/.test(message) ? 401 : /Platform-owner/.test(message) ? 403 : 400;
}

export async function GET(request: NextRequest) {
  try {
    const projectRef = projectRefSchema.parse(request.nextUrl.searchParams.get("projectRef"));
    const { client } = await requirePlatformOwner(request.headers.get("authorization"));
    const { data, error } = await client.rpc("preview_test_project_reset", { expected_project_ref: projectRef });
    if (error) throw new Error(error.message);
    const preview = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ mode: "preview", projectRef, ...preview,
      preserves: ["auth users", "profiles", "platform owners", "shared OmniSite templates", "subscription plans"] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const input = deleteSchema.parse(await request.json());
    const { client } = await requirePlatformOwner(request.headers.get("authorization"));
    const { data: previewData, error: previewError } = await client.rpc("preview_test_project_reset", { expected_project_ref: input.projectRef });
    if (previewError) throw new Error(previewError.message);
    const preview = (Array.isArray(previewData) ? previewData[0] : previewData) as { non_test_team_count?: number|string } | null;
    if (Number(preview?.non_test_team_count ?? 0) !== 0) throw new Error("Reset blocked because one or more teams are not marked as test teams");

    const admin = createSupabaseAdminClient();
    let removedAssets = 0;
    for (;;) {
      const { data: folders, error: folderError } = await admin.storage.from("omnisite-assets").list("", { limit: 1000 });
      if (folderError && !/not found/i.test(folderError.message)) throw folderError;
      const teamFolders = (folders ?? []).filter(folder => !folder.id && /^[0-9a-f-]{36}$/i.test(folder.name));
      if (!teamFolders.length) break;
      for (const folder of teamFolders) {
       for (;;) {
        const { data: files, error } = await admin.storage.from("omnisite-assets").list(folder.name, { limit: 1000, offset: 0 });
        if (error) throw error;
        const paths = (files ?? []).filter(file => file.id).map(file => `${folder.name}/${file.name}`);
        if (paths.length) {
          const { error: removeError } = await admin.storage.from("omnisite-assets").remove(paths);
          if (removeError) throw removeError;
          removedAssets += paths.length;
        }
        if (!paths.length || (files ?? []).length < 1000) break;
       }
      }
    }
    const { data: removedTeams, error: resetError } = await client.rpc("reset_all_test_client_data", {
      expected_project_ref: input.projectRef, confirmation: input.confirmation,
    });
    if (resetError) throw new Error(resetError.message);
    return NextResponse.json({ status: "completed", removedTeams, removedAssets,
      preserved: ["auth users", "profiles", "platform owners", "shared OmniSite templates", "subscription plans"] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
