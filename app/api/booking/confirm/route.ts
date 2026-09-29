import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordBooking } from "@/lib/leads";
import { calOrigin, mockBookingAllowed } from "@/lib/cal";

/**
 * Called by the booking page when the Cal.com embed reports a successful booking
 * (or by the dev mock). Records the booking immediately so the confirmation page
 * can show it; the Cal.com webhook later fills in the video link if needed.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token : "";
  const lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!lead.reviewPaidAt) return NextResponse.json({ error: "payment not received" }, { status: 402 });

  const uid = typeof b.uid === "string" && b.uid ? b.uid.slice(0, 120) : null;
  const start = typeof b.startTime === "string" ? new Date(b.startTime) : null;
  if (!uid || !start || Number.isNaN(start.getTime())) return NextResponse.json({ error: "missing booking" }, { status: 400 });
  if (b.mock === true && !mockBookingAllowed()) return NextResponse.json({ error: "mock disabled" }, { status: 403 });

  // Don't let the client overwrite a booking already confirmed by the webhook.
  if (lead.bookingUid === uid && lead.meetingUrl) return NextResponse.json({ ok: true });

  const end = typeof b.endTime === "string" ? new Date(b.endTime) : null;
  await recordBooking(
    lead,
    {
      uid,
      start,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      timezone: typeof b.timezone === "string" ? b.timezone.slice(0, 64) : null,
      meetingUrl: typeof b.videoCallUrl === "string" && b.videoCallUrl.startsWith("https://") ? b.videoCallUrl : lead.meetingUrl,
      rescheduleUrl: b.mock ? null : `${calOrigin}/reschedule/${uid}`,
      cancelUrl: b.mock ? null : `${calOrigin}/booking/${uid}?cancel=true`,
    },
    b.mock ? "mock" : "client",
  );
  return NextResponse.json({ ok: true });
}
