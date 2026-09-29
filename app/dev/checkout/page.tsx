import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { mockPaymentsAllowed } from "@/lib/stripe";
import { products, formatGBP, type ProductKey } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/** Stand-in for Stripe Checkout when STRIPE_SECRET_KEY isn't set (never available in production). */
export default async function MockCheckout({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!mockPaymentsAllowed()) notFound();
  const sp = await searchParams;
  const payment = sp.payment ? await db.payment.findUnique({ where: { id: sp.payment }, include: { lead: true } }) : null;
  if (!payment) notFound();
  const product = products[payment.product as ProductKey];
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="callout warn small" style={{ marginBottom: 16 }}>
          <strong>Development mock.</strong> Set <code>STRIPE_SECRET_KEY</code> to use real Stripe Checkout.
        </div>
        <div className="card">
          <p className="muted small">Global Talent Lab</p>
          <h1 style={{ fontSize: "1.4rem" }}>{product.name}</h1>
          <p className="price" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ink)" }}>{formatGBP(payment.amountPence)}</p>
          <p className="small muted">{payment.lead?.email}</p>
          <form action="/api/dev/mock-pay" method="post">
            <input type="hidden" name="payment" value={payment.id} />
            <input type="hidden" name="next" value={sp.next ?? "/"} />
            <button className="btn btn-dark btn-block" type="submit">Pay {formatGBP(payment.amountPence)} (mock)</button>
          </form>
          <p className="center small" style={{ marginTop: 12 }}>
            <a href={sp.cancel ?? "/"}>Cancel</a>
          </p>
        </div>
      </div>
    </main>
  );
}
