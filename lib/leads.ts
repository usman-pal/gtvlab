import { db } from "./db";
import { products, STATUS_RANK, type ProductKey, formatGBP } from "./site-config";
import { queueOnce, processDue, notifyAdmin } from "./messaging";
import type { Lead } from "@prisma/client";

/** Moves a lead forward in the pipeline (never backwards) and records the change. */
export async function advanceStatus(lead: Pick<Lead, "id" | "status">, to: string, actor = "system") {
  if ((STATUS_RANK[to] ?? 0) <= (STATUS_RANK[lead.status] ?? 0) && lead.status !== "NEW") return;
  await setStatus(lead, to, actor);
}

/** Sets status unconditionally (admin changes). */
export async function setStatus(lead: Pick<Lead, "id" | "status">, to: string, actor = "admin") {
  if (lead.status === to) return;
  const now = new Date();
  const stamp: Partial<Lead> = {};
  if (to === "CONTACTED") stamp.contactedAt = now;
  if (to === "REVIEW_COMPLETED") stamp.reviewCompletedAt = now;
  if (to === "LOST" || to === "NOT_SUITABLE" || to === "NO_RESPONSE") stamp.lostAt = now;
  if (to === "REVIEW_BOOKED") stamp.reviewBookedAt = now;
  await db.$transaction([
    db.lead.update({ where: { id: lead.id }, data: { status: to, ...stamp } }),
    db.statusChange.create({ data: { leadId: lead.id, from: lead.status, to, actor } }),
  ]);
}

export function gradeStatus(grade: string) {
  return grade === "A" ? "QUALIFIED_A" : grade === "B" ? "QUALIFIED_B" : "NURTURE_C";
}

/**
 * Idempotently marks a payment as paid and updates the lead.
 * Called from the Stripe webhook, the post-checkout redirect and the dev mock checkout.
 */
export async function fulfilPayment(paymentId: string, actor: "stripe" | "mock" | "admin" = "stripe") {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { lead: true } });
  if (!payment) throw new Error("payment not found");
  if (payment.status === "paid") return payment;

  // Guard against a double-fulfil race: only the call that flips pending→paid continues.
  const flipped = await db.payment.updateMany({ where: { id: paymentId, status: { not: "paid" } }, data: { status: "paid", paidAt: new Date() } });
  if (flipped.count === 0) return payment;

  const product = products[payment.product as ProductKey];
  const lead = payment.lead;
  if (lead && product) {
    const data: Partial<Lead> = { revenuePence: lead.revenuePence + payment.amountPence };
    if (product.paidField && !lead[product.paidField]) (data as Record<string, unknown>)[product.paidField] = new Date();
    await db.lead.update({ where: { id: lead.id }, data });
    await advanceStatus(lead, product.paidStatus, actor);

    await db.event.create({
      data: {
        name: product.key === "review" ? "review_purchased" : product.key === "strategy" ? "full_service_purchased" : "audit_purchased",
        leadId: lead.id,
        visitorId: lead.visitorId,
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        props: JSON.stringify({ product: product.key, value: payment.amountPence / 100 }),
      },
    });

    if (product.key === "review") {
      await queueOnce(lead.id, "review_paid");
      await queueOnce(lead.id, "book_reminder", 24 * 60 * 60 * 1000);
    } else {
      await queueOnce(lead.id, "purchase_confirmed");
    }
    await processDue({ leadId: lead.id });
  }
  await notifyAdmin(`Payment: ${product?.name ?? payment.product} ${formatGBP(payment.amountPence)}${payment.discountCode ? ` (code ${payment.discountCode}, ${payment.discountPercent}% off)` : ""}`, [
    `Lead: ${lead?.name ?? "—"} <${lead?.email ?? payment.customerEmail ?? "—"}>`,
    `Source: ${lead?.utmSource ?? "direct"} / ${lead?.utmCampaign ?? "—"}`,
    `Grade: ${lead?.grade ?? "—"}`,
  ]);
  return payment;
}

export type BookingInfo = {
  uid: string;
  start: Date;
  end?: Date | null;
  timezone?: string | null;
  meetingUrl?: string | null;
  rescheduleUrl?: string | null;
  cancelUrl?: string | null;
};

export async function recordBooking(lead: Lead, b: BookingInfo, actor = "cal") {
  const firstBooking = !lead.bookingUid;
  const isNew = lead.bookingUid !== b.uid;
  const updated = await db.lead.update({
    where: { id: lead.id },
    data: {
      bookingUid: b.uid,
      bookingStart: b.start,
      bookingEnd: b.end ?? null,
      bookingTimezone: b.timezone ?? null,
      meetingUrl: b.meetingUrl ?? null,
      rescheduleUrl: b.rescheduleUrl ?? null,
      cancelUrl: b.cancelUrl ?? null,
      reviewBookedAt: lead.reviewBookedAt ?? new Date(),
    },
  });
  await advanceStatus(lead, "REVIEW_BOOKED", actor);
  if (firstBooking) {
    await db.event.create({
      data: { name: "calendar_booking_completed", leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign },
    });
  }
  // Mock/client confirmations arrive first; a real reschedule changes the uid. Re-send details only when meaningful.
  if (isNew && (firstBooking || !lead.bookingUid?.startsWith("mock_"))) {
    await queueOnce(lead.id, "booking_confirmed");
    await processDue({ leadId: lead.id });
    await notifyAdmin(`Review ${firstBooking ? "booked" : "rescheduled"}: ${lead.name}`, [`When: ${b.start.toISOString()} (${b.timezone ?? "?"})`, `Paid: ${lead.reviewPaidAt ? "yes" : "NO — check payment"}`, `Grade: ${lead.grade}`]);
  }
  return updated;
}
