import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unsubscribeToken, safeEqual } from "@/lib/security";

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(req: Request) {
  const sig = new URL(req.url).searchParams.get("sig") ?? "";
  const [id, t] = sig.split(".");
  if (!id || !t || !safeEqual(t, unsubscribeToken(id))) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.lead.update({ where: { id }, data: { unsubscribed: true, unsubscribedAt: new Date() } }).catch(() => null);
  await db.message.updateMany({ where: { leadId: id, status: "queued" }, data: { status: "skipped", error: "unsubscribed" } });
  return NextResponse.json({ ok: true });
}
