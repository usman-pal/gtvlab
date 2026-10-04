import { db } from "./db";

/**
 * Typed lifecycle events for the admin Lifecycle panel (alongside the lead's original
 * funnel timestamps). Every event belongs to the same Lead, so attribution is preserved.
 */
export const LIFECYCLE_LABELS: Record<string, string> = {
  ELIGIBILITY_REVIEW_COMPLETED: "Eligibility Review completed",
  AUDIT_INTAKE_SUBMITTED: "Application Audit questions answered",
  AUDIT_BOOKED: "Application Audit booked",
  AUDIT_CANCELLED: "Application Audit booking cancelled",
  STRATEGY_INVITATION_SENT: "Strategy invitation sent",
  STRATEGY_INVITATION_DECLINED: "Strategy invitation declined",
  PORTAL_ACCOUNT_CREATED: "Portal account created",
  PHASE_1_CHECKOUT_STARTED: "Phase 1 checkout started",
  PHASE_1_PAID: "Phase 1 paid (£999)",
  SESSION_1_BOOKED: "Session 1 booked",
  STAGE_1_COMPLETED: "Stage 1 completed — Career Mapping",
  STAGE_2_UNLOCKED: "Stage 2 unlocked",
  SESSION_2_BOOKED: "Session 2 booked",
  WRITER_CHECKOUT_STARTED: "Hire a Writer checkout started",
  WRITER_PURCHASED: "Hire a Writer purchased (£250)",
  STAGE_2_COMPLETED: "Stage 2 completed — Phase 1 complete",
  PHASE_2_REMINDER_SENT: "Phase 2 payment reminder sent",
  PHASE_2_CHECKOUT_STARTED: "Phase 2 checkout started",
  PHASE_2_PAID: "Phase 2 paid (£900)",
  SESSION_3_BOOKED: "Session 3 booked",
  STAGE_3_COMPLETED: "Stage 3 completed — Evidence Review",
  STAGE_4_UNLOCKED: "Stage 4 unlocked",
  SESSION_4_BOOKED: "Session 4 booked",
  STAGE_4_COMPLETED: "Stage 4 completed — Refine & Finalise",
  PROGRAMME_COMPLETED: "Programme completed",
  DRIVE_WORKSPACE_SET: "Google Drive workspace set",
};

export async function logEvent(leadId: string, type: string, actor = "system", actorName?: string | null, meta?: Record<string, unknown>) {
  await db.lifecycleEvent.create({ data: { leadId, type, actor, actorName: actorName ?? null, meta: meta ? JSON.stringify(meta) : null } });
}
