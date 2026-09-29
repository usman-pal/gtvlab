import { db } from "./db";
import type { Prisma } from "@prisma/client";

export type Range = { from: Date; to: Date };
export type Filters = { source?: string; campaign?: string };

export const DIRECT = "(direct / unknown)";
const key = (s: string | null | undefined) => (s && s.trim() ? s.toLowerCase() : DIRECT);

export type FunnelRow = {
  source: string;
  campaign?: string;
  visitors: number;
  starts: number;
  assessments: number;
  a: number;
  b: number;
  c: number;
  qualified: number;
  reviews: number;
  audits: number;
  full: number;
  customers: number;
  revenuePence: number;
  spendPence: number;
};

const emptyRow = (source: string, campaign?: string): FunnelRow => ({
  source, campaign, visitors: 0, starts: 0, assessments: 0, a: 0, b: 0, c: 0, qualified: 0, reviews: 0, audits: 0, full: 0, customers: 0, revenuePence: 0, spendPence: 0,
});

/**
 * Cohort funnel: visitors/starts in the range, and leads *created* in the range with
 * everything they went on to buy (lifetime). This answers "which source produces
 * paying customers" rather than "what happened this week".
 */
export async function funnel(range: Range, f: Filters = {}, groupByCampaign = false) {
  const leadWhere: Prisma.LeadWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
    origin: { not: "legacy_google_form" },
    ...(f.source ? (f.source === DIRECT ? { utmSource: null } : { utmSource: f.source }) : {}),
    ...(f.campaign ? { utmCampaign: f.campaign } : {}),
  };
  const eventWhere: Prisma.EventWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
    name: { in: ["landing_page_view", "assessment_started"] },
    ...(f.source ? (f.source === DIRECT ? { utmSource: null } : { utmSource: f.source }) : {}),
    ...(f.campaign ? { utmCampaign: f.campaign } : {}),
  };

  const [leads, events, spend] = await Promise.all([
    db.lead.findMany({
      where: leadWhere,
      select: { grade: true, utmSource: true, utmCampaign: true, reviewPaidAt: true, auditPurchasedAt: true, fullServicePurchasedAt: true, revenuePence: true, payments: { where: { status: "paid" }, select: { product: true } } },
    }),
    db.event.findMany({ where: eventWhere, select: { name: true, visitorId: true, utmSource: true, utmCampaign: true } }),
    db.spend.findMany({
      where: {
        ...(f.source ? { utmSource: f.source } : {}),
        ...(f.campaign ? { utmCampaign: f.campaign } : {}),
        OR: [{ periodStart: null }, { AND: [{ periodStart: { lte: range.to } }, { OR: [{ periodEnd: null }, { periodEnd: { gte: range.from } }] }] }],
      },
    }),
  ]);

  const rows = new Map<string, FunnelRow>();
  const rowFor = (src: string | null, camp: string | null) => {
    const k = groupByCampaign ? `${key(src)}||${camp ?? ""}` : key(src);
    let r = rows.get(k);
    if (!r) rows.set(k, (r = emptyRow(key(src), groupByCampaign ? camp ?? "—" : undefined)));
    return r;
  };
  const total = emptyRow("All sources");

  // Distinct visitors; events without a visitor id (consent rejected) count individually.
  const seen = new Set<string>();
  for (const e of events) {
    const dedupe = e.visitorId ? `${e.name}|${e.visitorId}|${groupByCampaign ? e.utmCampaign : ""}` : null;
    if (dedupe) {
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
    }
    const r = rowFor(e.utmSource, e.utmCampaign);
    if (e.name === "landing_page_view") { r.visitors++; total.visitors++; }
    else { r.starts++; total.starts++; }
  }

  for (const l of leads) {
    const r = rowFor(l.utmSource, l.utmCampaign);
    for (const t of [r, total]) {
      t.assessments++;
      if (l.grade === "A") t.a++;
      else if (l.grade === "B") t.b++;
      else t.c++;
      if (l.grade === "A" || l.grade === "B") t.qualified++;
      if (l.reviewPaidAt) t.reviews++;
      if (l.payments.some((p) => p.product === "audit")) t.audits++;
      if (l.payments.some((p) => p.product === "strategy") || l.fullServicePurchasedAt) t.full++;
      if (l.revenuePence > 0) t.customers++;
      t.revenuePence += l.revenuePence;
    }
  }

  for (const s of spend) {
    const r = rowFor(s.utmSource, s.utmCampaign);
    r.spendPence += s.amountPence;
    total.spendPence += s.amountPence;
  }

  const list = [...rows.values()].sort((x, y) => y.revenuePence - x.revenuePence || y.qualified - x.qualified || y.visitors - x.visitors);
  return { total, rows: list };
}

export const rate = (n: number, d: number) => (d > 0 ? n / d : null);
export const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`);
export const gbp = (pence: number | null) => (pence === null ? "—" : `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: pence % 100 ? 2 : 0 })}`);
export const perUnit = (pence: number, d: number) => (d > 0 ? pence / d : null);

export function parseRange(sp: Record<string, string | undefined>): Range & { fromStr: string; toStr: string } {
  const today = new Date();
  const toStr = sp.to || today.toISOString().slice(0, 10);
  const fromDefault = new Date(today.getTime() - 89 * 864e5).toISOString().slice(0, 10);
  const fromStr = sp.from || fromDefault;
  return { from: new Date(`${fromStr}T00:00:00.000Z`), to: new Date(`${toStr}T23:59:59.999Z`), fromStr, toStr };
}
