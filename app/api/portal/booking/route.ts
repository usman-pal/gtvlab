import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/client-auth";
import { recordStageBooking } from "@/lib/programme";
import { calOrigin, mockStrategyBookingAllowed } from "@/lib/cal";

/**
 * Called by the portal booking page when the Cal.com embed reports a booking (or by the dev mock).
 * The Cal.com webhook later confirms it and fills in the video link.
 */
export async function POST(req: Request) {
  const viewer = await requireClient();
  if (!viewer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const n = Number(b.stage);
  const programme = await db.strategyProgramme.findUnique({ where: { leadId: viewer.leadId }, include: { stages: true } });
  const stage = programme?.stages.find((s) => s.number === n);
  if (!stage) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (stage.status !== "AVAILABLE" && stage.status !== "BOOKED") return NextResponse.json({ error: "stage not open" }, { status: 409 });

  const uid = typeof b.uid === "string" && b.uid ? b.uid.slice(0, 120) : null;
  const start = typeof b.startTime === "string" ? new Date(b.startTime) : null;
  if (!uid || !start || Number.isNaN(start.getTime())) return NextResponse.json({ error: "missing booking" }, { status: 400 });
  if (b.mock === true && !mockStrategyBookingAllowed()) return NextResponse.json({ error: "mock disabled" }, { status: 403 });
  if (stage.bookingUid === uid && stage.meetingUrl) return NextResponse.json({ ok: true });

  const end = typeof b.endTime === "string" ? new Date(b.endTime) : null;
  await recordStageBooking(
    stage,
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
