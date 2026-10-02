import { notFound } from "next/navigation";
import { db } from "./db";
import { stripe } from "./stripe";
import { fulfilPayment } from "./leads";
import type { PortalViewer } from "./client-auth";

/** Everything a portal page needs for the signed-in client (or the previewed client). */
export async function loadPortal(viewer: PortalViewer) {
  const lead = await db.lead.findUnique({
    where: { id: viewer.leadId },
    include: {
      programme: { include: { stages: { orderBy: { number: "asc" } } } },
      payments: { where: { product: { in: ["strategy_p1", "strategy_p2", "strategy_writer"] }, status: { in: ["paid", "refunded"] } }, orderBy: { paidAt: "asc" } },
    },
  });
  if (!lead) notFound();
  return { lead, programme: lead.programme, payments: lead.payments };
}

export type PortalData = Awaited<ReturnType<typeof loadPortal>>;

/**
 * Webhook fallback after the Stripe redirect: verify the Checkout Session server-side with Stripe
 * (never trusting the URL alone) in case the webhook hasn't arrived yet.
 */
export async function verifyReturnedSession(leadId: string, sessionId: string | undefined) {
  const s = stripe();
  if (!s || !sessionId) return;
  try {
    const session = await s.checkout.sessions.retrieve(sessionId);
    const paymentId = session.metadata?.paymentId;
    if (session.payment_status !== "paid" || session.client_reference_id !== leadId || !paymentId) return;
    const p = await db.payment.findUnique({ where: { id: paymentId } });
    if (p && p.leadId === leadId && p.stripeSessionId === session.id) await fulfilPayment(p.id, "stripe");
  } catch (e) {
    console.error("portal session verify failed", e);
  }
}
