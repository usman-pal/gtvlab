import { db } from "./db";
import { newToken } from "./security";
import { logEvent } from "./lifecycle";
import { notifyAdmin } from "./messaging";
import type { AdminIdentity } from "./auth";
import { deriveStatus, INVITE_TTL_DAYS, stageContent } from "./programme-content";
import * as mail from "./programme-emails";
import type { Lead, Payment, ProgrammeStage, StrategyProgramme } from "@prisma/client";

export type ProgrammeWithStages = StrategyProgramme & { stages: ProgrammeStage[] };
type Actor = { kind: string; name: string | null };
const asActor = (a: AdminIdentity): Actor => ({ kind: "admin", name: a.name });

export const loadProgramme = (leadId: string) =>
  db.strategyProgramme.findUnique({ where: { leadId }, include: { stages: { orderBy: { number: "asc" } } } });

const to = (lead: Pick<Lead, "id" | "name" | "email">, email?: string) => ({ leadId: lead.id, name: lead.name, email: email ?? lead.email });

/** ADMIN users may manage only clients assigned to them; super admins manage everyone. */
export function canManage(admin: AdminIdentity, p: Pick<StrategyProgramme, "assignedAdminId"> | null) {
  return admin.role === "SUPER_ADMIN" || !p || p.assignedAdminId === admin.id;
}

/** Recomputes and stores the derived status after any change. */
export async function syncStatus(programmeId: string) {
  const p = await db.strategyProgramme.findUniqueOrThrow({ where: { id: programmeId }, include: { stages: true } });
  const status = deriveStatus(p);
  if (status !== p.status) await db.strategyProgramme.update({ where: { id: p.id }, data: { status } });
  return status;
}

async function setStage(programmeId: string, n: number, data: Partial<ProgrammeStage>) {
  return db.programmeStage.update({ where: { programmeId_number: { programmeId, number: n } }, data });
}

// ---------------------------------------------------------------- invitation

const inviteExpiry = () => new Date(Date.now() + INVITE_TTL_DAYS * 864e5);

/** Creates the programme (or re-issues the invitation) and emails a fresh single-purpose link. */
export async function inviteLead(lead: Lead, admin: AdminIdentity, note: string | null) {
  const existing = await loadProgramme(lead.id);
  if (existing?.acceptedAt) throw new Error("This applicant has already accepted the invitation.");
  const token = newToken();
  const email = lead.email.trim().toLowerCase();
  const programme = existing
    ? await db.strategyProgramme.update({
        where: { id: existing.id },
        data: {
          inviteToken: token,
          inviteExpiresAt: inviteExpiry(),
          inviteEmail: email,
          inviteNote: note ?? existing.inviteNote,
          invitedAt: new Date(),
          invitedById: admin.id,
          invitedByName: admin.name,
          inviteSentCount: { increment: 1 },
          declinedAt: null,
        },
      })
    : await db.strategyProgramme.create({
        data: {
          leadId: lead.id,
          inviteEmail: email,
          inviteToken: token,
          inviteExpiresAt: inviteExpiry(),
          inviteNote: note,
          invitedById: admin.id,
          invitedByName: admin.name,
          assignedAdminId: admin.role === "ADMIN" ? admin.id : null,
          stages: { create: [1, 2, 3, 4].map((number) => ({ number })) },
        },
      });
  await syncStatus(programme.id);
  await logEvent(lead.id, "STRATEGY_INVITATION_SENT", "admin", admin.name, { email, resend: !!existing, expires: programme.inviteExpiresAt });
  await mail.sendInvitation(to(lead, email), token, programme.inviteNote);
  return programme;
}

/** A pending, unexpired invitation for this token — or null. */
export async function findInvitation(token: string) {
  if (!token || token.length < 20) return null;
  const p = await db.strategyProgramme.findUnique({ where: { inviteToken: token }, include: { lead: { include: { account: true } } } });
  if (!p || p.acceptedAt || p.declinedAt || !p.inviteExpiresAt || p.inviteExpiresAt < new Date()) return null;
  return p;
}

