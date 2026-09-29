import Stripe from "stripe";

let client: Stripe | null = null;

/** Null when Stripe isn't configured (local dev uses the mock checkout). */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function mockPaymentsAllowed() {
  return !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";
}
