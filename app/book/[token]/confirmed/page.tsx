import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header, Footer } from "@/components/SiteChrome";
import LocalTime from "@/components/LocalTime";
import { site } from "@/lib/site-config";

export const metadata: Metadata = { title: "Your review is booked", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Confirmed({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await db.lead.findUnique({ where: { token } });
  if (!lead) notFound();
  if (!lead.reviewPaidAt) redirect(`/assessment/result/${token}`);
  if (!lead.bookingStart) redirect(`/book/${token}`);

  return (
    <>
      <Header minimal />
      <main className="section" style={{ paddingTop: 32 }}>
        <div className="container narrow">
          <span className="grade-chip v-a">Booked</span>
          <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.4rem)" }}>Your Personal Eligibility Review is booked</h1>
          <p className="lead">We&apos;ve emailed the details to {lead.email}. A calendar invitation is on its way too.</p>

          <div className="card" style={{ marginTop: 20 }}>
            <dl className="kv" style={{ gridTemplateColumns: "120px 1fr" }}>
              <dt>Date &amp; time</dt>
              <dd><LocalTime iso={lead.bookingStart.toISOString()} fallbackTz={lead.bookingTimezone ?? "Europe/London"} /></dd>
              <dt>Duration</dt>
              <dd>30 minutes</dd>
              <dt>Video call</dt>
              <dd>{lead.meetingUrl ? <a href={lead.meetingUrl} target="_blank" rel="noopener noreferrer">{lead.meetingUrl}</a> : "The video link is in your calendar invitation and confirmation email."}</dd>
              {lead.rescheduleUrl && (
                <>
                  <dt>Need to change?</dt>
                  <dd>
                    <a href={lead.rescheduleUrl} target="_blank" rel="noopener noreferrer">Reschedule</a>
                    {lead.cancelUrl && <> · <a href={lead.cancelUrl} target="_blank" rel="noopener noreferrer">Cancel</a></>}
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3>How to prepare (about 15 minutes)</h3>
            <ul className="checks">
              <li>Reply to your confirmation email with your LinkedIn profile and CV{lead.linkedin ? " (we already have your LinkedIn)" : ""}.</li>
              <li>List your 3 strongest achievements, with numbers where possible.</li>
              <li>Gather links to any external evidence — talks, publications, open source, awards, press.</li>
              <li>Write down the questions you most want answered.</li>
            </ul>
            <p className="xs muted" style={{ margin: 0 }}>
              The review is coaching on your profile and evidence. It isn&apos;t immigration or legal advice and doesn&apos;t guarantee endorsement.
            </p>
          </div>

          <p className="small muted" style={{ marginTop: 24 }}>
            Questions? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. <Link href="/">Back to the homepage</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
