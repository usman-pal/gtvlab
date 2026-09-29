import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { fulfilPayment } from "@/lib/leads";

export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const paymentId = session.metadata?.paymentId;
      const payment = paymentId
        ? await db.payment.findUnique({ where: { id: paymentId } })
        : await db.payment.findUnique({ where: { stripeSessionId: session.id } });
      if (payment && typeof session.amount_total === "number" && session.amount_total !== payment.amountPence && payment.status !== "paid")
        await db.payment.update({ where: { id: payment.id }, data: { amountPence: session.amount_total } });
      if (payment) await fulfilPayment(payment.id, "stripe");
      else console.warn("Stripe session without matching payment", session.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await db.payment.updateMany({ where: { stripeSessionId: session.id, status: "pending" }, data: { status: "expired" } });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentId = charge.metadata?.paymentId;
    if (paymentId && charge.refunded) {
      const p = await db.payment.findUnique({ where: { id: paymentId } });
      if (p && p.status === "paid") {
        await db.payment.update({ where: { id: p.id }, data: { status: "refunded" } });
        if (p.leadId) await db.lead.update({ where: { id: p.leadId }, data: { revenuePence: { decrement: p.amountPence } } });
      }
    }
  }

  return NextResponse.json({ received: true });
}
