import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calOrigin, mockAuditBookingAllowed } from "@/lib/cal";
import { recordAuditBooking, loadAuditBooking } from "@/lib/audit";

/**
 * Called by the audit page when the Cal.com embed reports a booking (or by the dev mock).
 * The Cal.com webhook later confirms it and fills in the video link if needed.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token : "";
  const lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!lead.auditPurchasedAt) return NextResponse.json({ error: "payment not received" }, { status: 402 });

  const uid = typeof b.uid === "string" && b.uid ? b.uid.slice(0, 120) : null;
  const start = typeof b.startTime === "string" ? new Date(b.startTime) : null;
  if (!uid || !start || Number.isNaN(start.getTime())) return NextResponse.json({ error: "missing booking" }, { status: 400 });
  if (b.mock === true && !mockAuditBookingAllowed()) return NextResponse.json({ error: "mock disabled" }, { status: 403 });

  // Don't let the client overwrite a booking already confirmed by the webhook.
  const existing = await loadAuditBooking(lead.id);
  if (existing?.uid === uid && existing.meetingUrl) return NextResponse.json({ ok: true });

  const end = typeof b.endTime === "string" ? new Date(b.endTime) : null;
  await recordAuditBooking(
    lead,
    {
      uid,
      start,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      timezone: typeof b.timezone === "string" ? b.timezone.slice(0, 64) : null,
      meetingUrl: typeof b.videoCallUrl === "string" && b.videoCallUrl.startsWith("https://") ? b.videoCallUrl : null,
      rescheduleUrl: b.mock ? null : `${calOrigin}/reschedule/${uid}`,
      cancelUrl: b.mock ? null : `${calOrigin}/booking/${uid}?cancel=true`,
    },
    b.mock ? "mock" : "client",
  );
  return NextResponse.json({ ok: true });
}
