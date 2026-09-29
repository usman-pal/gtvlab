// Questions and answer options for the on-site profile assessment.
// Keys (value) are stored in the database; labels can be reworded freely.

export type Option = { value: string; label: string };

export const PROFESSIONS: Option[] = [
  { value: "ai_ml", label: "Artificial Intelligence / Machine Learning" },
  { value: "data", label: "Data Science / Data Engineering" },
  { value: "software", label: "Software Engineering" },
  { value: "cyber", label: "Cybersecurity" },
  { value: "product", label: "Product / Digital Technology" },
  { value: "tech_leadership", label: "Technology Leadership" },
  { value: "founder", label: "Founder / CTO / Entrepreneur" },
  { value: "other_digital", label: "Other Digital Technology" },
  { value: "other", label: "Other / Not listed" },
];

export const EXPERIENCE: Option[] = [
  { value: "lt3", label: "Less than 3 years" },
  { value: "3_5", label: "3–5 years" },
  { value: "5_7", label: "5–7 years" },
  { value: "7_10", label: "7–10 years" },
  { value: "10_plus", label: "10+ years" },
];

export const SENIORITY: Option[] = [
  { value: "junior", label: "Junior / Graduate" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Staff / Principal" },
  { value: "manager", label: "Manager / Head of" },
  { value: "director", label: "Director / VP" },
  { value: "founder", label: "Founder / CTO" },
  { value: "other", label: "Other" },
];

export const EVIDENCE: Option[] = [
  { value: "impact", label: "Significant product or business impact" },
  { value: "leadership", label: "Leadership of important technology projects" },
  { value: "awards", label: "Awards or professional recognition" },
  { value: "speaking", label: "Conference speaking" },
  { value: "publications", label: "Publications / research" },
  { value: "open_source", label: "Open-source contributions" },
  { value: "mentoring_judging", label: "Mentoring or judging" },
  { value: "startup", label: "Startup / founder achievements" },
  { value: "media", label: "Media coverage" },
  { value: "patents", label: "Patents / innovation" },
  { value: "compensation", label: "High compensation / senior remuneration" },
  { value: "community", label: "Industry / community contribution" },
  { value: "other", label: "Other" },
  { value: "none", label: "None of these" },
];

export const HELP_WANTED: Option[] = [
  { value: "could_qualify", label: "Understanding whether I could qualify" },
  { value: "which_evidence", label: "Identifying which evidence I should use" },
  { value: "gaps", label: "Understanding gaps in my profile" },
  { value: "review_evidence", label: "Reviewing my complete evidence" },
  { value: "strategy", label: "Building my application strategy" },
  { value: "full_support", label: "Support throughout the application process" },
];

export const ACHIEVEMENT_MAX = 1000;

export function labelFor(list: Option[], value: string | null | undefined): string {
  if (!value) return "—";
  return list.find((o) => o.value === value)?.label ?? value;
}

export const TOTAL_STEPS = 7;
