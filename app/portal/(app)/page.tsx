import { Fragment } from "react";
import Link from "next/link";
import { requirePortalViewer } from "@/lib/client-auth";
import { loadPortal, verifyReturnedSession } from "@/lib/portal-data";
import { formatGBP } from "@/lib/site-config";
import { first } from "@/lib/email-templates";
import { WRITER_CONFIRMATION, writerOfferOpen, STAGES, PROGRAMME_NAME, PHASE_2_PENCE, PROGRAMME_TOTAL_PENCE, progressPercent, paidPence, stageDone } from "@/lib/programme-content";
import { StageCard, PhaseCheckout, fmtDate } from "@/components/portal/StageCard";
import { Check } from "@/components/portal/marks";

type SP = Record<string, string | undefined>;

export default async function PortalHome({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const viewer = await requirePortalViewer();
  if (!viewer.preview && sp.session_id) await verifyReturnedSession(viewer.leadId, sp.session_id);
  const { lead, programme: p } = await loadPortal(viewer);

  const awaitingPhase = sp.paid === "1" ? !p?.phase1PaidAt : sp.paid === "2" ? !p?.phase2PaidAt : sp.paid === "writer" ? !p?.writerPaidAt : false;
  const phase1Complete = !!p && stageDone(p, 2);
  const percent = p ? progressPercent(p) : 0;

  return (
    <>
      {sp.welcome && <div className="callout" style={{ marginBottom: 20 }}><strong>Your account is ready.</strong> Next time, use <Link href="/portal/login">Client Portal Login</Link> with your email and password — you won&apos;t need the invitation link again.</div>}
      {sp.reset && <div className="callout" style={{ marginBottom: 20 }}>Your password has been updated.</div>}
      {sp.checkout === "cancelled" && <div className="callout neutral" style={{ marginBottom: 20 }}>Checkout was cancelled — nothing was charged.</div>}
      {sp.paid && !awaitingPhase && (
        <div className="callout" style={{ marginBottom: 20 }}>
          <strong>Payment received — thank you.</strong> A receipt is on its way from Stripe.
          {sp.paid === "writer" && <p style={{ margin: "6px 0 0" }}>{WRITER_CONFIRMATION}</p>}
        </div>
      )}
      {awaitingPhase && (
        <div className="callout warn" style={{ marginBottom: 20 }}>
          <strong>Confirming your payment…</strong> This usually takes a few seconds. <Link href="/portal">Refresh</Link>.
          <meta httpEquiv="refresh" content="4;url=/portal" />
        </div>
      )}

      <h1 style={{ marginBottom: 4 }}>Welcome, {first(lead.name)}</h1>
      <p className="lead muted" style={{ marginTop: 0 }}>Your UK Global Talent Journey</p>

      {p?.completedAt && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--teal-d)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Application Strategy Programme Complete <span style={{ color: "var(--teal-d)" }}>✓</span></h2>
          <ul className="checks">{STAGES.map((s) => <li key={s.n}>{s.title}</li>)}</ul>
          <p className="small muted" style={{ margin: "8px 0 0" }}>Completed {fmtDate(p.completedAt)}</p>
        </div>
      )}

      {p && (
        <div style={{ margin: "22px 0 18px" }}>
          <div className="progress-top"><span>Programme progress</span><span>{percent}% complete</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
        </div>
      )}

      <div className="journey" style={{ marginTop: 20 }}>
        <div className="journey-step done">
          <span className="journey-dot"><Check /></span>
          <div className="card stage-card">
            <div className="stage-top">
              <div>
                <span className="stage-num">Step 1</span>
                <h3>Eligibility Review</h3>
              </div>
              <span className="badge done"><Check /> Completed</span>
            </div>
            {lead.reviewCompletedAt && <p className="small muted" style={{ margin: "6px 0 0" }}>Completed {fmtDate(lead.reviewCompletedAt)}</p>}
          </div>
        </div>

        {!p ? (
          <div className="journey-step">
            <span className="journey-dot">2</span>
            <div className="card stage-card"><p style={{ margin: 0 }}>There&apos;s nothing else in your portal yet.</p></div>
          </div>
        ) : (
          <>
            <div className="journey-step" style={{ paddingTop: 10 }}>
              <h2 style={{ fontSize: "1.3rem", margin: "6px 0 2px" }}>{PROGRAMME_NAME}</h2>
              {p.phase1PaidAt ? (
                <p className="small" style={{ margin: 0 }}>
                  <strong style={{ color: "var(--teal-d)" }}>✓ Programme started</strong> · {formatGBP(paidPence(p))} paid · {formatGBP(PROGRAMME_TOTAL_PENCE - paidPence(p))} remaining
                </p>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>Four structured stages · {formatGBP(PROGRAMME_TOTAL_PENCE)} in two phases</p>
              )}
            </div>

            {STAGES.map((c) => {
              const stage = p.stages.find((s) => s.number === c.n)!;
              const cls = stage.status === "COMPLETED" ? "done" : stage.status === "AVAILABLE" || stage.status === "BOOKED" ? "current" : "";
              return (
                <Fragment key={c.n}>
                  {c.n === 3 && phase1Complete && (
                    <div className="journey-step done">
                      <span className="journey-dot"><Check /></span>
                      <div className="callout">
                        <strong style={{ fontSize: "1.1rem" }}>Phase 1 Complete ✓</strong>
                        <p style={{ margin: "6px 0 0" }}>You have completed the strategy phase and now have your Criteria &amp; Evidence Map and Personalised Application Write-up Plan.</p>
                      </div>
                    </div>
                  )}
                  {c.n === 3 && phase1Complete && !p.phase2PaidAt && (
                    <div className="journey-step current">
                      <span className="journey-dot">£</span>
                      <div className="card stage-card current">
                        <h3>Continue to Evidence Review &amp; Refinement</h3>
                        <p style={{ margin: "8px 0" }}>You&apos;ve completed the strategy phase. The second phase covers detailed evidence review, written feedback, refinement and final readiness review.</p>
                        <p style={{ margin: "0 0 4px" }}><strong>Remaining balance: {formatGBP(PHASE_2_PENCE)}</strong></p>
                        <PhaseCheckout phase={2} label={`Continue Programme — ${formatGBP(PHASE_2_PENCE)}`} preview={viewer.preview} />
                      </div>
                    </div>
                  )}
                  <div className={`journey-step ${cls}`}>
                    <span className="journey-dot">{stage.status === "COMPLETED" ? <Check /> : String(c.n).padStart(2, "0")}</span>
                    <StageCard content={c} stage={stage} phase1Paid={!!p.phase1PaidAt} canStart={!!p.acceptedAt && !p.phase1PaidAt} preview={viewer.preview} driveUrl={p.phase1PaidAt ? p.driveUrl : null} writer={c.n === 2 ? { offer: writerOfferOpen(p), purchased: !!p.writerPaidAt } : undefined} />
                  </div>
                </Fragment>
              );
            })}
          </>
        )}
      </div>

      {p?.phase1PaidAt && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Application Workspace</h3>
          {p.driveUrl ? (
            <>
              <p className="small" style={{ margin: "4px 0 12px" }}>Your application documents and working materials are stored in your private Google Drive workspace.</p>
              <a className="btn btn-dark" href={p.driveUrl} target="_blank" rel="noopener noreferrer">Open Application Workspace</a>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>We&apos;re setting up your private Google Drive workspace — it will appear here shortly.</p>
          )}
        </div>
      )}
    </>
  );
}
