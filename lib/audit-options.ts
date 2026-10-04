// Application Audit screening questions (safe for client and server).
// Criteria wording follows the digital technology Global Talent criteria; keep it factual.

export type Opt = { value: string; label: string; hint?: string };

export const ROUTES: Opt[] = [
  { value: "talent", label: "Exceptional Talent", hint: "Recognised as a leading talent" },
  { value: "promise", label: "Exceptional Promise", hint: "Recognised as a potential leading talent" },
  { value: "unsure", label: "Not sure yet" },
];

export const CRITERIA: Opt[] = [
  { value: "oc1", label: "OC1 — Innovation", hint: "Track record of innovation as a founder, senior executive or employee working on a new digital product or field" },
  { value: "oc2", label: "OC2 — Recognition outside your immediate work", hint: "Contributions that advanced the sector beyond your day job (talks, open source, mentoring, judging…)" },
  { value: "oc3", label: "OC3 — Significant contributions", hint: "Significant technical, commercial or entrepreneurial contributions to the field" },
  { value: "oc4", label: "OC4 — Academic contributions", hint: "Research published or endorsed by an expert" },
  { value: "unsure", label: "Not sure yet" },
];

/** Readiness of each part of the application. */
export const PARTS: Opt[] = [
  { value: "evidence", label: "Evidence documents" },
  { value: "letters", label: "Recommendation letters" },
  { value: "statement", label: "Personal statement" },
];

export const READINESS: Opt[] = [
  { value: "ready", label: "Ready" },
  { value: "drafting", label: "In progress" },
  { value: "not_started", label: "Not started" },
];

export const YES_NO: Opt[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const SUBMIT_WHEN: Opt[] = [
  { value: "2w", label: "Within 2 weeks" },
  { value: "1m", label: "Within a month" },
  { value: "3m", label: "In 1–3 months" },
  { value: "later", label: "More than 3 months away" },
  { value: "unsure", label: "Not decided yet" },
];

export const CONCERNS_MAX = 1000;

export type AuditIntake = {
  route: string;
  criteria: string[];
  readiness: Record<string, string>;
  submitted: string;
  submitWhen: string;
  refused: string;
  concerns: string | null;
};

export const label = (opts: Opt[], v: string | undefined) => opts.find((o) => o.value === v)?.label ?? v ?? "—";

/** Human-readable rows for summaries (applicant page, admin record, emails). */
export function intakeRows(i: AuditIntake): [string, string][] {
  return [
    ["Route", label(ROUTES, i.route)],
    ["Criteria claimed", i.criteria.map((c) => label(CRITERIA, c).split(" — ")[0]).join(", ") || "—"],
    ...PARTS.map((p): [string, string] => [p.label, label(READINESS, i.readiness[p.value])]),
    ["Already submitted?", label(YES_NO, i.submitted)],
    ["Planning to submit", i.submitted === "yes" ? "Already submitted" : label(SUBMIT_WHEN, i.submitWhen)],
    ["Previous endorsement refusal?", label(YES_NO, i.refused)],
    ["Particular concerns", i.concerns || "—"],
  ];
}
