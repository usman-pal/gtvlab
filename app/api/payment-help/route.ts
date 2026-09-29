import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/messaging";
import { products, site, formatGBP, type ProductKey } from "@/lib/site-config";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hits = new Map<string, number[]>();

/**
 * "Having trouble paying?" — emails Global Talent Lab (reply-to = the candidate),
 * sends the candidate an acknowledgement, and logs a note + event on the lead.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token : "";
  const lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = Date.now();
  const recent = (hits.get(lead.id) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 3) return NextResponse.json({ error: `You've already sent us a message — we'll reply soon. You can also email ${site.contactEmail}.` }, { status: 429 });
  recent.push(now);
  hits.set(lead.id, recent);

  const message = typeof b.message === "string" ? b.message.trim().slice(0, 1500) : "";
  const country = typeof b.country === "string" ? b.country.trim().slice(0, 80) : "";
  if (message.length < 5) return NextResponse.json({ error: "Please tell us briefly what happened." }, { status: 422 });
  const product = products[b.product as ProductKey] ?? products.review;

  const lines = [
    `${lead.name} <${lead.email}> couldn't complete checkout.`,
    "",
    `Service: ${product.name} (${formatGBP(product.pricePence)})`,
    `Paying from: ${country || "not given"} · Country of residence: ${lead.country ?? "—"}`,
    `Grade: ${lead.grade} · Source: ${lead.utmSource ?? "direct"} / ${lead.utmCampaign ?? "—"}`,
    `WhatsApp: ${lead.whatsapp ?? "—"}`,
    "",
    "Their message:",
    message,
    "",
    `Lead: ${site.url}/admin/leads/${lead.id}`,
    "If you take payment another way, record it on the lead page (Payments → Record a payment taken outside Stripe) so revenue and attribution stay correct.",
    "Reply to this email to answer them directly.",
  ];
  const to = process.env.ADMIN_NOTIFY_EMAIL || site.contactEmail;
  try {
    await sendEmail({
      to,
      replyTo: lead.email,
      subject: `[GTL] Payment help: ${lead.name} (${country || lead.country || "country not given"})`,
      text: lines.join("\n"),
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc(lines.join("\n"))}</pre>`,
    });
  } catch (e) {
    console.error("payment help email failed", e);
    return NextResponse.json({ error: `Couldn't send — please email ${site.contactEmail}.` }, { status: 502 });
  }

  // Acknowledge to the candidate (non-blocking for the response).
  const first = lead.name.split(/\s+/)[0];
  const ack = [
    `Hi ${first},`,
    "",
    `Thanks for letting us know you had trouble paying for the ${product.name}. We'll reply within one working day with another way to pay.`,
    "",
    "Your message:",
    message,
    "",
    "— Global Talent Lab",
  ].join("\n");
  sendEmail({
    to: lead.email,
    subject: "We've received your payment question",
    text: ack,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;white-space:pre-wrap;line-height:1.6">${esc(ack)}</div>`,
  }).catch((e) => console.error("payment help ack failed", e));

  await db.note.create({ data: { leadId: lead.id, body: `[Payment help] ${product.name} · paying from ${country || "—"}\n${message}` } });
  await db.event.create({
    data: {
      name: "payment_help_requested",
      leadId: lead.id,
      visitorId: lead.visitorId,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      props: JSON.stringify({ product: product.key }),
    },
  });
  return NextResponse.json({ ok: true });
}
