import { listSiteObjects } from '@/lib/supabase/cleanup-storage';
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
    const {data: teams, error: teamsError} = await admin.from('teams').select('id,is_test_team');
    if (teamsError || teams?.some(t => !t.is_test_team)) throw new Error('Test team verification failed');
    for (const team of teams ?? []) {
      const paths = await listSiteObjects(admin, team.id);
      for (let i=0;i<paths.length;i+=1000) {
        const {error} = await admin.storage.from('omnisite-assets').remove(paths.slice(i,i+1000));
        if (error) throw error;
        removedAssets += Math.min(1000,paths.length-i);
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
