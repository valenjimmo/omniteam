export const PUBLIC_PLAN_KEYS = ["website", "management", "complete"] as const;
export type PublicPlanKey = (typeof PUBLIC_PLAN_KEYS)[number];
export type OnboardingStage = "account" | "identity" | "location" | "plan" | "review" | "complete";

export type ClubIdentity = { name: string; slug: string; clubCode: string };
export type ClubLocation = { city: string; state: string; timezone: string; ownerPhone: string; primaryFacility: string };

export const TIMEZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago",
  "America/New_York", "Pacific/Honolulu", "America/Anchorage",
] as const;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clubCodePattern = /^[A-Z0-9]{2,5}$/;
const phonePattern = /^\+?[0-9][0-9 ()-]{7,23}[0-9]$/;

export function validateIdentity(value: ClubIdentity) {
  const errors: Partial<Record<keyof ClubIdentity, string>> = {};
  const name = value.name.trim();
  const slug = value.slug.trim();
  const code = value.clubCode.trim();
  if (name.length < 2 || name.length > 120) errors.name = "Enter your club name.";
  if (slug.length < 3 || slug.length > 40 || !slugPattern.test(slug)) errors.slug = "Use 3-40 lowercase letters, numbers, or hyphens.";
  if (code && !clubCodePattern.test(code)) errors.clubCode = "Use 2-5 uppercase letters or numbers.";
  return errors;
}

export function validateLocation(value: ClubLocation) {
  const errors: Partial<Record<keyof ClubLocation, string>> = {};
  if (!value.city.trim()) errors.city = "Enter a city.";
  if (!value.state.trim()) errors.state = "Enter a state.";
  if (!TIMEZONES.includes(value.timezone as (typeof TIMEZONES)[number])) errors.timezone = "Choose a valid timezone.";
  const phone = value.ownerPhone.trim();
  const digits = phone.replace(/[^0-9]/g, "");
  if (!phonePattern.test(phone) || digits.length < 10 || digits.length > 15) errors.ownerPhone = "Enter a valid phone number.";
  if (value.primaryFacility.trim().length > 160) errors.primaryFacility = "Use 160 characters or fewer.";
  return errors;
}

export function isPublicPlanKey(value: string): value is PublicPlanKey {
  return PUBLIC_PLAN_KEYS.includes(value as PublicPlanKey);
}

export function stageAfterEdit(stage: Exclude<OnboardingStage, "account" | "review" | "complete">) {
  return stage;
}
