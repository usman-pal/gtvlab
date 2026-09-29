import { db } from "./db";
import { renderTemplate, whatsappText, reviewUrl, type TemplateLead } from "./email-templates";
import { unsubscribeToken } from "./security";
import { site } from "./site-config";
import { primaryStrength } from "./scoring";
import type { Lead } from "@prisma/client";

const DAY = 24 * 60 * 60 * 1000;

/** Sales nurture for A/B leads who haven't bought the review. */
const AB_SEQUENCE: [string, number][] = [
  ["nurture_d2", 2],
  ["nurture_d5", 5],
  ["nurture_d9", 9],
  ["nurture_d14", 14],
  ["nurture_d21", 21],
  ["nurture_d30", 30],
];
/** Educational sequence for C leads who opted in to guidance. No review upsell. */
const C_SEQUENCE: [string, number][] = [
  ["guide_welcome", 0],
  ["nurture_d2", 3],
  ["nurture_d5", 7],
  ["nurture_d21", 21],
];
/** Sales messages stop once the lead has paid or been closed. */
const SALES_TEMPLATES = new Set(["nurture_d2", "nurture_d5", "nurture_d9", "nurture_d14", "nurture_d21", "nurture_d30", "wa_initial", "wa_followup"]);
const CLOSED_STATUSES = new Set(["NOT_SUITABLE", "LOST"]);

export function toTemplateLead(l: Lead): TemplateLead {
  return {
    name: l.name,
    token: l.token,
    grade: l.grade,
    strengths: safeJson<string[]>(l.strengths, []),
    bookingStart: l.bookingStart,
    bookingTimezone: l.bookingTimezone,
    meetingUrl: l.meetingUrl,
    rescheduleUrl: l.rescheduleUrl,
    cancelUrl: l.cancelUrl,
  };
}

export function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function unsubscribeUrl(lead: Pick<Lead, "id">) {
  return `${site.url}/unsubscribe/${lead.id}.${unsubscribeToken(lead.id)}`;
}

// ---------------------------------------------------------------- scheduling

export async function scheduleAfterAssessment(lead: Lead) {
  const now = Date.now();
  const rows: { leadId: string; channel: string; template: string; sendAt: Date }[] = [];
  if (lead.grade === "A" || lead.grade === "B") {
    rows.push({ leadId: lead.id, channel: "email", template: "result_ab", sendAt: new Date(now) });
    for (const [t, d] of AB_SEQUENCE) rows.push({ leadId: lead.id, channel: "email", template: t, sendAt: new Date(now + d * DAY) });
    if (lead.consentWhatsapp && lead.whatsapp) {
      // One initial message (after a short pause so it doesn't land on top of the result page) + one follow-up.
      rows.push({ leadId: lead.id, channel: "whatsapp", template: "wa_initial", sendAt: new Date(now + 15 * 60 * 1000) });
      rows.push({ leadId: lead.id, channel: "whatsapp", template: "wa_followup", sendAt: new Date(now + 4 * DAY) });
    }
  }
  if (rows.length) await db.message.createMany({ data: rows });
  await processDue({ leadId: lead.id });
}

export async function scheduleGuidance(lead: Lead) {
  const exists = await db.message.findFirst({ where: { leadId: lead.id, template: "guide_welcome" } });
  if (exists) return;
  const now = Date.now();
  await db.message.createMany({
    data: C_SEQUENCE.map(([t, d]) => ({ leadId: lead.id, channel: "email", template: t, sendAt: new Date(now + d * DAY) })),
  });
  await processDue({ leadId: lead.id });
}

export async function queueOnce(leadId: string, template: string, delayMs = 0) {
  await db.message.create({ data: { leadId, channel: "email", template, sendAt: new Date(Date.now() + delayMs) } });
}

// ---------------------------------------------------------------- processing

