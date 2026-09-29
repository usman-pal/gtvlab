import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAssessment } from "../lib/scoring.ts";

const long = "Led the rebuild of our pricing platform used by 2 million customers, increasing revenue by 18% (£4m per year). ".repeat(2);

test("CTO / founder with recognition is A", () => {
  const r = scoreAssessment({ profession: "founder", experience: "10_plus", seniority: "founder", evidence: ["impact", "leadership", "awards", "startup"], achievement: long });
  assert.equal(r.grade, "A");
  assert.ok(r.strengths.includes("External recognition"));
});

test("Senior ML engineer with impact but no external recognition is B", () => {
  const r = scoreAssessment({ profession: "ai_ml", experience: "7_10", seniority: "senior", evidence: ["impact", "leadership"], achievement: long });
  assert.equal(r.grade, "B");
});

test("Early-career engineer with little evidence is C", () => {
  const r = scoreAssessment({ profession: "software", experience: "lt3", seniority: "junior", evidence: ["community"], achievement: "Won a hackathon." });
  assert.equal(r.grade, "C");
});

test("Early-career engineer is not auto-rejected on experience alone", () => {
  const r = scoreAssessment({ profession: "ai_ml", experience: "lt3", seniority: "mid", evidence: ["publications", "open_source", "speaking", "awards", "impact"], achievement: long });
  assert.notEqual(r.grade, "C");
});

test("Profession outside specialism is always C", () => {
  const r = scoreAssessment({ profession: "other", experience: "10_plus", seniority: "director", evidence: ["impact", "awards", "leadership", "media"], achievement: long });
  assert.equal(r.grade, "C");
  assert.equal(r.outOfScope, true);
});

test("No evidence is C", () => {
  const r = scoreAssessment({ profession: "software", experience: "10_plus", seniority: "lead", evidence: ["none"], achievement: long });
  assert.equal(r.grade, "C");
});

test("score is 0-100", () => {
  const r = scoreAssessment({ profession: "founder", experience: "10_plus", seniority: "founder", evidence: ["impact","leadership","awards","speaking","publications","open_source","mentoring_judging","startup","media","patents","compensation","community"], achievement: long });
  assert.ok(r.score <= 100 && r.score >= 90);
});
