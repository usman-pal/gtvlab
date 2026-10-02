import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, site } from "@/lib/site-config";
import { stripe, mockPaymentsAllowed } from "@/lib/stripe";
import { requireClient } from "@/lib/client-auth";
import { loadProgramme } from "@/lib/programme";
import { logEvent } from "@/lib/lifecycle";
import { stageDone, writerOfferOpen } from "@/lib/programme-content";

const back = (path: string) => NextResponse.redirect(new URL(path, site.url), 303);

/**
 * Starts Stripe Checkout for Phase 1 (£999), Phase 2 (£900) or the optional Hire a Writer add-on (£250).
 * Nothing unlocks until the webhook confirms payment.
 */
export async function POST(req: Request) {
  const viewer = await requireClient();
  if (!viewer) return back("/portal/login");
  const form = await req.formData();
  const raw = String(form.get("phase"));
  const phase = raw === "writer" ? "writer" : raw === "2" ? 2 : 1;
  const product = products[phase === "writer" ? "strategy_writer" : phase === 1 ? "strategy_p1" : "strategy_p2"];

  const [lead, p] = await Promise.all([db.lead.findUnique({ where: { id: viewer.leadId } }), loadProgramme(viewer.leadId)]);
  if (!lead || !p || !p.acceptedAt || p.completedAt) return back("/portal");
  if (phase === 1 && p.phase1PaidAt) return back("/portal");
  if (phase === 2 && (p.phase2PaidAt || !p.phase1PaidAt || !stageDone(p, 2))) return back("/portal/payments");
  if (phase === "writer" && !writerOfferOpen(p)) return back("/portal");

  const payment = await db.payment.create({
    data: {
      leadId: lead.id,
      product: product.key,
      amountPence: product.pricePence,
      listPricePence: product.pricePence,
      customerEmail: viewer.email,
      // Attribution snapshot: the applicant's original first-touch source
      utmSource: lead.utmSource,
      utmCampaign: lead.utmCampaign,
    },
  });
  await logEvent(lead.id, phase === "writer" ? "WRITER_CHECKOUT_STARTED" : `PHASE_${phase}_CHECKOUT_STARTED`, "client", lead.name, { paymentId: payment.id, amount: product.pricePence / 100 });
  await db.event.create({
    data: { name: "checkout_started", leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign, props: JSON.stringify({ product: product.key }) },
  });

  const cancel = phase === 2 ? "/portal/payments?checkout=cancelled" : "/portal?checkout=cancelled";
  const s = stripe();
  if (s) {
    const session = await s.checkout.sessions.create({
      mode: "payment",
      customer_email: viewer.email,
      client_reference_id: lead.id,
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: product.pricePence, product_data: { name: product.name, description: product.duration } } }],
      metadata: {
        paymentId: payment.id,
        leadId: lead.id,
        product: product.key,
        utm_source: lead.utmSource ?? "",
        utm_medium: lead.utmMedium ?? "",
        utm_campaign: lead.utmCampaign ?? "",
        ref: lead.ref ?? "",
      },
      payment_intent_data: { metadata: { paymentId: payment.id, leadId: lead.id, product: product.key } },
      success_url: `${site.url}/portal?paid=${phase}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}${cancel}`,
    });
    await db.payment.update({ where: { id: payment.id }, data: { stripeSessionId: session.id } });
    return NextResponse.redirect(session.url!, 303);
  }

  if (mockPaymentsAllowed()) {
    const q = new URLSearchParams({ payment: payment.id, next: `/portal?paid=${phase}`, cancel });
    return back(`/dev/checkout?${q}`);
  }
  return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
}