/** Sends every queued message whose time has come. Called by the cron endpoint and inline after key events. */
export async function processDue(opts: { leadId?: string; limit?: number } = {}) {
  const due = await db.message.findMany({
    where: { status: "queued", sendAt: { lte: new Date() }, ...(opts.leadId ? { leadId: opts.leadId } : {}) },
    include: { lead: true },
    orderBy: { sendAt: "asc" },
    take: opts.limit ?? 100,
  });
  let sent = 0;
  for (const m of due) {
    const lead = m.lead;
    const skip = (reason: string) => db.message.update({ where: { id: m.id }, data: { status: "skipped", error: reason } });

    if (SALES_TEMPLATES.has(m.template) || m.template.startsWith("guide") || m.template.startsWith("nurture")) {
      if (lead.unsubscribed) { await skip("unsubscribed"); continue; }
      if (CLOSED_STATUSES.has(lead.status)) { await skip(`status ${lead.status}`); continue; }
      if (SALES_TEMPLATES.has(m.template) && lead.reviewPaidAt && lead.grade !== "C") { await skip("already purchased"); continue; }
    }
    if (m.template === "book_reminder" && lead.reviewBookedAt) { await skip("already booked"); continue; }

    try {
      if (m.channel === "email") {
        const r = renderTemplate(m.template, toTemplateLead(lead), unsubscribeUrl(lead));
        if (!r) { await skip("unknown template"); continue; }
        await sendEmail({ to: lead.email, ...r, unsubscribe: unsubscribeUrl(lead) });
        await db.message.update({ where: { id: m.id }, data: { status: "sent", sentAt: new Date() } });
      } else {
        if (m.template === "wa_followup" && lead.contactedAt) { await skip("already in conversation"); continue; }
        const res = await sendWhatsApp(lead, m.template);
        await db.message.update({ where: { id: m.id }, data: { status: res, sentAt: res === "sent" ? new Date() : null } });
      }
      sent++;
    } catch (e) {
      await db.message.update({ where: { id: m.id }, data: { status: "failed", error: String(e).slice(0, 500) } });
    }
  }
  return { processed: due.length, sent };
}

// ---------------------------------------------------------------- providers

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; unsubscribe?: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email:dev] to=${msg.to}\nsubject: ${msg.subject}\n${msg.text.slice(0, 600)}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Global Talent Lab <hello@globaltalentlab.services>",
      to: [msg.to],
      reply_to: msg.replyTo || process.env.EMAIL_REPLY_TO || site.contactEmail,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.unsubscribe
        ? { "List-Unsubscribe": `<${msg.unsubscribe.replace("/unsubscribe/", "/api/unsubscribe?sig=")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function notifyAdmin(subject: string, lines: string[]) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const text = lines.join("\n");
  try {
    await sendEmail({ to, subject: `[GTL] ${subject}`, text, html: `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>` });
  } catch (e) {
    console.error("admin notify failed", e);
  }
}

/**
 * WhatsApp Cloud API needs a pre-approved template for business-initiated messages.
 * Without API credentials the message is left as "manual" and shown in the admin
 * dashboard as a one-click wa.me link with the personalised text pre-filled.
 */
async function sendWhatsApp(lead: Lead, template: string): Promise<"sent" | "manual"> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tplName = template === "wa_followup" ? process.env.WHATSAPP_TEMPLATE_FOLLOWUP : process.env.WHATSAPP_TEMPLATE_INITIAL;
  if (!token || !phoneId || !tplName || !lead.whatsapp) return "manual";
  const strengths = safeJson<string[]>(lead.strengths, []);
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: lead.whatsapp.replace(/[^\d]/g, ""),
      type: "template",
      template: {
        name: tplName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_GB" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: lead.name.split(/\s+/)[0] },
              { type: "text", text: primaryStrength(strengths) },
              { type: "text", text: reviewUrl(lead.token) },
            ],
          },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
  return "sent";
}

export function waMeLink(lead: Lead, template: string) {
  const strengths = safeJson<string[]>(lead.strengths, []);
  const text = whatsappText(template, toTemplateLead(lead), primaryStrength(strengths));
  return `https://wa.me/${(lead.whatsapp || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}
