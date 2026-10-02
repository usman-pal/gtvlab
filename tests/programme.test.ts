import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStatus, currentStage, progressPercent, paidPence, writerOfferOpen, type ProgrammeState } from "../lib/programme-content.ts";

const day = 864e5;
const now = new Date("2026-10-02T12:00:00Z");
const stages = (...s: string[]) => s.map((status, i) => ({ number: i + 1, status, completedAt: status === "COMPLETED" ? now : null, bookingStart: null }));
const base: ProgrammeState = {
  acceptedAt: null,
  declinedAt: null,
  inviteExpiresAt: new Date(now.getTime() + day),
  phase1PaidAt: null,
  phase2PaidAt: null,
  completedAt: null,
  stages: stages("LOCKED", "LOCKED", "LOCKED", "LOCKED"),
};

test("invitation states", () => {
  assert.equal(deriveStatus(base, now), "INVITED");
  assert.equal(deriveStatus({ ...base, inviteExpiresAt: new Date(now.getTime() - 1) }, now), "EXPIRED");
  assert.equal(deriveStatus({ ...base, declinedAt: now }, now), "DECLINED");
  assert.equal(deriveStatus({ ...base, acceptedAt: now }, now), "ACCEPTED");
});

test("status follows payments and admin-completed stages", () => {
  const paid = { ...base, acceptedAt: now, phase1PaidAt: now };
  assert.equal(deriveStatus({ ...paid, stages: stages("AVAILABLE", "LOCKED", "LOCKED", "LOCKED") }, now), "PHASE_1_PAID");
  assert.equal(deriveStatus({ ...paid, stages: stages("COMPLETED", "BOOKED", "LOCKED", "LOCKED") }, now), "PHASE_1_PAID");
  assert.equal(deriveStatus({ ...paid, stages: stages("COMPLETED", "COMPLETED", "LOCKED", "LOCKED") }, now), "PHASE_1_COMPLETE");
  const p2 = { ...paid, phase2PaidAt: now };
  assert.equal(deriveStatus({ ...p2, stages: stages("COMPLETED", "COMPLETED", "AVAILABLE", "LOCKED") }, now), "PHASE_2_PAID");
  assert.equal(deriveStatus({ ...p2, stages: stages("COMPLETED", "COMPLETED", "COMPLETED", "AVAILABLE") }, now), "IN_PROGRESS");
  assert.equal(deriveStatus({ ...p2, completedAt: now, stages: stages("COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED") }, now), "COMPLETED");
});

test("a booked session never counts as progress", () => {
  const p = { ...base, stages: stages("COMPLETED", "BOOKED", "LOCKED", "LOCKED") };
  assert.equal(progressPercent(p), 25);
  assert.equal(currentStage(p), 2);
  assert.equal(currentStage({ ...base, stages: stages("COMPLETED", "COMPLETED", "LOCKED", "LOCKED") }), null);
});

test("paid totals", () => {
  assert.equal(paidPence(base), 0);
  assert.equal(paidPence({ phase1PaidAt: now, phase2PaidAt: null }), 99900);
  assert.equal(paidPence({ phase1PaidAt: now, phase2PaidAt: now }), 189900);
});

test("Hire a Writer is offered only while Stage 2 is open and not yet bought", () => {
  const p = { phase1PaidAt: now, writerPaidAt: null };
  assert.equal(writerOfferOpen({ ...p, stages: stages("AVAILABLE", "LOCKED", "LOCKED", "LOCKED") }), false);
  assert.equal(writerOfferOpen({ ...p, stages: stages("COMPLETED", "AVAILABLE", "LOCKED", "LOCKED") }), true);
  assert.equal(writerOfferOpen({ ...p, stages: stages("COMPLETED", "BOOKED", "LOCKED", "LOCKED") }), true);
  assert.equal(writerOfferOpen({ ...p, stages: stages("COMPLETED", "COMPLETED", "LOCKED", "LOCKED") }), false);
  assert.equal(writerOfferOpen({ ...p, writerPaidAt: now, stages: stages("COMPLETED", "BOOKED", "LOCKED", "LOCKED") }), false);
});
