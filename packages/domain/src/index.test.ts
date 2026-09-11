import { describe, expect, it } from "vitest";
import { calculateAttendancePercentage, isEligiblePractice } from "./index";

describe("attendance domain", () => {
  it("excludes excused swimmers when configured", () => {
    expect(calculateAttendancePercentage({ eligiblePractices: 18, present: 16, absent: 1, excused: 1, countExcusedAgainstAttendance: false })).toEqual({ denominator: 17, percentage: 94.1 });
  });

  it("keeps excused practices in the denominator when configured", () => {
    expect(calculateAttendancePercentage({ eligiblePractices: 18, present: 16, absent: 1, excused: 1, countExcusedAgainstAttendance: true }).percentage).toBe(88.9);
  });

  it("never treats a cancelled practice as eligible", () => {
    expect(isEligiblePractice("CANCELLED")).toBe(false);
    expect(isEligiblePractice("COMPLETED")).toBe(true);
  });
});