export type VolunteerSlot = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  signup_deadline: string;
  capacity: number;
  credit_value: number;
  job_signups: { id: string; household_id: string; membership_id: string; status: string }[];
};

export type HouseholdJob = {
  id: string;
  status: string;
  job_slots: { id: string; title: string; starts_at: string; ends_at: string; event_id: string };
};