/** Links a new portal account to the existing applicant — never a duplicate lead. */
export async function acceptInvitation(token: string, passwordHash: string) {
  const p = await findInvitation(token);
  if (!p) return null;
  if (p.lead.account) return { programme: p, account: p.lead.account, existing: true };
  const now = new Date();
  // Claim the token atomically so a double-submit can't create two accounts.
  const claimed = await db.strategyProgramme.updateMany({ where: { id: p.id, inviteToken: token, acceptedAt: null }, data: { acceptedAt: now, inviteToken: null } });
  if (claimed.count === 0) return null;
  const account = await db.clientAccount.create({
    data: { leadId: p.leadId, email: p.inviteEmail, name: p.lead.name, passwordHash, emailVerifiedAt: now /* the invitation link proves the address */ },
  });
  await syncStatus(p.id);
  await logEvent(p.leadId, "PORTAL_ACCOUNT_CREATED", "client", p.lead.name, { email: p.inviteEmail });
  await notifyAdmin(`Strategy invitation accepted: ${p.lead.name}`, [`${p.lead.name} created their portal account.`, "Next: they can pay £999 to start Stage 1."]);
  return { programme: p, account, existing: false };
}

export async function declineInvitation(token: string) {
  const p = await findInvitation(token);
  if (!p) return false;
  await db.strategyProgramme.update({ where: { id: p.id }, data: { declinedAt: new Date(), inviteToken: null } });
  await syncStatus(p.id);
  await logEvent(p.leadId, "STRATEGY_INVITATION_DECLINED", "client", p.lead.name);
  await notifyAdmin(`Strategy invitation declined: ${p.lead.name}`, ["They chose not to continue for now. You can re-send the invitation from their record."]);
  return true;
}

export async function markDeclined(p: ProgrammeWithStages, admin: AdminIdentity) {
  if (p.phase1PaidAt) return;
  await db.strategyProgramme.update({ where: { id: p.id }, data: { declinedAt: new Date(), inviteToken: null } });
  await syncStatus(p.id);
  await logEvent(p.leadId, "STRATEGY_INVITATION_DECLINED", "admin", admin.name);
}

// ---------------------------------------------------------------- payments

/** Called from fulfilPayment once a programme payment flips to paid (Stripe webhook, verified redirect, or admin-recorded). */
export async function onProgrammePaymentPaid(payment: Payment, actor: string) {
  if (!payment.leadId) return;
  const p = await loadProgramme(payment.leadId);
  const lead = await db.lead.findUnique({ where: { id: payment.leadId } });
  if (!p || !lead) {
    await notifyAdmin("Programme payment without a programme", [`Payment ${payment.id} (${payment.product}) for lead ${payment.leadId} — invite them so the portal reflects it.`]);
    return;
  }
  const meta = { paymentId: payment.id, amount: payment.amountPence / 100, stripeSessionId: payment.stripeSessionId, provider: payment.provider };
  const now = new Date();
  if (payment.product === "strategy_p1" && !p.phase1PaidAt) {
    await db.strategyProgramme.update({ where: { id: p.id }, data: { phase1PaidAt: now } });
    await setStage(p.id, 1, { status: "AVAILABLE", unlockedAt: now });
    await syncStatus(p.id);
    await logEvent(lead.id, "PHASE_1_PAID", actor, null, meta);
    await mail.sendPhase1Paid(to(lead, p.inviteEmail));
  }
  if (payment.product === "strategy_writer" && !p.writerPaidAt) {
    await db.strategyProgramme.update({ where: { id: p.id }, data: { writerPaidAt: now } });
    await logEvent(lead.id, "WRITER_PURCHASED", actor, null, meta);
    await mail.sendWriterPurchased(to(lead, p.inviteEmail));
    await notifyAdmin(`Hire a Writer purchased: ${lead.name}`, ["Arrange for the writer to join their Session 2 (Evidence & Write-up Strategy)."]);
  }
  if (payment.product === "strategy_p2" && !p.phase2PaidAt) {
    await db.strategyProgramme.update({ where: { id: p.id }, data: { phase2PaidAt: now } });
    const stage2Done = p.stages.find((s) => s.number === 2)?.status === "COMPLETED";
    if (stage2Done) await setStage(p.id, 3, { status: "AVAILABLE", unlockedAt: now });
    await syncStatus(p.id);
    await logEvent(lead.id, "PHASE_2_PAID", actor, null, meta);
    await mail.sendPhase2Paid(to(lead, p.inviteEmail), stage2Done);
  }
}

