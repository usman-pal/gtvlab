import { db } from "./db";
import { layout, first, type Block } from "./email-templates";
import { sendEmail } from "./messaging";
import { site, formatGBP, whatsappBusinessUrl } from "./site-config";
import { WRITER_CONFIRMATION, WRITER_PENCE, PROGRAMME_NAME, PHASE_1_PENCE, PHASE_2_PENCE, PROGRAMME_TOTAL_PENCE, STAGES, stageContent } from "./programme-content";

const portalUrl = (path = "") => `${site.url}/portal${path}`;
export const inviteUrl = (token: string) => `${site.url}/portal/invite/${token}`;

type To = { leadId: string; name: string; email: string };

/** Transactional programme emails: sent immediately and logged in the lead's message history. */
async function send(to: To, template: string, subject: string, blocks: Block[]) {
  const { html, text } = layout(blocks);
  const row = await db.message.create({ data: { leadId: to.leadId, channel: "email", template, sendAt: new Date(), status: "queued" } });
  try {
    await sendEmail({ to: to.email, subject, html, text });
    await db.message.update({ where: { id: row.id }, data: { status: "sent", sentAt: new Date() } });
  } catch (e) {
    await db.message.update({ where: { id: row.id }, data: { status: "failed", error: String(e).slice(0, 500) } });
    console.error(`programme email ${template} failed`, e);
  }
}

const wa = () => {
  const u = whatsappBusinessUrl();
  return u ? [{ small: `Questions between sessions? Message us on WhatsApp: ${u}` }] : [];
};

export function sendInvitation(to: To, token: string, note: string | null) {
  return send(to, "strategy_invite", "You've been invited to continue your Global Talent application", [
    { p: `Hi ${first(to.name)},` },
    { p: `Following your Eligibility Review, we'd like to invite you to continue with Global Talent Lab through our ${PROGRAMME_NAME}.` },
    ...(note ? [{ p: note }] : []),
    { h: "Four structured stages" },
    { list: STAGES.map((s) => `${s.n}. ${s.title} — ${s.deliverable}`) },
    {
      p: `The programme costs ${formatGBP(PROGRAMME_TOTAL_PENCE)}, split into two phases: ${formatGBP(PHASE_1_PENCE)} to begin Stages 1–2, and ${formatGBP(PHASE_2_PENCE)} before beginning Stages 3–4.`,
    },
    { p: "Create your private Global Talent Lab workspace to view the programme and decide whether you'd like to proceed." },
    { cta: { label: "View My Invitation", href: inviteUrl(token) } },
    { small: "This link is personal to you and expires in 21 days. If it has expired, reply to this email and we'll send a new one." },
  ]);
}

export function sendPhase1Paid(to: To) {
  return send(to, "strategy_phase1_paid", "Programme started — book your Career Mapping session", [
    { p: `Hi ${first(to.name)},` },
    { p: `Thank you — your ${formatGBP(PHASE_1_PENCE)} payment has been received and your ${PROGRAMME_NAME} has started. A receipt is on its way from Stripe.` },
    { p: `Stage 1 — Career Mapping is now open. The next step is to book Session 1 from your portal.` },
    { cta: { label: "Book Session 1", href: portalUrl("/sessions/1") } },
    { small: `${formatGBP(PHASE_1_PENCE)} covers Stages 1 & 2. The remaining ${formatGBP(PHASE_2_PENCE)} becomes payable before Stage 3.` },
    ...wa(),
  ]);
}

export function sendStageUnlocked(to: To, n: number, completed: number | null) {
  const s = stageContent(n);
  const done = completed ? stageContent(completed) : null;
  return send(to, `strategy_stage${n}_unlocked`, `Stage ${n} is open — ${s.title}`, [
    { p: `Hi ${first(to.name)},` },
    ...(done ? [{ p: `Stage ${done.n} — ${done.title} is complete. Your ${done.deliverable} is available in your application workspace.` }] : []),
    { p: `Stage ${n} — ${s.title} is now open. ${s.description}` },
    { cta: { label: `Book Session ${n}`, href: portalUrl(`/sessions/${n}`) } },
    ...wa(),
  ]);
}

