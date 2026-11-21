export type RegistrationQuestionType = "short_text" | "long_text" | "yes_no" | "single_select" | "multi_select" | "date";

export type RegistrationQuestion = {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  type: RegistrationQuestionType;
  options?: string[];
  appliesTo: "family" | "swimmer";
};

export type RegistrationAgreement = {
  id: string;
  title: string;
  body: string;
  required: boolean;
  requireInitials: boolean;
};

export type RegistrationProgram = { id: string; name: string; description?: string };
export type RegistrationRosterGroup = { id: string; name: string };

export const legalSexOptions = ["Female", "Male", "Intersex", "Not specified"] as const;
export type LegalSex = (typeof legalSexOptions)[number];

export type RegistrationConfiguration = {
  version: number;
  title: string;
  introduction: string;
  supportEmail?: string;
  collectInsurance: boolean;
  collectPhysician: boolean;
  collectSchool: boolean;
  collectApparel: boolean;
  collectDemographics: boolean;
  programs: RegistrationProgram[];
  questions: RegistrationQuestion[];
  agreements: RegistrationAgreement[];
};

export type Guardian = {
  firstName: string; lastName: string; relationship: string; email: string;
  mobilePhone: string; alternatePhone: string; sameHousehold: boolean;
  legalGuardian: boolean; authorizedPickup: boolean; receiveEmail: boolean; receiveSms: boolean;
};

export type EmergencyContact = {
  firstName: string; lastName: string; relationship: string; phone: string; alternatePhone: string;
};

export type SwimmerRegistration = {
  id: string; firstName: string; middleName: string; lastName: string; preferredName: string;
  birthDate: string; genderIdentity: string; legalSex: string; pronouns: string;
  email: string; mobilePhone: string; addressSameAsFamily: boolean;
  address1: string; address2: string; city: string; state: string; postalCode: string; country: string;
  school: string; grade: string; graduationYear: string;
  priorTeam: string; yearsSwimming: string; usaSwimmingId: string; requestedProgramId: string;
  requestedGroupId: string;
  tshirtSize: string; ethnicity: string; race: string;
  allergies: string; medications: string; medicalConditions: string; disabilitiesOrAccommodations: string;
  physicianName: string; physicianPhone: string; dentistName: string; dentistPhone: string;
  insuranceCarrier: string; insurancePolicyNumber: string; insuranceGroupNumber: string; insurancePhone: string;
  permissionForOTCMedication: boolean; notesForCoaches: string;
  answers: Record<string, string | string[] | boolean>;
};

export type RegistrationPayload = {
  version: number;
  family: {
    familyName: string; address1: string; address2: string; city: string; state: string;
    postalCode: string; country: string; primaryPhone: string; billingEmail: string;
    billingContactName: string; referralSource: string;
  };
  guardians: Guardian[];
  emergencyContacts: EmergencyContact[];
  swimmers: SwimmerRegistration[];
  familyAnswers: Record<string, string | string[] | boolean>;
  agreements: Record<string, { accepted: boolean; initials: string; acceptedAt: string }>;
};

export const defaultRegistrationConfiguration: RegistrationConfiguration = {
  version: 1,
  title: "Family registration",
  introduction: "Create your family account, add every swimmer, and review the information before submitting it to the team.",
  collectInsurance: true,
  collectPhysician: true,
  collectSchool: true,
  collectApparel: true,
  collectDemographics: false,
  programs: [],
  questions: [],
  agreements: [
    { id: "medical-release", title: "Emergency medical authorization", body: "I authorize the team to obtain emergency medical care when a legal guardian cannot be reached.", required: true, requireInitials: true },
    { id: "liability-waiver", title: "Participation and liability waiver", body: "I acknowledge the risks of aquatic activities and agree to the team's participation and liability terms.", required: true, requireInitials: true },
    { id: "code-of-conduct", title: "Codes of conduct", body: "Our family agrees to follow the team’s parent, guardian, and athlete codes of conduct.", required: true, requireInitials: false },
    { id: "media-consent", title: "Photo and media consent", body: "The team may use photographs or video of registered swimmers in team communications and promotional material.", required: false, requireInitials: false },
    { id: "electronic-communications", title: "Electronic communications", body: "I consent to receive operational email and text messages according to the preferences provided.", required: true, requireInitials: false },
  ],
};

export function emptySwimmer(): SwimmerRegistration {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `swimmer-${Date.now()}`,
    firstName: "", middleName: "", lastName: "", preferredName: "", birthDate: "",
    genderIdentity: "", legalSex: "", pronouns: "", email: "", mobilePhone: "",
    addressSameAsFamily: true, address1: "", address2: "", city: "", state: "", postalCode: "", country: "United States",
    school: "", grade: "", graduationYear: "", priorTeam: "", yearsSwimming: "", usaSwimmingId: "", requestedProgramId: "", requestedGroupId: "",
    tshirtSize: "", ethnicity: "", race: "", allergies: "", medications: "", medicalConditions: "",
    disabilitiesOrAccommodations: "", physicianName: "", physicianPhone: "", dentistName: "", dentistPhone: "",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceGroupNumber: "", insurancePhone: "",
    permissionForOTCMedication: false, notesForCoaches: "", answers: {},
  };
}

