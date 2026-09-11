export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEFT_EARLY" | "NOT_SCHEDULED";

export type PracticeSessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface AttendanceSummaryInput {
  eligiblePractices: number;
  present: number;
  absent: number;
  excused: number;
  countExcusedAgainstAttendance: boolean;
}

export interface AttendanceSummary {
  denominator: number;
  percentage: number;
}

export function calculateAttendancePercentage(input: AttendanceSummaryInput): AttendanceSummary {
  const denominator = Math.max(
    input.eligiblePractices - (input.countExcusedAgainstAttendance ? 0 : input.excused),
    0,
  );

  return {
    denominator,
    percentage: denominator === 0 ? 0 : Math.round((input.present / denominator) * 1000) / 10,
  };
}

export function isEligiblePractice(status: PracticeSessionStatus): boolean {
  return status !== "CANCELLED";
}

export function formatAttendancePercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}