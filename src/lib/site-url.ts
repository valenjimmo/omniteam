export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return (configured || fallback).replace(/\/$/, "");
}
export function authCallbackUrl(next: string) {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
