import { parse } from "tldts";
import { reservedSlugs, slugSchema } from "./model";

export function normalizeHostname(value: string): string {
  if (!value || value !== value.trim() || /[\s/:\\@?#%,\x00-\x1f]/.test(value))
    throw new Error("Enter a hostname without a scheme, port, or path.");
  const raw = value.endsWith(".") ? value.slice(0, -1) : value;
  const host = new URL(`https://${raw}`).hostname.toLowerCase();
  if (
    host.length > 253 ||
    !host
      .split(".")
      .every(
        (s) => s.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s),
      )
  )
    throw new Error("Invalid hostname.");
  const parts = parse(host, { allowPrivateDomains: true });
  if (parts.isIp || !parts.domain || !parts.isIcann || parts.isPrivate)
    throw new Error("Use a registrable public hostname.");
  return host;
}
export function requestHostname(value: string | null, allowLocal = false) {
  if (
    allowLocal &&
    value &&
    /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(value)
  )
    return value.split(":")[0];
  return normalizeHostname(value ?? "");
}
export function addressMode(
  host: string,
  root: string | undefined,
  appHosts: string[],
) {
  if (appHosts.includes(host)) return { kind: "platform" as const };
  if (root && host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -root.length - 1);
    if (!slugSchema.safeParse(slug).success)
      return { kind: "unavailable" as const };
    return { kind: "managed" as const, slug };
  }
  if (root && host === root) return { kind: "unavailable" as const };
  return { kind: "custom" as const };
}
export function claimHostname(
  value: string,
  root: string | undefined,
  appHosts: string[],
) {
  const host = normalizeHostname(value);
  if (
    appHosts.includes(host) ||
    (root && (host === root || host.endsWith(`.${root}`))) ||
    (reservedSlugs.has(host.split(".")[0]) && !host.startsWith("www."))
  )
    throw new Error("That hostname is reserved.");
  return host;
}
