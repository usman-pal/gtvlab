import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { fulfilPayment } from "@/lib/leads";
import { safeJson } from "@/lib/messaging";
import { loadAuditBooking } from "@/lib/audit";
import { intakeRows, type AuditIntake } from "@/lib/audit-options";
import { calAuditLink, calOrigin, mockAuditBookingAllowed } from "@/lib/cal";
import { products, formatGBP, site } from "@/lib/site-config";
import { Header, Footer } from "@/components/SiteChrome";
import PayButton from "@/components/PayButton";
import PurchaseTracker from "@/components/PurchaseTracker";
import LocalTime from "@/components/LocalTime";
import { CalBooking, MockBooking } from "@/app/book/[token]/BookingWidget";

export const metadata: Metadata = { title: "Your Application Audit", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Short, factual notes based on the screening answers. */
function notes(i: AuditIntake): string[] {
  const n: string[] = [];
  if (i.refused === "yes") n.push("As you've had a previous refusal, please include the refusal letter — we'll check whether the feedback has been addressed.");
  if (i.submitted === "yes") n.push("As you've already submitted, we'll focus on what to strengthen if you need to respond or reapply.");
  if (i.submitWhen === "2w") n.push("With submission within 2 weeks, book the earliest slot that works and send your materials as soon as you can.");
  const notStarted = Object.values(i.readiness).filter((r) => r === "not_started").length;
  if (notStarted >= 2) n.push("Several parts aren't started yet. The audit works best once you have drafts — you may get more value from booking it when they're ready.");
  if (i.criteria.includes("unsure")) n.push("Not sure which criteria to claim? We'll look at which two your evidence supports best.");
  return n;
}

export default async function AuditPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  let lead = await db.lead.findUnique({ where: { token } });
  if (!lead) notFound();

  // Webhook fallback after the Stripe redirect: verify the session server-side with Stripe.
  if (!lead.auditPurchasedAt && sp.session_id) {
    const s = stripe();
    if (s) {
      try {
        const session = await s.checkout.sessions.retrieve(sp.session_id);
        if (session.payment_status === "paid" && session.client_reference_id === lead.id && session.metadata?.paymentId && session.metadata.product === "audit") {
          await fulfilPayment(session.metadata.paymentId, "stripe");
          lead = (await db.lead.findUnique({ where: { token } }))!;
        }
      } catch (e) {
        console.error("audit session verify failed", e);
      }
    }
  }

  const audit = products.audit;
  const intake = safeJson<AuditIntake | null>(lead.auditIntake, null);
  const booking = await loadAuditBooking(lead.id);
  const paid = !!lead.auditPurchasedAt;
  const booked = !!booking?.start;
  const paidRow = paid ? await db.payment.findFirst({ where: { leadId: lead.id, product: "audit", status: "paid" }, orderBy: { paidAt: "desc" } }) : null;

  return (
    <>
      <Header minimal />
      <main className="section" style={{ paddingTop: 28 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          {paid && <PurchaseTracker event="audit_purchased" value={(paidRow?.amountPence ?? audit.pricePence) / 100} onceKey={`audit_${lead.id}`} />}

          {/* ---------------------------------------------------------------- booked */}
          {paid && booked && booking?.start && (
            <div className="narrow" style={{ margin: "0 auto" }}>
              <span className="grade-chip v-a">Booked</span>
              <h1 style={{ fontSize: "clamp(1.7rem,4.5vw,2.3rem)" }}>Your Application Audit is booked</h1>
              <p className="lead">We&apos;ve emailed the details to {lead.email}. A calendar invitation is on its way too.</p>
              <div className="card" style={{ marginTop: 18 }}>
                <dl className="kv" style={{ gridTemplateColumns: "120px 1fr" }}>
                  <dt>Date &amp; time</dt>
                  <dd><LocalTime iso={booking.start.toISOString()} fallbackTz={booking.timezone ?? "Europe/London"} /></dd>
                  <dt>Duration</dt>
                  <dd>90 minutes</dd>
                  <dt>Video call</dt>
                  <dd>{booking.meetingUrl ? <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">{booking.meetingUrl}</a> : "The video link is in your calendar invitation and confirmation email."}</dd>
                  {booking.rescheduleUrl && (
                    <>
                      <dt>Need to change?</dt>
                      <dd>
                        <a href={booking.rescheduleUrl} target="_blank" rel="noopener noreferrer">Reschedule</a>
                        {booking.cancelUrl && <> · <a href={booking.cancelUrl} target="_blank" rel="noopener noreferrer">Cancel</a></>}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <h3>Before the call</h3>
                <ul className="checks">
                  <li>
                    Share your evidence documents, recommendation letters and personal statement <strong>at least 3 working days before the call</strong> — reply to your confirmation
                    email with a Google Drive / OneDrive link, or email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
                  </li>
                  {intake?.refused === "yes" && <li>Include your refusal letter.</li>}
                  <li>Note anything you&apos;re unsure about so we can focus the call on it.</li>
                </ul>
                <p className="xs muted" style={{ margin: 0 }}>The audit is coaching on your application materials. It isn&apos;t immigration or legal advice and doesn&apos;t guarantee endorsement.</p>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- paid, choose a time */}
          {paid && !booked && (
            <>
              <div className="callout" style={{ marginBottom: 20 }}>
                <strong>Payment received — thank you.</strong> A receipt is on its way to {lead.email}.
              </div>
              <span className="eyebrow">Step 2 of 2</span>
              <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)" }}>Choose a time for your Application Audit</h1>
              <p className="muted">90-minute video call. Times are shown in your local timezone. Please pick a time that leaves at least 3 working days to share your materials beforehand.</p>
              {calAuditLink ? (
                <CalBooking token={lead.token} name={lead.name} email={lead.email} calLink={calAuditLink} calOrigin={calOrigin} metadata={{ auditLeadToken: lead.token }} confirmPath="/api/audit/booking" redirectTo={`/audit/${lead.token}`} />
              ) : mockAuditBookingAllowed() ? (
                <MockBooking token={lead.token} minutes={90} confirmPath="/api/audit/booking" redirectTo={`/audit/${lead.token}`} />
              ) : (
                <div className="card">
                  <p style={{ margin: 0 }}>
                    Our online calendar is temporarily unavailable. We&apos;ve been notified and will email you within one working day with times — or email{" "}
                    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ---------------------------------------------------------------- not paid yet */}
          {!paid && (
            <>
              {sp.paid && (
                <div className="callout warn" style={{ marginBottom: 20 }}>
                  <strong>Confirming your payment…</strong> This usually takes a few seconds. <Link href={`/audit/${lead.token}`}>Refresh</Link>.
                  <meta httpEquiv="refresh" content={`4;url=/audit/${lead.token}`} />
                </div>
              )}
              {sp.checkout === "cancelled" && <div className="callout neutral" style={{ marginBottom: 20 }}>Checkout was cancelled — nothing was charged.</div>}
              <span className="eyebrow">Step 2 of 2</span>
              <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)" }}>Your Application Audit</h1>
              <p className="lead">Thanks, {lead.name.split(/\s+/)[0]}. Here&apos;s the service that fits where your application is now.</p>

              <div className="grid g2" style={{ marginTop: 20, alignItems: "start" }}>
                <div className="card offer" id="pay">
                  <h3>{audit.name}</h3>
                  <p className="price">{formatGBP(audit.pricePence)}</p>
                  <p className="small muted" style={{ marginTop: -6 }}>{audit.duration} · one-off payment</p>
                  <ul className="checks">{audit.deliverables.map((x) => <li key={x}>{x}</li>)}</ul>
                  <PayButton token={lead.token} product="audit" label={`Pay ${formatGBP(audit.pricePence)} and choose a time`} codeError={sp.code_product === "audit" ? sp.code_error : undefined} />
                  <p className="xs muted" style={{ margin: "12px 0 0" }}>Pay securely with Stripe, then pick your call time straight away.</p>
                </div>

                {intake && (
                  <div className="stack">
                    <div className="card">
                      <h3>Your answers</h3>
                      <dl className="kv small" style={{ gridTemplateColumns: "150px 1fr" }}>
                        {intakeRows(intake).map(([k, v]) => (
                          <div key={k} style={{ display: "contents" }}>
                            <dt>{k}</dt>
                            <dd style={{ whiteSpace: "pre-wrap" }}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="xs muted" style={{ margin: "12px 0 0" }}>Something wrong? <Link href="/audit#questions">Answer again</Link>.</p>
                    </div>
                    {notes(intake).length > 0 && (
                      <div className="callout neutral small">
                        <ul style={{ margin: 0, paddingLeft: 18 }}>{notes(intake).map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="xs muted" style={{ marginTop: 24 }}>{site.scopeNote}</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
