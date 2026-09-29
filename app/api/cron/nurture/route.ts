import { NextResponse } from "next/server";
import { processDue } from "@/lib/messaging";
import { safeEqual } from "@/lib/security";

/** Sends due nurture / reminder messages. Scheduled hourly in vercel.json, or call from any cron service. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const r = await processDue({ limit: 500 });
  return NextResponse.json(r);
}
