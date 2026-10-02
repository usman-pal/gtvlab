// Application Strategy & Evidence Programme — copy and pure state helpers (safe for any component).
// Keep wording factual: no promise of endorsement and no "unlimited" revision.

export const PROGRAMME_NAME = "Application Strategy & Evidence Programme";
export const PHASE_1_PENCE = 99900;
export const PHASE_2_PENCE = 90000;
export const PROGRAMME_TOTAL_PENCE = PHASE_1_PENCE + PHASE_2_PENCE;
/** Optional add-on, offered while Stage 2 is open. Not part of the programme total. */
export const WRITER_PENCE = 25000;
export const WRITER_CONFIRMATION =
  "You have purchased writer services too. Your writer will be in our Evidence & Write-up Strategy session so your write-up can be started right away.";

/** The writer offer is shown once Stage 2 has opened and until it is completed. */
export const writerOfferOpen = (p: { phase1PaidAt: Date | null; writerPaidAt: Date | null; stages: { number: number; status: string }[] }) =>
  !!p.phase1PaidAt && !p.writerPaidAt && ["AVAILABLE", "BOOKED"].includes(p.stages.find((s) => s.number === 2)?.status ?? "");
export const INVITE_TTL_DAYS = 21;

export type StageContent = {
  n: 1 | 2 | 3 | 4;
  title: string;
  phase: 1 | 2;
  /** Shown before the stage is unlocked */
  lockedSummary: string;
  description: string;
  deliverable: string;
  /** Short lines for the progression visual */
  highlights: string[];
  focus?: { heading: string; intro?: string; items: string[]; outro?: string };
};

export const STAGES: StageContent[] = [
  {
    n: 1,
    title: "Career Mapping",
    phase: 1,
    lockedSummary: "In-depth review of your career against the Global Talent criteria to identify your strongest application route and evidence.",
    description: "In-depth review of your career against the Global Talent criteria to determine the evidence strategy for your application.",
    deliverable: "Criteria & Evidence Map",
    highlights: ["Criteria & Evidence Map"],
  },
  {
    n: 2,
    title: "Evidence & Write-up Strategy",
    phase: 1,
    lockedSummary: "Review your gathered evidence and build the plan for your own application write-up.",
    description:
      "Review your gathered evidence, understand how strong Global Talent evidence is structured, and build the plan for your own application write-up.",
    deliverable: "Personalised Application Write-up Plan",
    highlights: ["Successful application case study", "Personalised write-up plan"],
    focus: {
      heading: "Evidence from a Successful Global Talent Application",
      intro: "This session uses selected, appropriately redacted evidence from the founder's successful Global Talent application to show:",
      items: [
        "How evidence is structured",
        "How individual contribution is explained",
        "How measurable impact is presented",
        "How supporting material is used",
        "How evidence is connected to a criterion",
        "The style and language used in an actual successful application",
      ],
      outro: "We then apply the same principles to your own evidence.",
    },
  },
  {
    n: 3,
    title: "Evidence Review",
    phase: 2,
    lockedSummary: "Detailed review of your drafted evidence and supporting material.",
    description: "Detailed review of your drafted evidence and supporting material.",
    deliverable: "Written Evidence Feedback",
    highlights: ["Written evidence feedback"],
    focus: {
      heading: "The review focuses on",
      items: [
        "Criterion alignment",
        "Strength of claims",
        "Measurable impact",
        "Evidence supporting claims",
        "Individual contribution",
        "Unnecessary duplication",
        "Weak evidence",
        "Missing evidence",
        "Narrative clarity",
        "Consistency across application materials",
      ],
    },
  },
  {
    n: 4,
    title: "Refine & Finalise",
    phase: 2,
    lockedSummary: "Final review of your revised evidence package and application readiness.",
    description: "Review the revised evidence package, resolve outstanding issues and perform the final application readiness review.",
    deliverable: "Final Readiness Review",
    highlights: ["Final readiness review"],
  },
];

export const stageContent = (n: number) => STAGES[n - 1];

export const PROGRAMME_STATUSES = [
  { value: "NOT_INVITED", label: "Not invited" },
  { value: "INVITED", label: "Invitation sent" },
  { value: "ACCEPTED", label: "Invitation accepted" },
  { value: "PHASE_1_PAID", label: "Phase 1 paid" },
  { value: "PHASE_1_COMPLETE", label: "Phase 1 complete" },
  { value: "PHASE_2_PAID", label: "Phase 2 paid" },
  { value: "IN_PROGRESS", label: "In progress (Stage 4)" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Invitation expired" },
] as const;

export const programmeStatusLabel = (v: string) => PROGRAMME_STATUSES.find((s) => s.value === v)?.label ?? v;

export type StageState = { number: number; status: string; completedAt: Date | null; bookingStart: Date | null };
export type ProgrammeState = {
  acceptedAt: Date | null;
  declinedAt: Date | null;
  inviteExpiresAt: Date | null;
  phase1PaidAt: Date | null;
  phase2PaidAt: Date | null;
  completedAt: Date | null;
  stages: StageState[];
};

const stageOf = (p: ProgrammeState, n: number) => p.stages.find((s) => s.number === n);
export const stageDone = (p: ProgrammeState, n: number) => stageOf(p, n)?.status === "COMPLETED";

/**
 * Programme status is derived from facts (payments, completions) rather than set by hand,
 * so it can never drift out of step with the stages.
 */
export function deriveStatus(p: ProgrammeState, now = new Date()): string {
  if (p.completedAt) return "COMPLETED";
  if (!p.acceptedAt) {
    if (p.declinedAt) return "DECLINED";
    return p.inviteExpiresAt && p.inviteExpiresAt < now ? "EXPIRED" : "INVITED";
  }
  if (p.declinedAt && !p.phase1PaidAt) return "DECLINED";
  if (!p.phase1PaidAt) return "ACCEPTED";
  if (!stageDone(p, 2)) return "PHASE_1_PAID";
  if (!p.phase2PaidAt) return "PHASE_1_COMPLETE";
  if (!stageDone(p, 3)) return "PHASE_2_PAID";
  return "IN_PROGRESS";
}

/** The stage the client is currently working on (1–4), or null when nothing is open. */
export function currentStage(p: ProgrammeState): number | null {
  const open = [...p.stages].sort((a, b) => a.number - b.number).find((s) => s.status === "AVAILABLE" || s.status === "BOOKED");
  return open?.number ?? null;
}

/** Progress from completed stages — never from payment. */
export function progressPercent(p: ProgrammeState): number {
  return (p.stages.filter((s) => s.status === "COMPLETED").length / 4) * 100;
}

export function paidPence(p: Pick<ProgrammeState, "phase1PaidAt" | "phase2PaidAt">) {
  return (p.phase1PaidAt ? PHASE_1_PENCE : 0) + (p.phase2PaidAt ? PHASE_2_PENCE : 0);
}

/** Label for the admin record, e.g. Stage 1 "Not started" rather than "Available". */
export function stageStatusLabel(n: number, status: string, phasePaid: boolean): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "BOOKED") return "Booked";
  if (status === "AVAILABLE") return n === 1 || n === 3 ? "Not started" : "Available";
  return phasePaid ? "Locked" : "Locked (unpaid)";
}
