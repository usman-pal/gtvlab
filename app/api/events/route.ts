import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Only generic funnel events are accepted from the browser. Server-side events
// (assessment_completed, lead_x, checkout_started, purchases, bookings) are recorded where they happen.
const ALLOWED = new Set(["landing_page_view", "assessment_started", "assessment_step_completed", "paid_review_clicked", "paid_service_clicked"]);
const s = (v: unknown, n: number) => (typeof v === "string" && v ? v.slice(0, n) : null);

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const name = s(b.name, 60);
  if (!name || !ALLOWED.has(name)) return new NextResponse(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(ua)) return new NextResponse(null, { status: 204 });

  // Keep props tiny and non-sensitive
  const props: Record<string, string | number | boolean> = {};
  if (b.props && typeof b.props === "object") {
    for (const [k, v] of Object.entries(b.props as Record<string, unknown>).slice(0, 5)) {
      if (["step", "product", "restarted"].includes(k) && ["string", "number", "boolean"].includes(typeof v)) props[k] = v as string | number | boolean;
    }
  }
  await db.event.create({
    data: {
      name,
      visitorId: s(b.visitorId, 64),
      path: s(b.path, 200),
      utmSource: s(b.utmSource, 120)?.toLowerCase() ?? null,
      utmMedium: s(b.utmMedium, 120)?.toLowerCase() ?? null,
      utmCampaign: s(b.utmCampaign, 120),
      props: Object.keys(props).length ? JSON.stringify(props) : null,
    },
  });
  return new NextResponse(null, { status: 204 });
}
