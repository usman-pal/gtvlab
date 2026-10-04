import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/security";
import { notifyAdmin } from "@/lib/messaging";
import { logEvent } from "@/lib/lifecycle";
import { rateLimited } from "@/lib/passwords";
import { site } from "@/lib/site-config";
import { ROUTES, CRITERIA, PARTS, READINESS, YES_NO, SUBMIT_WHEN, CONCERNS_MAX, intakeRows, type AuditIntake } from "@/lib/audit-options";

const vals = (l: { value: string }[]) => new Set(l.map((o) => o.value));
const R = vals(ROUTES), C = vals(CRITERIA), RD = vals(READINESS), YN = vals(YES_NO), W = vals(SUBMIT_WHEN);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || null;

/**
 * Application Audit screening. Creates a lead of its own (origin "audit_intake") so the
 * visit's attribution is kept and the purchase, booking and revenue all hang off it.
 * Never attaches to an existing lead by email — that would hand an unauthenticated visitor
 * someone else's private token.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`audit:${ip}`, 8, 10 * 60e3)) return NextResponse.json({ error: "Too many submissions — please try again later." }, { status: 429 });
  if (typeof body.website === "string" && body.website.length > 0) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const a = (body.answers ?? {}) as Record<string, unknown>;
  const rd = (a.readiness ?? {}) as Record<string, unknown>;
  const intake: AuditIntake = {
    route: str(a.route, 20),
    criteria: Array.isArray(a.criteria) ? [...new Set((a.criteria as unknown[]).filter((c): c is string => typeof c === "string" && C.has(c)))] : [],
    readiness: Object.fromEntries(PARTS.map((p) => [p.value, str(rd[p.value], 20)])),
    submitted: str(a.submitted, 5),
    submitWhen: str(a.submitWhen, 10),
    refused: str(a.refused, 5),
    concerns: opt(a.concerns, CONCERNS_MAX),
  };
  if (intake.submitted === "yes") intake.submitWhen = "";
  const contact = {
    name: str(a.name, 120),
    email: str(a.email, 200).toLowerCase(),
    whatsapp: opt(a.whatsapp, 24),
    country: opt(a.country, 80),
    linkedin: opt(a.linkedin, 200),
    consentContact: a.consentContact === true,
    consentWhatsapp: a.consentWhatsapp === true,
  };

  const problems = [
    !R.has(intake.route) && "route",
    intake.criteria.length === 0 && "criteria",
    PARTS.some((p) => !RD.has(intake.readiness[p.value])) && "readiness",
    !YN.has(intake.submitted) && "submitted",
    intake.submitted === "no" && !W.has(intake.submitWhen) && "submission date",
    !YN.has(intake.refused) && "previous refusal",
    contact.name.length < 2 && "name",
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email) && "email",
    !contact.consentContact && "consent",
  ].filter(Boolean);
  if (problems.length) return NextResponse.json({ error: `Please check: ${problems.join(", ")}` }, { status: 422 });

  const t = (body.attribution ?? {}) as Record<string, unknown>;
  const at = typeof t.at === "string" && !Number.isNaN(Date.parse(t.at)) ? new Date(t.at) : null;

  const lead = await db.lead.create({
    data: {
      token: newToken(),
      origin: "audit_intake",
      utmSource: opt(t.utmSource, 120)?.toLowerCase() ?? null,
      utmMedium: opt(t.utmMedium, 120)?.toLowerCase() ?? null,
      utmCampaign: opt(t.utmCampaign, 120),
      utmContent: opt(t.utmContent, 120),
      utmTerm: opt(t.utmTerm, 120),
      ref: opt(t.ref, 120),
      referrer: opt(t.referrer, 300),
      landingPath: opt(t.landingPath, 300),
      firstSeenAt: at,
      lastTouch: body.lastTouch ? JSON.stringify(body.lastTouch).slice(0, 1000) : null,
      visitorId: opt(body.visitorId, 64),
      ...contact,
      consentAt: new Date(),
      // Eligibility questionnaire fields don't apply to audit leads.
      profession: "",
      experience: "",
      seniority: "",
      evidence: "[]",
      achievement: "",
      helpWanted: "audit",
      grade: "AUDIT",
      scoringVersion: "audit",
      auditIntake: JSON.stringify(intake),
      history: { create: { from: null, to: "NEW", actor: "system" } },
    },
  });

  await db.event.create({
    data: { name: "audit_intake_completed", leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign, path: "/audit" },
  });
  await logEvent(lead.id, "AUDIT_INTAKE_SUBMITTED", "client", lead.name);
  notifyAdmin(`Application Audit enquiry: ${lead.name}`, [
    `${lead.name} <${lead.email}> · ${lead.country ?? "?"}`,
    ...intakeRows(intake).map(([k, v]) => `${k}: ${v}`),
    `Source: ${lead.utmSource ?? "direct"} / ${lead.utmCampaign ?? "—"}`,
    `${site.url}/admin/leads/${lead.id}`,
  ]).catch(() => {});

  return NextResponse.json({ token: lead.token });
}
