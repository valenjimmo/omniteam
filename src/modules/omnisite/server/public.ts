import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { publicSnapshotSchema, mediaUrl } from "../model";
import { normalizeHostname } from "../hostname";
import { publicClient, resolveHostname, routingConfig } from "../resolver";
export async function loadPublicSite(
  slug: string,
  pageSlug = "home",
  canonicalRedirect = true,
) {
  const address = await resolveHostname((await headers()).get("host"));
  if (!address || (address.kind === "site" && address.slug !== slug))
    notFound();
  const client = publicClient();
  if (!client) notFound();
  const r = await client.rpc("get_public_site", { requested_slug: slug }),
    parsed = publicSnapshotSchema.safeParse(r.data);
  if (r.error || !parsed.success || parsed.data.slug !== slug) notFound();
  const site = parsed.data,
    page = site.pages.find((p) => p.slug === pageSlug && p.visible);
  if (!page) notFound();
  const primary = await client.rpc("public_site_primary", {
    requested_slug: slug,
  });
  const config = routingConfig();
  let canonicalHost: string | null = null;
  if (!primary.error && typeof primary.data === "string") {
    try {
      canonicalHost = normalizeHostname(primary.data);
    } catch {
      notFound();
    }
  } else if (config.root && config.managedReady)
    canonicalHost = `${site.slug}.${config.root}`;
  const basePath = address.kind === "site" ? "" : `/sites/${site.slug}`;
  const canonicalBase = canonicalHost
    ? `https://${canonicalHost}`
    : `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sites/${site.slug}`;
  const suffix = pageSlug === "home" ? "" : `/${pageSlug}`;
  if (canonicalRedirect && canonicalHost && address.host !== canonicalHost)
    redirect(`${canonicalBase}${suffix || "/"}`);
  return {
    site,
    page,
    basePath,
    canonicalBase,
    canonical: `${canonicalBase}${suffix || "/"}`,
  };
}
export async function publicMetadata(
  slug: string,
  pageSlug = "home",
): Promise<Metadata> {
  const { site, page, canonical, canonicalBase } = await loadPublicSite(
    slug,
    pageSlug,
    false,
  );
  const title =
    pageSlug === "home"
      ? site.settings.seoTitle || site.siteName
      : `${page.title} | ${site.siteName}`;
  const description = page.seoDescription || site.settings.seoDescription;
  const image = site.settings.socialImagePath;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image
        ? [new URL(mediaUrl(slug, image), canonicalBase).toString()]
        : [],
    },
    icons: site.settings.faviconPath
      ? { icon: mediaUrl(slug, site.settings.faviconPath) }
      : undefined,
  };
}
