import { db } from "./db";
import type { DiscountCode } from "@prisma/client";
import type { ProductKey } from "./site-config";

import { normaliseCode } from "./discount-math";
export { STRIPE_MIN_PENCE, normaliseCode, discountedPence } from "./discount-math";

export function codeProducts(d: Pick<DiscountCode, "products">): ProductKey[] | null {
  return d.products ? (d.products.split(",").filter(Boolean) as ProductKey[]) : null;
}

export type DiscountCheck = { ok: true; discount: DiscountCode } | { ok: false; error: string };

/** Validates a customer-entered code for a product. Redemptions = paid payments using the code. */
export async function checkDiscount(rawCode: unknown, product: ProductKey): Promise<DiscountCheck> {
  const code = normaliseCode(rawCode);
  if (!code) return { ok: false, error: "Please enter a code." };
  const d = await db.discountCode.findUnique({ where: { code } });
  if (!d || !d.active) return { ok: false, error: "That code isn't valid." };
  if (d.expiresAt && d.expiresAt < new Date()) return { ok: false, error: "That code has expired." };
  const allowed = codeProducts(d);
  if (allowed && !allowed.includes(product)) return { ok: false, error: "That code can't be used for this service." };
  if (d.maxUses !== null) {
    const used = await db.payment.count({ where: { discountCode: d.code, status: "paid" } });
    if (used >= d.maxUses) return { ok: false, error: "That code has reached its usage limit." };
  }
  return { ok: true, discount: d };
}
