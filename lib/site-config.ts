// Business content that is likely to change. Keep claims factual and avoid
// any wording that implies regulated immigration advice or guaranteed outcomes.

export const site = {
  name: "Global Talent Lab",
  domain: "globaltalentlab.services",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  contactEmail: "m.usman.uob@gmail.com",
  linkedin: "https://www.linkedin.com/in/usman-1/",
  founder: {
    name: "Muhammad Usman",
    role: "Founder, Global Talent Lab · Data Scientist (UK)",
    photo: "/img/founder.webp",
    facts: [
      "Endorsed for the UK Global Talent visa (digital technology)",
      "Went on to obtain ILR and British citizenship",
      "Works as a Data Scientist in the UK",
    ],
  },
  primaryCta: "Check My Global Talent Profile",
  primaryCtaShort: "Check My Profile",
  primaryCtaHref: "/assessment",
  scopeNote:
    "Global Talent Lab provides profile assessment, evidence review and application-preparation coaching. We are not immigration advisers, we do not provide immigration or legal advice, and we do not submit applications. No endorsement or visa outcome is guaranteed.",
  affiliationNote:
    "Global Talent Lab is independent and is not affiliated with the UK Home Office, UK Government or any endorsing body.",
};

export type ProductKey = "review" | "qa" | "audit" | "strategy" | "strategy_p1" | "strategy_p2" | "strategy_writer";

export type Product = {
  key: ProductKey;
  name: string;
  pricePence: number;
  duration: string;
  summary: string;
  deliverables: string[];
  /** Lead status set when this product is paid */
  paidStatus: string;
  /** Lead timestamp set when this product is paid */
  paidField: "reviewPaidAt" | "auditPurchasedAt" | "fullServicePurchasedAt" | null;
  /** Programme phases are bought from the client portal only — not sold on the result page or via discount codes */
  programme?: true;
};

export const products: Record<ProductKey, Product> = {
  review: {
    key: "review",
    name: "Personal Eligibility Review",
    pricePence: 5900,
    duration: "30-minute 1:1 video call",
    summary: "A personal review of your career profile and the evidence you could potentially use.",
    deliverables: [
      "Examine your career profile before and during the call",
      "Identify which criteria could potentially be relevant",
      "Discuss your strongest evidence",
      "Identify obvious gaps",
      "A clear view of your sensible next step: prepare now, build evidence first, or don't apply yet",
    ],
    paidStatus: "REVIEW_PAID",
    paidField: "reviewPaidAt",
  },
  qa: {
    key: "qa",
    name: "1-Hour Application Q&A",
    pricePence: 17500,
    duration: "60-minute 1:1 video call",
    summary: "For candidates already preparing, with questions about referees, the personal statement or the evidence pack.",
    deliverables: [
      "Clarify referee selection and recommendation-letter strategy",
      "Review your personal statement direction and positioning",
      "Practical improvements before you submit",
    ],
    paidStatus: "AUDIT_PURCHASED",
    paidField: "auditPurchasedAt",
  },
  audit: {
    key: "audit",
    name: "Evidence Audit",
    pricePence: 36900,
    duration: "90-minute 1:1 deep-dive",
    summary: "A detailed examination of your evidence, gaps and positioning — usually taken after the £49 review.",
    deliverables: [
      "Advance review of your full evidence pack (you send it before the call)",
      "Mapping of your evidence against the criteria you plan to use",
      "Keep / strengthen / replace / remove recommendation for each piece of evidence",
      "Gap analysis with practical ways to close gaps efficiently",
      "A clear recommendation: proceed now, fix then proceed, or pause",
    ],
    paidStatus: "AUDIT_PURCHASED",
    paidField: "auditPurchasedAt",
  },
  strategy: {
    key: "strategy",
    name: "Application Strategy & Support",
    pricePence: 189900,
    duration: "4 × 60-minute weekly 1:1 sessions",
    summary: "Higher-touch coaching for suitable candidates who want help building the overall application.",
    deliverables: [
      "Lock the criteria strategy and the strongest evidence set",
      "Structure your evidence portfolio (clarity, credibility, relevance)",
      "Refine your narrative and personal-statement direction",
      "Recommendation-letter strategy and review",
      "Final end-to-end readiness check before you submit",
    ],
    paidStatus: "FULL_SERVICE_PURCHASED",
    paidField: "fullServicePurchasedAt",
  },
  strategy_p1: {
    key: "strategy_p1",
    name: "Application Strategy & Evidence Programme — Phase 1",
    pricePence: 99900,
    duration: "Stages 1–2: Career Mapping · Evidence & Write-up Strategy",
    summary: "The strategy phase of the Application Strategy & Evidence Programme.",
    deliverables: ["Criteria & Evidence Map", "Personalised Application Write-up Plan"],
    paidStatus: "FULL_SERVICE_PURCHASED",
    paidField: "fullServicePurchasedAt",
    programme: true,
  },
  strategy_p2: {
    key: "strategy_p2",
    name: "Application Strategy & Evidence Programme — Phase 2",
    pricePence: 90000,
    duration: "Stages 3–4: Evidence Review · Refine & Finalise",
    summary: "The review and refinement phase of the Application Strategy & Evidence Programme.",
    deliverables: ["Written Evidence Feedback", "Final Readiness Review"],
    paidStatus: "FULL_SERVICE_PURCHASED",
    paidField: null,
    programme: true,
  },
  strategy_writer: {
    key: "strategy_writer",
    name: "Application Strategy & Evidence Programme — Hire a Writer",
    pricePence: 25000,
    duration: "Optional add-on · writer joins your Evidence & Write-up Strategy session",
    summary: "A writer joins Session 2 so your application write-up can start straight away.",
    deliverables: ["Writer attends Session 2", "Write-up started from your Write-up Plan"],
    paidStatus: "FULL_SERVICE_PURCHASED",
    paidField: null,
    programme: true,
  },
};