export function sendPhase1Complete(to: To, reminder = false) {
  return send(to, reminder ? "strategy_phase2_reminder" : "strategy_phase1_complete", reminder ? "Continue to Evidence Review & Refinement" : "Phase 1 complete ✓", [
    { p: `Hi ${first(to.name)},` },
    reminder
      ? { p: "A quick reminder that the second phase of your programme is ready whenever you are." }
      : { p: "You've completed the strategy phase and now have your Criteria & Evidence Map and Personalised Application Write-up Plan." },
    { p: "The second phase covers detailed evidence review, written feedback, refinement and a final readiness review." },
    { p: `Remaining balance: ${formatGBP(PHASE_2_PENCE)}.` },
    { cta: { label: `Continue Programme — ${formatGBP(PHASE_2_PENCE)}`, href: portalUrl("/payments") } },
    ...wa(),
  ]);
}

export function sendPhase2Paid(to: To, stage3Open: boolean) {
  return send(to, "strategy_phase2_paid", "Payment received — Evidence Review is next", [
    { p: `Hi ${first(to.name)},` },
    { p: `Thank you — your ${formatGBP(PHASE_2_PENCE)} payment has been received. Total paid: ${formatGBP(PROGRAMME_TOTAL_PENCE)}. Balance: £0.` },
    stage3Open
      ? { p: "Stage 3 — Evidence Review is now open. Book Session 3 from your portal once your drafted evidence is in your workspace." }
      : { p: "Stage 3 — Evidence Review will open as soon as Stage 2 is signed off." },
    { cta: { label: stage3Open ? "Book Session 3" : "Open my portal", href: portalUrl(stage3Open ? "/sessions/3" : "") } },
    ...wa(),
  ]);
}

export function sendWriterPurchased(to: To) {
  return send(to, "strategy_writer_paid", "Writer services confirmed", [
    { p: `Hi ${first(to.name)},` },
    { p: `Thank you — your ${formatGBP(WRITER_PENCE)} payment for writer services has been received. A receipt is on its way from Stripe.` },
    { p: WRITER_CONFIRMATION },
    { cta: { label: "Book or view Session 2", href: portalUrl("/sessions/2") } },
    ...wa(),
  ]);
}

export function sendSessionBooked(to: To, n: number, start: Date, timezone: string | null, meetingUrl: string | null) {
  const s = stageContent(n);
  const when = start.toLocaleString("en-GB", { timeZone: timezone || "Europe/London", dateStyle: "full", timeStyle: "short" });
  return send(to, `strategy_session${n}_booked`, `Session ${n} booked — ${s.title}`, [
    { p: `Hi ${first(to.name)},` },
    { p: `Your Session ${n} — ${s.title} is booked for ${when} (${timezone || "Europe/London"}).` },
    ...(meetingUrl ? [{ p: `Video link: ${meetingUrl}` }] : [{ p: "The video link is in your calendar invitation." }]),
    { p: "Please make sure your latest working materials are in your application workspace before the session." },
    { cta: { label: "View my sessions", href: portalUrl("/sessions") } },
  ]);
}

export function sendProgrammeComplete(to: To) {
  return send(to, "strategy_programme_complete", "Application Strategy Programme complete ✓", [
    { p: `Hi ${first(to.name)},` },
    { p: `Congratulations — you've completed all four stages of the ${PROGRAMME_NAME}.` },
    { list: STAGES.map((s) => `✓ ${s.title}`) },
    { p: "Your application workspace remains available from your portal." },
    { cta: { label: "Open my portal", href: portalUrl() } },
    { small: "Submitting your application and the endorsement decision remain yours and the endorsing body's. We wish you every success." },
  ]);
}

export function sendPasswordReset(to: To, url: string) {
  return send(to, "portal_password_reset", "Reset your Global Talent Lab password", [
    { p: `Hi ${first(to.name)},` },
    { p: "We received a request to reset the password for your Global Talent Lab portal. This link works once and expires in 1 hour." },
    { cta: { label: "Choose a new password", href: url } },
    { small: "If you didn't ask for this, you can ignore this email — your password won't change." },
  ]);
}
