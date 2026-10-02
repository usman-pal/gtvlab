import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalViewer } from "@/lib/client-auth";
import { loadPortal } from "@/lib/portal-data";
import { stageContent, writerOfferOpen } from "@/lib/programme-content";
import { calOrigin, calStrategyLink, mockStrategyBookingAllowed } from "@/lib/cal";
import { site, whatsappBusinessUrl } from "@/lib/site-config";
import { CalBooking, MockBooking } from "@/app/book/[token]/BookingWidget";
import LocalTime from "@/components/LocalTime";
import { fmtDate, WriterAddon } from "@/components/portal/StageCard";

export default async function SessionPage({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  if (![1, 2, 3, 4].includes(n)) notFound();
  const viewer = await requirePortalViewer();
  const { lead, programme: p } = await loadPortal(viewer);
  const stage = p?.stages.find((s) => s.number === n);
  if (!p || !stage) notFound();
  const c = stageContent(n);
  const wa = whatsappBusinessUrl();
  const target = { confirmPath: "/api/portal/booking", extra: { stage: n }, redirectTo: `/portal/sessions/${n}` };

  return (
    <>
      <p className="small"><Link href="/portal/sessions">← Sessions</Link></p>
      <span className="eyebrow">Session {n} of 4</span>
      <h1>{c.title}</h1>
      <p>{c.description}</p>
      {c.focus && (
        <div className="callout neutral small" style={{ marginBottom: 16 }}>
          <strong>{c.focus.heading}</strong>
          {c.focus.intro && <p style={{ margin: "6px 0" }}>{c.focus.intro}</p>}
          <ul className="checks" style={{ marginTop: 6 }}>{c.focus.items.map((i) => <li key={i}>{i}</li>)}</ul>
          {c.focus.outro && <p style={{ margin: "6px 0 0" }}>{c.focus.outro}</p>}
        </div>
      )}
      <p className="small"><strong>Deliverable:</strong> {c.deliverable}</p>
      {n === 2 && stage.status !== "LOCKED" && (
        <div style={{ marginBottom: 16 }}>
          <WriterAddon writer={{ offer: writerOfferOpen(p), purchased: !!p.writerPaidAt }} preview={viewer.preview} />
        </div>
      )}

      {stage.status === "LOCKED" && (
        <div className="callout neutral">This session isn&apos;t open yet. <Link href="/portal">See your programme</Link> for what comes next.</div>
      )}

      {stage.status === "COMPLETED" && (
        <div className="callout">
          <strong>Completed {fmtDate(stage.completedAt)}.</strong> Your {c.deliverable} is in your <Link href="/portal/workspace">application workspace</Link>.
        </div>
      )}

      {stage.status === "BOOKED" && stage.bookingStart && (
        <div className="card">
          <span className="badge booked">Session booked</span>
          <dl className="kv" style={{ gridTemplateColumns: "120px 1fr", marginTop: 12 }}>
            <dt>Date &amp; time</dt>
            <dd><LocalTime iso={stage.bookingStart.toISOString()} fallbackTz={stage.bookingTimezone ?? "Europe/London"} /></dd>
            <dt>Video call</dt>
            <dd>{stage.meetingUrl ? <a href={stage.meetingUrl} target="_blank" rel="noopener noreferrer">{stage.meetingUrl}</a> : "The video link is in your calendar invitation."}</dd>
            {stage.rescheduleUrl && !viewer.preview && (
              <>
                <dt>Need to change?</dt>
                <dd>
                  <a href={stage.rescheduleUrl} target="_blank" rel="noopener noreferrer">Reschedule</a>
                  {stage.cancelUrl && <> · <a href={stage.cancelUrl} target="_blank" rel="noopener noreferrer">Cancel</a></>}
                </dd>
              </>
            )}
          </dl>
          <p className="small muted" style={{ margin: "14px 0 0" }}>
            Before the session, please add your latest working materials to your <Link href="/portal/workspace">application workspace</Link>. The stage is marked complete by Global Talent Lab after the session.
          </p>
        </div>
      )}

      {stage.status === "AVAILABLE" &&
        (viewer.preview ? (
          <div className="callout warn">Booking is disabled in admin preview. The client sees the calendar here.</div>
        ) : calStrategyLink ? (
          <CalBooking token={lead.token} name={lead.name} email={viewer.email} calLink={calStrategyLink} calOrigin={calOrigin} metadata={{ programmeStageId: stage.id }} {...target} />
        ) : mockStrategyBookingAllowed() ? (
          <MockBooking token={lead.token} minutes={60} {...target} />
        ) : (
          <div className="card">
            <p style={{ margin: 0 }}>
              Online booking for programme sessions is being set up. Please message us{wa ? <> on <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null} or email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll arrange a time.
            </p>
          </div>
        ))}
    </>
  );
}
