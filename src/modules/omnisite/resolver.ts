import { createClient } from "@supabase/supabase-js";
import { addressMode, normalizeHostname, requestHostname } from "./hostname";

function exactConfiguredHost(raw: string | null, appHosts: string[]) {
  if (!raw || raw !== raw.trim() || /[\s/:\\@?#%,\x00-\x1f]/.test(raw))
    return null;
  const withoutDot = raw.endsWith(".") ? raw.slice(0, -1) : raw;
  const host = withoutDot.toLowerCase();
  if (
    host.length > 253 ||
    !host
      .split(".")
      .every(
        (label) =>
          label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
  )
    return null;
  return appHosts.includes(host) ? host : null;
}

export function routingConfig() {
  const appHosts = (process.env.OMNISITE_APP_HOSTS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  if (process.env.NEXT_PUBLIC_SITE_URL)
    appHosts.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname);
  if (process.env.NODE_ENV !== "production")
    appHosts.push("localhost", "127.0.0.1");
  return {
    appHosts,
    root: process.env.OMNISITE_ROOT_DOMAIN
      ? normalizeHostname(process.env.OMNISITE_ROOT_DOMAIN)
      : undefined,
    managedReady: process.env.OMNISITE_MANAGED_DOMAINS_READY === "true",
  };
}
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (u, i) => fetch(u, { ...i, cache: "no-store" }) },
  });
}
export async function resolveHostname(raw: string | null) {
  const config = routingConfig();
  const trustedPlatformHost = exactConfiguredHost(raw, config.appHosts);
  if (trustedPlatformHost)
    return { kind: "platform" as const, host: trustedPlatformHost };
  let host: string;
  try {
    const localHostWithPort = raw?.match(
      /^(localhost|127\.0\.0\.1)(?::\d{1,5})?$/,
    )?.[1];
    const configuredLocalHost =
      !!localHostWithPort && config.appHosts.includes(localHostWithPort);
    host = requestHostname(
      raw,
      process.env.NODE_ENV !== "production" || configuredLocalHost,
    );
  } catch {
    return null;
  }
  const mode = addressMode(host, config.root, config.appHosts);
  if (mode.kind === "platform") return { kind: "platform" as const, host };
  if (
    mode.kind === "unavailable" ||
    (mode.kind === "managed" && !config.managedReady)
  )
    return null;
  const client = publicClient();
  if (!client) return null;
  if (mode.kind === "managed")
    return { kind: "site" as const, host, slug: mode.slug };
  const { data, error } = await client.rpc("resolve_site_hostname", {
    requested_host: host,
  });
  return !error && typeof data === "string"
    ? { kind: "site" as const, host, slug: data }
    : null;
}
