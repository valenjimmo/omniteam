/** Data OmniAthlete may offer to OmniSite when both modules are enabled. */
export interface AthleteSiteGroup {
  id: string;
  name: string;
  description: string | null;
}

export interface AthleteSiteSnapshot {
  teamId: string;
  groups: AthleteSiteGroup[];
}

export interface AthleteSiteSource {
  listApprovedGroups(teamId: string): Promise<AthleteSiteGroup[]>;
}

export interface ModuleAccess {
  hasModule(teamId: string, moduleKey: "omniathlete" | "omnisite"): Promise<boolean>;
}

/** Returns only explicitly approved group data, never swimmer or family records. */
export async function getAthleteSiteSnapshot(
  teamId: string,
  access: ModuleAccess,
  source: AthleteSiteSource,
): Promise<AthleteSiteSnapshot | null> {
  const [athleteEnabled, siteEnabled] = await Promise.all([
    access.hasModule(teamId, "omniathlete"),
    access.hasModule(teamId, "omnisite"),
  ]);
  if (!athleteEnabled || !siteEnabled) return null;
  return { teamId, groups: await source.listApprovedGroups(teamId) };
}
