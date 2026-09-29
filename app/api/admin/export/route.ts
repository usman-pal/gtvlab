import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { safeJson } from "@/lib/messaging";

const cols = [
  "createdAt", "origin", "name", "email", "whatsapp", "country", "linkedin", "profession", "professionOther", "experience", "seniority", "evidence", "achievement",
  "helpWanted", "score", "grade", "status", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "ref", "referrer", "revenuePence",
  "reviewPaidAt", "reviewBookedAt", "reviewCompletedAt", "auditPurchasedAt", "fullServicePurchasedAt", "unsubscribed",
] as const;

const cell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });
  const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
  const lines = [cols.join(",")];
  for (const l of leads) {
    const row = { ...l, evidence: safeJson<string[]>(l.evidence, []).join("; ") } as Record<string, unknown>;
    lines.push(cols.map((c) => cell(row[c])).join(","));
  }
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gtl-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
