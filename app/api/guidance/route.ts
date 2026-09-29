import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleGuidance } from "@/lib/messaging";
import { site } from "@/lib/site-config";

/** C-lead opt-in to the educational (non-sales) email sequence. */
export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!lead.nurtureOptInAt) {
    const updated = await db.lead.update({ where: { id: lead.id }, data: { nurtureOptInAt: new Date(), unsubscribed: false } });
    await db.event.create({
      data: { name: "guidance_opt_in", leadId: lead.id, visitorId: lead.visitorId, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign },
    });
    scheduleGuidance(updated).catch((e) => console.error(e));
  }
  return NextResponse.redirect(new URL(`/assessment/result/${lead.token}?guidance=1#guidance`, site.url), 303);
}
