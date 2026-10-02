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
    school: "", grade: "", graduationYear: "", priorTeam: "", yearsSwimming: "", usaSwimmingId: "", requestedProgramId: "",
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

export function validateRegistration(payload: RegistrationPayload, config: RegistrationConfiguration): string[] {
  const errors: string[] = [];
  const required = (value: string, label: string) => { if (!value.trim()) errors.push(label); };
  required(payload.family.familyName, "Family name"); required(payload.family.address1, "Family street address");
  required(payload.family.city, "Family city"); required(payload.family.state, "Family state/province");
  required(payload.family.postalCode, "Family postal code"); required(payload.family.primaryPhone, "Primary family phone");
  required(payload.family.billingEmail, "Billing email");
  if (!payload.guardians.length) errors.push("At least one parent or guardian");
  payload.guardians.forEach((guardian, index) => {
    required(guardian.firstName, `Guardian ${index + 1} first name`); required(guardian.lastName, `Guardian ${index + 1} last name`);
    required(guardian.relationship, `Guardian ${index + 1} relationship`); required(guardian.email, `Guardian ${index + 1} email`);
    required(guardian.mobilePhone, `Guardian ${index + 1} mobile phone`);
  });
  if (!payload.emergencyContacts.length) errors.push("At least one emergency contact");
  payload.emergencyContacts.forEach((contact, index) => {
    required(contact.firstName, `Emergency contact ${index + 1} first name`); required(contact.lastName, `Emergency contact ${index + 1} last name`);
    required(contact.relationship, `Emergency contact ${index + 1} relationship`); required(contact.phone, `Emergency contact ${index + 1} phone`);
  });
  if (!payload.swimmers.length) errors.push("At least one swimmer");
  payload.swimmers.forEach((swimmer, index) => {
    required(swimmer.firstName, `Swimmer ${index + 1} first name`); required(swimmer.lastName, `Swimmer ${index + 1} last name`);
    required(swimmer.birthDate, `Swimmer ${index + 1} birth date`);
    if (config.programs.length) required(swimmer.requestedProgramId, `Swimmer ${index + 1} program`);
    config.questions.filter((q) => q.appliesTo === "swimmer" && q.required).forEach((question) => {
      const answer = swimmer.answers[question.id]; if (answer === undefined || answer === "" || (Array.isArray(answer) && !answer.length)) errors.push(`${swimmer.firstName || `Swimmer ${index + 1}`}: ${question.label}`);
    });
  });
  config.questions.filter((q) => q.appliesTo === "family" && q.required).forEach((question) => {
    const answer = payload.familyAnswers[question.id]; if (answer === undefined || answer === "" || (Array.isArray(answer) && !answer.length)) errors.push(question.label);
  });
  config.agreements.filter((agreement) => agreement.required).forEach((agreement) => {
    const acceptance = payload.agreements[agreement.id];
    if (!acceptance?.accepted || (agreement.requireInitials && !acceptance.initials.trim())) errors.push(agreement.title);
  });
  return errors;
}
