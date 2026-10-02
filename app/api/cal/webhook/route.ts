import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { recordBooking, setStatus } from "@/lib/leads";
import { recordStageBooking, cancelStageBooking } from "@/lib/programme";
import { calOrigin } from "@/lib/cal";
import { safeEqual } from "@/lib/security";
import { notifyAdmin } from "@/lib/messaging";

type CalPayload = {
  uid?: string;
  startTime?: string;
  endTime?: string;
  attendees?: { email?: string; name?: string; timeZone?: string }[];
  metadata?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  location?: string;
  videoCallData?: { url?: string };
};

/**
 * Cal.com webhook (BOOKING_CREATED / BOOKING_RESCHEDULED / BOOKING_CANCELLED).
 * The lead is matched by the `leadToken` metadata passed from our booking page,
 * falling back to the most recent paid lead with the attendee's email.
 */
export async function POST(req: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const raw = await req.text();
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const sig = req.headers.get("x-cal-signature-256") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!safeEqual(sig, expected)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let body: { triggerEvent?: string; payload?: CalPayload };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const p = body.payload ?? {};

  // Programme sessions carry the stage id instead of the lead token.
  const stageId = (p.metadata?.programmeStageId as string | undefined) ?? (p.responses?.programmeStageId as string | undefined);
  const stage = stageId
    ? await db.programmeStage.findUnique({ where: { id: stageId } })
    : p.uid ? await db.programmeStage.findFirst({ where: { bookingUid: p.uid } }) : null;
  if (stage) {
    if (body.triggerEvent === "BOOKING_CANCELLED") {
      if (stage.bookingUid === p.uid) await cancelStageBooking(stage);
    } else if ((body.triggerEvent === "BOOKING_CREATED" || body.triggerEvent === "BOOKING_RESCHEDULED") && p.uid && p.startTime && stage.status !== "LOCKED") {
      await recordStageBooking(stage, {
        uid: p.uid,
        start: new Date(p.startTime),
        end: p.endTime ? new Date(p.endTime) : null,
        timezone: p.attendees?.[0]?.timeZone ?? null,
        meetingUrl: (p.metadata?.videoCallUrl as string | undefined) ?? p.videoCallData?.url ?? (p.location?.startsWith("http") ? p.location : null),
        rescheduleUrl: `${calOrigin}/reschedule/${p.uid}`,
        cancelUrl: `${calOrigin}/booking/${p.uid}?cancel=true`,
      }, "cal");
    }
    return NextResponse.json({ ok: true, programme: true });
  }

  const token = (p.metadata?.leadToken as string | undefined) ?? (p.responses?.leadToken as string | undefined);
  const email = p.attendees?.[0]?.email?.toLowerCase();

  let lead = token ? await db.lead.findUnique({ where: { token } }) : null;
  if (!lead && email) lead = await db.lead.findFirst({ where: { email }, orderBy: [{ reviewPaidAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] });
  if (!lead) {
    await notifyAdmin("Cal booking with no matching lead", [`Event: ${body.triggerEvent}`, `Attendee: ${email ?? "?"}`, `Start: ${p.startTime ?? "?"}`, "Check whether this person has paid."]);
    return NextResponse.json({ ok: true, matched: false });
  }

  if (body.triggerEvent === "BOOKING_CANCELLED") {
    if (lead.bookingUid === p.uid) {
      await db.lead.update({ where: { id: lead.id }, data: { bookingUid: null, bookingStart: null, bookingEnd: null, meetingUrl: null, rescheduleUrl: null, cancelUrl: null, reviewBookedAt: null } });
      if (lead.status === "REVIEW_BOOKED") await setStatus(lead, lead.reviewPaidAt ? "REVIEW_PAID" : lead.status, "cal");
      await notifyAdmin(`Review cancelled: ${lead.name}`, [`Booking ${p.uid} was cancelled.`]);
    }
    return NextResponse.json({ ok: true });
  }

  if ((body.triggerEvent === "BOOKING_CREATED" || body.triggerEvent === "BOOKING_RESCHEDULED") && p.uid && p.startTime) {
    const meetingUrl = (p.metadata?.videoCallUrl as string | undefined) ?? p.videoCallData?.url ?? (p.location?.startsWith("http") ? p.location : null);
    await recordBooking(lead, {
      uid: p.uid,
      start: new Date(p.startTime),
      end: p.endTime ? new Date(p.endTime) : null,
      timezone: p.attendees?.[0]?.timeZone ?? null,
      meetingUrl,
      rescheduleUrl: `${calOrigin}/reschedule/${p.uid}`,
      cancelUrl: `${calOrigin}/booking/${p.uid}?cancel=true`,
    });
  }
  return NextResponse.json({ ok: true });
}
