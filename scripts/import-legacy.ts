// Import historic Google Form responses into the lead database.
//
// 1. In Google Forms → Responses → ⋮ → "Download responses (.csv)" (or export the linked Sheet as CSV).
// 2. Optionally add columns to the sheet before exporting:
//      "Contacted"  → yes / no
//      "Converted"  → no / review / audit / qa / strategy   (or "yes" = review)
//      "Revenue"    → amount in £ actually received (optional)
// 3. Run:  npm run import:legacy -- path/to/responses.csv [--dmy|--mdy] [--dry-run]
//
// Leads are stored with origin = "legacy_google_form", scored with the current
// scoring rules for comparison, and are NOT enrolled in any email sequence.

import fs from "node:fs";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { scoreAssessment } from "../lib/scoring.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const dateOrder = args.includes("--mdy") ? "mdy" : "dmy";
if (!file) {
  console.error("Usage: npm run import:legacy -- responses.csv [--dmy|--mdy] [--dry-run]");
  process.exit(1);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function pick(rec: Record<string, string>, ...needles: string[]) {
  for (const [k, v] of Object.entries(rec)) if (needles.some((n) => norm(k).includes(n))) return v?.trim() ?? "";
  return "";
}

function parseDate(s: string): Date {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return Number.isNaN(Date.parse(s)) ? new Date() : new Date(s);
  let [a, b] = [Number(m[1]), Number(m[2])];
  let day = dateOrder === "dmy" ? a : b;
  let month = dateOrder === "dmy" ? b : a;
  if (month > 12) [day, month] = [month, day];
  return new Date(Date.UTC(Number(m[3]), month - 1, day, Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)));
}

function mapProfession(area: string, role: string): string {
  const t = norm(`${area} ${role}`);
  if (/founder|cto|entrepreneur/.test(t)) return "founder";
  if (/\bai\b|machine learning|\bml\b|deep learning|llm|artificial/.test(t)) return "ai_ml";
  if (/data/.test(t)) return "data";
  if (/security|cyber/.test(t)) return "cyber";
  if (/product/.test(t)) return "product";
  if (/manager|head|director|lead|architect/.test(t)) return "tech_leadership";
  if (/software|developer|engineer|devops|platform|cloud|backend|frontend|full ?stack|mobile/.test(t)) return "software";
  if (/tech|digital|it\b|computer/.test(t)) return "other_digital";
  return area || role ? "other" : "other_digital";
}

function mapSeniority(role: string): string {
  const t = norm(role);
  if (/founder|cto/.test(t)) return "founder";
  if (/director|vp/.test(t)) return "director";
  if (/manager|head/.test(t)) return "manager";
  if (/staff|principal|lead|architect/.test(t)) return "lead";
  if (/senior/.test(t)) return "senior";
  if (/junior|graduate/.test(t)) return "junior";
  return role ? "other" : "other";
}

function mapExperience(s: string): string {
  const t = norm(s);
  if (t.includes("less than 3")) return "lt3";
  if (t.startsWith("3")) return "3_5";
  if (t.startsWith("5")) return "5_7";
  if (t.startsWith("7")) return "7_10";
  if (t.includes("10")) return "10_plus";
  return "5_7";
}

const EVIDENCE_MAP: [RegExp, string][] = [
  [/led or architected/i, "leadership"],
  [/commercially successful/i, "impact"],
  [/founder or early technical/i, "startup"],
  [/open-source/i, "open_source"],
  [/conference talks|meetups|workshops/i, "speaking"],
  [/blogs|publications|thought leadership/i, "publications"],
  [/mentorship|judging|community leadership/i, "mentoring_judging"],
  [/awards|grants|external recognition/i, "awards"],
];

function mapHelp(s: string): string {
  const t = norm(s);
  if (t.includes("handle the visa")) return "full_support";
  if (t.includes("evidence and narrative")) return "strategy";
  if (t.includes("assess and strengthen")) return "could_qualify";
  if (t.includes("time") || t.includes("documents")) return "full_support";
  return "could_qualify";
}

const slug = (s: string) => norm(s).replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const PRICES: Record<string, number> = { review: 4900, qa: 17500, audit: 36900, strategy: 189900 };

