import { resolveTxt } from "node:dns/promises";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".supabase.env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const emit = (severity, event, details = {}) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), severity, event, ...details }));

async function record(event, severity, details, teamId = null) {
  const result = await client.rpc("record_security_event", {
    requested_event_type: event,
    requested_severity: severity,
    requested_details: details,
    requested_team_id: teamId,
  });
  if (result.error) throw result.error;
}

let failures = 0;
const assets = await client.rpc("omnisite_asset_reconciliation_candidates", { older_than: "2 hours" });
if (assets.error) throw assets.error;
for (const asset of assets.data ?? []) {
  const removal = await client.storage.from("omnisite-assets").remove([asset.object_path]);
  if (removal.error) {
    failures++;
    emit("ERROR", "asset_reconciliation_failed", { assetId: asset.id, state: asset.state });
    await record("asset_reconciliation_failed", "WARNING", { assetId: asset.id, state: asset.state }, asset.team_id);
    continue;
  }
  const deletion = await client.from("site_assets").delete().eq("id", asset.id).eq("team_id", asset.team_id).in("state", ["PENDING", "DELETING"]);
  if (deletion.error) throw deletion.error;
  emit("INFO", "asset_reconciled", { assetId: asset.id, state: asset.state });
}

const domains = await client.rpc("omnisite_domain_review_candidates", { review_after: "30 days" });
if (domains.error) throw domains.error;
for (const domain of domains.data ?? []) {
  let confirmed = false;
  try {
    const records = (await resolveTxt(`_omnisite.${domain.hostname}`)).map(parts => parts.join(""));
    confirmed = records.includes(`omnisite-verification=${domain.verification_token}`);
  } catch {
    confirmed = false;
  }
  const review = await client.rpc("record_omnisite_domain_review", { target_domain_id: domain.id, ownership_confirmed: confirmed });
  if (review.error) throw review.error;
  emit(confirmed ? "INFO" : "ERROR", confirmed ? "domain_ownership_confirmed" : "domain_ownership_failed", { domainId: domain.id, hostname: domain.hostname });
  if (!confirmed) {
    failures++;
    await record("domain_ownership_failed", "CRITICAL", { domainId: domain.id, hostname: domain.hostname });
  }
}

const snapshot = await client.rpc("production_security_snapshot");
if (snapshot.error) throw snapshot.error;
emit("INFO", "production_security_snapshot", snapshot.data);
if ((snapshot.data?.staleAssetTransitions ?? 0) > 0 || (snapshot.data?.incompatiblePublishedSites ?? 0) > 0) failures++;
if (failures) process.exitCode = 1;
