import { describe, expect, it, vi } from "vitest";
import { getAthleteSiteSnapshot } from "./site-integration";

describe("OmniAthlete to OmniSite integration", () => {
  it("does not expose data when either module is unavailable", async () => {
    const source = { listApprovedGroups: vi.fn().mockResolvedValue([]) };
    const result = await getAthleteSiteSnapshot("team-1", {
      hasModule: async (_teamId, key) => key === "omniathlete",
    }, source);
    expect(result).toBeNull();
    expect(source.listApprovedGroups).not.toHaveBeenCalled();
  });

  it("returns only approved groups when both modules are available", async () => {
    const result = await getAthleteSiteSnapshot("team-1", {
      hasModule: async () => true,
    }, {
      listApprovedGroups: async () => [{ id: "group-1", name: "Novice", description: null }],
    });
    expect(result).toEqual({ teamId: "team-1", groups: [{ id: "group-1", name: "Novice", description: null }] });
  });
});
