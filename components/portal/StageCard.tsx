import Link from "next/link";
import type { ProgrammeStage } from "@prisma/client";
import LocalTime from "@/components/LocalTime";
import { formatGBP } from "@/lib/site-config";
import { PHASE_1_PENCE, PHASE_2_PENCE, WRITER_PENCE, WRITER_CONFIRMATION, type StageContent } from "@/lib/programme-content";
import { Check, Lock } from "./marks";

export const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "");

/** Form that starts Stripe Checkout for a phase or the writer add-on. Disabled in admin preview. */
export function PhaseCheckout({ phase, label, preview, block = false, className = "btn btn-primary btn-lg" }: { phase: 1 | 2 | "writer"; label: string; preview: boolean; block?: boolean; className?: string }) {
  return (
    <form action="/api/portal/checkout" method="post">
      <input type="hidden" name="phase" value={phase} />
      <button className={`${className}${block ? " btn-block" : ""}`} disabled={preview} title={preview ? "Disabled in admin preview" : undefined}>
        {label}
      </button>
    </form>
  );
}

export type WriterState = { offer: boolean; purchased: boolean };

/** Optional "Hire a Writer" add-on shown inside Stage 2, or its confirmation once bought. */
export function WriterAddon({ writer, preview }: { writer: WriterState; preview: boolean }) {
  if (writer.purchased) {
    return (
      <div className="callout small" style={{ marginTop: 14, padding: "14px 16px" }}>
        <strong><Check /> Writer services purchased</strong>
        <p style={{ margin: "6px 0 0" }}>{WRITER_CONFIRMATION}</p>
      </div>
    );
  }
  if (!writer.offer) return null;
  return (
    <div className="card" style={{ marginTop: 14, padding: "16px 18px", boxShadow: "none", borderStyle: "dashed" }}>
      <span className="badge locked">Optional add-on</span>
      <h3 style={{ fontSize: "1rem", margin: "8px 0 4px" }}>Hire a Writer — {formatGBP(WRITER_PENCE)}</h3>
      <p className="small" style={{ margin: "0 0 10px" }}>
        Want help writing it up? A writer joins your Evidence &amp; Write-up Strategy session so your application write-up can start straight away, based on the plan we build together.
      </p>
      <PhaseCheckout phase="writer" label={`Hire a Writer — ${formatGBP(WRITER_PENCE)}`} preview={preview} className="btn btn-secondary" />
      <p className="xs muted" style={{ margin: "8px 0 0" }}>Optional, one-off payment. Not part of the £1,899 programme price.</p>
    </div>
  );
}

const lockedHint: Record<number, string> = {
  1: "Available after starting programme",
  2: "Opens when Stage 1 is complete",
  3: "Opens after Phase 1 and the Phase 2 payment",
  4: "Opens when Stage 3 is complete",
};

export function StageCard({
  content: c,
  stage,
  phase1Paid,
  canStart,
  preview,
  driveUrl,
  writer,
}: {
  content: StageContent;
  stage: ProgrammeStage;
  phase1Paid: boolean;
  /** Stage 1 only: the client can pay to start */
  canStart: boolean;
  preview: boolean;
  driveUrl: string | null;
  /** Stage 2 only: the Hire a Writer add-on */
  writer?: WriterState;
}) {
  const num = String(c.n).padStart(2, "0");
  const open = stage.status === "AVAILABLE" || stage.status === "BOOKED";

  if (stage.status === "COMPLETED") {
    return (
      <div className="card stage-card">
        <div className="stage-top">
          <div>
            <span className="stage-num">{num}</span>
            <h3>{c.title}</h3>
          </div>
          <span className="badge done"><Check /> Completed</span>
        </div>
        <p className="small muted" style={{ margin: "6px 0 0" }}>Completed {fmtDate(stage.completedAt)}</p>
        <span className="deliverable">Deliverable available: {c.deliverable}</span>
        {writer?.purchased && <p className="small muted" style={{ margin: "8px 0 0" }}>✓ Writer services purchased</p>}
        {driveUrl && (
          <p className="small" style={{ margin: "10px 0 0" }}>
            <a href={driveUrl} target="_blank" rel="noopener noreferrer">Open in your workspace →</a>
          </p>
        )}
      </div>
    );
  }

  if (open) {
    return (
      <div className="card stage-card current">
        <div className="stage-top">
          <div>
            <span className="stage-num">{num}</span>
            <h3>{c.title}</h3>
          </div>
          <span className="badge current">Current stage</span>
        </div>
        <p style={{ margin: "10px 0 0" }}>{c.description}</p>
        {c.focus && (
          <div className="callout neutral small" style={{ marginTop: 14, padding: "14px 16px" }}>
            <strong>{c.focus.heading}</strong>
            {c.focus.intro && <p style={{ margin: "6px 0" }}>{c.focus.intro}</p>}
            <ul className="checks" style={{ marginTop: 6 }}>{c.focus.items.map((i) => <li key={i}>{i}</li>)}</ul>
            {c.focus.outro && <p style={{ margin: "6px 0 0" }}>{c.focus.outro}</p>}
          </div>
        )}
        <span className="deliverable">Deliverable: {c.deliverable}</span>
        {writer && <WriterAddon writer={writer} preview={preview} />}
        {stage.status === "BOOKED" && stage.bookingStart ? (
          <div style={{ marginTop: 14 }}>
            <p className="small" style={{ margin: 0 }}>
              <span className="badge booked">Session booked</span>{" "}
              <LocalTime iso={stage.bookingStart.toISOString()} fallbackTz={stage.bookingTimezone ?? "Europe/London"} />
            </p>
            <div className="btn-row" style={{ marginTop: 10 }}>
              {stage.meetingUrl && <a className="btn btn-dark" href={stage.meetingUrl} target="_blank" rel="noopener noreferrer">Join video call</a>}
              <Link className="btn btn-secondary" href={`/portal/sessions/${c.n}`}>Session details</Link>
            </div>
          </div>
        ) : (
          <div><Link className="btn btn-primary btn-lg" href={`/portal/sessions/${c.n}`}>Book Session {c.n}</Link></div>
        )}
      </div>
    );
  }

  // Locked (Stage 1 before payment is the next action, so it isn't greyed out)
  return (
    <div className={`card stage-card${c.n === 1 && canStart ? "" : " locked"}`}>
      <div className="stage-top">
        <div>
          <span className="stage-num"><Lock /> {num}</span>
          <h3>{c.title}</h3>
        </div>
        <span className="badge locked">{c.n === 1 && !phase1Paid ? "Not started" : "Locked"}</span>
      </div>
      <p className="small" style={{ margin: "8px 0 0", fontWeight: 600 }}>{lockedHint[c.n]}</p>
      <p className="small muted" style={{ margin: "4px 0 0" }}>{c.lockedSummary}</p>
      <span className="deliverable">{c.n === 1 ? "Deliverable" : c.highlights.join(" · ")}{c.n === 1 ? `: ${c.deliverable}` : ""}</span>
      {c.n === 1 && canStart && (
        <div style={{ marginTop: 6 }}>
          <PhaseCheckout phase={1} label={`Start Programme — ${formatGBP(PHASE_1_PENCE)}`} preview={preview} />
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            {formatGBP(PHASE_1_PENCE)} covers Stages 1 &amp; 2. The remaining {formatGBP(PHASE_2_PENCE)} becomes payable before Stage 3.
          </p>
        </div>
      )}
    </div>
  );
}
