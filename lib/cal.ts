/**
 * Accepts either "user/event" or a full booking URL such as
 * "https://cal.com/user/event" and returns the "user/event" path the embed needs.
 */
export function normaliseCalLink(raw: string | undefined): string {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.replace(/^https?:\/\/[^/]+\//i, "").replace(/^\/+|\/+$/g, "").split("?")[0];
}

export const calLink = normaliseCalLink(process.env.NEXT_PUBLIC_CAL_LINK);
export const calOrigin = process.env.NEXT_PUBLIC_CAL_ORIGIN || "https://app.cal.com";

export function mockBookingAllowed() {
  return !calLink && process.env.NODE_ENV !== "production";
}

/** Cal.com event for programme sessions (60 min, hidden). Set NEXT_PUBLIC_CAL_STRATEGY_LINK. */
export const calStrategyLink = normaliseCalLink(process.env.NEXT_PUBLIC_CAL_STRATEGY_LINK);

export function mockStrategyBookingAllowed() {
  return !calStrategyLink && process.env.NODE_ENV !== "production";
}