async function main() {
  const rows = parseCsv(fs.readFileSync(file!, "utf8").replace(/^﻿/, ""));
  const [header, ...data] = rows;
  const db = new PrismaClient();
  let created = 0, skipped = 0;

  for (const r of data) {
    const rec: Record<string, string> = Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]));
    const email = pick(rec, "email").toLowerCase();
    const name = pick(rec, "name") || email || "Unknown";
    if (!email && !name) { skipped++; continue; }
    const createdAt = parseDate(pick(rec, "timestamp"));
    const area = pick(rec, "area of expertise");
    const role = pick(rec, "current primary role");
    const profileTicks = pick(rec, "best describe your profile");
    const evidence = [...new Set(EVIDENCE_MAP.filter(([re]) => re.test(profileTicks)).map(([, v]) => v))];
    const achievement = pick(rec, "achievements", "evidences and draft") || pick(rec, "expectations about the process");
    const heard = pick(rec, "how did you hear");
    const answers = {
      profession: mapProfession(area, role),
      experience: mapExperience(pick(rec, "years of experience")),
      seniority: mapSeniority(role),
      evidence: evidence.length ? evidence : ["none"],
      achievement,
    };
    const s = scoreAssessment(answers);

    const contacted = /^y/i.test(pick(rec, "contacted"));
    const converted = norm(pick(rec, "converted"));
    const product = converted === "yes" ? "review" : (["review", "qa", "audit", "strategy"].find((p) => converted.includes(p)) ?? null);
    const revenueGbp = Number(pick(rec, "revenue").replace(/[£,]/g, "")) || (product ? PRICES[product] / 100 : 0);
    const status = product === "strategy" ? "FULL_SERVICE_PURCHASED" : product === "audit" || product === "qa" ? "AUDIT_PURCHASED" : product === "review" ? "REVIEW_COMPLETED" : contacted ? "CONTACTED" : s.grade === "C" ? "NURTURE_C" : s.grade === "A" ? "QUALIFIED_A" : "QUALIFIED_B";

    const exists = await db.lead.findFirst({ where: { origin: "legacy_google_form", email, createdAt } });
    if (exists) { skipped++; continue; }

    if (dryRun) {
      console.log(`${createdAt.toISOString().slice(0, 10)}  ${s.grade} ${String(s.score).padStart(3)}  ${status.padEnd(22)} ${name} <${email}>  [${answers.profession}/${answers.seniority}/${answers.experience}]`);
      created++;
      continue;
    }
    await db.lead.create({
      data: {
        token: crypto.randomBytes(24).toString("base64url"),
        origin: "legacy_google_form",
        createdAt,
        utmSource: heard ? slug(heard) : "legacy_google_form",
        utmMedium: heard ? "legacy" : null,
        utmCampaign: "legacy_google_form",
        profession: answers.profession,
        professionOther: answers.profession === "other" ? area || role : null,
        experience: answers.experience,
        seniority: answers.seniority,
        evidence: JSON.stringify(answers.evidence),
        achievement: achievement.slice(0, 4000),
        helpWanted: mapHelp(pick(rec, "which statement best matches", "primary reason")),
        name,
        email,
        whatsapp: pick(rec, "contact number") || null,
        linkedin: pick(rec, "linkedin") || null,
        consentContact: true,
        score: s.score,
        grade: s.grade,
        strengths: JSON.stringify(s.strengths),
        scoreNotes: JSON.stringify(["imported from Google Form", ...s.notes]),
        scoringVersion: s.version,
        status,
        contactedAt: contacted ? createdAt : null,
        reviewPaidAt: product ? createdAt : null,
        reviewCompletedAt: product ? createdAt : null,
        auditPurchasedAt: product === "audit" || product === "qa" ? createdAt : null,
        fullServicePurchasedAt: product === "strategy" ? createdAt : null,
        revenuePence: Math.round(revenueGbp * 100),
        legacyData: JSON.stringify(rec),
        history: { create: { to: status, actor: "import" } },
        payments: product ? { create: { product, amountPence: Math.round(revenueGbp * 100), status: "paid", provider: "legacy", paidAt: createdAt, customerEmail: email, note: "imported" } } : undefined,
      },
    });
    created++;
  }
  console.log(`${dryRun ? "[dry run] would import" : "Imported"} ${created} lead(s); skipped ${skipped}.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
