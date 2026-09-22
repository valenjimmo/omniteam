import { NextRequest, NextResponse } from "next/server";
import { resolveHostname } from "@/modules/omnisite/resolver";
export async function middleware(request: NextRequest) {
  const address = await resolveHostname(request.headers.get("host"));
  if (!address)
    return new NextResponse("Site unavailable", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  const headers = new Headers(request.headers);
  headers.delete("x-forwarded-host");
  headers.delete("x-omnisite-host");
  headers.delete("x-nonce");
  const nonce = btoa(crypto.randomUUID());
  headers.set("x-nonce", nonce);
  let supabase = "";
  try {
    supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {}
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self' ${supabase}; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
  headers.set("Content-Security-Policy", csp);
  let response: NextResponse;
  const path = request.nextUrl.pathname;
  if (address.kind === "site") {
    if (path.startsWith("/api/omnisite/media")) {
      if (
        request.method !== "GET" ||
        request.nextUrl.searchParams.get("slug") !== address.slug ||
        request.nextUrl.searchParams.has("preview")
      )
        return new NextResponse("Unavailable", { status: 404 });
      response = NextResponse.next({ request: { headers } });
    } else {
      if (!/^\/(?:[a-z0-9-]+|sitemap\.xml|robots\.txt)?$/.test(path))
        return new NextResponse("Unavailable", { status: 404 });
      const url = request.nextUrl.clone();
      url.pathname = `/sites/${address.slug}${path === "/" ? "" : path}`;
      response = NextResponse.rewrite(url, { request: { headers } });
    }
  } else response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Cache-Control", "private, no-store");
  if (path.startsWith("/omnisite"))
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (process.env.OMNISITE_HTTPS_READY === "true")
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
