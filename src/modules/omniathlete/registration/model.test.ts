import { describe, expect, it } from "vitest";
import { defaultRegistrationConfiguration, emptyRegistrationPayload, isCalendarDate, parseRegistrationConfiguration, validateRegistration } from "./model";

describe("family registration", () => {
  it("requires household, guardian, emergency, swimmer, and consent information", () => {
    const errors = validateRegistration(emptyRegistrationPayload(), defaultRegistrationConfiguration);
    expect(errors).toContain("Family name");
    expect(errors).toContain("Guardian 1 first name");
    expect(errors).toContain("Emergency contact 1 phone");
    expect(errors).toContain("Swimmer 1 birth date");
    expect(errors).toContain("Swimmer 1 legal sex");
    expect(errors).toContain("Emergency medical authorization");
  });

  it("uses the existing legal-sex field and validates shared contact formats", () => {
    const payload = emptyRegistrationPayload();
    payload.family.billingEmail = "not-an-email";
    payload.family.primaryPhone = "12";
    payload.guardians[0].email = "also-invalid";
    payload.guardians[0].mobilePhone = "phone";
    payload.swimmers[0].legalSex = "free text";
    const errors = validateRegistration(payload, defaultRegistrationConfiguration);
    expect(errors).toContain("Primary email must be a valid email");
    expect(errors).toContain("Primary family phone must be a valid phone number");
    expect(errors).toContain("Guardian 1 email must be a valid email");
    expect(errors).toContain("Guardian 1 mobile phone must be a valid phone number");
    expect(errors).toContain("Swimmer 1 legal sex must be a listed value");
  });

  it("validates configured family and swimmer questions", () => {
    const payload = emptyRegistrationPayload();
    const config = { ...defaultRegistrationConfiguration, questions: [
      { id: "family-q", label: "Family question", required: true, type: "short_text" as const, appliesTo: "family" as const },
      { id: "swimmer-q", label: "Swimmer question", required: true, type: "yes_no" as const, appliesTo: "swimmer" as const },
    ] };
    const errors = validateRegistration(payload, config);
    expect(errors).toContain("Family question");
    expect(errors).toContain("Swimmer 1: Swimmer question");
  });

  it("rejects impossible calendar dates", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2023-02-29")).toBe(false);
    expect(isCalendarDate("2024-13-01")).toBe(false);
    const payload = emptyRegistrationPayload();
    payload.swimmers[0].birthDate = "2023-02-29";
    expect(validateRegistration(payload, defaultRegistrationConfiguration)).toContain(
      "Swimmer 1 birth date must be a real calendar date",
    );
  });

  it("validates configured programs and answer types and options", () => {
    const payload = emptyRegistrationPayload();
    payload.swimmers[0].requestedProgramId = "foreign";
    payload.familyAnswers = { consent: "yes", level: "Gold", days: ["Friday"] };
    const config = { ...defaultRegistrationConfiguration,
      programs: [{ id: "learn", name: "Learn to swim" }],
      questions: [
        { id: "consent", label: "Consent", required: true, type: "yes_no" as const, appliesTo: "family" as const },
        { id: "level", label: "Level", required: true, type: "single_select" as const, options: ["Blue"], appliesTo: "family" as const },
        { id: "days", label: "Days", required: true, type: "multi_select" as const, options: ["Monday"], appliesTo: "family" as const },
      ],
    };
    const errors = validateRegistration(payload, config);
    expect(errors).toContain("Swimmer 1 program");
    expect(errors).toContain("Consent");
    expect(errors).toContain("Level");
    expect(errors).toContain("Days");
  });

  it("fails closed for malformed registration configuration", () => {
    expect(parseRegistrationConfiguration({ programs: {}, questions: [], agreements: [] })).toBeNull();
    expect(parseRegistrationConfiguration({ programs: [], questions: [
      { id: "level", label: "Level", required: true, type: "single_select", appliesTo: "family" },
    ], agreements: [] })).toBeNull();
    expect(parseRegistrationConfiguration({ programs: [], questions: [
      { id: "level", label: "Level", required: true, type: "single_select", appliesTo: "family", options: ["Blue", "Blue"] },
    ], agreements: [] })).toBeNull();
  });

  it("normalizes a valid partial configuration against safe defaults", () => {
    const parsed = parseRegistrationConfiguration({ programs: [{ id: "learn", name: "Learn" }], questions: [], agreements: [] });
    expect(parsed?.title).toBe(defaultRegistrationConfiguration.title);
    expect(parsed?.programs[0].id).toBe("learn");
  });
});
