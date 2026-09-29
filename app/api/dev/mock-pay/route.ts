import { NextResponse } from "next/server";
import { fulfilPayment } from "@/lib/leads";
import { mockPaymentsAllowed } from "@/lib/stripe";
import { site } from "@/lib/site-config";

/** Local development only: simulates a successful Stripe payment. */
export async function POST(req: Request) {
  if (!mockPaymentsAllowed()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const form = await req.formData();
  const paymentId = String(form.get("payment") ?? "");
  const next = String(form.get("next") ?? "/");
  await fulfilPayment(paymentId, "mock");
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", site.url), 303);
}
