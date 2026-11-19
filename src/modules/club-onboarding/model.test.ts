import { describe, expect, it } from "vitest";
import { isPublicPlanKey, stageAfterEdit, validateIdentity, validateLocation } from "./model";

describe("club onboarding validation", () => {
  it("accepts identity boundaries and an omitted club code", () => {
    expect(validateIdentity({ name: "AB", slug: "abc", clubCode: "" })).toEqual({});
    expect(validateIdentity({ name: "A".repeat(120), slug: "a".repeat(40), clubCode: "A1" })).toEqual({});
  });

  it("rejects malformed identity values with short messages", () => {
    expect(validateIdentity({ name: " ", slug: "Bad_slug", clubCode: "abc" })).toEqual({
      name: "Enter your club name.",
      slug: "Use 3-40 lowercase letters, numbers, or hyphens.",
      clubCode: "Use 2-5 uppercase letters or numbers.",
    });
  });

  it("validates location, IANA choice, phone boundaries, and facility length", () => {
    expect(validateLocation({ city: "Seattle", state: "WA", timezone: "America/Los_Angeles", ownerPhone: "+1 (206) 555-0100", primaryFacility: "Pool" })).toEqual({});
    expect(validateLocation({ city: " ", state: " ", timezone: "PST", ownerPhone: "555-CALL", primaryFacility: "x".repeat(161) })).toEqual({
      city: "Enter a city.", state: "Enter a state.", timezone: "Choose a valid timezone.",
      ownerPhone: "Enter a valid phone number.", primaryFacility: "Use 160 characters or fewer.",
    });
  });

  it("accepts only public plan keys", () => {
    expect(["website", "management", "complete"].every(isPublicPlanKey)).toBe(true);
    expect(isPublicPlanKey("team_manager")).toBe(false);
  });

  it("returns directly to each editable review section without changing state", () => {
    expect(stageAfterEdit("identity")).toBe("identity");
    expect(stageAfterEdit("location")).toBe("location");
    expect(stageAfterEdit("plan")).toBe("plan");
  });
});
