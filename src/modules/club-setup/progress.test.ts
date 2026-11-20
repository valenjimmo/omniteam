import { describe, expect, it } from "vitest";
import { calculateSetupProgress, type SetupChecklistState } from "./progress";

const empty = (overrides: Partial<SetupChecklistState> = {}): SetupChecklistState => ({
  identity: false, timezone: false, ownerPhone: false, location: false,
  clubCode: false, facility: false, seasonType: false, logo: false,
  practiceGroup: false, practiceGroupAvailable: true, ...overrides,
});

describe("club setup progress", () => {
  it("handles zero, partial, and full progress", () => {
    expect(calculateSetupProgress(empty())).toMatchObject({ completed: 0, total: 9, percentage: 0, setupComplete: false });
    expect(calculateSetupProgress(empty({ identity: true, timezone: true }))).toMatchObject({ completed: 2, percentage: 22, setupComplete: false });
    expect(calculateSetupProgress(empty({ identity: true, timezone: true, ownerPhone: true, location: true, clubCode: true, facility: true, seasonType: true, logo: true, practiceGroup: true }))).toMatchObject({ completed: 9, percentage: 100, setupComplete: true });
  });

  it("requires all four combined/required projections for setup_complete", () => {
    expect(calculateSetupProgress(empty({ identity: true, timezone: true, ownerPhone: true, location: false })).setupComplete).toBe(false);
    expect(calculateSetupProgress(empty({ identity: true, timezone: true, ownerPhone: true, location: true })).setupComplete).toBe(true);
  });

  it("shows unavailable tasks but excludes them from the denominator", () => {
    const result = calculateSetupProgress(empty({ practiceGroupAvailable: false, identity: true }));
    expect(result).toMatchObject({ completed: 1, total: 8, percentage: 12 });
    expect(result.items.find((item) => item.key === "practiceGroup")).toMatchObject({ available: false, complete: false });
  });
});
