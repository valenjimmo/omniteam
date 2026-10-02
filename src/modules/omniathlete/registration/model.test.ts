import { describe, expect, it } from "vitest";
import { defaultRegistrationConfiguration, emptyRegistrationPayload, validateRegistration } from "./model";

describe("family registration", () => {
  it("requires household, guardian, emergency, swimmer, and consent information", () => {
    const errors = validateRegistration(emptyRegistrationPayload(), defaultRegistrationConfiguration);
    expect(errors).toContain("Family name");
    expect(errors).toContain("Guardian 1 first name");
    expect(errors).toContain("Emergency contact 1 phone");
    expect(errors).toContain("Swimmer 1 birth date");
    expect(errors).toContain("Emergency medical authorization");
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
});