// ---------------------------------------------------------------- stage progression (admin-controlled)

async function unlock(p: ProgrammeWithStages, n: number, completed: number | null, actor: Actor) {
  const s = p.stages.find((x) => x.number === n);
  if (!s || s.status !== "LOCKED") return;
  await setStage(p.id, n, { status: "AVAILABLE", unlockedAt: new Date() });
  if (n === 2 || n === 4) await logEvent(p.leadId, `STAGE_${n}_UNLOCKED`, actor.kind, actor.name);
  const lead = await db.lead.findUniqueOrThrow({ where: { id: p.leadId } });
  await mail.sendStageUnlocked(to(lead, p.inviteEmail), n, completed);
}

/** Manual override: open a stage without completing the previous one (the phase must be paid). */
export async function unlockStage(p: ProgrammeWithStages, n: 2 | 4, admin: AdminIdentity) {
  if (n === 2 && !p.phase1PaidAt) throw new Error("Phase 1 isn't paid.");
  if (n === 4 && !p.phase2PaidAt) throw new Error("Phase 2 isn't paid.");
  await unlock(p, n, null, asActor(admin));
  await syncStatus(p.id);
}

/** Marks a stage complete and opens what follows. Stage 4 completion is the programme completion. */
export async function completeStage(p: ProgrammeWithStages, n: 1 | 2 | 3, admin: AdminIdentity) {
  const s = p.stages.find((x) => x.number === n);
  if (!s || s.status === "COMPLETED") return;
  if (s.status === "LOCKED") throw new Error(`Stage ${n} hasn't been unlocked.`);
  await setStage(p.id, n, { status: "COMPLETED", completedAt: new Date(), completedByName: admin.name });
  await logEvent(p.leadId, `STAGE_${n}_COMPLETED`, "admin", admin.name, { deliverable: stageContent(n).deliverable });
  const fresh = (await loadProgramme(p.leadId))!;
  const lead = await db.lead.findUniqueOrThrow({ where: { id: p.leadId } });
  if (n === 1) await unlock(fresh, 2, 1, asActor(admin));
  if (n === 2) {
    if (fresh.phase2PaidAt) await unlock(fresh, 3, 2, asActor(admin));
    else await mail.sendPhase1Complete(to(lead, p.inviteEmail));
  }
  if (n === 3) await unlock(fresh, 4, 3, asActor(admin));
  await syncStatus(p.id);
}

export async function completeProgramme(p: ProgrammeWithStages, admin: AdminIdentity) {
  if (p.completedAt) return;
  const s4 = p.stages.find((x) => x.number === 4);
  if (!s4 || s4.status === "LOCKED") throw new Error("Stage 4 hasn't been unlocked.");
  const now = new Date();
  await setStage(p.id, 4, { status: "COMPLETED", completedAt: now, completedByName: admin.name });
  await db.strategyProgramme.update({ where: { id: p.id }, data: { completedAt: now, completedByName: admin.name } });
  await logEvent(p.leadId, "STAGE_4_COMPLETED", "admin", admin.name, { deliverable: stageContent(4).deliverable });
  await logEvent(p.leadId, "PROGRAMME_COMPLETED", "admin", admin.name);
  await syncStatus(p.id);
  const lead = await db.lead.findUniqueOrThrow({ where: { id: p.leadId } });
  await mail.sendProgrammeComplete(to(lead, p.inviteEmail));
}