export function emptyRegistrationPayload(): RegistrationPayload {
  return {
    version: 1,
    family: { familyName: "", address1: "", address2: "", city: "", state: "", postalCode: "", country: "United States", primaryPhone: "", billingEmail: "", billingContactName: "", referralSource: "" },
    guardians: [{ firstName: "", lastName: "", relationship: "Parent", email: "", mobilePhone: "", alternatePhone: "", sameHousehold: true, legalGuardian: true, authorizedPickup: true, receiveEmail: true, receiveSms: false }],
    emergencyContacts: [{ firstName: "", lastName: "", relationship: "", phone: "", alternatePhone: "" }],
    swimmers: [emptySwimmer()], familyAnswers: {}, agreements: {},
  };
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isQuestionAnswerValid(
  answer: string | string[] | boolean | undefined,
  question: RegistrationQuestion,
): boolean {
  if (answer === undefined || answer === "" || (Array.isArray(answer) && !answer.length)) {
    return !question.required;
  }
  if (question.type === "yes_no") return typeof answer === "boolean";
  if (question.type === "single_select") {
    return typeof answer === "string" && (question.options ?? []).includes(answer);
  }
  if (question.type === "multi_select") {
    return Array.isArray(answer)
      && answer.every((value) => typeof value === "string" && (question.options ?? []).includes(value));
  }
  if (question.type === "date") return typeof answer === "string" && isCalendarDate(answer);
  return typeof answer === "string";
}

export function validateRegistration(payload: RegistrationPayload, config: RegistrationConfiguration): string[] {
  const errors: string[] = [];
  const required = (value: string, label: string) => { if (!value.trim()) errors.push(label); };
  const email = (value: string, label: string, optional = false) => {
    const trimmed = value.trim();
    if ((!optional || trimmed) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) errors.push(`${label} must be a valid email`);
  };
  const phone = (value: string, label: string, optional = false) => {
    const trimmed = value.trim();
    if ((!optional || trimmed) && (!/^[+() .\-\d]+$/.test(trimmed) || !/^\+?\d{7,15}$/.test(trimmed.replace(/[() .\-]/g, "")))) errors.push(`${label} must be a valid phone number`);
  };
  required(payload.family.familyName, "Family name"); required(payload.family.address1, "Family street address");
  required(payload.family.city, "Family city"); required(payload.family.state, "Family state/province");
  required(payload.family.postalCode, "Family postal code"); required(payload.family.primaryPhone, "Primary family phone");
  required(payload.family.billingEmail, "Primary email");
  email(payload.family.billingEmail, "Primary email"); phone(payload.family.primaryPhone, "Primary family phone");
  if (!payload.guardians.length) errors.push("At least one parent or guardian");
  payload.guardians.forEach((guardian, index) => {
    required(guardian.firstName, `Guardian ${index + 1} first name`); required(guardian.lastName, `Guardian ${index + 1} last name`);
    required(guardian.relationship, `Guardian ${index + 1} relationship`); required(guardian.email, `Guardian ${index + 1} email`);
    required(guardian.mobilePhone, `Guardian ${index + 1} mobile phone`);
    email(guardian.email, `Guardian ${index + 1} email`); phone(guardian.mobilePhone, `Guardian ${index + 1} mobile phone`);
    phone(guardian.alternatePhone, `Guardian ${index + 1} alternate phone`, true);
  });
  if (!payload.emergencyContacts.length) errors.push("At least one emergency contact");
  payload.emergencyContacts.forEach((contact, index) => {
    required(contact.firstName, `Emergency contact ${index + 1} first name`); required(contact.lastName, `Emergency contact ${index + 1} last name`);
    required(contact.relationship, `Emergency contact ${index + 1} relationship`); required(contact.phone, `Emergency contact ${index + 1} phone`);
    phone(contact.phone, `Emergency contact ${index + 1} phone`); phone(contact.alternatePhone, `Emergency contact ${index + 1} alternate phone`, true);
  });
  if (!payload.swimmers.length) errors.push("At least one swimmer");
  payload.swimmers.forEach((swimmer, index) => {
    required(swimmer.firstName, `Swimmer ${index + 1} first name`); required(swimmer.lastName, `Swimmer ${index + 1} last name`);
    required(swimmer.birthDate, `Swimmer ${index + 1} birth date`);
    if (swimmer.birthDate && !isCalendarDate(swimmer.birthDate)) errors.push(`Swimmer ${index + 1} birth date must be a real calendar date`);
    required(swimmer.legalSex, `Swimmer ${index + 1} legal sex`);
    if (swimmer.legalSex && !legalSexOptions.includes(swimmer.legalSex as LegalSex)) errors.push(`Swimmer ${index + 1} legal sex must be a listed value`);
    email(swimmer.email, `Swimmer ${index + 1} email`, true); phone(swimmer.mobilePhone, `Swimmer ${index + 1} mobile phone`, true);
    phone(swimmer.physicianPhone, `Swimmer ${index + 1} physician phone`, true); phone(swimmer.dentistPhone, `Swimmer ${index + 1} dentist phone`, true);
    phone(swimmer.insurancePhone, `Swimmer ${index + 1} insurance phone`, true);
    if (config.programs.length && !config.programs.some((program) => program.id === swimmer.requestedProgramId)) errors.push(`Swimmer ${index + 1} program`);
    config.questions.filter((q) => q.appliesTo === "swimmer").forEach((question) => {
      if (!isQuestionAnswerValid(swimmer.answers[question.id], question)) errors.push(`${swimmer.firstName || `Swimmer ${index + 1}`}: ${question.label}`);
    });
  });
  config.questions.filter((q) => q.appliesTo === "family").forEach((question) => {
    if (!isQuestionAnswerValid(payload.familyAnswers[question.id], question)) errors.push(question.label);
  });
  config.agreements.filter((agreement) => agreement.required).forEach((agreement) => {
    const acceptance = payload.agreements[agreement.id];
    if (!acceptance?.accepted || (agreement.requireInitials && !acceptance.initials.trim())) errors.push(agreement.title);
  });
  return errors;
}
