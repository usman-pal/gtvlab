import { scoringConfig as defaultConfig, SCORING_VERSION, type ScoringConfig } from "./scoring-config.ts";

export type Grade = "A" | "B" | "C";

export type AssessmentAnswers = {
  profession: string;
  experience: string;
  seniority: string;
  evidence: string[];
  achievement: string;
};

export type ScoreResult = {
  /** 0–100, internal only */
  score: number;
  grade: Grade;
  /** Candidate-facing strengths ("✓ Senior technology experience") */
  strengths: string[];
  /** Internal explanation for the admin dashboard */
  notes: string[];
  outOfScope: boolean;
  version: string;
};

const MEASURABLE = /(\d|%|£|\$|€|\bmillion\b|\bbillion\b|\busers?\b|\bcustomers?\b|\brevenue\b|\bgrowth\b|\bsaved\b|\bincreased?\b|\breduced?\b)/i;

export function scoreAssessment(a: AssessmentAnswers, cfg: ScoringConfig = defaultConfig): ScoreResult {
  const notes: string[] = [];
  const evidence = Array.from(new Set(a.evidence ?? [])).filter((e) => e !== "none");
  const meaningfulEvidence = evidence.filter((e) => e !== "other");

  const pProf = cfg.profession[a.profession] ?? 0;
  const pExp = cfg.experience[a.experience] ?? 0;
  const pSen = cfg.seniority[a.seniority] ?? 0;
  const pEvRaw = evidence.reduce((sum, e) => sum + (cfg.evidence[e] ?? 0), 0);
  const pEv = Math.min(pEvRaw, cfg.evidenceCap);

  const text = (a.achievement ?? "").trim();
  let pAch = 0;
  if (text.length >= cfg.achievement.minChars) pAch += cfg.achievement.detailed;
  if (MEASURABLE.test(text)) pAch += cfg.achievement.measurable;

  const maxRaw =
    Math.max(...Object.values(cfg.profession)) +
    Math.max(...Object.values(cfg.experience)) +
    Math.max(...Object.values(cfg.seniority)) +
    cfg.evidenceCap +
    cfg.achievement.detailed +
    cfg.achievement.measurable;
  const raw = pProf + pExp + pSen + pEv + pAch;
  const score = Math.round((raw / maxRaw) * 100);

  notes.push(`profession +${pProf}`, `experience +${pExp}`, `seniority +${pSen}`, `evidence +${pEv}${pEvRaw > pEv ? ` (capped from ${pEvRaw})` : ""}`, `achievement +${pAch}`);

  const outOfScope = cfg.outOfScopeProfessions.includes(a.profession);
  const isSenior = cfg.seniorRoles.includes(a.seniority);
  const hasRecognition = evidence.some((e) => cfg.externalRecognition.includes(e));
  const hasImpact = evidence.some((e) => cfg.impactOrLeadership.includes(e));

  let grade: Grade;
  if (outOfScope) {
    grade = "C";
    notes.push("C: profession outside digital-tech specialism");
  } else if (meaningfulEvidence.length === 0) {
    grade = "C";
    notes.push("C: no meaningful evidence selected");
  } else if (
    score >= cfg.thresholds.a &&
    isSenior &&
    hasRecognition &&
    hasImpact &&
    meaningfulEvidence.length >= cfg.thresholds.aMinEvidenceTypes
  ) {
    grade = "A";
    notes.push("A: senior, impact/leadership + external recognition, multiple evidence types");
  } else if (score >= cfg.thresholds.b) {
    grade = "B";
    const missing = [
      !isSenior && "not yet senior",
      !hasRecognition && "no external recognition",
      !hasImpact && "no impact/leadership evidence",
      meaningfulEvidence.length < cfg.thresholds.aMinEvidenceTypes && "few evidence types",
      score < cfg.thresholds.a && `score below A threshold (${cfg.thresholds.a})`,
    ].filter(Boolean);
    notes.push(`B: ${missing.join(", ") || "borderline"}`);
  } else {
    grade = "C";
    notes.push(`C: score below B threshold (${cfg.thresholds.b})`);
  }

  return { score, grade, strengths: deriveStrengths(a, evidence), notes, outOfScope, version: SCORING_VERSION };
}

function deriveStrengths(a: AssessmentAnswers, evidence: string[]): string[] {
  const s: string[] = [];
  const seniorRole = ["senior", "lead", "manager", "director", "founder"].includes(a.seniority);
  const longCareer = ["7_10", "10_plus"].includes(a.experience);
  if (seniorRole && longCareer) s.push("Senior technology experience");
  else if (seniorRole || longCareer) s.push("Established technology career");
  if (evidence.includes("impact")) s.push("Product / business impact");
  if (evidence.includes("leadership") || ["manager", "director", "founder", "lead"].includes(a.seniority)) s.push("Technology leadership");
  if (evidence.includes("startup") || a.profession === "founder") s.push("Founder / start-up achievements");
  if (evidence.some((e) => ["awards", "media", "speaking"].includes(e))) s.push("External recognition");
  if (evidence.some((e) => ["publications", "patents"].includes(e))) s.push("Research or innovation");
  if (evidence.includes("open_source")) s.push("Open-source contribution");
  if (evidence.some((e) => ["mentoring_judging", "community"].includes(e))) s.push("Contribution to the tech community");
  return s;
}

/** A short phrase for personalised follow-ups ("particularly your …"). */
export function primaryStrength(strengths: string[]): string {
  const first = strengths[0];
  if (!first) return "technology career";
  return first.toLowerCase().replace(" / ", " and ");
}
