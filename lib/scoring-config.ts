// V1 qualification weights — deliberately simple and easy to change.
// This is Global Talent Lab's internal triage only. It is NOT an eligibility or
// endorsement probability and must never be shown to candidates as one.
//
// Once ~100 qualified leads have converted (or not), revisit these numbers using
// the admin dashboard's grade → purchase data. Bump SCORING_VERSION when you do,
// so older leads can be compared against the version that scored them.

export const SCORING_VERSION = "v1";

export const scoringConfig = {
  profession: {
    ai_ml: 20,
    data: 18,
    software: 18,
    cyber: 18,
    product: 14,
    tech_leadership: 20,
    founder: 20,
    other_digital: 10,
    other: 0,
  } as Record<string, number>,

  experience: {
    lt3: 3,
    "3_5": 8,
    "5_7": 14,
    "7_10": 18,
    "10_plus": 20,
  } as Record<string, number>,

  seniority: {
    junior: 0,
    mid: 5,
    senior: 12,
    lead: 16,
    manager: 16,
    director: 20,
    founder: 20,
    other: 6,
  } as Record<string, number>,

  evidence: {
    impact: 8,
    leadership: 7,
    awards: 8,
    speaking: 7,
    publications: 7,
    open_source: 6,
    mentoring_judging: 5,
    startup: 7,
    media: 5,
    patents: 7,
    compensation: 4,
    community: 5,
    other: 2,
    none: 0,
  } as Record<string, number>,
  evidenceCap: 40,

  /** Evidence that shows recognition outside the candidate's employer. */
  externalRecognition: ["awards", "speaking", "publications", "open_source", "mentoring_judging", "media", "patents"],
  /** Evidence that shows impact / leadership inside the day job. */
  impactOrLeadership: ["impact", "leadership", "startup"],

  achievement: {
    /** points for a substantive description (>= minChars) */
    detailed: 5,
    minChars: 180,
    /** points when the description contains measurable signals (numbers, %, £, users…) */
    measurable: 5,
  },

  /** Seniority values that count as "senior" for grade A. */
  seniorRoles: ["senior", "lead", "manager", "director", "founder"],
  /** Professions outside the digital-tech specialism — always grade C. */
  outOfScopeProfessions: ["other"],

  thresholds: {
    /** Normalised 0–100 score needed for A (plus the qualitative gates below). */
    a: 65,
    /** Normalised 0–100 score needed for B. */
    b: 38,
    /** Minimum distinct evidence types for A. */
    aMinEvidenceTypes: 3,
  },
};

export type ScoringConfig = typeof scoringConfig;
