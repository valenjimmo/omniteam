export type PlatformTeamLinkRow = {
  team_id: string;
  site_slug: string | null;
  site_enabled: boolean | null;
  site_published: boolean | null;
  site_available: boolean;
  primary_hostname: string | null;
  primary_domain_type: "MANAGED" | "CUSTOM" | null;
  registration_slug: string | null;
  registration_open: boolean | null;
};

export type UsableLink = {
  url: string | null;
  label: string;
  status: string;
};

export type TeamUsableLinks = {
  website: UsableLink;
  registration: UsableLink;
};

export function configuredSiteOrigin(value: string | undefined) {
  const raw = value?.trim() || "http://localhost:3000";
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https");
  }
  return url.origin;
}

function platformUrl(origin: string, path: string) {
  return new URL(path, `${origin}/`).toString();
}

export function teamUsableLinks(
  row: PlatformTeamLinkRow | undefined,
  siteOrigin: string,
): TeamUsableLinks {
  if (!row) {
    return {
      website: { url: null, label: "Unavailable", status: "Site unavailable" },
      registration: {
        url: null,
        label: "Not configured",
        status: "Registration settings unavailable",
      },
    };
  }

  let website: UsableLink;
  if (!row.site_slug) {
    website = { url: null, label: "Unavailable", status: "Site unavailable" };
  } else if (!row.site_published) {
    website = { url: null, label: "Unpublished", status: "Site unpublished" };
  } else if (!row.site_enabled || !row.site_available) {
    website = { url: null, label: "Unavailable", status: "Site unavailable" };
  } else if (row.primary_hostname) {
    website = {
      url: `https://${row.primary_hostname}`,
      label:
        row.primary_domain_type === "MANAGED"
          ? "Managed subdomain"
          : "Custom domain",
      status: "Published",
    };
  } else {
    website = {
      url: platformUrl(
        siteOrigin,
        `/sites/${encodeURIComponent(row.site_slug)}`,
      ),
      label: "Platform fallback URL",
      status: "Published",
    };
  }

  const registration: UsableLink = row.registration_slug
    ? {
        url: platformUrl(
          siteOrigin,
          `/register/${encodeURIComponent(row.registration_slug)}`,
        ),
        label: "Registration link",
        status: row.registration_open ? "Open" : "Closed",
      }
    : {
        url: null,
        label: "Not configured",
        status: "Registration slug missing",
      };

  return { website, registration };
}
