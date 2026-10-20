import { describe, expect, it } from "vitest";
import {
  configuredSiteOrigin,
  teamUsableLinks,
  type PlatformTeamLinkRow,
} from "./team-links";

const base: PlatformTeamLinkRow = {
  team_id: "team-a",
  site_slug: "omni-sharks",
  site_enabled: true,
  site_published: true,
  site_available: true,
  primary_hostname: null,
  primary_domain_type: null,
  registration_slug: "sharks-family",
  registration_open: true,
};

describe("platform team usable links", () => {
  const origin = "https://app.omniteam.test";

  it("uses and labels an active primary custom hostname", () => {
    const links = teamUsableLinks(
      {
        ...base,
        primary_hostname: "www.sharks.test",
        primary_domain_type: "CUSTOM",
      },
      origin,
    );
    expect(links.website).toEqual({
      url: "https://www.sharks.test",
      label: "Custom domain",
      status: "Published",
    });
  });

  it("labels a managed primary hostname as a managed subdomain", () => {
    expect(
      teamUsableLinks(
        {
          ...base,
          primary_hostname: "sharks.omniteam.test",
          primary_domain_type: "MANAGED",
        },
        origin,
      ).website.label,
    ).toBe("Managed subdomain");
  });

  it("uses the platform fallback with the OmniSite slug", () => {
    expect(teamUsableLinks(base, origin).website).toEqual({
      url: "https://app.omniteam.test/sites/omni-sharks",
      label: "Platform fallback URL",
      status: "Published",
    });
  });

  it("does not link an unpublished site", () => {
    expect(
      teamUsableLinks({ ...base, site_published: false }, origin).website,
    ).toEqual({ url: null, label: "Unpublished", status: "Site unpublished" });
  });

  it("does not link a published site that is unavailable", () => {
    expect(
      teamUsableLinks({ ...base, site_available: false }, origin).website,
    ).toEqual({ url: null, label: "Unavailable", status: "Site unavailable" });
  });

  it("shows open registration using the distinct registration slug", () => {
    expect(teamUsableLinks(base, origin).registration).toEqual({
      url: "https://app.omniteam.test/register/sharks-family",
      label: "Registration link",
      status: "Open",
    });
  });

  it("keeps a configured closed registration link and labels it closed", () => {
    expect(
      teamUsableLinks({ ...base, registration_open: false }, origin)
        .registration,
    ).toEqual({
      url: "https://app.omniteam.test/register/sharks-family",
      label: "Registration link",
      status: "Closed",
    });
  });

  it("does not link registration when its slug is missing", () => {
    expect(
      teamUsableLinks({ ...base, registration_slug: null }, origin)
        .registration,
    ).toEqual({
      url: null,
      label: "Not configured",
      status: "Registration slug missing",
    });
  });

  it("normalizes configured URLs to a safe origin", () => {
    expect(configuredSiteOrigin("https://app.omniteam.test/base/")).toBe(
      "https://app.omniteam.test",
    );
    expect(() => configuredSiteOrigin("javascript:alert(1)")).toThrow();
  });
});
