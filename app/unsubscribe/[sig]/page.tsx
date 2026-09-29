import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { unsubscribeToken, safeEqual } from "@/lib/security";
import { Header } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function findLead(sig: string) {
  const [id, t] = sig.split(".");
  if (!id || !t || !safeEqual(t, unsubscribeToken(id))) return null;
  return db.lead.findUnique({ where: { id } });
}

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ sig: string }>; searchParams: Promise<{ done?: string }> }) {
  const { sig } = await params;
  const { done } = await searchParams;
  const lead = await findLead(sig);
  if (!lead) notFound();

  async function unsubscribe() {
    "use server";
    const l = await findLead(sig);
    if (!l) return;
    await db.lead.update({ where: { id: l.id }, data: { unsubscribed: true, unsubscribedAt: new Date() } });
    await db.message.updateMany({ where: { leadId: l.id, status: "queued" }, data: { status: "skipped", error: "unsubscribed" } });
    const { redirect } = await import("next/navigation");
    redirect(`/unsubscribe/${sig}?done=1`);
  }

  return (
    <>
      <Header minimal />
      <main className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="card">
            {lead.unsubscribed || done ? (
              <>
                <h1 style={{ fontSize: "1.4rem" }}>You&apos;re unsubscribed</h1>
                <p>We won&apos;t send you any more follow-up emails or WhatsApp messages. If you&apos;ve booked a review, you&apos;ll still receive messages about that booking.</p>
              </>
            ) : (
              <form action={unsubscribe}>
                <h1 style={{ fontSize: "1.4rem" }}>Unsubscribe from Global Talent Lab follow-ups?</h1>
                <p className="muted">This stops all follow-up emails and WhatsApp messages to {lead.email}.</p>
                <button className="btn btn-dark btn-block" type="submit">Unsubscribe</button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
