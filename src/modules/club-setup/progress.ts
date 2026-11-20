export type SetupItemKey =
  | "identity" | "timezone" | "ownerPhone" | "location"
  | "clubCode" | "facility" | "seasonType" | "logo" | "practiceGroup";

export type SetupChecklistState = Record<SetupItemKey, boolean> & {
  practiceGroupAvailable: boolean;
};

export type SetupItem = {
  key: SetupItemKey;
  label: string;
  kind: "required" | "recommended";
  complete: boolean;
  available: boolean;
};

const definitions: ReadonlyArray<Omit<SetupItem, "complete" | "available">> = [
  { key: "identity", label: "Club name & slug", kind: "required" },
  { key: "timezone", label: "Timezone", kind: "required" },
  { key: "ownerPhone", label: "Owner phone", kind: "required" },
  { key: "location", label: "City + state", kind: "required" },
  { key: "clubCode", label: "Club code", kind: "recommended" },
  { key: "facility", label: "Primary facility", kind: "recommended" },
  { key: "seasonType", label: "Season type", kind: "recommended" },
  { key: "logo", label: "Logo", kind: "recommended" },
  { key: "practiceGroup", label: "First practice group", kind: "recommended" },
];

export function calculateSetupProgress(state: SetupChecklistState) {
  const items = definitions.map((definition) => ({
    ...definition,
    complete: state[definition.key],
    available: definition.key !== "practiceGroup" || state.practiceGroupAvailable,
  }));
  const available = items.filter((item) => item.available);
  const completed = available.filter((item) => item.complete).length;
  const required = items.filter((item) => item.kind === "required");
  const recommended = items.filter((item) => item.kind === "recommended" && item.available);
  return {
    items,
    completed,
    total: available.length,
    percentage: available.length ? Math.floor((completed / available.length) * 100) : 100,
    requiredCompleted: required.filter((item) => item.complete).length,
    requiredTotal: required.length,
    recommendedCompleted: recommended.filter((item) => item.complete).length,
    recommendedTotal: recommended.length,
    setupComplete: required.every((item) => item.complete),
  };
}
