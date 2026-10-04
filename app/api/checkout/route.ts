import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, site, type ProductKey } from "@/lib/site-config";
import { stripe, mockPaymentsAllowed } from "@/lib/stripe";
import { checkDiscount, discountedPence, normaliseCode, STRIPE_MIN_PENCE } from "@/lib/discounts";
import { fulfilPayment } from "@/lib/leads";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const productKey = String(form.get("product") ?? "") as ProductKey;
  const product = products[productKey];
  const lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  // Programme phases and add-ons are sold only from the client portal (/api/portal/checkout).
  if (!lead || !product || product.programme) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resultPath = `/assessment/result/${lead.token}`;
  // The Application Audit has its own page: questions → pay → book.
  const auditPath = `/audit/${lead.token}`;
  const returnPath = productKey === "audit" ? auditPath : resultPath;
  if (productKey === "review" && lead.reviewPaidAt) return NextResponse.redirect(new URL(`/book/${lead.token}`, site.url), 303);

  // Optional discount code — always re-validated here, whatever the pay button showed.
  let amountPence = product.pricePence;
  let discount: { code: string; percentOff: number } | null = null;
  if (normaliseCode(form.get("code"))) {
    const r = await checkDiscount(form.get("code"), product.key);
    if (!r.ok) {
      const back = `${returnPath}?code_error=${encodeURIComponent(r.error)}&code_product=${product.key}#${productKey === "review" ? "review" : "services"}`;
      return NextResponse.redirect(new URL(back, site.url), 303);
    }
    discount = { code: r.discount.code, percentOff: r.discount.percentOff };
    amountPence = discountedPence(product.pricePence, r.discount.percentOff);
    if (amountPence < STRIPE_MIN_PENCE) amountPence = 0;
  }

  const now = new Date();
  await db.lead.update({
    where: { id: lead.id },
    data: { paidClickedAt: lead.paidClickedAt ?? now, checkoutStartedAt: now },
  });
  const payment = await db.payment.create({
    data: {
      leadId: lead.id,
      product: product.key,
      amountPence,
      listPricePence: product.pricePence,
      discountCode: discount?.code ?? null,
      discountPercent: discount?.percentOff ?? null,
      customerEmail: lead.email,
      utmSource: lead.utmSource,
      utmCampaign: lead.utmCampaign,
    },
  });
  await db.event.create({
    data: {
      name: "checkout_started",
      leadId: lead.id,
      visitorId: lead.visitorId,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      props: JSON.stringify({ product: product.key, ...(discount ? { discount: discount.percentOff } : {}) }),
    },
  });

  const successPath = productKey === "review" ? `/book/${lead.token}` : productKey === "audit" ? `${auditPath}?paid=1` : `${resultPath}?purchased=${product.key}`;
  const cancelPath = productKey === "audit" ? `${auditPath}?checkout=cancelled#pay` : `${resultPath}?checkout=cancelled#review`;
  // Fully discounted (100% code): nothing to charge, so skip the payment provider.
  if (amountPence === 0) {
    await db.payment.update({ where: { id: payment.id }, data: { provider: "discount" } });
    await fulfilPayment(payment.id, "admin");
    return NextResponse.redirect(new URL(successPath, site.url), 303);
  }

  const s = stripe();
  if (s) {
    const session = await s.checkout.sessions.create({
      mode: "payment",
      customer_email: lead.email,
      client_reference_id: lead.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: amountPence,
            product_data: {
              name: `Global Talent Lab — ${product.name}`,
              description: discount ? `${product.duration} · code ${discount.code} (${discount.percentOff}% off)` : product.duration,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        leadId: lead.id,
        product: product.key,
        utm_source: lead.utmSource ?? "",
        utm_medium: lead.utmMedium ?? "",
        utm_campaign: lead.utmCampaign ?? "",
        discount_code: discount?.code ?? "",
      },
      payment_intent_data: { metadata: { paymentId: payment.id, leadId: lead.id, product: product.key } },
      success_url: `${site.url}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}${cancelPath}`,
    });
    await db.payment.update({ where: { id: payment.id }, data: { stripeSessionId: session.id } });
    return NextResponse.redirect(session.url!, 303);
  }

  if (mockPaymentsAllowed()) {
    const q = new URLSearchParams({ payment: payment.id, next: successPath, cancel: cancelPath });
    return NextResponse.redirect(new URL(`/dev/checkout?${q}`, site.url), 303);
  }
  return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
}
