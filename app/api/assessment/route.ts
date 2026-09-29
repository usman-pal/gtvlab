import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/security";
import { scoreAssessment } from "@/lib/scoring";
import { PROFESSIONS, EXPERIENCE, SENIORITY, EVIDENCE, HELP_WANTED, ACHIEVEMENT_MAX } from "@/lib/assessment-options";
import { gradeStatus } from "@/lib/leads";
import { scheduleAfterAssessment, notifyAdmin } from "@/lib/messaging";
import { site } from "@/lib/site-config";

const vals = (l: { value: string }[]) => new Set(l.map((o) => o.value));
const P = vals(PROFESSIONS), X = vals(EXPERIENCE), S = vals(SENIORITY), E = vals(EVIDENCE), H = vals(HELP_WANTED);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || null;

// Very small in-memory rate limit (per server instance) — enough to stop accidental double submits & basic abuse.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many submissions — please try again later." }, { status: 429 });

  // Honeypot: bots fill hidden fields. Pretend success without storing.
  if (typeof body.website === "string" && body.website.length > 0) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const a = (body.answers ?? {}) as Record<string, unknown>;
  const evidence = Array.isArray(a.evidence) ? (a.evidence as unknown[]).filter((e): e is string => typeof e === "string" && E.has(e)) : [];
  const answers = {
    profession: str(a.profession, 40),
    professionOther: opt(a.professionOther, 120),
    experience: str(a.experience, 20),
    seniority: str(a.seniority, 20),
    evidence,
    evidenceOther: opt(a.evidenceOther, 200),
    achievement: str(a.achievement, ACHIEVEMENT_MAX),
    helpWanted: str(a.helpWanted, 40),
    name: str(a.name, 120),
    email: str(a.email, 200).toLowerCase(),
    whatsapp: opt(a.whatsapp, 24),
    country: opt(a.country, 80),
    linkedin: opt(a.linkedin, 200),
    consentContact: a.consentContact === true,
    consentWhatsapp: a.consentWhatsapp === true,
  };

  const problems = [
    !P.has(answers.profession) && "profession",
    !X.has(answers.experience) && "experience",
    !S.has(answers.seniority) && "seniority",
    evidence.length === 0 && "evidence",
    answers.achievement.length < 10 && "achievement",
    !H.has(answers.helpWanted) && "helpWanted",
    answers.name.length < 2 && "name",
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(answers.email) && "email",
    !answers.consentContact && "consent",
  ].filter(Boolean);
  if (problems.length) return NextResponse.json({ error: `Please check: ${problems.join(", ")}` }, { status: 422 });

  const result = scoreAssessment(answers);
  const t = (body.attribution ?? {}) as Record<string, unknown>;
  const at = typeof t.at === "string" && !Number.isNaN(Date.parse(t.at)) ? new Date(t.at) : null;

  const lead = await db.lead.create({
    data: {
      token: newToken(),
      origin: "website",
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
      ...answers,
      evidence: JSON.stringify(evidence),
      consentAt: new Date(),
      score: result.score,
      grade: result.grade,
      strengths: JSON.stringify(result.strengths),
      scoreNotes: JSON.stringify(result.notes),
      scoringVersion: result.version,
      status: gradeStatus(result.grade),
      history: { create: { from: null, to: gradeStatus(result.grade), actor: "system" } },
    },
  });

  const ev = { leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign, path: "/assessment" };
  await db.event.createMany({
    data: [
      { ...ev, name: "assessment_completed" },
      { ...ev, name: `lead_${result.grade.toLowerCase()}` },
    ],
  });

  // Don't block the response on email delivery.
  scheduleAfterAssessment(lead).catch((e) => console.error("schedule failed", e));
  if (result.grade !== "C")
    notifyAdmin(`New ${result.grade} lead: ${lead.name}`, [
      `${lead.name} <${lead.email}> · ${lead.country ?? "?"}`,
      `Profession: ${lead.profession} · ${lead.experience} · ${lead.seniority}`,
      `Source: ${lead.utmSource ?? "direct"} / ${lead.utmCampaign ?? "—"}`,
      `${site.url}/admin/leads/${lead.id}`,
    ]).catch(() => {});

  return NextResponse.json({ token: lead.token, grade: result.grade });
}
