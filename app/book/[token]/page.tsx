import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { fulfilPayment } from "@/lib/leads";
import { calLink, calOrigin, mockBookingAllowed } from "@/lib/cal";
import { Header } from "@/components/SiteChrome";
import PayButton from "@/components/PayButton";
import PurchaseTracker from "@/components/PurchaseTracker";
import { CalBooking, MockBooking } from "./BookingWidget";
import { products, formatGBP, site } from "@/lib/site-config";

export const metadata: Metadata = { title: "Choose your review time", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  let lead = await db.lead.findUnique({ where: { token } });
  if (!lead) notFound();

  // Webhook fallback: if the customer lands here before Stripe's webhook, verify the session directly.
  if (!lead.reviewPaidAt && sp.session_id) {
    const s = stripe();
    if (s) {
      try {
        const session = await s.checkout.sessions.retrieve(sp.session_id);
        if (session.payment_status === "paid" && session.client_reference_id === lead.id && session.metadata?.paymentId) {
          await fulfilPayment(session.metadata.paymentId, "stripe");
          lead = await db.lead.findUnique({ where: { token } });
        }
      } catch (e) {
        console.error("session verify failed", e);
      }
    }
  }
  if (!lead) notFound();
  if (lead.reviewBookedAt && lead.bookingStart) redirect(`/book/${token}/confirmed`);

  const justPaid = !!sp.session_id || !!lead.reviewPaidAt;
  const paidReview = lead.reviewPaidAt ? await db.payment.findFirst({ where: { leadId: lead.id, product: "review", status: "paid" }, orderBy: { paidAt: "desc" } }) : null;

  return (
    <>
      <Header minimal />
      <main className="section" style={{ paddingTop: 28 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          {lead.reviewPaidAt ? (
            <>
              <PurchaseTracker event="review_purchased" value={(paidReview?.amountPence ?? products.review.pricePence) / 100} onceKey={`rp_${lead.id}`} />
              <div className="callout" style={{ marginBottom: 20 }}>
                <strong>Payment received — thank you.</strong> A receipt is on its way to {lead.email}.
              </div>
              <span className="eyebrow">Step 2 of 2</span>
              <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)" }}>Choose a time for your review</h1>
              <p className="muted">30-minute video call. Times are shown in your local timezone. You&apos;ll get a confirmation email with the video link and a rescheduling link.</p>
              {calLink ? (
                <CalBooking token={lead.token} name={lead.name} email={lead.email} calLink={calLink} calOrigin={calOrigin} />
              ) : mockBookingAllowed() ? (
                <MockBooking token={lead.token} />
              ) : (
                <div className="card">
                  <p>Our online calendar is temporarily unavailable. We&apos;ve been notified and will email you within one working day with times — or email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</p>
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
              {justPaid ? (
                <>
                  <h1 style={{ fontSize: "1.5rem" }}>Confirming your payment…</h1>
                  <p>This usually takes a few seconds. <a href={`/book/${lead.token}${sp.session_id ? `?session_id=${encodeURIComponent(sp.session_id)}` : ""}`}>Refresh this page</a>.</p>
                  <meta httpEquiv="refresh" content="4" />
                </>
              ) : (
                <>
                  <h1 style={{ fontSize: "1.5rem" }}>Personal Eligibility Review — {formatGBP(products.review.pricePence)}</h1>
                  <p>Pay securely, then choose your appointment straight away.</p>
                  <PayButton token={lead.token} product="review" label={`Pay ${formatGBP(products.review.pricePence)} and choose a time`} />
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
