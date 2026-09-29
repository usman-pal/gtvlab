"use client";
// First-party attribution + funnel events.
// - UTM / ?ref= values are captured on landing and kept (first touch) so every lead
//   and purchase retains its original acquisition source.
// - Events go to our own /api/events (no personal data) and, only after consent,
//   to GA4 / Meta / Google Ads as generic funnel-stage events.

export type Touch = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  ref?: string;
  referrer?: string;
  landingPath?: string;
  at: string;
};

const ATTR_KEY = "gtl_attr";
const VID_KEY = "gtl_vid";
const CONSENT_KEY = "gtl_consent";

function ls(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getConsent(): "granted" | "denied" | null {
  const v = ls()?.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}
export function setConsent(v: "granted" | "denied") {
  try {
    ls()?.setItem(CONSENT_KEY, v);
    if (v === "denied") ls()?.removeItem(VID_KEY);
  } catch {}
}

export function visitorId(): string | null {
  if (getConsent() === "denied") return null;
  const s = ls();
  if (!s) return null;
  let v = s.getItem(VID_KEY);
  if (!v) {
    v = crypto.randomUUID();
    try { s.setItem(VID_KEY, v); } catch {}
  }
  return v;
}

const clean = (v: string | null) => (v ? v.trim().slice(0, 120) || undefined : undefined);

/** Reads UTM / ref params from the current URL and stores first + last touch. */
export function captureAttribution() {
  const s = ls();
  const q = new URLSearchParams(window.location.search);
  const ref = clean(q.get("ref"));
  const touch: Touch = {
    utmSource: clean(q.get("utm_source")) ?? ref,
    utmMedium: clean(q.get("utm_medium")) ?? (ref ? "referral" : undefined),
    utmCampaign: clean(q.get("utm_campaign")),
    utmContent: clean(q.get("utm_content")),
    utmTerm: clean(q.get("utm_term")),
    ref,
    referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.slice(0, 300) : undefined,
    landingPath: window.location.pathname + window.location.search,
    at: new Date().toISOString(),
  };
  const hasSignal = touch.utmSource || touch.referrer;
  let stored: { first?: Touch; last?: Touch } = {};
  try { stored = JSON.parse(s?.getItem(ATTR_KEY) || "{}"); } catch {}
  if (!stored.first) stored.first = touch; // first visit, even if direct
  else if (hasSignal) stored.last = touch;
  // A direct first visit followed by a campaign visit: promote the campaign to first touch.
  if (stored.first && !stored.first.utmSource && !stored.first.referrer && touch.utmSource) stored.first = touch;
  try { s?.setItem(ATTR_KEY, JSON.stringify(stored)); } catch {}
  return stored;
}

export function getAttribution(): { first?: Touch; last?: Touch } {
  try { return JSON.parse(ls()?.getItem(ATTR_KEY) || "{}"); } catch { return {}; }
}

type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };

const META_EVENTS: Record<string, [string, boolean]> = {
  assessment_started: ["AssessmentStarted", true],
  assessment_completed: ["AssessmentCompleted", true],
  lead_a: ["QualifiedLead", true],
  lead_b: ["QualifiedLead", true],
  checkout_started: ["InitiateCheckout", false],
  review_purchased: ["Purchase", false],
  calendar_booking_completed: ["Schedule", false],
  audit_purchased: ["HighTicketPurchase", true],
  full_service_purchased: ["HighTicketPurchase", true],
};

/** Track a funnel event. `props` must never contain personal data or free text. */
export function track(name: string, props: Record<string, string | number | boolean> = {}, opts: { internal?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (opts.internal !== false) sendInternal(name, props);
  sendThirdParty(name, props);
}

function sendInternal(name: string, props: Record<string, string | number | boolean>) {
  const attr = getAttribution().first;
  const body = JSON.stringify({
    name,
    visitorId: visitorId(),
    path: window.location.pathname.startsWith("/assessment/result") || window.location.pathname.startsWith("/book") ? window.location.pathname.split("/").slice(0, 3).join("/") : window.location.pathname,
    utmSource: attr?.utmSource,
    utmMedium: attr?.utmMedium,
    utmCampaign: attr?.utmCampaign,
    props,
  });
  try {
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {}
}

function sendThirdParty(name: string, props: Record<string, string | number | boolean>) {
  if (getConsent() !== "granted") return;
  const w = window as W;
  w.gtag?.("event", name, props);
  const meta = META_EVENTS[name];
  if (meta && w.fbq) {
    const [ev, custom] = meta;
    const p = props.value ? { value: props.value, currency: "GBP" } : {};
    w.fbq(custom ? "trackCustom" : "track", ev, p);
  }
}
