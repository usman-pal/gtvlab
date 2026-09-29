/** Stripe's minimum charge for GBP. Anything below this is treated as free. */
export const STRIPE_MIN_PENCE = 30;

export const normaliseCode = (raw: unknown) =>
  typeof raw === "string" ? raw.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40) : "";

export function discountedPence(listPence: number, percentOff: number) {
  return Math.max(0, Math.round((listPence * (100 - percentOff)) / 100));
}