/** Products that can be sold on the public result page and targeted by discount codes. */
export const publicProducts = Object.values(products).filter((p) => !p.programme);

/** Business WhatsApp link for programme clients (WHATSAPP_BUSINESS_URL, or a number in WHATSAPP_BUSINESS_NUMBER). */
export function whatsappBusinessUrl(): string | null {
  const url = process.env.WHATSAPP_BUSINESS_URL?.trim();
  if (url) return url;
  const n = process.env.WHATSAPP_BUSINESS_NUMBER?.replace(/[^\d]/g, "");
  return n ? `https://wa.me/${n}` : null;
}

export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return "£" + pounds.toLocaleString("en-GB", { minimumFractionDigits: pounds % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

/**
 * Genuine client testimonials only. Add real quotes (with permission) here and
 * the testimonials section appears automatically. Never invent testimonials.
 */
export const testimonials: { quote: string; name: string; role: string }[] = [];

export const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "QUALIFIED_A", label: "Qualified — A" },
  { value: "QUALIFIED_B", label: "Qualified — B" },
  { value: "NURTURE_C", label: "Nurture — C" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "REVIEW_PAID", label: "Review paid (not booked)" },
  { value: "REVIEW_BOOKED", label: "Review booked" },
  { value: "REVIEW_COMPLETED", label: "Review completed" },
  { value: "AUDIT_PURCHASED", label: "Audit purchased" },
  { value: "FULL_SERVICE_PURCHASED", label: "Full service" },
  { value: "NOT_SUITABLE", label: "Not suitable" },
  { value: "NO_RESPONSE", label: "No response" },
  { value: "LOST", label: "Lost" },
] as const;

export function statusLabel(v: string) {
  return LEAD_STATUSES.find((s) => s.value === v)?.label ?? v;
}

/** Pipeline order — automatic updates never move a lead backwards. */
export const STATUS_RANK: Record<string, number> = {
  NEW: 0,
  QUALIFIED_A: 1,
  QUALIFIED_B: 1,
  NURTURE_C: 1,
  CONTACTED: 2,
  REVIEW_PAID: 3,
  REVIEW_BOOKED: 4,
  REVIEW_COMPLETED: 5,
  AUDIT_PURCHASED: 6,
  FULL_SERVICE_PURCHASED: 7,
  NOT_SUITABLE: 1,
  NO_RESPONSE: 1,
  LOST: 1,
};
