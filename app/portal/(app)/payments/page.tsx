import type Stripe from "stripe";
import { requirePortalViewer } from "@/lib/client-auth";
import { loadPortal } from "@/lib/portal-data";
import { stripe } from "@/lib/stripe";
import { formatGBP } from "@/lib/site-config";
import { WRITER_PENCE, writerOfferOpen, PHASE_1_PENCE, PHASE_2_PENCE, PROGRAMME_TOTAL_PENCE, paidPence, stageDone } from "@/lib/programme-content";
import { PhaseCheckout, fmtDate } from "@/components/portal/StageCard";
import { Check } from "@/components/portal/marks";

/** Stripe-hosted receipt for a Checkout Session, if available. */
async function receiptUrl(sessionId: string | null): Promise<string | null> {
  const s = stripe();
  if (!s || !sessionId) return null;
  try {
    const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    const charge = (session.payment_intent as Stripe.PaymentIntent | null)?.latest_charge as Stripe.Charge | null;
    return charge?.receipt_url ?? null;
  } catch {
    return null;
  }
}

export default async function Payments({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await requirePortalViewer();
  const { programme: p, payments } = await loadPortal(viewer);
  if (!p) return <h1>Payments</h1>;
  const pay1 = payments.find((x) => x.product === "strategy_p1" && x.status === "paid");
  const pay2 = payments.find((x) => x.product === "strategy_p2" && x.status === "paid");
  const payW = payments.find((x) => x.product === "strategy_writer" && x.status === "paid");
  const [r1, r2, rW] = await Promise.all([receiptUrl(pay1?.stripeSessionId ?? null), receiptUrl(pay2?.stripeSessionId ?? null), receiptUrl(payW?.stripeSessionId ?? null)]);
  const paid = paidPence(p);
  const phase2Due = !!p.phase1PaidAt && !p.phase2PaidAt && stageDone(p, 2);

  const row = (label: string, sub: string, amount: number, paidAt: Date | null, receipt: string | null, due: boolean) => (
    <div className="pay-row">
      <div>
        <strong style={{ color: "var(--ink)" }}>{label}</strong>
        <div className="small muted">{sub}</div>
        {paidAt && (
          <div className="small muted">
            Paid {fmtDate(paidAt)}
            {receipt && <> · <a href={receipt} target="_blank" rel="noopener noreferrer">Stripe receipt</a></>}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="amt">{formatGBP(amount)}</div>
        {paidAt ? <span className="badge done"><Check /> Paid</span> : due ? <span className="badge due">Due</span> : <span className="badge locked">Not yet due</span>}
      </div>
    </div>
  );

  return (
    <>
      <h1>Payments</h1>
      {sp.checkout === "cancelled" && <div className="callout neutral" style={{ marginBottom: 16 }}>Checkout was cancelled — nothing was charged.</div>}
      <div className="card">
        <div className="pay-row">
          <strong style={{ color: "var(--ink)" }}>Programme total</strong>
          <span className="amt">{formatGBP(PROGRAMME_TOTAL_PENCE)}</span>
        </div>
        {row("Phase 1", "Stages 1–2 · Career Mapping, Evidence & Write-up Strategy", PHASE_1_PENCE, p.phase1PaidAt, r1, !!p.acceptedAt)}
        {row("Phase 2", "Stages 3–4 · Evidence Review, Refine & Finalise", PHASE_2_PENCE, p.phase2PaidAt, r2, phase2Due)}
        <div className="pay-row">
          <strong style={{ color: "var(--ink)" }}>Total paid</strong>
          <span className="amt">{formatGBP(paid)} / {formatGBP(PROGRAMME_TOTAL_PENCE)}</span>
        </div>
      </div>

      {(p.writerPaidAt || writerOfferOpen(p)) && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong style={{ color: "var(--ink)" }}>Optional add-ons</strong>
          {row("Hire a Writer", "Writer joins your Evidence & Write-up Strategy session", WRITER_PENCE, p.writerPaidAt, rW, false)}
          {!p.writerPaidAt && (
            <div style={{ marginTop: 4 }}>
              <PhaseCheckout phase="writer" label={`Hire a Writer — ${formatGBP(WRITER_PENCE)}`} preview={viewer.preview} className="btn btn-secondary" />
            </div>
          )}
        </div>
      )}

      {!p.phase1PaidAt && p.acceptedAt && (
        <div style={{ marginTop: 18 }}>
          <PhaseCheckout phase={1} label={`Start Programme — ${formatGBP(PHASE_1_PENCE)}`} preview={viewer.preview} />
        </div>
      )}
      {phase2Due && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Continue to Evidence Review &amp; Refinement</h3>
          <p className="small" style={{ margin: "4px 0 12px" }}>Remaining balance: <strong>{formatGBP(PHASE_2_PENCE)}</strong></p>
          <PhaseCheckout phase={2} label={`Continue Programme — ${formatGBP(PHASE_2_PENCE)}`} preview={viewer.preview} />
        </div>
      )}
      {p.phase1PaidAt && !p.phase2PaidAt && !phase2Due && (
        <p className="small muted" style={{ marginTop: 14 }}>The Phase 2 payment of {formatGBP(PHASE_2_PENCE)} becomes due once Phase 1 (Stages 1 and 2) is complete.</p>
      )}
    </>
  );
}
