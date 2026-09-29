import { test } from "node:test";
import assert from "node:assert/strict";
import { discountedPence, normaliseCode, STRIPE_MIN_PENCE } from "../lib/discount-math.ts";

test("percentage discounts round to whole pence", () => {
  assert.equal(discountedPence(4900, 20), 3920);
  assert.equal(discountedPence(36900, 15), 31365);
  assert.equal(discountedPence(189900, 33), 127233);
});

test("100% is free and never negative", () => {
  assert.equal(discountedPence(4900, 100), 0);
  assert.ok(discountedPence(4900, 100) < STRIPE_MIN_PENCE);
});

test("codes are case- and space-insensitive", () => {
  assert.equal(normaliseCode("  creator 20 "), "CREATOR20");
  assert.equal(normaliseCode(42), "");
});
