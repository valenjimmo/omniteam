import { createSupabaseAdminClient } from "@/lib/supabase/admin-auth";
import { verifyDomain } from "@/modules/omnisite/server/domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const client = createSupabaseAdminClient();
  let failures = 0;
  const assets = await client.rpc("omnisite_asset_reconciliation_candidates", { older_than: "2 hours" });
  if (assets.error) throw assets.error;
  for (const asset of assets.data ?? []) {
    const removal = await client.storage.from("omnisite-assets").remove([asset.object_path]);
    if (removal.error) {
      failures++;
      await client.rpc("record_security_event", { requested_event_type: "asset_reconciliation_failed", requested_severity: "WARNING", requested_details: { assetId: asset.id, state: asset.state }, requested_team_id: asset.team_id });
      continue;
    }
    const deletion = await client.from("site_assets").delete().eq("id", asset.id).eq("team_id", asset.team_id).in("state", ["PENDING", "DELETING"]);
    if (deletion.error) throw deletion.error;
  }

  const domains = await client.rpc("omnisite_domain_review_candidates", { review_after: "30 days" });
  if (domains.error) throw domains.error;
  for (const domain of domains.data ?? []) {
    const confirmed = await verifyDomain(domain.hostname, domain.verification_token);
    const review = await client.rpc("record_omnisite_domain_review", { target_domain_id: domain.id, ownership_confirmed: confirmed });
    if (review.error) throw review.error;
    if (!confirmed) {
      failures++;
      await client.rpc("record_security_event", { requested_event_type: "domain_ownership_failed", requested_severity: "CRITICAL", requested_details: { domainId: domain.id, hostname: domain.hostname } });
    }
  }

  const snapshot = await client.rpc("production_security_snapshot");
  if (snapshot.error) throw snapshot.error;
  console.log(JSON.stringify({ event: "production_operations", failures, ...snapshot.data }));
  return Response.json({ ok: failures === 0, failures, snapshot: snapshot.data }, { status: failures ? 503 : 200 });
}