export async function sendPhase2Reminder(p: ProgrammeWithStages, admin: AdminIdentity) {
  if (p.phase2PaidAt) return;
  const lead = await db.lead.findUniqueOrThrow({ where: { id: p.leadId } });
  await mail.sendPhase1Complete(to(lead, p.inviteEmail), true);
  await db.strategyProgramme.update({ where: { id: p.id }, data: { phase2ReminderAt: new Date() } });
  await logEvent(p.leadId, "PHASE_2_REMINDER_SENT", "admin", admin.name);
}

// ---------------------------------------------------------------- sessions (Cal.com)

export type StageBooking = { uid: string; start: Date; end: Date | null; timezone: string | null; meetingUrl: string | null; rescheduleUrl: string | null; cancelUrl: string | null };

/** Records a session booking. Booking never completes a stage — only an admin does. */
export async function recordStageBooking(stage: ProgrammeStage, b: StageBooking, actor: string) {
  if (stage.status === "LOCKED") throw new Error("stage locked");
  const first = !stage.bookedAt;
  const changed = stage.bookingUid !== b.uid || stage.bookingStart?.getTime() !== b.start.getTime();
  await db.programmeStage.update({
    where: { id: stage.id },
    data: {
      status: stage.status === "COMPLETED" ? "COMPLETED" : "BOOKED",
      bookedAt: stage.bookedAt ?? new Date(),
      bookingUid: b.uid,
      bookingStart: b.start,
      bookingEnd: b.end,
      bookingTimezone: b.timezone,
      meetingUrl: b.meetingUrl ?? stage.meetingUrl,
      rescheduleUrl: b.rescheduleUrl,
      cancelUrl: b.cancelUrl,
    },
  });
  if (!changed) return;
  const p = await db.strategyProgramme.findUniqueOrThrow({ where: { id: stage.programmeId }, include: { lead: true } });
  await logEvent(p.leadId, `SESSION_${stage.number}_BOOKED`, actor, null, { start: b.start.toISOString(), timezone: b.timezone, rescheduled: !first });
  await mail.sendSessionBooked(to(p.lead, p.inviteEmail), stage.number, b.start, b.timezone, b.meetingUrl);
  await notifyAdmin(`Session ${stage.number} ${first ? "booked" : "rescheduled"}: ${p.lead.name}`, [`${stageContent(stage.number).title}`, `When: ${b.start.toISOString()} (${b.timezone ?? "?"})`]);
}

export async function cancelStageBooking(stage: ProgrammeStage) {
  await db.programmeStage.update({
    where: { id: stage.id },
    data: { status: stage.status === "BOOKED" ? "AVAILABLE" : stage.status, bookingUid: null, bookingStart: null, bookingEnd: null, meetingUrl: null, rescheduleUrl: null, cancelUrl: null },
  });
  const p = await db.strategyProgramme.findUniqueOrThrow({ where: { id: stage.programmeId }, include: { lead: true } });
  await notifyAdmin(`Session ${stage.number} cancelled: ${p.lead.name}`, [stageContent(stage.number).title]);
}

/** Revenue split for the admin record, from paid Payment rows on the lead. */
export function revenueBreakdown(payments: Pick<Payment, "product" | "status" | "amountPence">[]) {
  const sum = (pred: (k: string) => boolean) => payments.filter((x) => x.status === "paid" && pred(x.product)).reduce((t, x) => t + x.amountPence, 0);
  return {
    review: sum((k) => k === "review"),
    phase1: sum((k) => k === "strategy_p1"),
    phase2: sum((k) => k === "strategy_p2"),
    writer: sum((k) => k === "strategy_writer"),
    other: sum((k) => !["review", "strategy_p1", "strategy_p2", "strategy_writer"].includes(k)),
    total: sum(() => true),
  };
}
