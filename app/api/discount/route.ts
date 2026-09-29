import { NextResponse } from "next/server";
import { checkDiscount, discountedPence, STRIPE_MIN_PENCE } from "@/lib/discounts";
import { products, formatGBP, type ProductKey } from "@/lib/site-config";

// Light per-instance throttle so codes can't be brute-forced quickly.
const hits = new Map<string, number[]>();

/** Previews a discount code on the pay button. Checkout re-validates it server-side. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > 20) return NextResponse.json({ ok: false, error: "Too many attempts — please try again later." }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as { code?: unknown; product?: string };
  const product = products[b.product as ProductKey];
  if (!product) return NextResponse.json({ ok: false, error: "Unknown service." }, { status: 400 });

  const r = await checkDiscount(b.code, product.key);
  if (!r.ok) return NextResponse.json(r);
  const total = discountedPence(product.pricePence, r.discount.percentOff);
  const free = total < STRIPE_MIN_PENCE;
  return NextResponse.json({
    ok: true,
    code: r.discount.code,
    percentOff: r.discount.percentOff,
    totalPence: free ? 0 : total,
    totalLabel: free ? "Free" : formatGBP(total),
  });
}
