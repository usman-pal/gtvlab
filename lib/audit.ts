import { db } from "./db";
import { layout, first } from "./email-templates";
import { sendEmail, notifyAdmin } from "./messaging";
import { logEvent } from "./lifecycle";
import { site } from "./site-config";
import type { Lead } from "@prisma/client";

export const auditUrl = (token: string) => `${site.url}/audit/${token}`;

export type AuditBookingInfo = {
  uid: string;
  start: Date;
  end: Date | null;
  timezone: string | null;
  meetingUrl: string | null;
  rescheduleUrl: string | null;
  cancelUrl: string | null;
};

export const loadAuditBooking = (leadId: string) => db.serviceBooking.findUnique({ where: { leadId_product: { leadId, product: "audit" } } });

/** Records (or reschedules) the Application Audit call. Emails the applicant only when the time actually changes. */
export async function recordAuditBooking(lead: Lead, b: AuditBookingInfo, actor: string) {
  const existing = await loadAuditBooking(lead.id);
  const changed = existing?.uid !== b.uid || existing?.start?.getTime() !== b.start.getTime();
  const data = {
    uid: b.uid,
    start: b.start,
    end: b.end,
    timezone: b.timezone,
    meetingUrl: b.meetingUrl ?? existing?.meetingUrl ?? null,
    rescheduleUrl: b.rescheduleUrl,
    cancelUrl: b.cancelUrl,
    bookedAt: existing?.bookedAt ?? new Date(),
  };
  await db.serviceBooking.upsert({ where: { leadId_product: { leadId: lead.id, product: "audit" } }, create: { leadId: lead.id, product: "audit", ...data }, update: data });
  if (!changed) return;

  const first_ = !existing?.uid;
  await logEvent(lead.id, "AUDIT_BOOKED", actor, null, { start: b.start.toISOString(), timezone: b.timezone, rescheduled: !first_ });
  if (first_) {
    await db.event.create({ data: { name: "audit_booking_completed", leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign } });
  }
  await sendAuditBooked(lead, b);
  await notifyAdmin(`Application Audit ${first_ ? "booked" : "rescheduled"}: ${lead.name}`, [
    `When: ${b.start.toISOString()} (${b.timezone ?? "?"})`,
    `Paid: ${lead.auditPurchasedAt ? "yes" : "NO — check payment"}`,
    `${site.url}/admin/leads/${lead.id}`,
  ]);
}

export async function cancelAuditBooking(leadId: string, uid: string) {
  const b = await loadAuditBooking(leadId);
  if (!b || b.uid !== uid) return;
  await db.serviceBooking.update({ where: { id: b.id }, data: { uid: null, start: null, end: null, meetingUrl: null, rescheduleUrl: null, cancelUrl: null } });
  await logEvent(leadId, "AUDIT_CANCELLED", "cal");
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
  await notifyAdmin(`Application Audit cancelled: ${lead?.name ?? leadId}`, [`Booking ${uid} was cancelled. They can rebook from their audit page.`]);
}

async function sendAuditBooked(lead: Lead, b: AuditBookingInfo) {
  const tz = b.timezone || "Europe/London";
  const when = b.start.toLocaleString("en-GB", { timeZone: tz, dateStyle: "full", timeStyle: "short" });
  const { html, text } = layout([
    { p: `Hi ${first(lead.name)},` },
    { p: `Your Application Audit is booked for ${when} (${tz}). It's a 90-minute video call.` },
    ...(b.meetingUrl ? [{ p: `Video link: ${b.meetingUrl}` }] : [{ p: "The video link is in your calendar invitation." }]),
    { h: "Before the call" },
    {
      list: [
        `Share your application materials — evidence documents, recommendation letters and personal statement — at least 3 working days before the call. Reply to this email with a Google Drive / OneDrive link, or send them to ${site.contactEmail}.`,
        "Include anything you're unsure about, so we can focus the call on it.",
      ],
    },
    { cta: { label: "View my audit booking", href: auditUrl(lead.token) } },
    { small: "The audit is coaching on your application materials. It is not immigration or legal advice and does not guarantee endorsement." },
  ]);
  const row = await db.message.create({ data: { leadId: lead.id, channel: "email", template: "audit_booked", sendAt: new Date() } });
  try {
    await sendEmail({ to: lead.email, subject: "Your Application Audit is booked", html, text });
    await db.message.update({ where: { id: row.id }, data: { status: "sent", sentAt: new Date() } });
  } catch (e) {
    await db.message.update({ where: { id: row.id }, data: { status: "failed", error: String(e).slice(0, 500) } });
  }
}
